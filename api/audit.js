import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured.' });
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');

  try {
    const { proposalId } = req.query;
    if (!proposalId) {
      return res.status(400).json({ error: 'Missing proposalId query param' });
    }

    const { data: proposal, error: propErr } = await supabase
      .from('proposals')
      .select('id, title, target_policy_id, target_asset_name, created_at')
      .eq('id', proposalId)
      .single();

    if (propErr || !proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const { data: votes, error: votesErr } = await supabase
      .from('votes')
      .select('voter_address, vote_choice, stake_weight, split_weights, signature_hex, key_hex, created_at')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: true });

    if (votesErr) throw votesErr;

    // Compute detailed tally
    const tally = {};
    let totalWeight = 0n;
    for (const v of votes) {
      if (v.split_weights) {
        for (const [opt, pct] of Object.entries(v.split_weights)) {
          const alloc = BigInt(Math.floor(Number(BigInt(v.stake_weight)) * Number(pct) / 100));
          tally[opt] = (tally[opt] || 0n) + alloc;
        }
      } else {
        tally[v.vote_choice] = (tally[v.vote_choice] || 0n) + BigInt(v.stake_weight);
      }
      totalWeight += BigInt(v.stake_weight);
    }
    const formattedTally = {};
    for (const [choice, weight] of Object.entries(tally)) {
      formattedTally[choice] = weight.toString();
    }

    return res.json({
      proposal,
      votes: votes.map(v => ({
        ...v,
        split_weights: v.split_weights || null,
      })),
      tally: formattedTally,
      totalWeight: totalWeight.toString(),
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
