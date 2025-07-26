function calculateRSI(closingPrices, period = 14) {
  if (closingPrices.length < period + 1) return [];

  const rsi = [];
  let gains = 0;
  let losses = 0;

  // Calculate initial averages
  for (let i = 1; i <= period; i++) {
    const change = closingPrices[i] - closingPrices[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi.push(100 - 100 / (1 + avgGain / avgLoss));

  // RSI calculation for rest
  for (let i = period + 1; i < closingPrices.length; i++) {
    const change = closingPrices[i] - closingPrices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const currentRSI = 100 - 100 / (1 + rs);
    rsi.push(currentRSI);
  }

  return rsi;
}

module.exports = calculateRSI;
