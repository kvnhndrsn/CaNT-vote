import {
  reqId, log, defaultKoiosUrl,
  discoverAddresses, checkBalance,
} from '../lib/koios.js';

const VALID_CHOICES = ['Yes', 'No', 'Abstain'];

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

    if (!VALID_CHOICES.includes(choice)) {
      return res.status(400).json({ error: 'Invalid choice. Must be one of: ' + VALID_CHOICES.join(', ') });
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

    log(id, 'proposal-found', { policy: proposal.target_policy_id, asset: proposal.target_asset_name });
    debug.proposal = { policy: proposal.target_policy_id, asset: proposal.target_asset_name };

    let addrsToCheck = Array.isArray(addresses) && addresses.length > 0 ? [].concat(addresses) : [address];
    log(id, 'addrs-initial', { count: addrsToCheck.length, samples: addrsToCheck.slice(0, 2).map(function (a) { return a.slice(0, 15) + '...'; }) });
    debug.initialAddresses = addrsToCheck.length;
    debug.addressSamples = addrsToCheck.slice(0, 2).map(function (a) { return a.slice(0, 20) + '...'; });

    if (Array.isArray(stakeAddresses) && stakeAddresses.length > 0) {
      debug.stakeAddresses = stakeAddresses.map(function (s) { return s.slice(0, 20) + '...'; });
      addrsToCheck = await discoverAddresses(stakeAddresses, addrsToCheck, KOIOS_URL);
    } else {
      log(id, 'no-stake-addrs');
      debug.noStakeAddresses = true;
    }

    const isADA = !proposal.target_policy_id;
    const targetPolicyId = proposal.target_policy_id || '';
    const targetAssetName = proposal.target_asset_name || '';
    const targetFingerprint = proposal.target_fingerprint || null;

    log(id, 'balance-check-start', { isADA, targetPolicyId: targetPolicyId.slice(0, 16) + '...', targetAssetName: targetAssetName || '(empty)', addrCount: addrsToCheck.length });
    debug.balanceCheck = { isADA, targetPolicyId: targetPolicyId.slice(0, 16) + '...', targetAssetName: targetAssetName || '(empty)', addrCount: addrsToCheck.length };

    const totalBalance = await checkBalance(
      addrsToCheck, stakeAddresses,
      targetPolicyId, targetAssetName, targetFingerprint,
      KOIOS_URL
    );

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
      error: 'No ' + label + ' balance found for this wallet. You must hold ' + label + ' to vote.',
    });
  } catch (error) {
    log(id, 'catch', { msg: error.message });
    return res.status(500).json({ error: error.message });
  }
}
