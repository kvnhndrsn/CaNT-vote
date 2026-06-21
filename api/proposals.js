import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function ipfsToHttp(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('ipfs://')) return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  return url;
}

function formatAssetId(proposal) {
  if (!proposal.target_policy_id) return null;
  return `${proposal.target_policy_id}${proposal.target_asset_name || ''}`;
}

async function fetchAssetInfo(assetId) {
  if (!assetId) return null;
  const bfUrl = `https://cardano-${process.env.BLOCKFROST_NETWORK || 'mainnet'}.blockfrost.io/api/v0`;
  const bfKey = process.env.BLOCKFROST_API_KEY;
  if (!bfKey) return null;
  try {
    const resp = await fetch(`${bfUrl}/assets/${assetId}`, {
      headers: { project_id: bfKey },
    });
    if (!resp.ok) return null;
    const info = await resp.json();
    return {
      supply: info.quantity,
      name: info.onchain_metadata?.name || null,
      image: ipfsToHttp(info.onchain_metadata?.image || null),
    };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured.' });
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

        const assetId = formatAssetId(proposal);
        const assetInfo = await fetchAssetInfo(assetId);

        return res.json({
          ...proposal,
          voterCount: votes.length,
          totalWeight: totalWeight.toString(),
          tally: formattedTally,
          circulatingSupply: assetInfo?.supply || null,
          tokenName: assetInfo?.name || null,
          tokenImage: assetInfo?.image || null,
        });
      }

      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data.length === 0) return res.json([]);

      const ids = data.map(p => p.id);
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

      const uniqueAssets = [...new Set(data.map(p => formatAssetId(p)))];
      const assetInfos = {};
      await Promise.all(uniqueAssets.filter(id => id).map(async (assetId) => {
        const info = await fetchAssetInfo(assetId);
        if (info) assetInfos[assetId] = info;
      }));

      data.forEach(p => {
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
        p.circulatingSupply = ai.supply || null;
        p.tokenName = ai.name || null;
        p.tokenImage = ai.image || null;
      });

      return res.json(data);
    }

    if (req.method === 'POST') {
      let { title, description, targetPolicyId, targetAssetName, snapshotBlock, creatorAddress } = req.body;

      if (!title || !description || !creatorAddress) {
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
