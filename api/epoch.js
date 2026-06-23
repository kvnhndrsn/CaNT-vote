import { defaultKoiosUrl, fetchEpochInfo } from '../lib/koios.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const network = process.env.BLOCKFROST_NETWORK || 'mainnet';
  const koiosUrl = process.env.KOIOS_API_URL || defaultKoiosUrl(network);

  try {
    const info = await fetchEpochInfo(koiosUrl);
    if (!info) {
      return res.status(502).json({ error: 'Failed to fetch epoch info from Koios' });
    }
    return res.json(info);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
