import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.' });
  }

  try {
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

        return res.json({
          ...proposal,
          voterCount: votes.length,
          totalWeight: totalWeight.toString(),
          tally: formattedTally,
        });
      }

      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'POST') {
      let { title, description, targetPolicyId, targetAssetName, snapshotBlock, creatorAddress } = req.body;

      if (!title || !description || !targetPolicyId || !creatorAddress) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const blockfrostUrl = `https://cardano-${process.env.BLOCKFROST_NETWORK || 'mainnet'}.blockfrost.io/api/v0`;
      const blockfrostHeaders = { project_id: process.env.BLOCKFROST_API_KEY || '' };

      let snapshotSlot = 0;
      if (!snapshotBlock) {
        try {
          const tipResp = await fetch(`${blockfrostUrl}/blocks/latest`, { headers: blockfrostHeaders });
          if (tipResp.ok) {
            const tip = await tipResp.json();
            snapshotBlock = tip.height || tip.block;
            snapshotSlot = tip.slot || 0;
          }
        } catch {
          return res.status(500).json({ error: 'Could not fetch latest block. Provide a snapshot block or set BLOCKFROST_API_KEY.' });
        }
      } else {
        try {
          const tipResp = await fetch(`${blockfrostUrl}/blocks/${snapshotBlock}`, { headers: blockfrostHeaders });
          if (tipResp.ok) {
            const block = await tipResp.json();
            snapshotSlot = block.slot || 0;
          }
        } catch {
          // non-critical
        }
      }

      const { data, error } = await supabase
        .from('proposals')
        .insert({
          title,
          description,
          target_policy_id: targetPolicyId,
          target_asset_name: targetAssetName || '',
          snapshot_block: snapshotBlock,
          snapshot_slot: snapshotSlot,
          creator_address: creatorAddress,
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Proposals error:', error);
    return res.status(500).json({ error: error.message });
  }
}
