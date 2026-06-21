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

  try {
    const { id } = req.query;

    const { data: proposal, error: propErr } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (propErr || !proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const { data: votes, error: votesErr } = await supabase
      .from('votes')
      .select('voter_address, vote_choice, stake_weight, created_at')
      .eq('proposal_id', id);

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
  } catch (error) {
    console.error('Proposal detail error:', error);
    return res.status(500).json({ error: error.message });
  }
}
