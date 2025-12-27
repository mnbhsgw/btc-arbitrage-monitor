function feeAdjustedBuy(price, feeRate) {
  if (price == null) return null;
  return price * (1 + feeRate);
}

function feeAdjustedSell(price, feeRate) {
  if (price == null) return null;
  return price * (1 - feeRate);
}

function profitRate(buyNet, sellNet) {
  if (buyNet == null || sellNet == null) return null;
  return (sellNet - buyNet) / buyNet;
}

function buildOpportunities(quotes, minProfitRate, limit) {
  const opportunities = [];
  for (const buy of quotes) {
    for (const sell of quotes) {
      if (buy.id === sell.id) continue;
      if (buy.feeAdjustedBuy == null || sell.feeAdjustedSell == null) continue;
      const rate = profitRate(buy.feeAdjustedBuy, sell.feeAdjustedSell);
      if (rate == null) continue;
      if (rate >= minProfitRate) {
        opportunities.push({
          buyExchange: buy.id,
          sellExchange: sell.id,
          profitRate: rate,
          feeAdjustedBuy: buy.feeAdjustedBuy,
          feeAdjustedSell: sell.feeAdjustedSell,
          priceSpread: sell.feeAdjustedSell - buy.feeAdjustedBuy
        });
      }
    }
  }

  opportunities.sort((a, b) => b.profitRate - a.profitRate);
  return opportunities.slice(0, limit);
}

module.exports = {
  feeAdjustedBuy,
  feeAdjustedSell,
  profitRate,
  buildOpportunities
};
