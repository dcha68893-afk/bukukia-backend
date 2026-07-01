const router = require('express').Router();
const buildCrudRouter = require('../utils/crudFactory');
const { Announcement } = require('../models');

module.exports = buildCrudRouter({
  Model: Announcement,
  router,
  publishedFilter: { isPublished: true },
  searchFields: ['title', 'content'],
});
