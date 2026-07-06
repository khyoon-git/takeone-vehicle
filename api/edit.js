// POST /api/edit  { name, pin, days:[...] }
// 해당 이름+PIN의 기존 신청을 모두 지우고 새 내용으로 교체 (공개, 본인 PIN 확인)
import { db, readBody } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const sql = db();
  try {
    const body = await readBody(req);
    const name = String(body.name || '').trim();
    const pin = String(body.pin || '').trim();
    const days = Array.isArray(body.days) ? body.days : [];
    if (!name || !pin) return res.status(400).json({ error: '이름과 PIN이 필요합니다' });

    // 본인 확인: 같은 이름+PIN 레코드가 하나 이상 있어야 수정 허용
    const own = await sql`SELECT 1 FROM records WHERE name=${name} AND pin=${pin} LIMIT 1`;
    if (own.length === 0) return res.status(403).json({ error: '수정 권한이 없습니다' });

    await sql`DELETE FROM records WHERE name=${name} AND pin=${pin}`;
    for (const d of days) {
      const day = String(d.day || '');
      if (!day) continue;
      // 혹시 같은 이름+요일이 다른 PIN으로 남아있으면 제거(유니크 인덱스 보호)
      await sql`DELETE FROM records WHERE name=${name} AND day=${day}`;
      await sql`
        INSERT INTO records
          (name, pin, day, class_time, arrive_place, school_time, arrive_method, depart_place, depart_method)
        VALUES
          (${name}, ${pin}, ${day}, ${d.time || ''}, ${d.arrLoc || ''}, ${d.schoolTime || ''}, ${d.arrMethod || ''}, ${d.depLoc || ''}, ${d.depMethod || ''})
      `;
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
