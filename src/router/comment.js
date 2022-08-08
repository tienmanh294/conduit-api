/* eslint-disable consistent-return */
/* eslint-disable array-callback-return */
/* eslint-disable no-underscore-dangle */
const express = require('express');
const Comment = require('../models/comment');
const Article = require('../models/article');
const auth = require('../middleware/auth');

const router = new express.Router();

router.post('/articles/:slug/comments', auth, async (req, res) => {
  try {
    const { slug } = req.params;
    const article = await Article.findOne({ slug });
    if (!article) {
      throw new Error();
    }
    const comment = new Comment({
      ...req.body,
      author: req.user._id,
      article: article._id,
    });
    await comment.save();
    res.status(201).send(comment);
  } catch (e) {
    res.status(400).send(e);
  }
});
// GET /articles?tag=<tag>
// GET /articles?author=<user name>
// GET /articles?favorited=<user name>
// GET /articles?limit=20
// GET /articles?offset=0
router.get('/articles/:slug/comments', async (req, res) => {
  try {
    const { slug } = req.params;
    const article = await Article.findOne({ slug });
    const comments = await Comment.find({ article: article._id }).populate({
      path: 'author',
    }).populate({
      path: 'article',
    });
    if (!comments) {
      return res.status(404).send({ error: 'Article not found' });
    }
    res.send(comments);
  } catch (e) {
    res.status(500).send();
  }
});
// GET /articles?limit=20

router.delete('/articles/:slug/comments/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const comment = await Comment.findOneAndDelete({ _id: id, author: req.user._id });

    if (!comment) {
      return res.status(404).send();
    }

    res.send(comment);
  } catch (e) {
    res.status(400).send(e);
  }
});
router.get('/tags', async (req, res) => {
  try {
    const allArticles = await Article.find();
    const tags = [];
    allArticles.map(article => {
      article.tags.map(item => {
        tags.push(item);
      });
    });

    const dictTags = {};
    tags.forEach(item => {
      dictTags[item] = (dictTags[item] || 0) + 1;
    });

    const arrTags = Object.keys(dictTags).map(key => [key, dictTags[key]]);
    arrTags.sort((first, second) => second[1] - first[1]);
    const result = arrTags.slice(0, 5);
    res.send(result);
  } catch (e) {
    res.status(400).send(e);
  }
});
module.exports = router;
