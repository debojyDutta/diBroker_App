const apiClient = require('../utils/apiClient');

const getProfile = async () => {
  const response = await apiClient.get('/user/profile');
  return response.data;
};

module.exports = { getProfile };
