const router = require('express').Router();
const buildCrudRouter = require('../utils/crudFactory');
const { Ministry } = require('../models');

module.exports = buildCrudRouter({
  Model: Ministry,
  router,
  publishedFilter: { isActive: true },
  searchFields: ['name', 'description'],
});
