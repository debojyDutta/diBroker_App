const axios = require('axios');
const tokenStore = require('../cache/tokenStore');
const { refreshAccessToken } = require('../auth/authenticator');

const apiClient = axios.create({
  baseURL: 'https://api.upstox.com/v2/',
});

apiClient.interceptors.request.use(async (config) => {
  let { access_token } = tokenStore.getTokens();

  if (!access_token) {
    access_token = await refreshAccessToken();
  }

  config.headers['Authorization'] = `Bearer ${access_token}`;
  return config;
});

module.exports = apiClient;
