import snapshotHandler from './snapshot.js';

export default function handler(req, res) {
  if (req.headers['x-vercel-cron'] !== '1') {
    return res.status(403).json({ error: 'forbidden' });
  }
  req.query = req.query || {};
  req.query.key = process.env.SNAPSHOT_KEY;
  return snapshotHandler(req, res);
}
