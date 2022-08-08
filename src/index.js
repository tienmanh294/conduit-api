const express = require('express');
require('./db/mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const articleRouter = require('./router/article');
const articlesRouter = require('./router/articles');
const userRouter = require('./router/user');
const commentRouter = require('./router/comment');

const app = express();
const port = process.env.PORT;

app.use(cors({ credentials: true, origin: process.env.REACT_URL }));
app.use(express.json());
app.use(cookieParser());
app.use(userRouter);
app.use(articleRouter);
app.use(commentRouter);
app.use(articlesRouter);

app.listen(port, () => {
});
