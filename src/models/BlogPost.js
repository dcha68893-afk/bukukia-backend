const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BlogPost = sequelize.define('BlogPost', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  category: { type: DataTypes.ENUM('devotional', 'bible_study', 'article', 'testimony'), defaultValue: 'devotional' },
  content: { type: DataTypes.TEXT, allowNull: false },
  authorName: { type: DataTypes.STRING },
  coverImage: { type: DataTypes.STRING },
  bibleVerse: { type: DataTypes.STRING },
  isPublished: { type: DataTypes.BOOLEAN, defaultValue: true },
  publishDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'blog_posts', timestamps: true });

module.exports = BlogPost;
