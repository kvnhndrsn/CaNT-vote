import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured.' });
  }
  if (!process.env.BLOCKFROST_API_KEY) {
    return res.status(500).json({ error: 'Blockfrost not configured.' });
  }

  try {
    const { address, payload, signature, key, proposalId, choice } = req.body;

    if (!address || !payload || !signature || !key || !proposalId || !choice) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: proposal, error: proposalErr } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (proposalErr || !proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const assetId = `${proposal.target_policy_id}${proposal.target_asset_name}`;
    const blockfrostUrl = `https://cardano-${process.env.BLOCKFROST_NETWORK || 'mainnet'}.blockfrost.io/api/v0`;
    const headers = { project_id: process.env.BLOCKFROST_API_KEY };

    let totalBalance = 0n;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = `${blockfrostUrl}/addresses/${address}/utxos/${assetId}?page=${page}&count=100`;
      const resp = await fetch(url, { headers });
      if (!resp.ok) break;
      const utxos = await resp.json();
      if (!Array.isArray(utxos) || utxos.length === 0) break;

      for (const utxo of utxos) {
        if (utxo.block_height <= proposal.snapshot_block) {
          const amount = utxo.amount.find(a => a.unit === assetId);
          if (amount) totalBalance += BigInt(amount.quantity);
        }
      }
      hasMore = utxos.length === 100;
      page++;
    }

    if (totalBalance <= 0n) {
      return res.status(403).json({ error: 'No token balance held at snapshot block' });
    }

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

    return res.json({
      success: true,
      stakeWeight: totalBalance.toString(),
    });
  } catch (error) {
    console.error('Vote error:', error);
    return res.status(400).json({ error: error.message });
  }
}
