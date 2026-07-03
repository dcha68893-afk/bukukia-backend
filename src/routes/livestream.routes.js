const router = require('express').Router();
const buildCrudRouter = require('../utils/crudFactory');
const { LiveStream } = require('../models');
const { PERMISSIONS } = require('../config/permissions');

module.exports = buildCrudRouter({
  Model: LiveStream,
  router,
  searchFields: ['title'],
  // Widened to 'leader' tier so camera/livestream operators and sound
  // technicians (all tier 'leader') can reach these routes; the permission
  // check below then narrows it to only the media roles that actually have
  // MANAGE_LIVESTREAM/START_LIVESTREAM (e.g. finance_manager is tier 'admin'
  // too, but has neither permission, so it's correctly kept out).
  editRoles: ['leader', 'pastor', 'admin', 'super_admin'],
  createPermission: [PERMISSIONS.START_LIVESTREAM, PERMISSIONS.MANAGE_LIVESTREAM],
  editPermission: [PERMISSIONS.START_LIVESTREAM, PERMISSIONS.MANAGE_LIVESTREAM],
  deleteRoles: ['pastor', 'admin', 'super_admin'],
  deletePermission: PERMISSIONS.MANAGE_LIVESTREAM,
});
