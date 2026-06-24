import { createClient } from '@supabase/supabase-js';
import { containsProfanity } from '../lib/profanity.js';
import {
  reqId, log, defaultKoiosUrl, formatAssetId,
  fetchAssetInfo, fetchAdaSupply,
  checkBalance,
} from '../lib/koios.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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

    const network = process.env.BLOCKFROST_NETWORK || 'mainnet';
    const koiosUrl = process.env.KOIOS_API_URL || defaultKoiosUrl(network);

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
        const assetId = formatAssetId(proposal.target_policy_id, proposal.target_asset_name);
        const assetInfo = assetId
          ? await fetchAssetInfo(proposal.target_policy_id, proposal.target_asset_name, koiosUrl)
          : null;
        let adaCirculating = null;
        if (isADA) adaCirculating = await fetchAdaSupply(koiosUrl);

        return res.json({
          ...proposal,
          target_fingerprint: proposal.target_fingerprint || null,
          options: proposal.options || ['Yes', 'No', 'Abstain'],
          category: proposal.category || 'General',
          voting_type: proposal.voting_type || 'standard',
          allow_split: proposal.allow_split || false,
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
        const id = formatAssetId(p.target_policy_id, p.target_asset_name);
        if (id && !assetMap[id]) {
          assetMap[id] = { policy: p.target_policy_id, name: p.target_asset_name };
        }
      }
      const assetInfos = {};
      await Promise.all(Object.entries(assetMap).map(async ([id, { policy, name }]) => {
        const info = await fetchAssetInfo(policy, name, koiosUrl);
        if (info) assetInfos[id] = info;
      }));

      let adaCirculating = null;
      if (active.some(p => !p.target_policy_id)) {
        adaCirculating = await fetchAdaSupply(koiosUrl);
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
        const assetId = formatAssetId(p.target_policy_id, p.target_asset_name);
        const ai = assetInfos[assetId] || {};
        const isADA = !p.target_policy_id;
        p.circulatingSupply = isADA ? adaCirculating : (ai.supply || null);
        p.totalSupply = isADA ? '45000000000000000' : (ai.supply || null);
        p.tokenName = ai.name || null;
        p.tokenImage = ai.image || null;
        p.options = p.options || ['Yes', 'No', 'Abstain'];
        p.category = p.category || 'General';
        p.voting_type = p.voting_type || 'standard';
        p.allow_split = p.allow_split || false;
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

      if (title.length > 500) {
        return res.status(400).json({ error: 'Title too long (max 500 characters)' });
      }
      if (description.length > 5000) {
        return res.status(400).json({ error: 'Description too long (max 5000 characters)' });
      }

      if (containsProfanity(title) || containsProfanity(description)) {
        return res.status(400).json({ error: 'Title or description contains inappropriate language' });
      }

      log(pid, 'check-balance', { targetPolicy: targetPolicyId?.slice(0, 16) || 'ADA' });
      const balance = await checkBalance(
        addresses || [creatorAddress],
        stakeAddresses || [],
        targetPolicyId || '',
        targetAssetName || '',
        null,
        koiosUrl
      );

      log(pid, 'balance-result', { balance: balance.toString() });

      if (balance <= 0n) {
        const label = !targetPolicyId ? 'ADA' : 'this token';
        return res.status(403).json({ error: `You must hold ${label} to create a proposal for it.` });
      }

      let fingerprint = null;
      if (targetPolicyId && targetAssetName) {
        const info = await fetchAssetInfo(targetPolicyId, targetAssetName, koiosUrl);
        if (info && info.fingerprint) fingerprint = info.fingerprint;
      }

      const options = req.body.options || ['Yes', 'No', 'Abstain'];
      const category = req.body.category || 'General';
      const votingType = req.body.votingType || 'standard';
      const allowSplit = !!req.body.allowSplit;

      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: 'At least 2 options required' });
      }
      if (options.length > 8) {
        return res.status(400).json({ error: 'Maximum 8 options allowed' });
      }
      for (const opt of options) {
        if (!opt || opt.length > 100) {
          return res.status(400).json({ error: 'Each option must be 1-100 characters' });
        }
      }

      let snapshotBlock = null;
      if (req.body.snapshotBlock) {
        snapshotBlock = BigInt(req.body.snapshotBlock);
      }

      const { data, error } = await supabase
        .from('proposals')
        .insert({
          title,
          description,
          target_policy_id: targetPolicyId,
          target_asset_name: targetAssetName || '',
          target_fingerprint: fingerprint,
          creator_address: creatorAddress,
          options,
          category,
          voting_type: votingType,
          allow_split: allowSplit,
          snapshot_block: snapshotBlock,
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
