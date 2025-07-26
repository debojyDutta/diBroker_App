// cache/tokenCache.js

let accessToken = null;

function setAccessToken(token) {
  accessToken = token;
}

function getAccessToken() {
  return accessToken;
}

module.exports = {
  setAccessToken,
  getAccessToken
};
