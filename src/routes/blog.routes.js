const router = require('express').Router();
const buildCrudRouter = require('../utils/crudFactory');
const { BlogPost } = require('../models');

module.exports = buildCrudRouter({
  Model: BlogPost,
  router,
  publishedFilter: { isPublished: true },
  searchFields: ['title', 'content', 'category'],
});
