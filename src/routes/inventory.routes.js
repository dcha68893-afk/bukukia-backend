const router = require('express').Router();
const buildCrudRouter = require('../utils/crudFactory');
const { InventoryItem } = require('../models');

// Inventory is staff-only; no public publishedFilter needed
module.exports = buildCrudRouter({
  Model: InventoryItem,
  router,
  publishedFilter: {},
  searchFields: ['name', 'category', 'serialNumber'],
  editRoles: ['leader', 'pastor', 'admin', 'super_admin'],
});
