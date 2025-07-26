// auth/authenticator.js
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const API_HOST = 'https://api.upstox.com/v2';
const LOGIN_URL = `${API_HOST}/login/authorization/dialog`;
const TOKEN_URL = `${API_HOST}/login/authorization/token`;
const loginApi = require('../api/upstox'); 

function getLoginUrl() {
  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI,
    response_type: 'code'
  });
  return `${LOGIN_URL}?${params.toString()}`;
}

async function fetchAndStoreAccessToken(code) {
  try {
    const body = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uri: process.env.REDIRECT_URI,
      grant_type: 'authorization_code',
      code
    });
    const opts = {
    grant_type: 'authorization_code',
    code: code,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI
  };

    const tokenResponse = await loginApi.getAccessToken(opts);
    const tokenData = tokenResponse;
    if (!tokenData.access_token) {
      throw new Error('Upstox did not return access_token');
    }

    
    return tokenData;

  } catch (err) {
    console.error('Error fetching access token:', err.response?.data || err.message);
    throw err;
  }
}

function getAccessToken() {
}

module.exports = {
  getLoginUrl,
  fetchAndStoreAccessToken,
  getAccessToken, 
};
