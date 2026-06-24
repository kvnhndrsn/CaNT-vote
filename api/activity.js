import { createClient } from '@supabase/supabase-js';

const SURF_API = 'https://surflending.org';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function surfFetch(path) {
  const res = await fetch(SURF_API + path);
  if (!res.ok) return null;
  return res.json();
}

function shortenAddr(addr, chars = 6) {
  return addr.slice(0, chars) + '...' + addr.slice(-chars);
}

export default async function handler(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page) || 50));
    const typeFilter = req.query.type || '';
    const addressFilter = req.query.address || '';

    let query = supabase
      .from('surf_activities')
      .select('*', { count: 'exact' });

    if (typeFilter) {
      query = query.eq('activity_type', typeFilter);
    }
    if (addressFilter) {
      query = query.ilike('address', '%' + addressFilter + '%');
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await query
      .order('activity_time', { ascending: false })
      .range(from, to);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const poolData = await surfFetch('/api/getAllPoolInfos');
    const pools = poolData?.poolInfos || poolData || {};
    const poolMap = {};
    for (const [pid, info] of Object.entries(pools)) {
      const asset = info.asset || {};
      poolMap[pid] = {
        ticker: asset.ticker || '?',
        decimals: asset.decimals || 0,
        price: info.price || 0,
      };
    }

    const enriched = data.map(a => {
      const pool = poolMap[a.pool_id] || {};
      const decimals = pool.decimals || 0;
      const divisor = Math.pow(10, decimals);
      const amountAda = a.amount / divisor;
      const collatAda = a.collateral_amount / divisor;
      return {
        ...a,
        address_short: shortenAddr(a.address),
        pool_ticker: pool.ticker || '?',
        amount_ada: amountAda,
        collateral_ada: collatAda,
        amount_fmt: amountAda >= 1e3 ? amountAda.toLocaleString(undefined, { maximumFractionDigits: 0 }) + 'K'
          : amountAda.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        time_ago: timeAgo(a.activity_time),
        cardanoscan_link: 'https://cardanoscan.io/transaction/' + a.tx_hash,
      };
    });

    return res.json({ data: enriched, total: count, page, per_page: perPage });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + 'd ago';
  return new Date(ts).toLocaleDateString();
}
