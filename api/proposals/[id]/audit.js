import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { id } = req.query;

    const { data: proposal, error: propErr } = await supabase
      .from('proposals')
      .select('id, title, target_policy_id, target_asset_name, snapshot_block, snapshot_slot, created_at')
      .eq('id', id)
      .single();

    if (propErr || !proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const { data: votes, error: votesErr } = await supabase
      .from('votes')
      .select('voter_address, vote_choice, stake_weight, signature_hex, key_hex, created_at')
      .eq('proposal_id', id)
      .order('created_at', { ascending: true });

    if (votesErr) throw votesErr;

    return res.json({
      proposal,
      votes,
      metadata: {
        exportGeneratedAt: new Date().toISOString(),
        totalVoters: votes.length,
        schema: 'https://github.com/cardano-foundation/CIPs/tree/master/CIP-8',
      },
    });
  } catch (error) {
    console.error('Audit error:', error);
    return res.status(500).json({ error: error.message });
  }
}
