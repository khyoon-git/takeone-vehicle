// GET  /api/uniform  -> 전체 단체복 신청 목록 (관리자 전용)
// POST /api/uniform  -> 단체복 신청 등록 (공개, 신청 열림 상태에서만)
import { db, isAdmin, readBody, clip, getUniformSettings, uToRecord } from './_db.js';

export default async function handler(req, res) {
  const sql = db();
  try {
    if (req.method === 'GET') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
      const rows = await sql`SELECT * FROM uniform_orders ORDER BY created_at ASC, id ASC`;
      return res.status(200).json({ orders: rows.map(uToRecord) });
    }

    if (req.method === 'POST') {
      const st = await getUniformSettings(sql);
      if (!st.enabled) return res.status(403).json({ error: '현재 단체복 신청 기간이 아닙니다.' });

      const b = await readBody(req);
      const name = clip(b.name, 20).trim();
      const grade = clip(b.grade, 20).trim();
      const building = clip(b.building, 10).trim();
      const size = clip(b.size, 20).trim();
      const qty = Math.max(1, Math.min(99, parseInt(b.qty, 10) || 0));
      const depositor = clip(b.depositor, 20).trim();
      const pin = String(b.pin || '').trim();

      if (!name) return res.status(400).json({ error: '이름을 입력해 주세요' });
      if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'PIN은 숫자 4자리여야 합니다' });
      if (!size || !st.sizes.includes(size)) return res.status(400).json({ error: '사이즈를 선택해 주세요' });
      if (!qty) return res.status(400).json({ error: '수량을 선택해 주세요' });

      const rows = await sql`
        INSERT INTO uniform_orders (name, grade, building, size, qty, depositor, pin, paid)
        VALUES (${name}, ${grade}, ${building}, ${size}, ${qty}, ${depositor}, ${pin}, false)
        RETURNING id`;
      return res.status(200).json({ ok: true, id: rows[0] && rows[0].id });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
