const router = require('express').Router();
const buildCrudRouter = require('../utils/crudFactory');
const { Testimonial } = require('../models');

module.exports = buildCrudRouter({
  Model: Testimonial,
  router,
  publishedFilter: { isApproved: true },
  searchFields: ['fullName', 'content'],
});
