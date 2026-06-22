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

async function koiosPost(url, body) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) return null;
  return resp.json();
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

    log(id, 'proposal-found', { block: proposal.snapshot_block, policy: proposal.target_policy_id });

    let addrsToCheck = Array.isArray(addresses) && addresses.length > 0 ? [...addresses] : [address];

    if (Array.isArray(stakeAddresses) && stakeAddresses.length > 0) {
      try {
        const result = await koiosPost(`${KOIOS_URL}/account_addresses`, {
          _stake_addresses: stakeAddresses,
        });
        if (Array.isArray(result)) {
          const existing = new Set(addrsToCheck);
          for (const account of result) {
            if (Array.isArray(account.addresses)) {
              for (const addr of account.addresses) {
                if (!existing.has(addr)) {
                  addrsToCheck.push(addr);
                  existing.add(addr);
                }
              }
            }
          }
        }
      } catch (e) {
        log(id, 'koios-discover-err', { msg: e.message });
      }
    }

    const isADA = !proposal.target_policy_id;
    const targetPolicyId = proposal.target_policy_id || '';
    const targetAssetName = proposal.target_asset_name || '';
    let totalBalance = 0n;

    if (isADA) {
      if (Array.isArray(stakeAddresses) && stakeAddresses.length > 0) {
        try {
          const result = await koiosPost(`${KOIOS_URL}/account_info`, {
            _stake_addresses: stakeAddresses,
          });
          if (Array.isArray(result)) {
            for (const acct of result) {
              totalBalance += BigInt(acct.balance || '0');
            }
          }
        } catch (e) {
          log(id, 'koios-ada-stake-err', { msg: e.message });
        }
      }

      if (totalBalance <= 0n && addrsToCheck.length > 0) {
        try {
          const result = await koiosPost(`${KOIOS_URL}/address_info`, {
            _addresses: addrsToCheck,
          });
          if (Array.isArray(result)) {
            for (const entry of result) {
              totalBalance += BigInt(entry.balance || '0');
            }
          }
        } catch (e) {
          log(id, 'koios-ada-addr-err', { msg: e.message });
        }
      }
    } else {
      if (Array.isArray(stakeAddresses) && stakeAddresses.length > 0) {
        try {
          const result = await koiosPost(`${KOIOS_URL}/account_assets`, {
            _stake_addresses: stakeAddresses,
          });
          if (Array.isArray(result)) {
            for (const acct of result) {
              if (Array.isArray(acct.asset_list)) {
                for (const asset of acct.asset_list) {
                  if (asset.policy_id === targetPolicyId && (asset.asset_name || '') === targetAssetName) {
                    totalBalance += BigInt(asset.quantity || '0');
                  }
                }
              }
            }
          }
        } catch (e) {
          log(id, 'koios-assets-err', { msg: e.message });
        }
      }

      if (totalBalance <= 0n && addrsToCheck.length > 0) {
        try {
          const result = await koiosPost(`${KOIOS_URL}/address_assets`, {
            _addresses: addrsToCheck,
          });
          if (Array.isArray(result)) {
            for (const entry of result) {
              if (Array.isArray(entry.asset_list)) {
                for (const asset of entry.asset_list) {
                  if (asset.policy_id === targetPolicyId && (asset.asset_name || '') === targetAssetName) {
                    totalBalance += BigInt(asset.quantity || '0');
                  }
                }
              }
            }
          }
        } catch (e) {
          log(id, 'koios-addr-assets-err', { msg: e.message });
        }
      }
    }

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
    });
  } catch (error) {
    log(id, 'catch', { msg: error.message });
    return res.status(500).json({ error: error.message });
  }
}
