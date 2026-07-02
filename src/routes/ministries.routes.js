const router = require('express').Router();
const buildCrudRouter = require('../utils/crudFactory');
const { Ministry } = require('../models');

module.exports = buildCrudRouter({
  Model: Ministry,
  router,
  publishedFilter: { isActive: true },
  searchFields: ['name', 'description'],
  // Leaders can see/edit ministries (their own only, enforced below) alongside pastor/admin.
  editRoles: ['leader', 'pastor', 'admin', 'super_admin'],
  // Only pastors and above may create brand-new ministries.
  createRoles: ['pastor', 'admin', 'super_admin'],
  // A leader may only update the one ministry they lead (item.id === user.ministryId),
  // and cannot delete ministries at all (deleteRoles below keeps the default admin-only).
  scopedRoles: ['leader'],
  itemScopeField: 'id',
  userScopeField: 'ministryId',
});
