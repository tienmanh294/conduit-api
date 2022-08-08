/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */
const express = require('express');
const Article = require('../models/article');
const User = require('../models/user');
const auth = require('../middleware/auth');

const router = new express.Router();

// GET /articles?tag=<tag>
// GET /articles?author=<user name>
// GET /articles?favorited=<user name>
// GET /articles?limit=20
// GET /articles?offset=0
router.get('/articles', async (req, res) => {
  try {
    if (req.query.tag) {
      const allArticles = await Article.find({
        $expr: {
          $in: [req.query.tag, '$tags'],
        },
      })
        .skip(parseInt(req.query.skip, 10))
        .limit(parseInt(req.query.limit, 10))
        .sort({ createdAt: -1 })
        .populate({ path: 'author' });
      const response = {
        articles: allArticles,
        articlesCount: allArticles.length,
      };
      res.send(response);
    } else {
      const allArticles = await Article.find()
        .skip(parseInt(req.query.skip, 10))
        .limit(parseInt(req.query.limit, 10))
        .sort({ createdAt: -1 })
        .populate({ path: 'author' });

      const response = {
        articles: allArticles,
        articlesCount: allArticles.length,
      };
      res.send(response);
    }
  } catch (e) {
    res.status(500).send();
  }
});
router.get('/articles/follows', auth, async (req, res) => {
  try {
    const articles = await Article.find({
      author: { $in: req.user.followings },
    })
      .skip(parseInt(req.query.skip, 10))
      .limit(parseInt(req.query.limit, 10))
      .sort({ createdAt: -1 })
      .populate({ path: 'author' });
    const response = {
      articles,
      articlesCount: articles.length,
    };
    res.send(response);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.get('/articles/:username/favorites', async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOne({ name: username });
    const articles = await Article.find({
      $expr: {
        $in: [user.name, '$favorited'],
      },
    })
      .skip(parseInt(req.query.skip, 10))
      .limit(parseInt(req.query.limit, 10))
      .sort({ createdAt: -1 })
      .populate({ path: 'author' });
    if (!articles) {
      return res.status(404).send();
    }
    const response = {
      articles,
      articlesCount: articles.length,
    };
    res.send(response);
  } catch (e) {
    res.status(400).send(e);
  }
});
router.get('/articles/:username/articles', async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOne({ name: username });
    const articles = await Article.find({ author: user._id })
      .skip(parseInt(req.query.skip, 10))
      .limit(parseInt(req.query.limit, 10))
      .sort({ createdAt: -1 })
      .populate({ path: 'author' });
    if (!articles) {
      return res.status(404).send();
    }
    const response = {
      articles,
      articlesCount: articles.length,
    };
    res.send(response);
  } catch (e) {
    res.status(400).send(e);
  }
});
module.exports = router;
