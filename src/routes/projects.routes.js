const router = require('express').Router();
const { authenticateToken, optionalAuth, requireRole, requirePermission } = require('../middleware/auth');
const { Project, ProjectMilestone, ProjectDocument, User } = require('../models');
const { PERMISSIONS } = require('../config/permissions');

const include = [
  { model: ProjectMilestone, as: 'milestones' },
  { model: ProjectDocument, as: 'documents' },
  { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName'] },
];

// Public-ish: anyone signed in can see the list (e.g. members following the
// building fund); only staff with VIEW_PROJECTS/MANAGE_PROJECTS see the
// documents (invoices/contracts). Kept behind authenticateToken (not
// optionalAuth) since project budgets aren't meant to be fully public.
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    const offset = (Number(page) - 1) * Number(limit);
    const { rows, count } = await Project.findAndCountAll({
      where, include, limit: Number(limit), offset, order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, total: count, page: Number(page), pages: Math.ceil(count / limit), data: rows });
  } catch (err) { next(err); }
});

router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id, { include });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (err) { next(err); }
});

router.post('/', authenticateToken, requireRole('pastor', 'admin', 'super_admin'), requirePermission(PERMISSIONS.MANAGE_PROJECTS), async (req, res, next) => {
  try {
    const { title, description, budget, status, responsibleParty, ministryId, startDate, targetEndDate } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });
    const project = await Project.create({
      title, description, budget, status, responsibleParty, ministryId, startDate, targetEndDate,
      createdByUserId: req.user.id,
    });
    res.status(201).json({ success: true, data: project });
  } catch (err) { next(err); }
});

router.put('/:id', authenticateToken, requireRole('pastor', 'admin', 'super_admin'), requirePermission(PERMISSIONS.MANAGE_PROJECTS), async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const allowed = ['title', 'description', 'budget', 'amountSpent', 'completedPercent', 'status', 'responsibleParty', 'ministryId', 'startDate', 'targetEndDate'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) project[f] = req.body[f]; });
    await project.save();
    res.json({ success: true, data: project });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticateToken, requireRole('admin', 'super_admin'), requirePermission(PERMISSIONS.MANAGE_PROJECTS), async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    await project.destroy(); // cascades to milestones/documents
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) { next(err); }
});

// ── Milestones ────────────────────────────────────────────────────────────
router.post('/:id/milestones', authenticateToken, requireRole('pastor', 'admin', 'super_admin'), requirePermission(PERMISSIONS.MANAGE_PROJECTS), async (req, res, next) => {
  try {
    const { title, status, dueDate, order } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const milestone = await ProjectMilestone.create({ projectId: project.id, title, status, dueDate, order });
    res.status(201).json({ success: true, data: milestone });
  } catch (err) { next(err); }
});

router.put('/:id/milestones/:milestoneId', authenticateToken, requireRole('pastor', 'admin', 'super_admin'), requirePermission(PERMISSIONS.MANAGE_PROJECTS), async (req, res, next) => {
  try {
    const milestone = await ProjectMilestone.findOne({ where: { id: req.params.milestoneId, projectId: req.params.id } });
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });
    const allowed = ['title', 'status', 'dueDate', 'order'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) milestone[f] = req.body[f]; });
    await milestone.save();
    res.json({ success: true, data: milestone });
  } catch (err) { next(err); }
});

router.delete('/:id/milestones/:milestoneId', authenticateToken, requireRole('pastor', 'admin', 'super_admin'), requirePermission(PERMISSIONS.MANAGE_PROJECTS), async (req, res, next) => {
  try {
    const milestone = await ProjectMilestone.findOne({ where: { id: req.params.milestoneId, projectId: req.params.id } });
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });
    await milestone.destroy();
    res.json({ success: true, message: 'Milestone deleted' });
  } catch (err) { next(err); }
});

// ── Documents (invoices / contracts / images) ───────────────────────────────
// Actual file bytes go through POST /api/upload first; this just records the
// resulting URL against the project.
router.post('/:id/documents', authenticateToken, requireRole('pastor', 'admin', 'super_admin'), requirePermission(PERMISSIONS.MANAGE_PROJECTS), async (req, res, next) => {
  try {
    const { title, category, fileUrl } = req.body;
    if (!title || !fileUrl) return res.status(400).json({ success: false, message: 'title and fileUrl are required' });
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const doc = await ProjectDocument.create({ projectId: project.id, title, category, fileUrl, uploadedByUserId: req.user.id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
});

router.delete('/:id/documents/:docId', authenticateToken, requireRole('pastor', 'admin', 'super_admin'), requirePermission(PERMISSIONS.MANAGE_PROJECTS), async (req, res, next) => {
  try {
    const doc = await ProjectDocument.findOne({ where: { id: req.params.docId, projectId: req.params.id } });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    await doc.destroy();
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
