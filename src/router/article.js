/* eslint-disable prefer-arrow-callback */
/* eslint-disable no-return-assign */
/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */
const express = require('express');
const multer = require('multer');
const Article = require('../models/article');
const auth = require('../middleware/auth');
const { cloudinary } = require('../cloudinary/cloudinary');

const router = new express.Router();

router.post('/article', auth, async (req, res) => {
  const article = new Article({
    ...req.body,
    author: req.user._id,
  });
  try {
    
    const slug=article.title.replace(/<[^>]*>|[^a-zA-Z0-9 ]/g,'-').replace(/ /g, '-');
    const isExist = await Article.findOne({ slug });
    if(isExist){
      res.status(400).send(e);
    }
    article.slug = article.title.replace(/<[^>]*>|[^a-zA-Z0-9 ]/g,'-').replace(/ /g, '-');
    await article.save();
    res.status(201).send(article);
  } catch (e) {
    res.status(400).send(e);
  }
});
router.get('/cloudinary', async (req, res) => {
  try {
    const { resources } = await cloudinary.search
      .expression('folder: conduit')
      .sort_by('public_id', 'desc')
      .max_results(30)
      .execute();
    const publicIds = resources.map(file => file.public_id);
    res.send(publicIds);
  } catch (e) {
    res.status(400).send(e);
  }
});
const storage = multer.diskStorage({
  filename: (request, file, cb) => {
    const fileExt = file.originalname.split('.').pop();
    const filename = `${new Date().getTime()}.${fileExt}`;
    cb(null, filename);
  },
});
// Filter the file to validate if it meets the required video extension
const fileFilter = (request, file, cb) => {
  if (file.mimetype === 'video/mp4') {
    cb(null, true);
  } else {
    cb(
      {
        message: 'Unsupported File Format',
      },
      false,
    );
  }
};
// Set the storage, file filter and file size with multer
const upload = multer({
  storage,
  limits: {
    fieldNameSize: 200,
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter,
});
router.post('/article/video', auth, upload.single('video'), async (req, res) => {
  try {
    const { path } = req.file; // file becomes available in req at this point
    const fName = req.file.originalname.split('.')[0];
    function uploadToCloudinary() {
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_large(path, 
          {
          resource_type: 'video',
          public_id: `conduit/${fName}`,
          chunk_size: 6000000,
          eager: [
            {
              width: 300,
              height: 300,
              crop: 'pad',
              audio_codec: 'none',
            },
            {
              width: 160,
              height: 100,
              crop: 'crop',
              gravity: 'south',
              audio_codec: 'none',
            },
          ],
        },(err, url) => {
          if (err) return reject(err);
          return resolve(url);
        })
      });
    }
    const response = await uploadToCloudinary();
    const articleData = {
      title: fName,
      description: fName,
      tags: ['video'],
    };
    const article = new Article({
      ...articleData,
      author: req.user._id,
    });
    article.video = fName;
    if (/\s/.test(article.title)) {
      article.slug = article.title.replace(/\s*$/, '').replace(/ /g, '-');
    } else {
      article.slug = article.title;
    }
    await article.save();
    res.send(response);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.get('/article/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const article = await Article.findOne({ slug }).populate({
      path: 'author',
    });
    if (!article) {
      return res.status(404).send();
    }

    res.send(article);
  } catch (e) {
    res.status(500).send();
  }
});
router.patch('/article/:slug', auth, async (req, res) => {
  const { slug } = req.params;
  const updates = Object.keys(req.body);
  const allowUpdates = ['description', 'title', 'body', 'tags', 'slug'];
  const isValidOperation = updates.every(update =>
    allowUpdates.includes(update));
  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates' });
  }

  try {
    const article = await Article.findOne({ slug, author: req.user._id });

    if (!article) {
      return res.status(404).send();
    }
    updates.forEach(update => (article[update] = req.body[update]));
    article.slug = article.title.replace(/ /g, '-');
    await article.save();
    res.send(article);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.delete('/article/:slug', auth, async (req, res) => {
  const { slug } = req.params;
  try {
    const article = await Article.findOneAndDelete({
      slug,
      author: req.user._id,
    });
    if (article.video !== '') {
      const publicId = `conduit/${article.video}`;
      cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    }
    if (!article) {
      return res.status(404).send();
    }
    res.send(article);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.patch('/article/:slug/favorites', auth, async (req, res) => {
  const { slug } = req.params;
  try {
    const article = await Article.findOne({ slug });
    if (!article) {
      return res.status(404).send();
    }
    if (article.favorited.includes(req.user.name)) {
      article.favorited.splice(article.favorited.indexOf(req.user.name), 1);
      article.favorites -= 1;
    } else {
      article.favorited.push(req.user.name);
      article.favorites += 1;
    }

    await article.save();
    res.send(article);
  } catch (e) {
    res.status(400).send(e);
  }
});
module.exports = router;
