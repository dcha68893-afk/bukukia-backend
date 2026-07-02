const router = require('express').Router();
const buildCrudRouter = require('../utils/crudFactory');
const { ChoirMember } = require('../models');

module.exports = buildCrudRouter({
  Model: ChoirMember,
  router,
  publishedFilter: { isActive: true },
  searchFields: ['fullName', 'voicePart', 'instruments'],
  editRoles: ['leader', 'pastor', 'admin', 'super_admin'],
});
