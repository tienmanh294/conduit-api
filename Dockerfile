FROM --platform=linux/amd64 node:16

ENV PORT=80
ENV MONGODB_URL=mongodb://localhost:27017/conduit-local
ENV JWT_SECRET=thisisasecretformyapp
ENV ACCESS_TOKEN_SECRET=54cd5928c485d0cfd25e293ae97e4bff35f90e15796a38e2cea1473caeddc4c6940297a6b04d81b11332c12b21a38838843958f82527166edffaf470f009d591
ENV REFRESH_TOKEN_SECRET=a020411e0eb303a376aacee3b3f50e65719c0f0dbb92a3ecfa6acbd590694f02ac20485f49e0976298fadef9f916ad08f940f13ebba78b52fa346baa3c9a1690
ENV REACT_URL=http://manhdt.internship.designveloper.com

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "run", "dev"]