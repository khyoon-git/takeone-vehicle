// POST /api/delete  { mode:'one', id }  또는  { mode:'all' }  (관리자 전용)
import { db, isAdmin, readBody } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });

  const sql = db();
  try {
    const body = await readBody(req);
    if (body.mode === 'all') {
      await sql`DELETE FROM records`;
      return res.status(200).json({ ok: true });
    }
    if (body.mode === 'one' && body.id != null) {
      await sql`DELETE FROM records WHERE id=${body.id}`;
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: 'invalid input' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
