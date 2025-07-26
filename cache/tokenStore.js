if (!global.tokenStore) {
  let tokenData = {
    accessToken: null,
    refreshToken: null,
    expiresIn: null,
    timestamp: null
    };

  global.tokenStore = {
    setToken: (data) => {
      tokenData = {
            'accessToken':data?.access_token ,
            'refreshToken':data?.refreshToken,
            'expiresIn':data?.expiresIn,
            'timestamp': Date.now()
        };
    },
    getToken: () => tokenData.accessToken,
  };
}

module.exports = global.tokenStore;