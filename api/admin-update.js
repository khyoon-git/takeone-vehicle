// POST /api/admin-update  { building, ids:[...] }  (관리자 전용)
// 지정한 레코드들의 관(building)을 일괄 변경
import { db, isAdmin, readBody, clip } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });

  const sql = db();
  try {
    const body = await readBody(req);
    const building = clip(body.building, 10);
    const ids = Array.isArray(body.ids) ? body.ids.filter((x) => x != null) : [];
    if (!ids.length) return res.status(400).json({ error: 'ids required' });
    for (const id of ids) {
      await sql`UPDATE records SET building=${building} WHERE id=${id}`;
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
