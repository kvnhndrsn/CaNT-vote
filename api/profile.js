import { createClient } from '@supabase/supabase-js';

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
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ error: 'Missing address query param' });
    }

    // Get all votes by this address (without split_weights — handled later)
    const { data: votes, error: votesErr } = await supabase
      .from('votes')
      .select('proposal_id, vote_choice, stake_weight, created_at')
      .eq('voter_address', address)
      .order('created_at', { ascending: false });

    if (votesErr) throw votesErr;

    // Get all proposals this address has voted on
    const propIds = [...new Set(votes.map(v => v.proposal_id))];
    const { data: proposals, error: propErr } = await supabase
      .from('proposals')
      .select('id, title, created_at')
      .in('id', propIds.length > 0 ? propIds : ['00000000-0000-0000-0000-000000000000']);

    if (propErr) throw propErr;

    const propMap = {};
    for (const p of proposals || []) {
      propMap[p.id] = p;
    }

    const enrichedVotes = votes.map(v => ({
      ...v,
      proposal: propMap[v.proposal_id] || null,
    }));

    // Get proposals created by this address
    const { data: createdPolls, error: createdErr } = await supabase
      .from('proposals')
      .select('id, title, created_at')
      .eq('creator_address', address)
      .order('created_at', { ascending: false });

    if (createdErr) throw createdErr;

    return res.json({
      address,
      totalVotes: votes.length,
      totalCreated: (createdPolls || []).length,
      votes: enrichedVotes,
      created: createdPolls || [],
    });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ error: error.message });
  }
}
