const HANDLE_POLICY = 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a';

export default async function handler(req, res) {
  const addresses = req.query.addresses ? req.query.addresses.split(',') : [];
  if (addresses.length === 0) return res.json({});
  if (addresses.length > 100) return res.status(400).json({ error: 'Max 100 addresses' });

  try {
    const valid = addresses.filter(a => a && a.startsWith('addr'));
    if (valid.length === 0) return res.json({});

    const koiosUrl = process.env.KOIOS_API_URL || 'https://api.koios.rest/api/v1';
    const resp = await fetch(koiosUrl + '/address_assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _addresses: valid }),
    });
    if (!resp.ok) return res.json({});

    const data = await resp.json();
    const map = {};

    if (!Array.isArray(data)) return res.json(map);

    // Koios v1 returns flat array: [{ address, policy_id, asset_name, quantity }, ...]
    // Handle both flat format and nested { address, asset_list } format
    for (const entry of data) {
      if (entry.asset_list && Array.isArray(entry.asset_list)) {
        // nested format
        const addr = entry.address;
        for (const asset of entry.asset_list) {
          if (asset.policy_id === HANDLE_POLICY) {
            const hex = asset.asset_name || '';
            try {
              const name = decodeURIComponent(hex.replace(/([0-9a-fA-F]{2})/g, '%$1'));
              map[addr] = '$' + name;
            } catch {}
            break;
          }
        }
      } else if (entry.policy_id === HANDLE_POLICY) {
        // flat format
        const hex = entry.asset_name || '';
        try {
          const name = decodeURIComponent(hex.replace(/([0-9a-fA-F]{2})/g, '%$1'));
          map[entry.address] = '$' + name;
        } catch {}
      }
    }

    return res.json(map);
  } catch {
    return res.json({});
  }
}
