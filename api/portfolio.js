import {
  reqId, log, defaultKoiosUrl, koiosPost,
  fetchAssetInfo,
} from '../lib/koios.js';

const KNOWN_DEX_LP = [
  { policyId: 'f5808c2c990d86da54bfc97d89cee6efa20cd8461616359478d96b4c', dex: 'Minswap V2', label: 'Minswap LP' },
];

const KNOWN_PROTOCOL_TOKENS = [
  { policyId: 'f66d78b4a3cb3d37afa0ec36461e51ecbdee8aa51e95f0e8fc1e97fe', ticker: 'iUSD', name: 'Indigo iUSD' },
  { policyId: '8f1ef40c87b12a45c597534fd7d5c5bd41697b04693a557e59c7253', ticker: 'iBTC', name: 'Indigo iBTC' },
  { policyId: '8a1cfae21368b8bebbbedf0bebb45e7a8c7c8f0b3e5f8f0b3e5f8a1c', ticker: 'DJED', name: 'Djed' },
  { policyId: '8a1cfae21368b8bebbbedf0bebb45e7a8c7c8f0b3e5f8f0b3e5f8a1d', ticker: 'SHEN', name: 'Shen' },
  { policyId: '3ea87a72bd3b5e3623fdc265a6cb0e04c19a84a6fa6d7e1234567890', ticker: 'LQ', name: 'Liqwid LQ' },
];

async function fetchAdaBalance(stakeAddresses, addresses, koiosUrl, id) {
  if (Array.isArray(stakeAddresses) && stakeAddresses.length > 0) {
    const result = await koiosPost(`${koiosUrl}/account_info`, {
      _stake_addresses: stakeAddresses,
    }, id);
    if (Array.isArray(result) && result.length > 0) {
      let total = 0n;
      for (const acct of result) {
        const bal = acct.balance || acct.total_balance || '0';
        total += BigInt(bal);
      }
      if (total > 0n) return total.toString();
    }
  }
  if (Array.isArray(addresses) && addresses.length > 0) {
    const BATCH_SIZE = 50;
    let total = 0n;
    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
      const batch = addresses.slice(i, i + BATCH_SIZE);
      const result = await koiosPost(`${koiosUrl}/address_info`, {
        _addresses: batch,
      }, id);
      if (Array.isArray(result)) {
        for (const entry of result) {
          total += BigInt(entry.balance || '0');
        }
      }
    }
    return total.toString();
  }
  return '0';
}

function detectLpInfo(policyId, assetName) {
  const known = KNOWN_DEX_LP.find(d => d.policyId === policyId);
  if (!known) return null;
  return { dex: known.dex, label: known.label, poolKey: (policyId + (assetName || '')).toLowerCase() };
}

function detectProtocolToken(policyId) {
  return KNOWN_PROTOCOL_TOKENS.find(t => t.policyId === policyId) || null;
}

function tokenPriceKey(policyId, assetName) {
  return ((policyId || '') + (assetName || '')).toLowerCase();
}


async function fetchMinswapData() {
  const id = 'mp-' + reqId();

  // Prices from Assets Metrics endpoint (direct price per token)
  const priceMap = {};
  try {
    const resp = await fetch(
      'https://api-mainnet-prod.minswap.org/v1/assets/metrics',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: 100,
          sort_field: 'liquidity',
          sort_direction: 'desc',
          only_verified: false,
        }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (resp.ok) {
      const json = await resp.json();
      const metrics = json.asset_metrics || [];
      log(id, 'assets', { count: metrics.length });
      for (const m of metrics) {
        const asset = m.asset || {};
        const policy = asset.currency_symbol || '';
        const name = asset.token_name || '';
        if (policy && m.price != null && m.liquidity != null) {
          priceMap[tokenPriceKey(policy, name)] = m.price;
        }
      }
    } else {
      log(id, 'prices-fail', { status: resp.status });
    }
  } catch (e) {
    log(id, 'prices-error', { msg: e.message });
  }

  // LP pool data from Pools Metrics endpoint
  const lpMap = {};
  try {
    const resp = await fetch(
      'https://api-mainnet-prod.minswap.org/v1/pools/metrics',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100, sort_field: 'liquidity' }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (resp.ok) {
      const json = await resp.json();
      const poolArr = json.pool_metrics || [];
      log(id, 'pools', { count: poolArr.length });
      for (const pool of poolArr) {
        const poolId = (pool.lp_asset && pool.lp_asset.token_name) || '';
        if (poolId) {
          const lpKey = (KNOWN_DEX_LP[0].policyId + poolId).toLowerCase();
          lpMap[lpKey] = { poolId, tvlAda: pool.liquidity_currency || 0 };
        }
      }
    }
  } catch (e) {
    log(id, 'lp-error', { msg: e.message });
  }

  log(id, 'summary', { prices: Object.keys(priceMap).length, lp: Object.keys(lpMap).length });
  return { priceMap, lpMap };
}

async function fetchAssetMeta(policyId, assetName) {
  const network = process.env.BLOCKFROST_NETWORK || 'mainnet';
  const url = process.env.KOIOS_API_URL || defaultKoiosUrl(network);
  const info = await fetchAssetInfo(policyId, assetName, url);
  if (!info) return {};
  return { name: info.name, image: info.image, ticker: info.ticker, decimals: info.decimals, totalSupply: info.supply };
}

function calculateLpValue(lpData, lpBalance, totalLPSupply) {
  if (!lpData) return null;
  if (totalLPSupply && BigInt(totalLPSupply) > 0n) {
    try {
      const totalLP = BigInt(totalLPSupply);
      const tvl = lpData.tvlAda || 0;
      if (totalLP <= 0n || tvl <= 0) return null;
      const lpShare = Number(BigInt(lpBalance)) / Number(totalLP);
      return lpShare * tvl;
    } catch {
      return null;
    }
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = 'pf-' + reqId();
  log(id, 'start', {});

  try {
    const { addresses, stakeAddresses } = req.body;
    if ((!stakeAddresses || !Array.isArray(stakeAddresses) || stakeAddresses.length === 0) &&
        (!addresses || !Array.isArray(addresses) || addresses.length === 0)) {
      return res.status(400).json({ error: 'stakeAddresses or addresses required' });
    }

    const network = process.env.BLOCKFROST_NETWORK || 'mainnet';
    const koiosUrl = process.env.KOIOS_API_URL || defaultKoiosUrl(network);

    const [adaBalance, { priceMap, lpMap }] = await Promise.all([
      fetchAdaBalance(stakeAddresses, addresses, koiosUrl, id),
      fetchMinswapData(),
    ]);

    log(id, 'prices-status', { priceCount: Object.keys(priceMap).length, lpCount: Object.keys(lpMap).length, priceSample: Object.keys(priceMap).slice(0, 3) });

    const adaInAda = Number(adaBalance) / 1e6;

    let tokens = [], lpPositions = [];
    const assetsResult = await koiosPost(`${koiosUrl}/account_assets`, {
      _stake_addresses: stakeAddresses,
    }, id);

    if (Array.isArray(assetsResult)) {
      const raw = assetsResult.filter(a => a.quantity && BigInt(a.quantity) > 0n);
      const unique = {};
      for (const a of raw) {
        const key = a.fingerprint || (a.policy_id + (a.asset_name || ''));
        if (!unique[key]) {
          unique[key] = { policyId: a.policy_id, assetName: a.asset_name || '', fingerprint: a.fingerprint, quantity: '0' };
        }
        unique[key].quantity = (BigInt(unique[key].quantity) + BigInt(a.quantity)).toString();
      }
      const entries = Object.values(unique);
      log(id, 'unique-tokens', { count: entries.length, policies: entries.map(e => e.policyId + '.' + (e.assetName || '').slice(0, 12) + '..') });

      const metaResults = await Promise.all(
        entries.map(e => fetchAssetMeta(e.policyId, e.assetName).catch(() => null))
      );

      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const meta = metaResults[i] || {};
        const rawQty = BigInt(e.quantity);
        const decimals = meta.decimals != null ? meta.decimals : 0;
        const divisor = BigInt(10) ** BigInt(decimals);
        const displayQty = divisor > 0n && rawQty >= divisor
          ? (Number(rawQty) / Number(divisor)).toLocaleString(undefined, { maximumFractionDigits: decimals || 6 })
          : rawQty.toString();

        const pKey = tokenPriceKey(e.policyId, e.assetName);
        const priceInAda = priceMap[pKey] || null;
        const wholeAmt = Number(rawQty) / Math.pow(10, decimals);
        const valueAda = priceInAda != null ? wholeAmt * priceInAda : null;
        const valueAdaFormatted = valueAda != null
          ? valueAda.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : null;

        const token = {
          policyId: e.policyId,
          assetName: e.assetName,
          fingerprint: e.fingerprint,
          quantity: e.quantity,
          displayQty,
          decimals,
          name: meta.name || null,
          ticker: meta.ticker || null,
          image: meta.image || null,
          priceInAda,
          valueAda: valueAda != null ? Math.round(valueAda * 100) / 100 : null,
          valueAdaFormatted,
        };

        const lpInfo = detectLpInfo(e.policyId, e.assetName);
        if (lpInfo) {
          let lpValue = null;
          if (lpInfo.dex === 'Minswap V2') {
            const lpData = lpMap[lpInfo.poolKey] || null;
            lpValue = calculateLpValue(lpData, e.quantity, meta.totalSupply);
          }
          token.lpInfo = lpInfo;
          token.lpValueAda = lpValue;
          token.lpValueFormatted = lpValue != null
            ? lpValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : null;
          lpPositions.push(token);
        } else {
          const proto = detectProtocolToken(e.policyId);
          if (proto) {
            token.protocolToken = proto;
            if (!token.ticker) token.ticker = proto.ticker;
            if (!token.name) token.name = proto.name;
          }
          tokens.push(token);
        }
      }

      tokens.sort((a, b) => (b.valueAda || 0) - (a.valueAda || 0));
      lpPositions.sort((a, b) => (b.lpValueAda || 0) - (a.lpValueAda || 0));
    }

    const tokenTotal = tokens.reduce((s, t) => s + (t.valueAda || 0), 0);
    const lpTotal = lpPositions.reduce((s, t) => s + (t.lpValueAda || 0), 0);
    const netWorthAda = Math.round((adaInAda + tokenTotal + lpTotal) * 100) / 100;
    const netWorthFormatted = netWorthAda.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    log(id, 'done', { ada: adaBalance, tokens: tokens.length, lp: lpPositions.length, netWorth: netWorthFormatted });
    return res.json({
      adaBalance,
      adaInAda: Math.round(adaInAda * 100) / 100,
      tokens,
      lpPositions,
      netWorthAda,
      netWorthFormatted,
      pricesUpdatedAt: priceMap && Object.keys(priceMap).length > 0 ? new Date().toISOString() : null,
    });
  } catch (error) {
    log('pf-err', 'catch', { msg: error.message });
    return res.status(500).json({ error: error.message });
  }
}
