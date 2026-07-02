const router = require('express').Router();
const buildCrudRouter = require('../utils/crudFactory');
const { Pastor } = require('../models');

module.exports = buildCrudRouter({
  Model: Pastor,
  router,
  publishedFilter: { isActive: true },
  searchFields: ['fullName', 'title', 'bio'],
  editRoles: ['pastor', 'admin', 'super_admin'],
});
