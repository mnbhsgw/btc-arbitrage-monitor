const { fetchJson } = require('./common');

const ID = 'bitflyer';
const URL = 'https://api.bitflyer.com/v1/getticker?product_code=BTC_JPY';

async function fetchQuote(timeoutMs) {
  const data = await fetchJson(URL, timeoutMs);
  const bestBid = Number(data.best_bid);
  const bestAsk = Number(data.best_ask);
  if (!Number.isFinite(bestBid) || !Number.isFinite(bestAsk)) {
    throw new Error('Invalid price data');
  }
  return {
    id: ID,
    bestBid,
    bestAsk,
    lastUpdated: new Date().toISOString()
  };
}

module.exports = { fetchQuote };
