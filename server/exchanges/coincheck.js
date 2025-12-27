const { fetchJson } = require('./common');

const ID = 'coincheck';
const URL = 'https://coincheck.com/api/ticker';

async function fetchQuote(timeoutMs) {
  const data = await fetchJson(URL, timeoutMs);
  const bestBid = Number(data.bid);
  const bestAsk = Number(data.ask);
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
