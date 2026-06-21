export default async function handler(req, res) {
  return res.json({ ok: true, method: req.method });
}
