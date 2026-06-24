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

    const { address, addresses, stakeAddresses, payload, signature, key, proposalId, choice, splitWeights, tokenUnit } = req.body || {};

    if (!address || !payload || !signature || !key || !proposalId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: proposal, error: proposalErr } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (proposalErr || !proposal) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const pollOptions = proposal.options || ['Yes', 'No', 'Abstain'];
    const votingType = proposal.voting_type || 'standard';
    const allowSplit = proposal.allow_split || false;

    log(id, 'poll-found', { options: pollOptions, votingType, allowSplit });

    // Validate choice(s)
    if (splitWeights && allowSplit) {
      // Vote splitting mode
      if (typeof splitWeights !== 'object') {
        return res.status(400).json({ error: 'splitWeights must be an object' });
      }
      const totalPct = Object.values(splitWeights).reduce((s, v) => s + Number(v), 0);
      if (totalPct <= 0 || totalPct > 100) {
        return res.status(400).json({ error: 'Split weights must sum to 1-100' });
      }
      for (const opt of Object.keys(splitWeights)) {
        if (!pollOptions.includes(opt)) {
          return res.status(400).json({ error: 'Invalid option: ' + opt });
        }
      }
    } else {
      if (!choice) {
        return res.status(400).json({ error: 'Missing vote choice' });
      }
      if (!pollOptions.includes(choice) && !VALID_CHOICES.includes(choice)) {
        return res.status(400).json({ error: 'Invalid choice. Options: ' + pollOptions.join(', ') });
      }
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

    let totalBalance = await checkBalance(
      addrsToCheck, stakeAddresses,
      targetPolicyId, targetAssetName, targetFingerprint,
      KOIOS_URL
    );

    debug.totalBalance = totalBalance.toString();
    log(id, 'balance-done', { total: totalBalance.toString() });

    // Check min balance requirement
    const minBal = BigInt(proposal.min_balance || 0);
    if (totalBalance < minBal) {
      return res.status(403).json({ error: 'Insufficient balance to vote on this poll (minimum: ' + minBal.toString() + ')' });
    }

    if (totalBalance > 0n) {
      // Compute final weight
      let finalWeight = totalBalance;
      if (votingType === 'quadratic') {
        // Quadratic voting: weight = floor(sqrt(balance))
        finalWeight = BigInt(Math.floor(Math.sqrt(Number(totalBalance))));
        if (finalWeight < 1n) finalWeight = 1n;
      }

      const voteData = {
        proposal_id: proposalId,
        voter_address: address,
        signature_hex: signature,
        key_hex: key,
        stake_weight: finalWeight.toString(),
      };

      if (splitWeights && allowSplit) {
        voteData.vote_choice = Object.keys(splitWeights).join(',');
        voteData.split_weights = splitWeights;
      } else {
        voteData.vote_choice = choice;
      }

      const { error: voteErr } = await supabase
        .from('votes')
        .upsert(voteData, { onConflict: 'proposal_id,voter_address' });

      if (voteErr) throw voteErr;

      log(id, 'success', { weight: finalWeight.toString(), type: votingType });
      return res.json({ success: true, stakeWeight: finalWeight.toString(), votingType });
    }

    const label = isADA ? 'ADA' : 'the required token';
    return res.status(403).json({
      error: 'No ' + label + ' balance found for this wallet.',
    });
  } catch (error) {
    log(id, 'catch', { msg: error.message });
    return res.status(500).json({ error: error.message });
  }
}
