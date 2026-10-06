// POST /api/uniform-edit  (공개, 본인 PIN 확인, 신청 열림 상태에서만)
//   { name, pin, id, size, qty }            -> 사이즈/수량 수정
//   { name, pin, id, mode:'delete' }        -> 본인 신청 취소(삭제)
import { db, readBody, clip, getUniformSettings } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const sql = db();
  try {
    const st = await getUniformSettings(sql);
    if (!st.enabled) return res.status(403).json({ error: '현재 단체복 신청 기간이 아닙니다.' });

    const b = await readBody(req);
    const name = String(b.name || '').trim();
    const pin = String(b.pin || '').trim();
    const id = parseInt(b.id, 10);
    if (!name || !pin || !id) return res.status(400).json({ error: '잘못된 요청입니다' });

    const own = await sql`SELECT 1 FROM uniform_orders WHERE id=${id} AND name=${name} AND pin=${pin} LIMIT 1`;
    if (own.length === 0) return res.status(403).json({ error: '수정 권한이 없습니다' });

    if (b.mode === 'delete') {
      await sql`DELETE FROM uniform_orders WHERE id=${id} AND name=${name} AND pin=${pin}`;
      return res.status(200).json({ ok: true });
    }

    const size = clip(b.size, 20).trim();
    const qty = Math.max(1, Math.min(99, parseInt(b.qty, 10) || 0));
    if (!size || !st.sizes.includes(size)) return res.status(400).json({ error: '사이즈를 선택해 주세요' });
    await sql`UPDATE uniform_orders SET size=${size}, qty=${qty} WHERE id=${id} AND name=${name} AND pin=${pin}`;
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
