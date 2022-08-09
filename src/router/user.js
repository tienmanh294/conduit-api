/* eslint-disable no-unused-vars */
/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */
/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */
/* eslint-disable arrow-parens */
/* eslint-disable no-console */
const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const sharp = require('sharp');
const { cloudinary } = require('../cloudinary/cloudinary');
const User = require('../models/user');
const auth = require('../middleware/auth');

const router = new express.Router();
router.get('/users/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.jwt;
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findOne({
      _id: decoded._id,
      'refreshTokens.refreshToken': refreshToken,
    }).exec();

    if (!user) {
      throw new Error();
    }

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const accessToken = await user.generateAuthToken();
    res.send({ user, accessToken });
  } catch (e) {
    res.status(400);
  }
});

router.post('/users', async (req, res) => {
  const user = new User(req.body);
  try {
    const token = await user.generateAuthToken();

    await user.save();

    res.status(201).send({ user, token });
  } catch (e) {
    res.status(400).send(e);
  }
});

router.post('/users/login', async (req, res) => {
  try {
    const user = await User.findByCredentials(
      req.body.email,
      req.body.password,
    );
    if(!user){
      res.status(404).send(e);
    }
    const token = await user.generateAuthToken();
    const refreshToken = jwt.sign(
      { _id: user._id.toString() },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '1d' },
    );
    user.refreshTokens = user.refreshTokens.concat({ refreshToken });

    await user.save();

    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.send({ user, token });
  } catch (e) {
    res.status(400).send(e);
  }
});
router.post('/users/logout', auth, async (req, res) => {
  try {
    req.user.refreshTokens = req.user.refreshTokens.filter(
      ({ refreshToken }) => refreshToken.token !== req.refreshToken);
    req.user.tokens = req.user.tokens.filter(({ token }) => token.token !== req.token);
    await req.user.save();
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
    res.send();
  } catch (e) {
    res.status(500).send();
  }
});

router.post('/users/logoutAll', auth, async (req, res) => {
  try {
    req.user.tokens = [];
    req.user.refreshTokens = [];
    await req.user.save();
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
    res.send();
  } catch (e) {
    res.status(500).send();
  }
});

router.get('/users/me', auth, async (req, res) => {
  res.send(req.user);
});

router.patch('/users/me', auth, async (req, res) => {
  const updatesKey = Object.keys(req.body);
  const test = (updates) => {
    updates.map(update => {
      if (req.body[update] === '') {
        updates.splice(updates.indexOf(update), 1);
      }
    });
  };
  test(updatesKey);
  const allowUpdates = ['name', 'email', 'password', 'bio', 'url'];
  const isValidOperation = updatesKey.every(update => allowUpdates.includes(update));
  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates' });
  }
  try {
    updatesKey.forEach(update => (req.user[update] = req.body[update]));
    await req.user.save();
    res.send(req.user);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.delete('/users/me', auth, async (req, res) => {
  try {
    await req.user.remove();
    res.send(req.user);
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
const upload = multer({
  storage,
  limits: {
    fileSize: 1048576,
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jepg|png)$/)) {
      return cb(new Error('Please upload an image'));
    }
    cb(undefined, true);
  },
});

router.post(
  '/users/me/avatar',
  auth,
  upload.single('avatar'),
  async (req, res) => {
    const fName = req.file.originalname.split('.')[0];
    const { path } = req.file;
    const uploadResponse = await cloudinary.uploader.upload(path, {
      public_id: `conduit/${fName}`,
      chunk_size: 6000000,
    });
    req.user.url = uploadResponse.public_id;
    await req.user.save();
    res.send();
  },
  (error, req, res) => {
    res.status(400).send({ error: error.message });
  },
);

router.delete('/users/me/avatar', auth, async (req, res) => {
  req.user.avatar = undefined;
  await req.user.save();
  res.send();
});

router.get('/users/me/avatar', auth, async (req, res) => {
  try {
    if (req.user.avatar === undefined) {
      throw new Error();
    }
    res.set('Content-type', 'image/png');
    res.send(req.user.avatar);
  } catch (error) {
    res.status(404).send('Avatar not found');
  }
});
router.get('/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ name: username });
    if (!user) {
      throw new Error();
    }
    res.send(user);
  } catch (e) {
    res.status(404).send('user not found');
  }
});
router.post('/users/:username/follow', auth, async (req, res) => {
  try {
    const name = req.params.username;
    const user = await User.findOne({ name });
    if (!user.followers.includes(req.user._id)) {
      user.followers.push(req.user._id);
      req.user.followings.push(user._id);
      await user.save();
      await req.user.save();

      res.status(200).send(req.user);
    } else {
      user.followers.splice(user.followers.indexOf(req.user._id), 1);
      req.user.followings.splice(user.followings.indexOf(user._id), 1);

      await user.save();
      await req.user.save();

      res.status(200).send(req.user);
    }
  } catch (error) {
    res.status(403).send('Can\'t follow');
  }
});
module.exports = router;
