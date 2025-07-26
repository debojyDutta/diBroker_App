const express = require('express');
const router = express.Router();
const { upstoxGet } = require('../api/upstox');

function formatDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0'); // months are 0-based
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

router.get('/', async (req, res) => {
  const { symbol, interval, duration } = req.query;

  if (!symbol || !interval) {
    return res.status(400).json({ status: 'error', message: 'symbol and interval are required' });
  }

  try {
    const durationInMinutes = parseInt(duration) || 30; // Default to 30 minutes if not passed
    let endpoint = ''
    const encodedSymbol = encodeURIComponent(symbol)
    const today = new Date()
    const isWeekend = today.getDay() === 0 || today.getDay() === 6;
    if (isWeekend) {
      // Calculate previous week's Monday (day 1) and Friday (day 5)
      let interval = 5
      let unit = 'minutes'
      const todayDay = today.getDay(); // Sunday = 0, Saturday = 6
      const daysSinceMonday = todayDay; // Backtrack to previous Monday
      let startTime = new Date(today);
      startTime.setDate(today.getDate() - daysSinceMonday);
      let endTime = new Date(startTime);
      endTime.setDate(startTime.getDate() + 5); // Friday of the same week
      startTime  = formatDate(startTime)
      endTime  = formatDate(endTime)
      endpoint = `/v3/historical-candle/${encodedSymbol}/${unit}/${interval}/${endTime}/${startTime}`;
    } 
    else{
      const endTime = formatDate(new Date());
      const startTime = formatDate(new Date(new Date().getTime() - durationInMinutes * 60 * 1000));
      endpoint = `/v2/historical-candle/${encodedSymbol}/${interval}/${endTime}/${startTime}`;
    }
    const data = await upstoxGet(endpoint);
    res.json({ status: 'success', data });
  } catch (err) {
    console.error('Error fetching candle data:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
