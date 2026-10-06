// POST /api/uniform-admin  (관리자 전용)
//   { mode:'delete', id }        -> 개별 삭제
//   { mode:'delete-all' }        -> 전체 삭제
//   { mode:'paid', id, paid }    -> 입금확인 토글
//   { mode:'edit', id, size, qty } -> 사이즈/수량 수정
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
    if (b.mode === 'delete-all') {
      await sql`DELETE FROM uniform_orders`;
      return res.status(200).json({ ok: true });
    }
    const id = parseInt(b.id, 10);
    if (!id) return res.status(400).json({ error: 'id required' });

    if (b.mode === 'delete') {
      await sql`DELETE FROM uniform_orders WHERE id=${id}`;
      return res.status(200).json({ ok: true });
    }
    if (b.mode === 'paid') {
      await sql`UPDATE uniform_orders SET paid=${!!b.paid} WHERE id=${id}`;
      return res.status(200).json({ ok: true });
    }
    if (b.mode === 'edit') {
      const size = clip(b.size, 20).trim();
      const qty = Math.max(1, Math.min(99, parseInt(b.qty, 10) || 0));
      await sql`UPDATE uniform_orders SET size=${size}, qty=${qty} WHERE id=${id}`;
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: 'invalid mode' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
