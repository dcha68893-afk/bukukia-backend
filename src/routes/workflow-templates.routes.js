const router = require('express').Router();
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const { WorkflowTemplate } = require('../models');
const { PERMISSIONS } = require('../config/permissions');

// Anyone signed in can see what workflows exist (e.g. a member deciding
// whether to submit a baptism request); only admin-tier+ with
// MANAGE_WORKFLOW_TEMPLATES can create/edit the process itself.
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const templates = await WorkflowTemplate.findAll({ where: { isActive: true }, order: [['name', 'ASC']] });
    res.json({ success: true, data: templates });
  } catch (err) { next(err); }
});

router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const template = await WorkflowTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Workflow template not found' });
    res.json({ success: true, data: template });
  } catch (err) { next(err); }
});

router.post('/', authenticateToken, requireRole('admin', 'super_admin', 'pastor'), requirePermission(PERMISSIONS.MANAGE_WORKFLOW_TEMPLATES), async (req, res, next) => {
  try {
    const { key, name, description, steps, completionEffect } = req.body;
    if (!key || !name || !Array.isArray(steps) || !steps.length) {
      return res.status(400).json({ success: false, message: 'key, name, and a non-empty steps array are required' });
    }
    for (const s of steps) {
      if (!s.name || (!s.minRole && !s.permission)) {
        return res.status(400).json({ success: false, message: `Step "${s.name || '(unnamed)'}" needs a name and at least one of minRole/permission, or nobody will ever be able to act on it` });
      }
    }
    const template = await WorkflowTemplate.create({ key, name, description, steps, completionEffect });
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, message: `A workflow with key "${req.body.key}" already exists` });
    next(err);
  }
});

router.put('/:id', authenticateToken, requireRole('admin', 'super_admin', 'pastor'), requirePermission(PERMISSIONS.MANAGE_WORKFLOW_TEMPLATES), async (req, res, next) => {
  try {
    const template = await WorkflowTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Workflow template not found' });
    const allowed = ['name', 'description', 'steps', 'completionEffect', 'isActive'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) template[f] = req.body[f]; });
    await template.save();
    res.json({ success: true, data: template });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticateToken, requireRole('admin', 'super_admin'), requirePermission(PERMISSIONS.MANAGE_WORKFLOW_TEMPLATES), async (req, res, next) => {
  try {
    const template = await WorkflowTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Workflow template not found' });
    // Soft-disable rather than hard-delete: existing in-flight WorkflowRequests
    // reference this template and shouldn't be orphaned mid-process.
    template.isActive = false;
    await template.save();
    res.json({ success: true, message: 'Workflow template deactivated' });
  } catch (err) { next(err); }
});

module.exports = router;
