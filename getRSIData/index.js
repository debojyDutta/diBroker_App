const express = require('express');
const router = express.Router();
const { upstoxGet } = require('../api/upstox');
const calculateRSI = require('../indicators/rsi');

router.get('/', async (req, res) => {
  const { symbol, interval, duration, period = 14 } = req.query;

  if (!symbol || !interval || !duration) {
    return res.status(400).json({
      status: 'error',
      message: 'symbol, interval, and duration are required parameters',
    });
  }

  try {
    if (!symbol || !interval) {
      return res.status(400).json({ status: 'error', message: 'Missing symbol or interval' });
    }
    // URL encode if symbol has spaces or pipes
    const encodedSymbol = encodeURIComponent(symbol);
    const endpoint = `/v2/historical-candle/${encodedSymbol}/${interval}/${duration}`;
    const candleData = await upstoxGet(endpoint);

    const candles = candleData?.data?.candles;
    if (!candles || candles.length === 0) {
      return res.status(500).json({ status: 'error', message: 'No candle data available' });
    }

    const closingPrices = candles.map(c => c[4]); // Close price is at index 4
    const rsi = calculateRSI(closingPrices, parseInt(period));

    return res.json({
      status: 'success',
      data: {
        rsi,
        latest_rsi: rsi[rsi.length - 1],
      },
    });
  } catch (error) {
    console.error('RSI fetch error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to calculate RSI',
    });
  }
});

module.exports = router;
