const path = require('path');
const fs = require('fs');
const express = require('express');
const { feeAdjustedBuy, feeAdjustedSell, buildOpportunities } = require('./core/calc');

const bitflyer = require('./exchanges/bitflyer');
const coincheck = require('./exchanges/coincheck');
const bitbank = require('./exchanges/bitbank');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'config.json');
const PORT = process.env.PORT || 3000;
const REQUEST_TIMEOUT_MS = 4000;

function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw);
}

const exchangeClients = {
  bitflyer,
  coincheck,
  bitbank
};

async function fetchAllQuotes(config) {
  const enabled = config.exchanges.filter((ex) => ex.enabled);
  const tasks = enabled.map(async (ex) => {
    const client = exchangeClients[ex.id];
    if (!client) {
      return {
        id: ex.id,
        status: 'error',
        bestBid: null,
        bestAsk: null,
        feeAdjustedBuy: null,
        feeAdjustedSell: null,
        lastUpdated: null,
        errorMessage: 'Unknown exchange id'
      };
    }

    try {
      const quote = await client.fetchQuote(REQUEST_TIMEOUT_MS);
      const feeBuy = feeAdjustedBuy(quote.bestAsk, ex.feeRate);
      const feeSell = feeAdjustedSell(quote.bestBid, ex.feeRate);
      return {
        id: ex.id,
        status: 'ok',
        bestBid: quote.bestBid,
        bestAsk: quote.bestAsk,
        feeAdjustedBuy: feeBuy,
        feeAdjustedSell: feeSell,
        lastUpdated: quote.lastUpdated,
        errorMessage: null
      };
    } catch (err) {
      return {
        id: ex.id,
        status: 'error',
        bestBid: null,
        bestAsk: null,
        feeAdjustedBuy: null,
        feeAdjustedSell: null,
        lastUpdated: null,
        errorMessage: err?.message || 'Fetch failed'
      };
    }
  });

  return Promise.all(tasks);
}

async function buildOverview() {
  const config = loadConfig();
  const quotes = await fetchAllQuotes(config);
  const okQuotes = quotes.filter((q) => q.status === 'ok');
  const opportunities = buildOpportunities(
    okQuotes.map((q) => ({
      id: q.id,
      feeAdjustedBuy: q.feeAdjustedBuy,
      feeAdjustedSell: q.feeAdjustedSell
    })),
    config.minProfitRate,
    5
  );

  const overallStatus = quotes.every((q) => q.status === 'ok')
    ? 'ok'
    : 'partial_error';

  return {
    timestamp: new Date().toISOString(),
    overallStatus,
    exchanges: quotes,
    opportunities
  };
}

const app = express();
app.use(express.static(path.join(__dirname, '..', 'web')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/overview', async (req, res) => {
  try {
    const overview = await buildOverview();
    res.json(overview);
  } catch (err) {
    res.status(500).json({
      error: 'overview_failed',
      message: err?.message || 'Unknown error'
    });
  }
});

app.get('/api/quotes', async (req, res) => {
  try {
    const overview = await buildOverview();
    res.json({
      timestamp: overview.timestamp,
      exchanges: overview.exchanges
    });
  } catch (err) {
    res.status(500).json({
      error: 'quotes_failed',
      message: err?.message || 'Unknown error'
    });
  }
});

app.get('/api/opportunities', async (req, res) => {
  try {
    const overview = await buildOverview();
    res.json({
      timestamp: overview.timestamp,
      opportunities: overview.opportunities
    });
  } catch (err) {
    res.status(500).json({
      error: 'opportunities_failed',
      message: err?.message || 'Unknown error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
