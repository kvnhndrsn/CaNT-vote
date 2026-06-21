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
    log(id, 'import-start');
    const { createClient } = await import('@supabase/supabase-js');
    log(id, 'import-done');

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
    const BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY;
    const BLOCKFROST_NET = process.env.BLOCKFROST_NETWORK || 'mainnet';
    const KOIOS_URL = process.env.KOIOS_API_URL || defaultKoiosUrl(BLOCKFROST_NET);

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

    const { address, addresses, stakeAddresses, payload, signature, key, proposalId, choice, tokenUnit } = req.body || {};
    const unit = tokenUnit || 'lovelace';
    let addrsToCheck = Array.isArray(addresses) && addresses.length > 0 ? addresses : [address];

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

    const blockfrostUrl = `https://cardano-${BLOCKFROST_NET}.blockfrost.io/api/v0`;
    const bfHeaders = { project_id: BLOCKFROST_KEY };

    /* ---- Snapshot balance check ---- */

    // Phase 0: If stake addresses provided, use Koios to discover ALL payment addresses
    let koiosDiscoveredCount = 0;
    if (Array.isArray(stakeAddresses) && stakeAddresses.length > 0) {
      log(id, 'koios-discover', { stakeCount: stakeAddresses.length });
      try {
        const koiosResult = await koiosPost(`${KOIOS_URL}/account_addresses`, {
          _stake_addresses: stakeAddresses,
        });
        if (Array.isArray(koiosResult)) {
          const existing = new Set(addrsToCheck);
          for (const account of koiosResult) {
            if (Array.isArray(account.addresses)) {
              for (const addr of account.addresses) {
                if (!existing.has(addr)) {
                  addrsToCheck.push(addr);
                  existing.add(addr);
                  koiosDiscoveredCount++;
                }
              }
            }
          }
          log(id, 'koios-discovered', { count: koiosDiscoveredCount, total: addrsToCheck.length });
        }
      } catch (e) {
        log(id, 'koios-discover-err', { msg: e.message });
      }
    }

    // Phase 1: Check current UTXOs for utxos created at/before snapshot
    let totalBalance = 0n;
    const bfErrors = [];
    const addrResults = [];

    for (const addr of addrsToCheck) {
      log(id, 'bf-start', { unit, address: addr.slice(0, 12) + '...' });
      let page = 1;
      let hasMore = true;
      let addrUtxoCount = 0;
      let addrBalance = 0n;

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
          bfErrors.push({ addr: addr.slice(0, 12), page, status: resp.status, detail: text.slice(0, 100) });
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
                const qty = BigInt(adaAmount.quantity);
                totalBalance += qty;
                addrBalance += qty;
              }
            } else {
              const amount = utxo.amount.find(a => a.unit === unit);
              if (amount) {
                const qty = BigInt(amount.quantity);
                totalBalance += qty;
                addrBalance += qty;
                log(id, 'found-utxo', { qty: amount.quantity, block: utxo.block_height });
              }
            }
          }
        }
        addrUtxoCount += utxos.length;
        hasMore = utxos.length === 100;
        page++;
      }

      addrResults.push({ addr: addr.slice(0, 12), utxoCount: addrUtxoCount, snapshotBalance: addrBalance.toString() });
    }

    log(id, 'balance-done', { total: totalBalance.toString(), unit, addrCount: addrsToCheck.length });

    if (totalBalance > 0n) {
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
    }

    // ---- Balance check failed — gather diagnostics ----

    // Phase 2: Try Blockfrost address history (total received before snapshot)
    let bfHistoryBalance = 0n;
    let bfHistoryError = null;
    let hadPreSnapshotReceives = false;
    try {
      for (const addr of addrsToCheck) {
        let page = 1;
        let hasMore = true;
        while (hasMore) {
          const hResp = await fetch(
            `${blockfrostUrl}/addresses/${addr}/history?page=${page}&count=100`,
            { headers: bfHeaders }
          );
          if (!hResp.ok) break;
          const entries = await hResp.json();
          if (!Array.isArray(entries) || entries.length === 0) break;
          for (const entry of entries) {
            if (entry.block_height <= proposal.snapshot_block) {
              if (unit === 'lovelace') {
                const amt = entry.amount?.find(a => a.unit === 'lovelace');
                if (amt) { bfHistoryBalance += BigInt(amt.quantity); hadPreSnapshotReceives = true; }
              } else {
                const amt = entry.amount?.find(a => a.unit === unit);
                if (amt) { bfHistoryBalance += BigInt(amt.quantity); hadPreSnapshotReceives = true; }
              }
            }
          }
          hasMore = entries.length === 100;
          page++;
        }
      }
    } catch (e) {
      bfHistoryError = e.message;
    }

    // Phase 3: Blockfrost current address summaries
    const bfSummaries = [];
    for (const addr of addrsToCheck.slice(0, 3)) {
      try {
        const sResp = await fetch(`${blockfrostUrl}/addresses/${addr}`, { headers: bfHeaders });
        if (sResp.ok) {
          const info = await sResp.json();
          bfSummaries.push({
            addr: addr.slice(0, 12),
            balance: info.controlled_amount || info.total_balance || '0',
            txCount: info.tx_count,
          });
        }
      } catch {}
    }

    // Phase 4: Koios enhanced diagnostics — current token balances + post-snapshot txs
    let koiosAddrAssets = null;
    let koiosPostSnapshotTxs = null;
    let koiosError = null;
    if (Array.isArray(stakeAddresses) && stakeAddresses.length > 0) {
      try {
        // Check current token balances per address via Koios
        const addrAssets = await koiosPost(`${KOIOS_URL}/address_assets`, {
          _addresses: addrsToCheck,
        });
        if (Array.isArray(addrAssets)) {
          koiosAddrAssets = addrAssets.map(a => ({
            addr: a.address?.slice(0, 12),
            tokenCount: Array.isArray(a.asset_list) ? a.asset_list.length : 0,
            hasTarget: Array.isArray(a.asset_list) && (unit === 'lovelace'
              ? true
              : a.asset_list.some(asset =>
                  `${asset.policy_id}${asset.asset_name || ''}` === unit
                )
            ),
          }));
        }

        // Check for post-snapshot txs
        const txResult = await koiosPost(`${KOIOS_URL}/address_txs`, {
          _addresses: addrsToCheck,
          _after_block_height: proposal.snapshot_block,
        });
        if (Array.isArray(txResult)) {
          const allHashes = [];
          for (const entry of txResult) {
            if (Array.isArray(entry.tx_hashes)) allHashes.push(...entry.tx_hashes);
          }
          koiosPostSnapshotTxs = { count: allHashes.length };
        }
      } catch (e) {
        koiosError = e.message;
      }
    }

    const debugInfo = {
      snapshot_block: proposal.snapshot_block,
      unit,
      network: BLOCKFROST_NET,
      addrCount: addrsToCheck.length,
      koiosDiscoveredAddrs: koiosDiscoveredCount,
      addrResults,
      bfErrors: bfErrors.length > 0 ? bfErrors : undefined,
      bfCurrentBalances: bfSummaries,
      bfHistoryReceivedUpToSnapshot: bfHistoryBalance.toString(),
      hadPreSnapshotReceives,
      bfHistoryError,
      koiosAddrAssets,
      koiosPostSnapshotTxs,
      koiosError,
    };

    let msg;
    if (hadPreSnapshotReceives) {
      msg = `You received ${bfHistoryBalance.toString()} ${unit === 'lovelace' ? 'ADA (in lovelace)' : 'tokens'} before the snapshot, but those UTXOs have been spent. Voting requires holding the unspent UTXOs from the snapshot block.`;
    } else if (bfSummaries.some(a => a.balance !== '0')) {
      msg = `You have a current balance but no pre-snapshot UTXOs. Funds were likely acquired after snapshot block ${proposal.snapshot_block}.`;
    } else if (bfErrors.length > 0) {
      msg = `Blockfrost API error(s) prevented balance check: ${bfErrors.map(e => `page ${e.page} status ${e.status}`).join(', ')}`;
    } else if (koiosPostSnapshotTxs?.count > 0) {
      msg = `Address had ${koiosPostSnapshotTxs.count} transaction(s) after snapshot block ${proposal.snapshot_block}. UTXOs from before the snapshot may have been spent.`;
    } else {
      msg = `No ${unit === 'lovelace' ? 'ADA' : 'token'} balance held at snapshot block`;
    }

    return res.status(403).json({ error: msg, debug: debugInfo });
  } catch (error) {
    log(id, 'catch', { msg: error.message, stack: error.stack?.split('\n').slice(0, 6).join(' | ') });
    return res.status(500).json({ error: error.message, stack: error.stack?.split('\n').slice(0, 6) });
  }
}
