const express = require('express');
const router = express.Router();
const { upstoxGet } = require('../api/upstox');
const { getOptionsData } = require('../utils/getOptionsData');
const { writeMergedObjToCSV } = require('../utils/writeMergedObjToCSV');
const fs = require('fs');
const csv = require('csv-parser');

function getColumn(filePath, columnName) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        if (row[columnName]) {
          results.push(row[columnName]);
        }
      })
      .on('end', () => {
        resolve(results);  // return list
      })
      .on('error', reject);
  });
}

function getLastLastSaturday(date = new Date()) {
  const day = date.getDay(); // 0=Sun, 6=Sat
  const diff = (day >= 6) ? day - 6 : day + 1;
  const lastSaturday = new Date(date);
  lastSaturday.setDate(date.getDate() - diff-7);
  return lastSaturday;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseYYYYMMDD(dateStr) {
  try{
  const [ year, month,day] = dateStr.split(/\/|-/).map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
  }
  catch(err){
    console.log(err)
  }
  
}

// ISO Week Number (Week starts on Monday)
function getWeekNumber(date) {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  const weekNumber = 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return weekNumber;
}

function getAllSaturdaysWithWeekNumbers(startDateStr, endDateStr) {
  const startDate = parseYYYYMMDD(startDateStr);
  const endDate = parseYYYYMMDD(endDateStr);
  const result = {};

  // Start from the first Saturday on or after the startDate
  const current = new Date(startDate);
  const day = current.getDay();
  const diffToSaturday = (6 - day + 7) % 7;
  current.setDate(current.getDate() + diffToSaturday);

  while (current <= endDate) {
    result[getWeekNumber(current)]={
      'date': new Date(current)
    }
    current.setDate(current.getDate() + 7); // move to next Saturday
  }

  return result;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// simple rate limiter: ensures max 50 requests/sec (~20ms gap)
async function rateLimitedRequest(fn) {
  await sleep(20); 
  return fn();
}

async function calendarDataProcessor(symbol, startTime, endTime, instrument_type = 'Index') { 
  const encodedSymbol = encodeURIComponent(symbol);
  let resultsData = getAllSaturdaysWithWeekNumbers(startTime, endTime);

  const weekPromises = Object.keys(resultsData).map(async (week) => {
    const today = resultsData[week].date;
    const interval = 5;
    const unit = 'minutes';

    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay()); // Monday
    const end = new Date(start);
    end.setDate(start.getDate() + 5); // Friday

    const formattedStart = formatDate(start);
    const formattedEnd = formatDate(end);

    const endpoint = `/v3/historical-candle/${encodedSymbol}/${unit}/${interval}/${formattedEnd}/${formattedStart}`;

    // enforce rate limit here
    const weeklyData = await rateLimitedRequest(() => upstoxGet(endpoint));
    
    let strike_price = 0;
    if (weeklyData?.data?.candles?.length > 0) {
      const formattedCandles = weeklyData.data.candles.map(([Timestamp, Open, High, Low, Close, Volume, OpenInterest]) => ({
        Timestamp, Open, High, Low, Close, Volume, OpenInterest, symbol, strike_price, instrument_type
      }));
      return { week, data: formattedCandles };
    }
    return null; // Skip weeks with no data
  });

  const weeklyResults = await Promise.all(weekPromises);

  const finalResults = {};
  for (const result of weeklyResults) {
    if (result) {
      finalResults[result.week] = result.data;
    }
  }

  return finalResults;
}

async function calendarDataProcessorOptions(symbol, startTime, endTime, strike_price, instrument_type, finalData) {
  const resultsData = getAllSaturdaysWithWeekNumbers(startTime, endTime);

  const weekPromises = Object.keys(resultsData).map(async (week) => {
    const today = resultsData[week].date;
    const interval = 5;
    const unit = 'minute';

    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay()); // Monday
    const end = new Date(start);
    end.setDate(start.getDate() + 5); // Friday

    const formattedStart = formatDate(start);
    const formattedEnd = formatDate(end);

    if (formattedStart > formattedEnd) return null;

    const endpoint = `/v2/expired-instruments/historical-candle/${symbol}/${interval}${unit}/${formattedEnd}/${formattedStart}`;
    const weeklyData = await upstoxGet(endpoint);

    await delay(300); // optional, if API throttles
    if (weeklyData?.data?.candles?.length > 0) {
      const formattedCandles = weeklyData.data.candles.map(([Timestamp, Open, High, Low, Close, Volume, OpenInterest]) => ({
        Timestamp, Open, High, Low, Close, Volume, OpenInterest, symbol, strike_price, instrument_type
      }));
      return { week, data: formattedCandles };
    }
    return null;
  });

  const weeklyResults = await Promise.all(weekPromises);
  await delay(70); // optional, if API throttles
  for (const result of weeklyResults) {
    if (result) {
      if (Object.keys(finalData).includes(result.week)) {
        finalData[result.week].push(...result.data);
      } else {
        finalData[result.week] = result.data;
      }
    }
  }

  return finalData;
}



function formatDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0'); // months are 0-based
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

router.post('/', async (req, res) => {
  const symbol = req.body.symbol;
  const startTime = req.body.startTime;
  let endTime = req.body.endTime;

  if (!symbol) {
    return res.status(400).json({ status: 'error', message: 'symbol and interval are required' });
  }
  let mergedObj = {};
  try {
    //At upstox there is archival delay of one week for options so tosync all timeStamps
    //adding a lag of 1 week here as well
    const maxEndDate = getLastLastSaturday()
    endTime = (parseYYYYMMDD(endTime) < maxEndDate) ? endTime : formatDate(maxEndDate);
    let finalData = await calendarDataProcessor(symbol,startTime,endTime)
    Object.assign(mergedObj,finalData)
    if(symbol == "NSE_INDEX|Nifty 50"){
      const symbols = await getColumn('.\\ind_nifty50list.csv', 'ISIN Code');
      for(let symbolConstituent of symbols){
        let nwSymbol = `NSE_EQ|${symbolConstituent}`
        let constituentData = await calendarDataProcessor(nwSymbol,startTime,endTime,'N50_CONS')
        for (const week of Object.keys(constituentData)) {
          if (week) {
            if (Object.keys(mergedObj).includes(week)) {
              mergedObj[week].push(...constituentData[week]);
            } else {
              mergedObj[week] = constituentData[week];
            }
          }
        }
      }
      const symbolsIdx = await getColumn('.\\exteraIndices.csv', 'Symbol');
      for(let symbolConstituent of symbolsIdx){
        let nwSymbol = `NSE_INDEX|${symbolConstituent}`
        let constituentData = await calendarDataProcessor(nwSymbol,startTime,endTime,'EXT')
        for (const week of Object.keys(constituentData)) {
          if (week) {
            if (Object.keys(mergedObj).includes(week)) {
              mergedObj[week].push(...constituentData[week]);
            } else {
              mergedObj[week] = constituentData[week];
            }
          }
        }
      }
    }
    const options = await getOptionsData(startTime,endTime,symbol)
    let optionIds ={}
    options.forEach(element => {
      if(element.instrument_key.trim().length>0){
        let expInstKey = element.instrument_key
        if(!Object.keys(optionIds).includes(expInstKey)){
          optionIds[expInstKey]={
            'expiry': element?.expiry,
            'strike_price':element?.strike_price,
            'instrument_type':element?.instrument_type
          }
        }
      }
    });
    for (const row of Object.keys(optionIds)) {
      const expiry = optionIds[row]?.expiry
      const strike_price = optionIds[row]?.strike_price
      const instrument_type = optionIds[row]?.instrument_type
      mergedObj = await calendarDataProcessorOptions(row,startTime,expiry,strike_price,instrument_type,mergedObj)
    }
    const csvPath = writeMergedObjToCSV(mergedObj);
    res.json({ status: 'success', csvPath });
  } catch (err) {
    console.error('Error fetching candle data:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
