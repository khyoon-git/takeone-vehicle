// POST /api/uniform-settings  { enabled?, sizes? }  (관리자 전용)
//   enabled: 신청 받기 on/off (시작/마감)
//   sizes: 신청 가능한 사이즈 배열
import { db, isAdmin, readBody, clip } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });

  const sql = db();
  try {
    const b = await readBody(req);
    const ops = [];
    if (typeof b.enabled === 'boolean') ops.push(['uniform_enabled', b.enabled ? '1' : '0']);
    if (Array.isArray(b.sizes)) {
      const seen = new Set();
      const sizes = [];
      for (const s of b.sizes) {
        const v = clip(s, 20).trim();
        if (v && !seen.has(v)) { seen.add(v); sizes.push(v); }
        if (sizes.length >= 40) break;
      }
      ops.push(['uniform_sizes', JSON.stringify(sizes)]);
    }
    for (const [k, v] of ops) {
      await sql`INSERT INTO settings (key, value) VALUES (${k}, ${v})
                ON CONFLICT (key) DO UPDATE SET value = ${v}`;
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
