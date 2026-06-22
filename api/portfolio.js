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
  let name = null, image = null;
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
  return { name, image, ticker, decimals };
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

function parsePoolAsset(assetField) {
  if (!assetField || typeof assetField === 'string') {
    const str = assetField || '';
    if (str === 'lovelace' || str === '') return { policyId: null, assetName: null };
    const assetId = str.replace(/^0x/, '');
    if (assetId.length >= 56) {
      return { policyId: assetId.slice(0, 56), assetName: assetId.slice(56) || '' };
    }
    return { policyId: assetId, assetName: '' };
  }
  if (typeof assetField === 'object') {
    const policyId = assetField.policyId || assetField.policy_id || null;
    const assetName = assetField.assetName || assetField.asset_name || assetField.name || '';
    return { policyId: policyId || null, assetName: assetName || '' };
  }
  return { policyId: null, assetName: null };
}

async function fetchMinswapPools() {
  const id = 'mp-' + reqId();
  try {
    const resp = await fetch(
      'https://api.minswap.org/v2/pools?page=1&pageSize=1000',
      { signal: AbortSignal.timeout(15000) }
    );
    if (!resp.ok) {
      log(id, 'fetch-fail', { status: resp.status });
      return { pools: [], lpMap: {} };
    }
    const json = await resp.json();
    const poolArr = Array.isArray(json) ? json : (json.pools || json.data || []);
    log(id, 'pools', { count: poolArr.length });

    if (poolArr.length > 0) {
      const first = poolArr[0];
      log(id, 'pool-sample', { keys: Object.keys(first), id: first.id || first.poolId || '(missing)' });
    }

    const priceMap = {};
    const lpMap = {};

    for (const pool of poolArr) {
      try {
        const poolId = pool.id || pool.poolId || pool.pool_id || '';
        const assetA = parsePoolAsset(pool.assetA || pool.assetAIn || pool.asset_a);
        const assetB = parsePoolAsset(pool.assetB || pool.assetBIn || pool.asset_b);
        const reserveA = pool.reserveA || pool.reserveAIn || pool.reserve_a || '0';
        const reserveB = pool.reserveB || pool.reserveBIn || pool.reserve_b || '0';
        const totalLP = pool.totalLPSupply || pool.total_lp_supply || pool.totalLiquidity || '0';

        const ra = BigInt(reserveA);
        const rb = BigInt(reserveB);
        const tl = BigInt(totalLP);
        if (ra <= 0n || rb <= 0n || tl <= 0n) continue;

        const keyA = tokenPriceKey(assetA.policyId, assetA.assetName);
        const keyB = tokenPriceKey(assetB.policyId, assetB.assetName);
        const isAdaA = !assetA.policyId;
        const isAdaB = !assetB.policyId;

        if (isAdaB && !isAdaA) {
          priceMap[keyA] = (Number(ra) / 1e6) / (Number(rb) / 1e6);
        } else if (isAdaA && !isAdaB) {
          priceMap[keyB] = (Number(rb) / 1e6) / (Number(ra) / 1e6);
        }

        if (poolId) {
          const lpKey = (KNOWN_DEX_LP[0].policyId + poolId).toLowerCase();
          lpMap[lpKey] = {
            poolId,
            assetA, assetB,
            reserveA: ra.toString(),
            reserveB: rb.toString(),
            totalLPSupply: tl.toString(),
            priceA: priceMap[keyA] || null,
            priceB: priceMap[keyB] || null,
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

function calculateLpValue(lpData, lpBalance, lpDecimals) {
  if (!lpData) return null;
  try {
    const totalLP = BigInt(lpData.totalLPSupply);
    if (totalLP <= 0n) return null;
    const lpShare = Number(BigInt(lpBalance)) / Number(totalLP);

    const rA = Number(BigInt(lpData.reserveA)) / 1e6;
    const rB = Number(BigInt(lpData.reserveB)) / 1e6;

    const valA = lpData.priceA != null ? rA * lpData.priceA : rA;
    const valB = lpData.priceB != null ? rB * lpData.priceB : rB;

    return lpShare * (valA + valB);
  } catch {
    return null;
  }
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

    log(id, 'prices-status', { priceCount: Object.keys(priceMap).length, lpCount: Object.keys(lpMap).length });

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
            lpValue = calculateLpValue(lpData, e.quantity, decimals);
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
