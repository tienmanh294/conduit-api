const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    body: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    article: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Article',
    },
  },
  {
    timestamps: true,
  },
);

// articleSchema.virtual('comments', {
//     ref: 'Comment',
//     localField: '_id',
//     foreignField: 'owner',
//   });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
