const axios = require('axios');
const tokenStore = require('../cache/tokenStore');


/**
 * Get all option contracts (expired and current) for an underlying up to a max expiry date.
 * @param {string} maxExpiryDate - e.g., "2025-08-01"
 * @param {string} underlyingKey - e.g., "NSE_INDEX|NIFTY"
 * @returns {Promise<Array<Object>>}
 */

function parseYYYYMMDD(dateStr) {
  const [year, month, day] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}
function formatDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0'); // months are 0-based
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}


async function getOptionsData(startDate,maxExpiryDate, underlyingKey) {
    const minDate = parseYYYYMMDD(startDate);
    const maxExpiry = parseYYYYMMDD(maxExpiryDate);
    const allContracts = [];
    const accessToken = tokenStore.getToken();
    const headers= {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
    }
    try {
        // 1. Get all expiry dates for the underlying
        let encodedUnderlyingKey = encodeURIComponent(underlyingKey)
        let endPoint = `https://api.upstox.com/v2/expired-instruments/expiries?instrument_key=${encodedUnderlyingKey}`
        let expiryRes = await axios.get(endPoint, { headers })
        const expiryDates = expiryRes.data.data||[];
        for(let dates of expiryDates){
            if(parseYYYYMMDD(dates)>maxExpiry||parseYYYYMMDD(dates)<minDate){
                continue
            }
            try {
                let url = `https://api.upstox.com/v2/expired-instruments/option/contract?instrument_key=${encodedUnderlyingKey}&expiry_date=${dates}`;
                const contractRes = await axios.get(url, { headers })
                
                // allContracts[contractRes.data?.data]={
                //     'underlyingKey':contractRes.data?.data?.underlying_key,
                //     'segment':contractRes.data?.data?.segment,
                //     'instrument_type':contractRes.data?.data?.instrument_type,
                //     'strike_price':contractRes.data?.data?.strike_price,
                //     'trading_symbol':contractRes.data?.data?.trading_symbol,
                //     'expiry':contractRes.data?.data?.expiry,
                //     'weekly':contractRes.data?.data?.weekly
                // }
                allContracts.push(...contractRes.data?.data)
                } 
            catch (innerErr) {
                console.warn(`Warning: failed to fetch contracts for expiry ${expiry}:`, innerErr.message);
            }
        }
        

        return allContracts;
    } catch (err) {
        console.error('Failed to fetch expiries or contracts:', err.message);
        throw err;
    }
}

module.exports = { getOptionsData };
