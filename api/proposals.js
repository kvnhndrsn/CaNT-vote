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
