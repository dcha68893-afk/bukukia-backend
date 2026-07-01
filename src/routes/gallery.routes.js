const router = require('express').Router();
const buildCrudRouter = require('../utils/crudFactory');
const { GalleryItem } = require('../models');

module.exports = buildCrudRouter({
  Model: GalleryItem,
  router,
  searchFields: ['title', 'album'],
});
