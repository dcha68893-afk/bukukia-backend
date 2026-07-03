const router = require('express').Router();
const { authenticateToken, requireMinRole, requirePermission, requireOwnMinistryOrMinRole } = require('../middleware/auth');
const { MinistryTask, User } = require('../models');
const { PERMISSIONS, hasPermission } = require('../config/permissions');

const include = [{ model: User, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName'] }];

// List: ?ministryId=... (required in practice, but not enforced — admins may
// want an unfiltered view). Any leader-tier+ staff member can view; a plain
// 'leader' will typically only be shown their own ministry's tasks by the
// frontend passing their ministryId, since requireOwnMinistryOrMinRole below
// prevents them from ever writing to another ministry's tasks.
router.get('/', authenticateToken, requireMinRole('leader'), async (req, res, next) => {
  try {
    const { ministryId, serviceDate, status } = req.query;
    const where = {};
    if (ministryId) where.ministryId = ministryId;
    if (serviceDate) where.serviceDate = serviceDate;
    if (status) where.status = status;
    const tasks = await MinistryTask.findAll({ where, include, order: [['serviceDate', 'DESC'], ['createdAt', 'DESC']] });
    res.json({ success: true, total: tasks.length, data: tasks });
  } catch (err) { next(err); }
});

router.post(
  '/',
  authenticateToken,
  requireMinRole('leader'),
  requirePermission(PERMISSIONS.MANAGE_MINISTRY_TASKS),
  requireOwnMinistryOrMinRole((req) => req.body.ministryId || null),
  async (req, res, next) => {
    try {
      const { ministryId, title, notes, assignedToUserId, serviceDate, status } = req.body;
      if (!ministryId || !title) return res.status(400).json({ success: false, message: 'ministryId and title are required' });
      const task = await MinistryTask.create({ ministryId, title, notes, assignedToUserId, serviceDate, status });
      res.status(201).json({ success: true, data: task });
    } catch (err) { next(err); }
  }
);

router.put(
  '/:id',
  authenticateToken,
  requireMinRole('leader'),
  async (req, res, next) => {
    try {
      const task = await MinistryTask.findByPk(req.params.id);
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

      // Full manage permission (or a legacy account with no roleTitle, which
      // defers to the tier check already passed above) → can edit anything,
      // but still scoped to their own ministry unless pastor-tier+.
      const canManage = req.user.role === 'super_admin' || !req.user.roleTitle || hasPermission(req.user.roleTitle, PERMISSIONS.MANAGE_MINISTRY_TASKS);
      if (canManage) {
        return requireOwnMinistryOrMinRole(() => task.ministryId)(req, res, async () => {
          const allowed = ['title', 'notes', 'assignedToUserId', 'serviceDate', 'status'];
          allowed.forEach((f) => { if (req.body[f] !== undefined) task[f] = req.body[f]; });
          await task.save();
          res.json({ success: true, data: task });
        });
      }

      // Otherwise: the person this task is assigned to (e.g. a camera
      // operator who was handed "Camera Setup") can mark their own status,
      // even without MANAGE_MINISTRY_TASKS — but nothing else about the task.
      const isAssignee = task.assignedToUserId && task.assignedToUserId === req.user.id;
      const onlyChangingStatus = Object.keys(req.body).every((k) => k === 'status');
      if (isAssignee && onlyChangingStatus && req.body.status !== undefined) {
        task.status = req.body.status;
        await task.save();
        return res.json({ success: true, data: task });
      }

      return res.status(403).json({ success: false, message: 'You do not have permission to update this task' });
    } catch (err) { next(err); }
  }
);

router.delete(
  '/:id',
  authenticateToken,
  requireMinRole('leader'),
  requirePermission(PERMISSIONS.MANAGE_MINISTRY_TASKS),
  async (req, res, next) => {
    try {
      const task = await MinistryTask.findByPk(req.params.id);
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
      return requireOwnMinistryOrMinRole(() => task.ministryId)(req, res, async () => {
        await task.destroy();
        res.json({ success: true, message: 'Task deleted' });
      });
    } catch (err) { next(err); }
  }
);

module.exports = router;
