const router = require('express').Router();
const buildCrudRouter = require('../utils/crudFactory');
const { LiveStream } = require('../models');

module.exports = buildCrudRouter({
  Model: LiveStream,
  router,
  searchFields: ['title'],
});
