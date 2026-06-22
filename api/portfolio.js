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
  let ticker = null, decimals = null, regLogo = null;
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
    if (!stakeAddresses || !Array.isArray(stakeAddresses) || stakeAddresses.length === 0) {
      return res.status(400).json({ error: 'stakeAddresses required' });
    }

    const network = process.env.BLOCKFROST_NETWORK || 'mainnet';
    const koiosUrl = process.env.KOIOS_API_URL || defaultKoiosUrl(network);

    let adaBalance = '0';

    const adaResult = await koiosPost(`${koiosUrl}/account_info`, {
      _stake_addresses: stakeAddresses,
    }, id);
    if (Array.isArray(adaResult) && adaResult.length > 0) {
      adaBalance = adaResult[0].balance || '0';
    }

    const assetsResult = await koiosPost(`${koiosUrl}/account_assets`, {
      _stake_addresses: stakeAddresses,
    }, id);

    let tokens = [];
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
      log(id, 'unique-tokens', { count: entries.length });

      const metaResults = await Promise.all(
        entries.map(e => fetchAssetMeta(e.policyId, e.assetName).catch(() => null))
      );

      tokens = entries.map((e, i) => {
        const meta = metaResults[i] || {};
        const rawQty = BigInt(e.quantity);
        const decimals = meta.decimals != null ? meta.decimals : 0;
        const divisor = BigInt(10) ** BigInt(decimals);
        const displayQty = divisor > 0n && rawQty >= divisor
          ? (Number(rawQty) / Number(divisor)).toLocaleString(undefined, { maximumFractionDigits: decimals || 6 })
          : rawQty.toString();
        return {
          policyId: e.policyId,
          assetName: e.assetName,
          fingerprint: e.fingerprint,
          quantity: e.quantity,
          displayQty,
          decimals,
          name: meta.name || null,
          ticker: meta.ticker || null,
          image: meta.image || null,
        };
      });

      tokens.sort((a, b) => {
        const aQty = BigInt(a.quantity);
        const bQty = BigInt(b.quantity);
        if (bQty > aQty) return 1;
        if (bQty < aQty) return -1;
        return 0;
      });
    }

    log(id, 'done', { ada: adaBalance, tokens: tokens.length });
    return res.json({ adaBalance, tokens });
  } catch (error) {
    log('pf-err', 'catch', { msg: error.message });
    return res.status(500).json({ error: error.message });
  }
}
