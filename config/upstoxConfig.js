// config/upstoxConfig.js
require('dotenv').config();
const path = require('path');
const dotenv = require('dotenv');

// Load .env from root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  redirect_uri: process.env.REDIRECT_URI,
  BASE_URL: 'https://api.upstox.com/v2',
};
