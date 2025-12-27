const { fetchJson } = require('./common');

const ID = 'bitbank';
const URL = 'https://public.bitbank.cc/btc_jpy/ticker';

async function fetchQuote(timeoutMs) {
  const data = await fetchJson(URL, timeoutMs);
  const bestBid = Number(data?.data?.buy);
  const bestAsk = Number(data?.data?.sell);
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
