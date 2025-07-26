// index.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const candleRoutes = require('./getCandelChart'); 
const rsiRoutes = require('./getRSIData');
const { getLoginUrl, fetchAndStoreAccessToken } = require('./auth/authenticator');

app.use(express.json());

// Route modules for candle & RSI
app.use('/candle', candleRoutes);     
app.use('/rsi', rsiRoutes);          

// OAuth login redirection
app.get('/auth', (req, res) => {
  res.redirect(getLoginUrl());
});

// OAuth callback
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing authorization code');

  try {
    const token = await fetchAndStoreAccessToken(code);
    res.json({ status: 'success', token });
  } catch (err) {
    console.error('Token exchange failed:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Optional root route — redirects to login
app.get('/', (req, res) => {
  res.redirect(getLoginUrl());
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
