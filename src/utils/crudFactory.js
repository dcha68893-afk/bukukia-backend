const { authenticateToken, requireRole, optionalAuth, requirePermission } = require('../middleware/auth');

// No-op middleware, used when a given CRUD action has no extra permission
// requirement beyond the tier check.
const noPermissionRequired = (req, res, next) => next();

/**
 * Builds a standard public-read / admin-write CRUD router for a simple model.
 * Pass `publishedFilter` to restrict what the general public sees (e.g. { isPublished: true }).
 * Staff whose role is in `editRoles` bypass that filter so they can see/manage drafts too.
 *
 * Ministry scoping (optional): pass `scopedRoles` (e.g. ['leader']) together with
 * `itemScopeField` (the field on the record identifying its scope, e.g. 'ministryId'
 * or 'id' for the Ministry model itself) and `userScopeField` (the field on req.user
 * to compare against, e.g. 'ministryId'). Roles in `scopedRoles` may then only
 * update/delete records whose itemScopeField matches their own userScopeField value,
 * and `createRoles` can be set separately to exclude them from creating brand-new
 * records entirely (e.g. a leader can edit their own ministry's page but not spin up
 * new ministries).
 */
function buildCrudRouter({
  Model, router, publishedFilter = {}, searchFields = [],
  editRoles = ['admin', 'super_admin'],
  deleteRoles = null,
  createRoles = null,
  scopedRoles = [],
  itemScopeField = null,
  userScopeField = null,
  // Optional fine-grained permission(s) (from config/permissions.js), layered
  // ON TOP OF the tier check above. Use this when a tier (e.g. 'admin') is
  // shared by multiple job titles that shouldn't all get access — e.g.
  // Finance Manager and Media Director are both tier 'admin', but only one
  // of them should be able to manage the livestream. Accepts a single
  // permission string or an array (any-of).
  createPermission = null,
  editPermission = null,
  deletePermission = null,
}) {
  const { Op } = require('sequelize');
  const effectiveDeleteRoles = deleteRoles || ['admin', 'super_admin']; // deletion is always at least admin-level, regardless of editRoles
  const effectiveCreateRoles = createRoles || editRoles;
  const effectiveUserScopeField = userScopeField || itemScopeField;

  const asArray = (p) => (p == null ? [] : Array.isArray(p) ? p : [p]);
  const createPermCheck = createPermission ? requirePermission(...asArray(createPermission)) : noPermissionRequired;
  const editPermCheck = editPermission ? requirePermission(...asArray(editPermission)) : noPermissionRequired;
  const deletePermCheck = deletePermission ? requirePermission(...asArray(deletePermission)) : noPermissionRequired;

  function isScoped(user) {
    return itemScopeField && scopedRoles.includes(user.role);
  }

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

  // Create
  router.post('/', authenticateToken, requireRole(...effectiveCreateRoles), createPermCheck, async (req, res, next) => {
    try {
      const body = { ...req.body };
      if (isScoped(req.user)) {
        const myScope = req.user[effectiveUserScopeField];
        if (!myScope) {
          return res.status(403).json({ success: false, message: 'You have not been assigned a scope for this yet. Ask your pastor or admin.' });
        }
        body[itemScopeField] = myScope;
      }
      const item = await Model.create(body);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  });

  // Update
  router.put('/:id', authenticateToken, requireRole(...editRoles), editPermCheck, async (req, res, next) => {
    try {
      const item = await Model.findByPk(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: 'Not found' });
      const body = { ...req.body };
      if (isScoped(req.user)) {
        const myScope = req.user[effectiveUserScopeField];
        if (!myScope || item[itemScopeField] !== myScope) {
          return res.status(403).json({ success: false, message: 'You can only manage your own ministry\'s content.' });
        }
        delete body[itemScopeField]; // can't reassign it to another scope
      }
      await item.update(body);
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  });

  // Delete
  router.delete('/:id', authenticateToken, requireRole(...effectiveDeleteRoles), deletePermCheck, async (req, res, next) => {
    try {
      const item = await Model.findByPk(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: 'Not found' });
      if (isScoped(req.user)) {
        const myScope = req.user[effectiveUserScopeField];
        if (!myScope || item[itemScopeField] !== myScope) {
          return res.status(403).json({ success: false, message: 'You can only manage your own ministry\'s content.' });
        }
      }
      await item.destroy();
      res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = buildCrudRouter;
