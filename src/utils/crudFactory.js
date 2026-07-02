const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');

/**
 * Builds a standard public-read / admin-write CRUD router for a simple model.
 * Pass `publishedFilter` to restrict what the general public sees (e.g. { isPublished: true }).
 * Staff whose role is in `editRoles` bypass that filter so they can see/manage drafts too.
 */
function buildCrudRouter({ Model, router, publishedFilter = {}, searchFields = [], editRoles = ['admin', 'super_admin'], deleteRoles = null }) {
  const { Op } = require('sequelize');
  const effectiveDeleteRoles = deleteRoles || ['admin', 'super_admin']; // deletion is always at least admin-level, regardless of editRoles

  function visibilityFilter(req) {
    if (req.user && editRoles.includes(req.user.role)) return {}; // staff see everything
    return publishedFilter;
  }

  // List: public sees only published/approved items; staff (per editRoles) see everything
  router.get('/', optionalAuth, async (req, res, next) => {
    try {
      const { search, page = 1, limit = 20 } = req.query;
      const where = { ...visibilityFilter(req) };
      if (search && searchFields.length) {
        where[Op.or] = searchFields.map((f) => ({ [f]: { [Op.iLike]: `%${search}%` } }));
      }
      const offset = (Number(page) - 1) * Number(limit);
      const { rows, count } = await Model.findAndCountAll({
        where,
        limit: Number(limit),
        offset,
        order: [['createdAt', 'DESC']],
      });
      res.json({ success: true, total: count, page: Number(page), pages: Math.ceil(count / limit), data: rows });
    } catch (err) {
      next(err);
    }
  });

  // Get one: same visibility rule as the list endpoint, so unpublished items
  // can't be fetched directly by guessing an ID, but staff can still open them to edit.
  router.get('/:id', optionalAuth, async (req, res, next) => {
    try {
      const item = await Model.findOne({ where: { id: req.params.id, ...visibilityFilter(req) } });
      if (!item) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  });

  // Admin: create
  router.post('/', authenticateToken, requireRole(...editRoles), async (req, res, next) => {
    try {
      const item = await Model.create(req.body);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  });

  // Admin: update
  router.put('/:id', authenticateToken, requireRole(...editRoles), async (req, res, next) => {
    try {
      const item = await Model.findByPk(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: 'Not found' });
      await item.update(req.body);
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  });

  // Admin: delete
  router.delete('/:id', authenticateToken, requireRole(...effectiveDeleteRoles), async (req, res, next) => {
    try {
      const item = await Model.findByPk(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: 'Not found' });
      await item.destroy();
      res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = buildCrudRouter;
