const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * Builds a standard public-read / admin-write CRUD router for a simple model.
 * Pass `publishedFilter` to restrict public GET results (e.g. { isPublished: true }).
 */
function buildCrudRouter({ Model, router, publishedFilter = {}, searchFields = [], editRoles = ['admin', 'super_admin'] }) {
  const { Op } = require('sequelize');

  // Public: list (with optional search + pagination)
  router.get('/', async (req, res, next) => {
    try {
      const { search, page = 1, limit = 20 } = req.query;
      const where = { ...publishedFilter };
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

  // Public: get one
  router.get('/:id', async (req, res, next) => {
    try {
      const item = await Model.findByPk(req.params.id);
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
  router.delete('/:id', authenticateToken, requireRole(...editRoles), async (req, res, next) => {
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
