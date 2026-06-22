const reqId = () => Math.random().toString(36).slice(2, 8);

function log(id, step, data) {
  console.log(JSON.stringify({ reqId: id, step, ...data }));
}

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function defaultKoiosUrl(network) {
  switch (network) {
    case 'preprod': return 'https://preprod.koios.rest/api/v1';
    case 'preview': return 'https://preview.koios.rest/api/v1';
    case 'sanchonet': return 'https://sancho.koios.rest/api/v1';
    default: return 'https://api.koios.rest/api/v1';
  }
}

async function koiosPost(url, body) {
  const id = 'koios-' + reqId();
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

async function koiosGet(url) {
  const id = 'koios-' + reqId();
  log(id, 'req', { url: url.slice(0, 60) + '..' });
  const resp = await fetch(url);
  log(id, 'resp', { status: resp.status, ok: resp.ok });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    log(id, 'err-body', { text: text.slice(0, 300) });
    return null;
  }
  const json = await resp.json();
  log(id, 'data', { json });
  return json;
}

function ipfsToHttp(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('ipfs://')) return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  return url;
}

function formatAssetId(proposal) {
  if (!proposal.target_policy_id) return null;
  return `${proposal.target_policy_id}${proposal.target_asset_name || ''}`;
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

async function fetchTokenRegistry(assetPolicy, assetName) {
  const id = 'reg-' + reqId();
  if (!assetPolicy || !assetName) return null;
  const subject = (assetPolicy + assetName).toLowerCase();
  try {
    log(id, 'fetch', { subject: subject.slice(0, 24) + '...' });
    const resp = await fetch(`https://tokens.cardano.org/metadata/${subject}`);
    if (!resp.ok) {
      log(id, 'not-found', { status: resp.status });
      return null;
    }
    const data = await resp.json();
    log(id, 'got', { name: data.name?.value, hasLogo: !!data.logo?.value });
    const image = data.logo?.value
      ? `data:image/png;base64,${data.logo.value}`
      : null;
    return { name: data.name?.value || null, image };
  } catch (e) {
    log(id, 'error', { msg: e.message });
    return null;
  }
}

async function fetchAssetInfo(assetPolicy, assetName) {
  const id = 'asset-' + reqId();
  if (!assetPolicy) return null;
  const network = process.env.BLOCKFROST_NETWORK || 'mainnet';
  const koiosUrl = process.env.KOIOS_API_URL || defaultKoiosUrl(network);
  let supply = null;
  let name = null;
  let image = null;
  try {
    log(id, 'fetch', { policy: assetPolicy.slice(0, 16) + '...', name: assetName || '(empty)' });
    const result = await koiosPost(`${koiosUrl}/asset_info`, {
      _asset_policy: assetPolicy,
      _asset_name: assetName || '',
    });
    if (Array.isArray(result) && result.length > 0) {
      const info = result[0];
      log(id, 'got-info', { supply: info.total_supply, hasMeta: !!info.minting_tx_metadata });
      supply = info.total_supply;
      const meta = extractAssetMeta(info.minting_tx_metadata);
      name = meta.name;
      image = meta.image;
    } else {
      log(id, 'no-result', { result });
    }
  } catch (e) {
    log(id, 'error', { msg: e.message });
  }
  if (!name && !image && assetName) {
    log(id, 'fallback-registry', {});
    const reg = await fetchTokenRegistry(assetPolicy, assetName);
    if (reg) {
      if (!name) name = reg.name;
      if (!image) image = reg.image;
    }
  }
  return { supply, name, image };
}

async function fetchAdaSupply() {
  const id = 'ada-supply-' + reqId();
  const network = process.env.BLOCKFROST_NETWORK || 'mainnet';
  const koiosUrl = process.env.KOIOS_API_URL || defaultKoiosUrl(network);
  try {
    const result = await koiosGet(`${koiosUrl}/totals`);
    if (Array.isArray(result) && result.length > 0) {
      const circulating = result[0].circulating_supply;
      log(id, 'done', { circulating });
      return circulating;
    }
  } catch (e) {
    log(id, 'error', { msg: e.message });
  }
  return null;
}

async function fetchLatestBlock() {
  const id = 'block-' + reqId();
  const network = process.env.BLOCKFROST_NETWORK || 'mainnet';
  const koiosUrl = process.env.KOIOS_API_URL || defaultKoiosUrl(network);
  try {
    log(id, 'fetch-tip', { url: `${koiosUrl}/tip` });
    const tip = await koiosGet(`${koiosUrl}/tip`);
    log(id, 'tip-result', { tip });
    if (!tip || !Array.isArray(tip) || tip.length === 0) return null;
    const t = tip[0];
    const result = { height: t.block_no, slot: t.slot_no };
    log(id, 'tip-parsed', { result });
    return result;
  } catch (e) {
    log(id, 'error', { msg: e.message });
    return null;
  }
}

async function checkTokenBalance(addresses, stakeAddresses, targetPolicyId, targetAssetName) {
  const id = 'check-' + reqId();
  const network = process.env.BLOCKFROST_NETWORK || 'mainnet';
  const koiosUrl = process.env.KOIOS_API_URL || defaultKoiosUrl(network);
  const isADA = !targetPolicyId;
  const matchAsset = (asset) => {
    if (asset.policy_id !== targetPolicyId) return false;
    if (!targetAssetName) return true;
    return (asset.asset_name || '') === targetAssetName;
  };
  let totalBalance = 0n;

  log(id, 'start', { isADA, targetPolicy: targetPolicyId.slice(0, 16) + '...', targetAsset: targetAssetName || '(empty)', addrCount: addresses.length, stakeCount: stakeAddresses.length });

  if (isADA) {
    if (Array.isArray(stakeAddresses) && stakeAddresses.length > 0) {
      const result = await koiosPost(`${koiosUrl}/account_info`, { _stake_addresses: stakeAddresses });
      if (Array.isArray(result)) {
        const balances = result.map(a => ({ addr: a.stake_address?.slice(0, 15) + '...', bal: a.balance }));
        log(id, 'ada-stake', { count: result.length, balances });
        for (const acct of result) totalBalance += BigInt(acct.balance || '0');
      } else {
        log(id, 'ada-stake-null', { result });
      }
    }
    if (totalBalance <= 0n && Array.isArray(addresses) && addresses.length > 0) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
        const batch = addresses.slice(i, i + BATCH_SIZE);
        const result = await koiosPost(`${koiosUrl}/address_info`, { _addresses: batch });
        if (Array.isArray(result)) {
          const balances = result.map(a => ({ addr: a.address?.slice(0, 15) + '...', bal: a.balance }));
          log(id, 'ada-addr-batch', { batchIdx: i / BATCH_SIZE, count: result.length, balances });
          for (const entry of result) totalBalance += BigInt(entry.balance || '0');
        } else {
          log(id, 'ada-addr-batch-null', { batchIdx: i / BATCH_SIZE, result });
        }
      }
    }
  } else {
    if (Array.isArray(stakeAddresses) && stakeAddresses.length > 0) {
      const result = await koiosPost(`${koiosUrl}/account_assets`, { _stake_addresses: stakeAddresses });
      if (Array.isArray(result)) {
        log(id, 'token-stake-raw', { count: result.length, sample: result.slice(0, 3).map(a => ({ policy: a.policy_id?.slice(0, 12) + '...', name: a.asset_name || '(empty)', qty: a.quantity })) });
        for (const asset of result) {
          const match = matchAsset(asset);
          log(id, 'token-stake-entry', { policy: asset.policy_id?.slice(0, 12) + '...', name: asset.asset_name || '(empty)', qty: asset.quantity, match });
          if (match) totalBalance += BigInt(asset.quantity || '0');
        }
      } else {
        log(id, 'token-stake-null', { result });
      }
    }
    const BATCH_SIZE = 50;
    if (totalBalance <= 0n && Array.isArray(addresses) && addresses.length > 0) {
      for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
        const batch = addresses.slice(i, i + BATCH_SIZE);
        const result = await koiosPost(`${koiosUrl}/address_assets`, { _addresses: batch });
        if (Array.isArray(result)) {
          log(id, 'token-addr-batch', { batchIdx: i / BATCH_SIZE, count: result.length, sample: result.slice(0, 3).map(a => ({ addr: a.address?.slice(0, 12) + '...', policy: a.policy_id?.slice(0, 12) + '...', name: a.asset_name || '(empty)', qty: a.quantity })) });
          for (const asset of result) {
            const match = matchAsset(asset);
            log(id, 'token-addr-entry', { policy: asset.policy_id?.slice(0, 12) + '...', name: asset.asset_name || '(empty)', qty: asset.quantity, match });
            if (match) totalBalance += BigInt(asset.quantity || '0');
          }
        } else {
          log(id, 'token-addr-batch-null', { batchIdx: i / BATCH_SIZE, result });
        }
      }
    }
  }

  log(id, 'done', { total: totalBalance.toString() });
  return totalBalance;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured.' });
  }

  try {
    const EXPIRY_HOURS = 72;

    function addExpiry(p) {
      const created = new Date(p.created_at).getTime();
      p.expiresAt = new Date(created + EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
      p.expired = Date.now() > new Date(p.expiresAt).getTime();
      return p;
    }

    if (req.method === 'GET') {
      if (req.query.id) {
        const { data: proposal, error: propErr } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', req.query.id)
          .single();

        if (propErr || !proposal) {
          return res.status(404).json({ error: 'Proposal not found' });
        }

        addExpiry(proposal);

        const { data: votes, error: votesErr } = await supabase
          .from('votes')
          .select('voter_address, vote_choice, stake_weight, created_at')
          .eq('proposal_id', req.query.id);

        if (votesErr) throw votesErr;

        const tally = {};
        let totalWeight = 0n;
        for (const v of votes) {
          tally[v.vote_choice] = (tally[v.vote_choice] || 0n) + BigInt(v.stake_weight);
          totalWeight += BigInt(v.stake_weight);
        }

        const formattedTally = {};
        for (const [choice, weight] of Object.entries(tally)) {
          formattedTally[choice] = weight.toString();
        }

        let myVote = null;
        if (req.query.voter) {
          const { data: myVoteData } = await supabase
            .from('votes')
            .select('vote_choice, stake_weight')
            .eq('proposal_id', req.query.id)
            .eq('voter_address', req.query.voter)
            .maybeSingle();
          if (myVoteData) myVote = myVoteData;
        }

        const isADA = !proposal.target_policy_id;
        const assetId = formatAssetId(proposal);
        const assetInfo = assetId
          ? await fetchAssetInfo(proposal.target_policy_id, proposal.target_asset_name)
          : null;
        let adaCirculating = null;
        if (isADA) adaCirculating = await fetchAdaSupply();

        return res.json({
          ...proposal,
          voterCount: votes.length,
          totalWeight: totalWeight.toString(),
          tally: formattedTally,
          myVote,
          circulatingSupply: isADA ? adaCirculating : (assetInfo?.supply || null),
          totalSupply: isADA ? '45000000000000000' : (assetInfo?.supply || null),
          tokenName: assetInfo?.name || null,
          tokenImage: assetInfo?.image || null,
        });
      }

      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const active = data.filter(p => {
        const created = new Date(p.created_at).getTime();
        const elapsed = Date.now() - created;
        return elapsed < EXPIRY_HOURS * 60 * 60 * 1000;
      });

      if (active.length === 0) return res.json([]);

      const ids = active.map(p => p.id);
      const { data: votes } = await supabase
        .from('votes')
        .select('proposal_id, vote_choice, stake_weight')
        .in('proposal_id', ids);

      const summaries = {};
      if (votes) {
        for (const v of votes) {
          if (!summaries[v.proposal_id]) summaries[v.proposal_id] = {};
          summaries[v.proposal_id][v.vote_choice] =
            (summaries[v.proposal_id][v.vote_choice] || 0n) + BigInt(v.stake_weight);
        }
      }

      const assetMap = {};
      for (const p of active) {
        const id = formatAssetId(p);
        if (id && !assetMap[id]) {
          assetMap[id] = { policy: p.target_policy_id, name: p.target_asset_name };
        }
      }
      const assetInfos = {};
      await Promise.all(Object.entries(assetMap).map(async ([id, { policy, name }]) => {
        const info = await fetchAssetInfo(policy, name);
        if (info) assetInfos[id] = info;
      }));

      let adaCirculating = null;
      if (active.some(p => !p.target_policy_id)) {
        adaCirculating = await fetchAdaSupply();
      }

      active.forEach(p => {
        addExpiry(p);
        const s = summaries[p.id] || {};
        const weights = Object.values(s).map(v => typeof v === 'bigint' ? v : BigInt(v));
        const total = weights.reduce((a, b) => a + b, 0n);
        const formatted = {};
        for (const [choice, weight] of Object.entries(s)) {
          formatted[choice] = (typeof weight === 'bigint' ? weight : BigInt(weight)).toString();
        }
        p.voteSummary = formatted;
        p.totalVoteWeight = total.toString();
        const assetId = formatAssetId(p);
        const ai = assetInfos[assetId] || {};
        const isADA = !p.target_policy_id;
        p.circulatingSupply = isADA ? adaCirculating : (ai.supply || null);
        p.totalSupply = isADA ? '45000000000000000' : (ai.supply || null);
        p.tokenName = ai.name || null;
        p.tokenImage = ai.image || null;
      });

      return res.json(active);
    }

    if (req.method === 'POST') {
      const pid = 'create-' + reqId();
      const { title, description, targetPolicyId, targetAssetName, creatorAddress, addresses, stakeAddresses } = req.body;

      log(pid, 'body', { title, description, targetPolicyId: targetPolicyId ? targetPolicyId.slice(0, 16) + '...' : null, hasAddrs: Array.isArray(addresses), hasStake: Array.isArray(stakeAddresses) });

      if (!title || !description || !creatorAddress) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      log(pid, 'check-balance', { targetPolicy: targetPolicyId?.slice(0, 16) || 'ADA' });
      const balance = await checkTokenBalance(
        addresses || [creatorAddress],
        stakeAddresses || [],
        targetPolicyId || '',
        targetAssetName || ''
      );

      log(pid, 'balance-result', { balance: balance.toString() });

      if (balance <= 0n) {
        const label = !targetPolicyId ? 'ADA' : 'this token';
        return res.status(403).json({ error: `You must hold ${label} to create a proposal for it.` });
      }

      const { data, error } = await supabase
        .from('proposals')
        .insert({
          title,
          description,
          target_policy_id: targetPolicyId,
          target_asset_name: targetAssetName || '',
          snapshot_block: 0,
          snapshot_slot: 0,
          creator_address: creatorAddress,
        })
        .select()
        .single();

      if (error) throw error;
      log(pid, 'created', { id: data.id });
      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const pid = 'delete-' + reqId();
      const { id, creatorAddress } = req.body;

      if (!id || !creatorAddress) {
        return res.status(400).json({ error: 'Missing proposal id or creatorAddress' });
      }

      log(pid, 'verify', { id, creator: creatorAddress.slice(0, 15) + '...' });

      const { data: proposal, error: findErr } = await supabase
        .from('proposals')
        .select('creator_address')
        .eq('id', id)
        .single();

      if (findErr || !proposal) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      if (proposal.creator_address !== creatorAddress) {
        return res.status(403).json({ error: 'Only the creator can delete this proposal' });
      }

      const { error: delErr } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id);

      if (delErr) throw delErr;

      log(pid, 'deleted', { id });
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Proposals error:', error);
    return res.status(500).json({ error: error.message });
  }
}
