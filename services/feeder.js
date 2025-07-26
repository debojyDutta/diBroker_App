const { getCandles } = require('../api/upstox');
const { calculateRSI } = require('../indicators/rsi');

const sleep = (ms) => new Promise(res => setTimeout(res, ms));
function formatDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0'); // months are 0-based
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
async function startFeeding({ symbol, interval, durationHours }) {
  const endTime = Date.now() + durationHours * 60 * 60 * 1000;

  while (Date.now() < endTime) {
    const now = new Date();
    const from = formatDate(new Date(now - 20 * 60 * 1000)); // 20 min back
    const to = formatDate(now);

    try {
      if (!symbol || !interval) {
        return res.status(400).json({ status: 'error', message: 'Missing symbol or interval' });
      }

      // URL encode if symbol has spaces or pipes
      const encodedSymbol = encodeURIComponent(symbol);
      const encodedInterval = encodeURIComponent(interval);
      const candleData = await getCandles(encodedSymbol, encodedInterval, from, to);
      const rsi = calculateRSI(candleData);
      console.log(`[${now.toISOString()}] RSI: ${rsi}`);
    } catch (err) {
      console.error('Error fetching data:', err.message);
    }

    await sleep(60 * 1000); // Wait 1 min
  }

  console.log('Finished data feeding.');
}

module.exports = { startFeeding };
