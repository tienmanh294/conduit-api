const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema(
  {
    body: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    video: {
      type: String,
      default: '',
    },
    slug: {
      type: String,
      default: '',
    },
    tags: [{ type: String }],
    favorited: [
      {
        type: String,
      },
    ],
    favorites: {
      type: Number,
      default: 0,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

articleSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'article',
});

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;
