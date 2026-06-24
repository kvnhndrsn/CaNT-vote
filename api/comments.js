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
    if (req.method === 'GET') {
      const { pollId } = req.query;
      if (!pollId) {
        return res.status(400).json({ error: 'Missing pollId query param' });
      }

      const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('proposal_id', pollId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return res.json(comments);
    }

    if (req.method === 'POST') {
      const { pollId, voterAddress, body } = req.body;
      if (!pollId || !voterAddress || !body) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      if (body.length > 2000) {
        return res.status(400).json({ error: 'Comment too long (max 2000 characters)' });
      }

      const { data: poll, error: pollErr } = await supabase
        .from('proposals')
        .select('id')
        .eq('id', pollId)
        .single();

      if (pollErr || !poll) {
        return res.status(404).json({ error: 'Poll not found' });
      }

      const { data, error } = await supabase
        .from('comments')
        .insert({
          proposal_id: pollId,
          voter_address: voterAddress,
          body,
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const { id, voterAddress } = req.body;
      if (!id || !voterAddress) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { data: comment, error: findErr } = await supabase
        .from('comments')
        .select('voter_address')
        .eq('id', id)
        .single();

      if (findErr || !comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      if (comment.voter_address !== voterAddress) {
        return res.status(403).json({ error: 'Only the author can delete this comment' });
      }

      const { error: delErr } = await supabase
        .from('comments')
        .delete()
        .eq('id', id);

      if (delErr) throw delErr;
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Comments error:', error);
    return res.status(500).json({ error: error.message });
  }
}
