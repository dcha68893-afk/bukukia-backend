const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { WorkflowRequest, WorkflowTemplate, WorkflowStepLog, User } = require('../models');
const { rankOf } = require('../config/roles');
const { hasPermission } = require('../config/permissions');
const { sendNotification } = require('../utils/notify');

// Can this user act on this step? A step names EITHER/BOTH a minimum tier
// (minRole) and a specific permission. super_admin always can. If the user
// has no roleTitle assigned (a plain leader/pastor/admin/etc — see
// config/permissions.js for why), only the tier check applies, same as
// every other legacy-compatible check in this codebase. Once a roleTitle IS
// assigned, both the tier AND the permission (if the step specifies one)
// must be satisfied.
function canActOnStep(user, step) {
  if (user.role === 'super_admin') return true;
  const tierOk = !step.minRole || rankOf(user.role) >= rankOf(step.minRole);
  if (!tierOk) return false;
  if (!step.permission) return true;
  if (!user.roleTitle) return true; // legacy account, defers to tier only
  return hasPermission(user.roleTitle, step.permission);
}

const include = [
  { model: WorkflowTemplate, as: 'template' },
  { model: User, as: 'subject', attributes: ['id', 'firstName', 'lastName', 'email'] },
  { model: User, as: 'submittedBy', attributes: ['id', 'firstName', 'lastName'] },
  { model: WorkflowStepLog, as: 'history', include: [{ model: User, as: 'actedBy', attributes: ['id', 'firstName', 'lastName'] }] },
];

// List: staff see everything (optionally filtered to "awaiting my action" via
// ?pendingForMe=true); a plain member only ever sees their own requests.
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { status, pendingForMe } = req.query;
    const where = {};
    if (status) where.status = status;
    if (req.user.role === 'member') where.subjectUserId = req.user.id;

    let requests = await WorkflowRequest.findAll({ where, include, order: [['createdAt', 'DESC']] });

    if (pendingForMe === 'true') {
      requests = requests.filter((r) => {
        if (r.status !== 'in_progress') return false;
        const step = r.template.steps[r.currentStep];
        return step && canActOnStep(req.user, step);
      });
    }
    res.json({ success: true, total: requests.length, data: requests });
  } catch (err) { next(err); }
});

router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const request = await WorkflowRequest.findByPk(req.params.id, { include });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (req.user.role === 'member' && request.subjectUserId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only view your own requests' });
    }
    res.json({ success: true, data: request });
  } catch (err) { next(err); }
});

// Submit a new request against a template (e.g. "I'd like to be baptized").
// Anyone signed in can submit for themselves; staff (leader-tier+) may
// submit on behalf of another member (e.g. a secretary filing it for them).
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { templateId, subjectUserId, data } = req.body;
    if (!templateId) return res.status(400).json({ success: false, message: 'templateId is required' });
    const template = await WorkflowTemplate.findByPk(templateId);
    if (!template || !template.isActive) return res.status(404).json({ success: false, message: 'Workflow template not found or inactive' });

    const effectiveSubjectId = subjectUserId && rankOf(req.user.role) >= rankOf('leader') ? subjectUserId : req.user.id;

    const request = await WorkflowRequest.create({
      templateId, subjectUserId: effectiveSubjectId, submittedByUserId: req.user.id,
      data: data || {}, currentStep: 0, status: 'in_progress',
    });

    await notifyStepOwners(request, template);
    const full = await WorkflowRequest.findByPk(request.id, { include });
    res.status(201).json({ success: true, data: full });
  } catch (err) { next(err); }
});

// Advance the request: approve or reject the CURRENT step. On the final
// step's approval, status becomes 'completed' and, if the template defines
// one, its completionEffect is applied to the subject member automatically
// (e.g. baptismDate gets set) — see WorkflowTemplate.js for the fixed,
// reviewed list of what completionEffect is allowed to do.
router.post('/:id/advance', authenticateToken, async (req, res, next) => {
  try {
    const { decision, notes } = req.body; // decision: 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: "decision must be 'approved' or 'rejected'" });
    }
    const request = await WorkflowRequest.findByPk(req.params.id, { include: [{ model: WorkflowTemplate, as: 'template' }] });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'in_progress') return res.status(400).json({ success: false, message: `Request is already ${request.status}` });

    const step = request.template.steps[request.currentStep];
    if (!step) return res.status(500).json({ success: false, message: 'Workflow template is misconfigured (missing step)' });
    if (!canActOnStep(req.user, step)) {
      return res.status(403).json({ success: false, message: `Only staff who can perform "${step.name}" may act on this step` });
    }

    await WorkflowStepLog.create({
      requestId: request.id, stepIndex: request.currentStep, stepName: step.name,
      actedByUserId: req.user.id, decision, notes,
    });

    if (decision === 'rejected') {
      request.status = 'rejected';
      await request.save();
    } else if (request.currentStep >= request.template.steps.length - 1) {
      // Final step approved → completed, apply the template's completion effect.
      request.status = 'completed';
      await request.save();
      await applyCompletionEffect(request, request.template);
    } else {
      request.currentStep += 1;
      await request.save();
      await notifyStepOwners(request, request.template);
    }

    const full = await WorkflowRequest.findByPk(request.id, { include });
    res.json({ success: true, data: full });
  } catch (err) { next(err); }
});

async function applyCompletionEffect(request, template) {
  if (template.completionEffect === 'none') return;
  const subject = await User.findByPk(request.subjectUserId);
  if (!subject) return;
  if (template.completionEffect === 'set_baptism_date') {
    subject.baptismDate = new Date();
  } else if (template.completionEffect === 'set_membership_active') {
    subject.membershipStatus = 'active';
  }
  await subject.save();
  await sendNotification({
    userId: subject.id, title: `${template.name} complete`,
    message: `Your "${template.name}" request has been fully approved.`, type: 'general',
  }).catch(() => {}); // notification failure shouldn't fail the request completion
}

// Best-effort: tell everyone who could act on the NEW current step that
// something is waiting on them. Failures here are swallowed — a notification
// hiccup shouldn't block the workflow itself.
async function notifyStepOwners(request, template) {
  try {
    const step = template.steps[request.currentStep];
    if (!step) return;
    const where = {};
    if (step.minRole) where.role = { [require('sequelize').Op.in]: tiersAtOrAbove(step.minRole) };
    const candidates = await User.findAll({ where, attributes: ['id', 'role', 'roleTitle'] });
    const eligible = candidates.filter((u) => canActOnStep(u, step));
    await Promise.all(eligible.map((u) => sendNotification({
      userId: u.id, title: `Action needed: ${step.name}`,
      message: `A "${template.name}" request is waiting on the "${step.name}" step.`,
      type: 'general', sendEmail: false,
    }).catch(() => {})));
  } catch { /* non-critical */ }
}

function tiersAtOrAbove(minRole) {
  const order = ['member', 'leader', 'pastor', 'admin', 'super_admin'];
  const idx = order.indexOf(minRole);
  return idx === -1 ? order : order.slice(idx);
}

module.exports = router;
