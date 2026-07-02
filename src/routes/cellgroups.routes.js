const router = require('express').Router();
const { authenticateToken, requireMinRole, requireRole } = require('../middleware/auth');
const { CellGroup, CellGroupMember, User } = require('../models');

// GET /api/cell-groups - public list
router.get('/', async (req, res, next) => {
  try {
    const groups = await CellGroup.findAll({ where: { isActive: true }, order: [['area', 'ASC']] });
    res.json({ success: true, data: groups });
  } catch (err) { next(err); }
});

// GET /api/cell-groups/:id/members - leader+ can see members
router.get('/:id/members', authenticateToken, requireMinRole('leader'), async (req, res, next) => {
  try {
    const members = await CellGroupMember.findAll({
      where: { cellGroupId: req.params.id },
      include: [{ model: User, as: 'user', attributes: ['id','firstName','lastName','email','phone'] }],
    });
    res.json({ success: true, data: members });
  } catch (err) { next(err); }
});

// POST /api/cell-groups/:id/join - logged-in member joins a cell group
router.post('/:id/join', authenticateToken, async (req, res, next) => {
  try {
    const group = await CellGroup.findByPk(req.params.id);
    if (!group || !group.isActive) return res.status(404).json({ success: false, message: 'Cell group not found' });
    const [record, created] = await CellGroupMember.findOrCreate({
      where: { cellGroupId: group.id, userId: req.user.id },
    });
    res.status(created ? 201 : 200).json({ success: true, data: record, alreadyMember: !created });
  } catch (err) { next(err); }
});

// POST /api/cell-groups - admin/pastor creates a cell group
router.post('/', authenticateToken, requireMinRole('pastor'), async (req, res, next) => {
  try {
    const group = await CellGroup.create(req.body);
    res.status(201).json({ success: true, data: group });
  } catch (err) { next(err); }
});

// PUT /api/cell-groups/:id
router.put('/:id', authenticateToken, requireMinRole('leader'), async (req, res, next) => {
  try {
    const group = await CellGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Not found' });
    await group.update(req.body);
    res.json({ success: true, data: group });
  } catch (err) { next(err); }
});

// DELETE /api/cell-groups/:id
router.delete('/:id', authenticateToken, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const group = await CellGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Not found' });
    await group.destroy();
    res.json({ success: true, message: 'Cell group deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
