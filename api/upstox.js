// api/upstox.js
const superagent = require('superagent');
const axios = require('axios');
const BASE_URL = 'https://api.upstox.com/v2/login/authorization/token';
const tokenStore = require('../cache/tokenStore');
/**
 * Makes a GET request to the Upstox API with the stored access token.
 * @param {string} endpoint - The full API path, e.g. '/v2/historical-candle/...'
 * @returns {Promise<Object>} - The response data from Upstox
 */

async function getAccessToken(opts) {
  const {
    code,
    clientId= process.env.CLIENT_ID,
    clientSecret= process.env.CLIENT_SECRET,
    redirectUri= process.env.REDIRECT_URI,
    grantType = 'authorization_code',
  } = opts;

  try {
    const response = await superagent
      .post(BASE_URL)
      .type('form') // required for x-www-form-urlencoded POST
      .send({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: grantType,
      });
    tokenStore.setToken(response.body);
    return response.body;
  } catch (error) {
    console.error('Error fetching access token from Upstox:', error.response?.body || error.message);
    throw error;
  }
}
function getStoredAccessToken() {
  const tokenData = tokenStore.getToken();
  if (!tokenData) {
    throw new Error('Access token not available');
  }
  return tokenData;
}
const upstoxGet = async (endpoint) => {
  const accessToken = getStoredAccessToken();

  if (!accessToken) {
    throw new Error('Access token not available');
  }

  const url = `https://api.upstox.com${endpoint}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        timeout: 10000,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Upstox API GET error:', error.response?.data || error.message);
    throw error;
  }
};
module.exports = {
  upstoxGet,
  getAccessToken,
  getStoredAccessToken
};
