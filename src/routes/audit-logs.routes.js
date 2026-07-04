const router = require('express').Router();
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const { AuditLog, User } = require('../models');
const { PERMISSIONS } = require('../config/permissions');

// Deliberately read-only: no POST/PUT/DELETE here. Entries are written only
// via utils/audit.js's recordAudit(), called from inside the routes that
// actually perform sensitive actions — never directly by a client.
router.get('/', authenticateToken, requireRole('admin', 'super_admin', 'pastor'), requirePermission(PERMISSIONS.VIEW_AUDIT_LOGS), async (req, res, next) => {
  try {
    const { entityType, entityId, actorUserId, action, from, to, page = 1, limit = 50 } = req.query;
    const { Op } = require('sequelize');
    const where = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (actorUserId) where.actorUserId = actorUserId;
    if (action) where.action = { [Op.iLike]: `%${action}%` };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) where.createdAt[Op.lte] = new Date(to);
    }
    const offset = (Number(page) - 1) * Number(limit);
    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'actor', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      limit: Number(limit), offset, order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, total: count, page: Number(page), pages: Math.ceil(count / limit), data: rows });
  } catch (err) { next(err); }
});

// History for one specific record (e.g. "show me everything that's ever
// happened to this member"), across every action type.
router.get('/entity/:entityType/:entityId', authenticateToken, requireRole('admin', 'super_admin', 'pastor'), requirePermission(PERMISSIONS.VIEW_AUDIT_LOGS), async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const logs = await AuditLog.findAll({
      where: { entityType, entityId },
      include: [{ model: User, as: 'actor', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, total: logs.length, data: logs });
  } catch (err) { next(err); }
});

module.exports = router;
