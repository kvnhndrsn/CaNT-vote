const reqId = () => Math.random().toString(36).slice(2, 8);

function log(id, step, data) {
  console.log(JSON.stringify({ reqId: id, step, ...data }));
}

function defaultKoiosUrl(network) {
  switch (network) {
    case 'preprod': return 'https://preprod.koios.rest/api/v1';
    case 'preview': return 'https://preview.koios.rest/api/v1';
    case 'sanchonet': return 'https://sancho.koios.rest/api/v1';
    default: return 'https://api.koios.rest/api/v1';
  }
}

async function koiosPost(url, body, id) {
  log(id, 'req', { url: url.slice(0, 60) + '..', bodyPreview: JSON.stringify(body).slice(0, 120) });
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  log(id, 'resp', { status: resp.status, ok: resp.ok });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    log(id, 'err-body', { text: text.slice(0, 300) });
    return null;
  }
  const json = await resp.json();
  log(id, 'data', { isArray: Array.isArray(json), length: Array.isArray(json) ? json.length : typeof json });
  return json;
}

function ipfsToHttp(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('ipfs://')) return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  return url;
}

function extractAssetMeta(metadata) {
  if (!metadata || typeof metadata !== 'object') return { name: null, image: null };
  const cip25 = metadata['721'];
  if (cip25 && typeof cip25 === 'object') {
    for (const policyId of Object.keys(cip25)) {
      const policy = cip25[policyId];
      if (policy && typeof policy === 'object') {
        const keys = Object.keys(policy);
        if (keys.length > 0) {
          const entry = policy[keys[0]];
          if (entry && typeof entry === 'object') {
            return {
              name: typeof entry.name === 'string' ? entry.name : null,
              image: typeof entry.image === 'string' ? ipfsToHttp(entry.image) : null,
            };
          }
        }
      }
    }
  }
  return { name: null, image: null };
}

async function fetchTokenRegistryAsset(assetPolicy, assetName) {
  const id = 'reg-' + reqId();
  if (!assetPolicy || !assetName) return null;
  const subject = (assetPolicy + assetName).toLowerCase();
  try {
    log(id, 'fetch', { subject: subject.slice(0, 24) + '...' });
    const resp = await fetch(`https://tokens.cardano.org/metadata/${subject}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    log(id, 'got', { name: data.name?.value, ticker: data.ticker?.value, decimals: data.decimals?.value });
    return {
      name: data.name?.value || null,
      ticker: data.ticker?.value || null,
      decimals: data.decimals?.value != null ? Number(data.decimals.value) : null,
      logo: data.logo?.value ? `data:image/png;base64,${data.logo.value}` : null,
    };
  } catch (e) {
    log(id, 'error', { msg: e.message });
    return null;
  }
}

async function fetchAssetMeta(policyId, assetName) {
  const id = 'meta-' + reqId();
  const network = process.env.BLOCKFROST_NETWORK || 'mainnet';
  const koiosUrl = process.env.KOIOS_API_URL || defaultKoiosUrl(network);
  let name = null, image = null, totalSupply = null;
  try {
    const result = await koiosPost(`${koiosUrl}/asset_info`, {
      _asset_policy: policyId,
      _asset_name: assetName || '',
    }, id);
    if (Array.isArray(result) && result.length > 0) {
      const info = result[0];
      const meta = extractAssetMeta(info.minting_tx_metadata);
      name = meta.name;
      image = meta.image;
      if (info.total_supply) totalSupply = info.total_supply;
    }
  } catch (e) {
    log(id, 'error', { msg: e.message });
  }
  let ticker = null, decimals = null;
  if (assetName) {
    const reg = await fetchTokenRegistryAsset(policyId, assetName);
    if (reg) {
      if (!name) name = reg.name;
      if (!ticker) ticker = reg.ticker;
      if (decimals == null) decimals = reg.decimals;
      if (!image) image = reg.logo;
    }
  }
  return { name, image, ticker, decimals, totalSupply };
}

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


async function fetchMinswapPools() {
  const id = 'mp-' + reqId();
  try {
    const resp = await fetch(
      'https://api-mainnet-prod.minswap.org/v1/pools/metrics',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 1000, sort_field: 'liquidity' }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!resp.ok) {
      log(id, 'fetch-fail', { status: resp.status });
      return { pools: [], priceMap: {}, lpMap: {} };
    }
    const json = await resp.json();
    log(id, 'resp-keys', { topKeys: Object.keys(json) });
    const poolArr = json.pool_metrics || json.pools || json.data || [];
    log(id, 'pools', { count: poolArr.length });

    if (poolArr.length > 0) {
      const first = poolArr[0];
      log(id, 'pool-sample', { keys: Object.keys(first), type: first.type, id: (first.lp_asset || {}).token_name });
      log(id, 'pool-raw', { a: JSON.stringify(first.asset_a).slice(0, 100), b: JSON.stringify(first.asset_b).slice(0, 100), liq: first.liquidity_a, liqCur: first.liquidity_a_currency, lp: first.lp_asset });
    }

    const priceMap = {};
    const lpMap = {};

    for (const pool of poolArr) {
      try {
        const poolId = (pool.lp_asset && pool.lp_asset.token_name) || '';
        const assetA = pool.asset_a || {};
        const assetB = pool.asset_b || {};
        const policyA = assetA.currency_symbol || '';
        const nameA = assetA.token_name || '';
        const policyB = assetB.currency_symbol || '';
        const nameB = assetB.token_name || '';
        const reserveA = pool.liquidity_a || 0;
        const reserveB = pool.liquidity_b || 0;
        const adaValA = pool.liquidity_a_currency || 0;
        const adaValB = pool.liquidity_b_currency || 0;
        const tvlAda = pool.liquidity_currency || 0;

        if (reserveA <= 0 || reserveB <= 0) continue;

        const keyA = tokenPriceKey(policyA, nameA);
        const keyB = tokenPriceKey(policyB, nameB);
        const isAdaA = !policyA;
        const isAdaB = !policyB;

        if (isAdaB && !isAdaA) {
          priceMap[keyA] = reserveA > 0 ? adaValA / reserveA : null;
        } else if (isAdaA && !isAdaB) {
          priceMap[keyB] = reserveB > 0 ? adaValB / reserveB : null;
        } else if (!isAdaA && !isAdaB) {
          if (adaValA > 0 && reserveA > 0) priceMap[keyA] = adaValA / reserveA;
          if (adaValB > 0 && reserveB > 0) priceMap[keyB] = adaValB / reserveB;
        }

        if (poolId) {
          const lpKey = (KNOWN_DEX_LP[0].policyId + poolId).toLowerCase();
          lpMap[lpKey] = {
            poolId,
            tvlAda,
          };
        }
      } catch (e) {
        continue;
      }
    }

    log(id, 'prices', { tokens: Object.keys(priceMap).length, lpPools: Object.keys(lpMap).length });
    return { pools: poolArr, priceMap, lpMap };
  } catch (e) {
    log(id, 'error', { msg: e.message });
    return { pools: [], priceMap: {}, lpMap: {} };
  }
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
      fetchMinswapPools(),
    ]);

    log(id, 'prices-status', { priceCount: Object.keys(priceMap).length, lpCount: Object.keys(lpMap).length, sampleKeys: Object.keys(priceMap).slice(0, 5) });

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
      log(id, 'token-keys', { keys: entries.map(e => tokenPriceKey(e.policyId, e.assetName)) });

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
        if (priceInAda != null) {
          log(id, 'price-hit', { token: (e.fingerprint || '').slice(0, 14), pKey: pKey.slice(0, 20), price: priceInAda });
        }
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
