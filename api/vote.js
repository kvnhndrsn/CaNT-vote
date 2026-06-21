const reqId = () => Math.random().toString(36).slice(2, 8);

function log(id, step, data) {
  console.log(JSON.stringify({ reqId: id, step, ...data }));
}

export default async function handler(req, res) {
  const id = reqId();
  log(id, 'start', { method: req.method });

  try {
    log(id, 'import-start');
    const { createClient } = await import('@supabase/supabase-js');
    log(id, 'import-done');

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
    const BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY;
    const BLOCKFROST_NET = process.env.BLOCKFROST_NETWORK || 'mainnet';

    log(id, 'env', { hasUrl: !!SUPABASE_URL, hasKey: !!SUPABASE_KEY, hasBf: !!BLOCKFROST_KEY, net: BLOCKFROST_NET });

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    if (!BLOCKFROST_KEY) {
      return res.status(500).json({ error: 'Blockfrost not configured' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    log(id, 'body', { type: typeof req.body, keys: req.body ? Object.keys(req.body) : [] });

    const { address, addresses, payload, signature, key, proposalId, choice, tokenUnit } = req.body || {};
    const unit = tokenUnit || 'lovelace';
    const addrsToCheck = Array.isArray(addresses) && addresses.length > 0 ? addresses : [address];

    if (!address || !payload || !signature || !key || !proposalId || !choice) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing: {
          address: !address, payload: !payload, signature: !signature,
          key: !key, proposalId: !proposalId, choice: !choice
        }
      });
    }

    log(id, 'create-client');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    log(id, 'client-created');

    log(id, 'query-proposal', { proposalId });
    const { data: proposal, error: proposalErr } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (proposalErr) {
      log(id, 'proposal-err', { msg: proposalErr.message, code: proposalErr.code });
      return res.status(404).json({ error: 'Proposal not found', detail: proposalErr.message });
    }
    if (!proposal) {
      log(id, 'proposal-null');
      return res.status(404).json({ error: 'Proposal not found' });
    }

    log(id, 'proposal-found', { block: proposal.snapshot_block, policy: proposal.target_policy_id });

    const assetId = `${proposal.target_policy_id}${proposal.target_asset_name}`;
    const blockfrostUrl = `https://cardano-${BLOCKFROST_NET}.blockfrost.io/api/v0`;
    const bfHeaders = { project_id: BLOCKFROST_KEY };

    let totalBalance = 0n;

    for (const addr of addrsToCheck) {
      log(id, 'bf-start', { unit, address: addr.slice(0, 12) + '...' });
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const utxoPath = unit === 'lovelace'
          ? `${addr}/utxos`
          : `${addr}/utxos/${unit}`;
        const url = `${blockfrostUrl}/addresses/${utxoPath}?page=${page}&count=100`;
        log(id, 'bf-fetch', { page, url: url.slice(0, 80) + '...' });

        const resp = await fetch(url, { headers: bfHeaders });
        log(id, 'bf-resp', { status: resp.status, ok: resp.ok });

        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          log(id, 'bf-err-body', { text: text.slice(0, 200) });
          break;
        }

        const utxos = await resp.json();
        log(id, 'bf-data', { count: utxos.length, isArray: Array.isArray(utxos) });

        if (!Array.isArray(utxos) || utxos.length === 0) break;

        for (const utxo of utxos) {
          if (utxo.block_height <= proposal.snapshot_block) {
            if (unit === 'lovelace') {
              const adaAmount = utxo.amount.find(a => a.unit === 'lovelace');
              if (adaAmount) {
                totalBalance += BigInt(adaAmount.quantity);
              }
            } else {
              const amount = utxo.amount.find(a => a.unit === unit);
              if (amount) {
                totalBalance += BigInt(amount.quantity);
                log(id, 'found-utxo', { qty: amount.quantity, block: utxo.block_height });
              }
            }
          }
        }
        hasMore = utxos.length === 100;
        page++;
      }
    }

    log(id, 'balance-done', { total: totalBalance.toString(), unit, addrCount: addrsToCheck.length });

    if (totalBalance <= 0n) {
      let currentBalance = 'unknown';
      try {
        const debugAddr = addrsToCheck[0];
        const dbgResp = await fetch(`${blockfrostUrl}/addresses/${debugAddr}`, { headers: bfHeaders });
        if (dbgResp.ok) {
          const dbgInfo = await dbgResp.json();
          currentBalance = dbgInfo.total_balance || dbgInfo.controlled_amount || '0';
        }
      } catch {}
      return res.status(403).json({
        error: `No ${unit === 'lovelace' ? 'ADA' : 'token'} balance held at snapshot block`,
        debug: { snapshot_block: proposal.snapshot_block, unit, addrCount: addrsToCheck.length, currentBalance }
      });
    }

    log(id, 'upsert-vote');
    const { error: voteErr } = await supabase
      .from('votes')
      .upsert({
        proposal_id: proposalId,
        voter_address: address,
        vote_choice: choice,
        signature_hex: signature,
        key_hex: key,
        stake_weight: totalBalance.toString(),
      }, { onConflict: 'proposal_id,voter_address' });

    if (voteErr) {
      log(id, 'upsert-err', { msg: voteErr.message, code: voteErr.code });
      throw voteErr;
    }

    log(id, 'success');
    return res.json({ success: true, stakeWeight: totalBalance.toString() });
  } catch (error) {
    log(id, 'catch', { msg: error.message, stack: error.stack?.split('\n').slice(0, 6).join(' | ') });
    return res.status(500).json({ error: error.message, stack: error.stack?.split('\n').slice(0, 6) });
  }
}
