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
  log(id, 'koios-req', { url: url.slice(0, 60) + '..', bodyKeys: Object.keys(body), bodyPreview: JSON.stringify(body).slice(0, 120) });
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  log(id, 'koios-resp', { status: resp.status, ok: resp.ok, statusText: resp.statusText });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    log(id, 'koios-err-body', { text: text.slice(0, 300) });
    return null;
  }
  const json = await resp.json();
  log(id, 'koios-data', { isArray: Array.isArray(json), length: Array.isArray(json) ? json.length : typeof json, preview: JSON.stringify(json).slice(0, 200) });
  return json;
}

export default async function handler(req, res) {
  const id = reqId();
  log(id, 'start', { method: req.method });

  try {
    const { createClient } = await import('@supabase/supabase-js');

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
    const NETWORK = process.env.BLOCKFROST_NETWORK || 'mainnet';
    const KOIOS_URL = process.env.KOIOS_API_URL || defaultKoiosUrl(NETWORK);
    const debug = { network: NETWORK, koiosUrl: KOIOS_URL, steps: [] };

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { address, addresses, stakeAddresses, payload, signature, key, proposalId, choice } = req.body || {};

    if (!address || !payload || !signature || !key || !proposalId || !choice) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: proposal, error: proposalErr } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (proposalErr || !proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    log(id, 'proposal-found', { block: proposal.snapshot_block, policy: proposal.target_policy_id, asset: proposal.target_asset_name });
    debug.proposal = { block: proposal.snapshot_block, policy: proposal.target_policy_id, asset: proposal.target_asset_name };

    let addrsToCheck = Array.isArray(addresses) && addresses.length > 0 ? [...addresses] : [address];
    log(id, 'addrs-initial', { count: addrsToCheck.length, samples: addrsToCheck.slice(0, 2).map(a => a.slice(0, 15) + '...') });
    debug.initialAddresses = addrsToCheck.length;
    debug.addressSamples = addrsToCheck.slice(0, 2).map(a => a.slice(0, 20) + '...');

    if (Array.isArray(stakeAddresses) && stakeAddresses.length > 0) {
      log(id, 'stake-addrs', { count: stakeAddresses.length, samples: stakeAddresses.map(s => s.slice(0, 15) + '...') });
      debug.stakeAddresses = stakeAddresses.map(s => s.slice(0, 20) + '...');
      try {
        const result = await koiosPost(`${KOIOS_URL}/account_addresses`, { _stake_addresses: stakeAddresses }, id);
        if (Array.isArray(result)) {
          const existing = new Set(addrsToCheck);
          let discovered = 0;
          for (const account of result) {
            if (Array.isArray(account.addresses)) {
              for (const addr of account.addresses) {
                if (!existing.has(addr)) {
                  addrsToCheck.push(addr);
                  existing.add(addr);
                  discovered++;
                }
              }
            }
          }
          log(id, 'koios-discovered', { count: discovered, total: addrsToCheck.length });
          debug.koiosDiscovered = discovered;
        } else {
          log(id, 'koios-discover-skip', { msg: 'result was not an array', resultType: typeof result, result });
          debug.koiosDiscoverFailed = true;
          debug.koiosDiscoverResult = JSON.stringify(result).slice(0, 100);
        }
      } catch (e) {
        log(id, 'koios-discover-err', { msg: e.message });
        debug.koiosDiscoverError = e.message;
      }
    } else {
      log(id, 'no-stake-addrs');
      debug.noStakeAddresses = true;
    }

    const isADA = !proposal.target_policy_id;
    const targetPolicyId = proposal.target_policy_id || '';
    const targetAssetName = proposal.target_asset_name || '';
    let totalBalance = 0n;

    log(id, 'balance-check-start', { isADA, targetPolicyId: targetPolicyId.slice(0, 16) + '...', targetAssetName: targetAssetName || '(empty)', addrCount: addrsToCheck.length });
    debug.balanceCheck = { isADA, targetPolicyId: targetPolicyId.slice(0, 16) + '...', targetAssetName: targetAssetName || '(empty)', addrCount: addrsToCheck.length };

    if (isADA) {
      if (Array.isArray(stakeAddresses) && stakeAddresses.length > 0) {
        try {
          log(id, 'ada-check-stake', { url: `${KOIOS_URL}/account_info` });
          const result = await koiosPost(`${KOIOS_URL}/account_info`, { _stake_addresses: stakeAddresses }, id);
          if (Array.isArray(result)) {
            const balances = result.map(a => ({ addr: a.stake_address?.slice(0, 15) + '...', balance: a.balance }));
            log(id, 'ada-stake-result', { count: result.length, balances });
            debug.adaStake = balances;
            for (const acct of result) totalBalance += BigInt(acct.balance || '0');
          } else {
            log(id, 'ada-stake-null', { result });
            debug.adaStakeFailed = true;
            debug.adaStakeResult = JSON.stringify(result).slice(0, 100);
          }
        } catch (e) {
          log(id, 'koios-ada-stake-err', { msg: e.message });
          debug.adaStakeError = e.message;
        }
      }

      if (totalBalance <= 0n && addrsToCheck.length > 0) {
        try {
          log(id, 'ada-check-addr', { url: `${KOIOS_URL}/address_info`, addrs: addrsToCheck.slice(0, 3).map(a => a.slice(0, 15) + '...') });
          const result = await koiosPost(`${KOIOS_URL}/address_info`, { _addresses: addrsToCheck }, id);
          if (Array.isArray(result)) {
            const balances = result.map(a => ({ addr: a.address?.slice(0, 15) + '...', balance: a.balance }));
            log(id, 'ada-addr-result', { count: result.length, balances });
            debug.adaAddress = balances;
            for (const entry of result) totalBalance += BigInt(entry.balance || '0');
          } else {
            log(id, 'ada-addr-null', { result });
            debug.adaAddressFailed = true;
            debug.adaAddressResult = JSON.stringify(result).slice(0, 100);
          }
        } catch (e) {
          log(id, 'koios-ada-addr-err', { msg: e.message });
          debug.adaAddressError = e.message;
        }
      }
    } else {
      if (Array.isArray(stakeAddresses) && stakeAddresses.length > 0) {
        try {
          log(id, 'token-check-stake', { url: `${KOIOS_URL}/account_assets` });
          const result = await koiosPost(`${KOIOS_URL}/account_assets`, { _stake_addresses: stakeAddresses }, id);
          if (Array.isArray(result)) {
            const entries = result.map(a => ({
              addr: a.stake_address?.slice(0, 15) + '...',
              policy: a.policy_id?.slice(0, 12) + '...',
              name: a.asset_name || '(empty)',
              qty: a.quantity,
            }));
            log(id, 'token-stake-result', { count: result.length, entries });
            debug.tokenStake = entries;
            for (const asset of result) {
              const match = asset.policy_id === targetPolicyId && (asset.asset_name || '') === targetAssetName;
              log(id, 'token-stake-entry', { policy: asset.policy_id?.slice(0, 12) + '...', name: asset.asset_name || '(empty)', qty: asset.quantity, match, targetPolicy: targetPolicyId.slice(0, 12) + '...', targetName: targetAssetName || '(empty)' });
              if (match) {
                totalBalance += BigInt(asset.quantity || '0');
              }
            }
          } else {
            log(id, 'token-stake-null', { result });
            debug.tokenStakeFailed = true;
            debug.tokenStakeResult = JSON.stringify(result).slice(0, 100);
          }
        } catch (e) {
          log(id, 'koios-assets-err', { msg: e.message });
          debug.tokenStakeError = e.message;
        }
      } else {
        log(id, 'token-no-stake-skip-stake-level');
        debug.tokenNoStakeAddresses = true;
      }

      log(id, 'pre-fallback-check', { totalBalance: totalBalance.toString(), addrsCount: addrsToCheck.length, addrsSample: addrsToCheck.slice(0, 3).map(a => a.slice(0, 15) + '...') });
      if (totalBalance <= 0n && addrsToCheck.length > 0) {
        const BATCH_SIZE = 50;
        for (let i = 0; i < addrsToCheck.length; i += BATCH_SIZE) {
          const batch = addrsToCheck.slice(i, i + BATCH_SIZE);
          log(id, 'token-check-addr-batch', { batchIdx: i / BATCH_SIZE, batchSize: batch.length });
          try {
            const result = await koiosPost(`${KOIOS_URL}/address_assets`, { _addresses: batch }, id);
            if (Array.isArray(result)) {
              const entries = result.map(a => ({
                addr: a.address?.slice(0, 15) + '...',
                policy: a.policy_id?.slice(0, 12) + '...',
                name: a.asset_name || '(empty)',
                qty: a.quantity,
              }));
              log(id, 'token-addr-batch-result', { count: result.length, entries });
              debug.tokenAddress = (debug.tokenAddress || []).concat(entries);
              for (const asset of result) {
                const match = asset.policy_id === targetPolicyId && (asset.asset_name || '') === targetAssetName;
                log(id, 'token-addr-entry', { policy: asset.policy_id?.slice(0, 12) + '...', name: asset.asset_name || '(empty)', qty: asset.quantity, match, targetPolicy: targetPolicyId.slice(0, 12) + '...', targetName: targetAssetName || '(empty)' });
                if (match) {
                  totalBalance += BigInt(asset.quantity || '0');
                }
              }
            } else {
              log(id, 'token-addr-batch-null', { batchIdx: i / BATCH_SIZE, result });
              if (!debug.tokenAddressFailures) debug.tokenAddressFailures = [];
              debug.tokenAddressFailures.push({ batchIdx: i / BATCH_SIZE, result: JSON.stringify(result).slice(0, 100) });
            }
          } catch (e) {
            log(id, 'koios-addr-assets-err', { msg: e.message });
            if (!debug.tokenAddressErrors) debug.tokenAddressErrors = [];
            debug.tokenAddressErrors.push(e.message);
          }
        }
      }
    }

    debug.totalBalance = totalBalance.toString();
    log(id, 'balance-done', { total: totalBalance.toString() });

    if (totalBalance > 0n) {
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

      if (voteErr) throw voteErr;

      log(id, 'success', { weight: totalBalance.toString() });
      return res.json({ success: true, stakeWeight: totalBalance.toString() });
    }

    const label = isADA ? 'ADA' : 'the required token';
    return res.status(403).json({
      error: `No ${label} balance found for this wallet. You must hold ${label} to vote.`,
      debug,
    });
  } catch (error) {
    log(id, 'catch', { msg: error.message });
    return res.status(500).json({ error: error.message });
  }
}
