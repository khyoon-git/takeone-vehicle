// GET  /api/records  -> 전체 신청 목록 (관리자 전용)
// POST /api/records  -> 신청 등록 (공개). 같은 이름+요일은 새 내용으로 덮어씀.
import { db, isAdmin, readBody, toRecord, clip } from './_db.js';

export default async function handler(req, res) {
  const sql = db();
  try {
    if (req.method === 'GET') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
      const rows = await sql`SELECT * FROM records ORDER BY name ASC, id ASC`;
      return res.status(200).json({ records: rows.map(toRecord) });
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const name = String(body.name || '').trim();
      const pin = String(body.pin || '').trim();
      const building = clip(body.building, 10);
      const memo = String(body.memo || '');
      const days = Array.isArray(body.days) ? body.days : [];

      if (!name) return res.status(400).json({ error: '이름이 필요합니다' });
      if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'PIN은 숫자 4자리여야 합니다' });
      if (days.length === 0) return res.status(400).json({ error: '요일을 선택해 주세요' });

      const overwritten = [];
      for (const d of days) {
        const day = String(d.day || '');
        if (!day) continue;
        const existing = await sql`SELECT 1 FROM records WHERE name=${name} AND day=${day} LIMIT 1`;
        if (existing.length) overwritten.push(day);
        await sql`DELETE FROM records WHERE name=${name} AND day=${day}`;
        await sql`
          INSERT INTO records
            (name, pin, day, class_time, arrive_place, school_time, arrive_method, depart_place, depart_method, memo, building)
          VALUES
            (${name}, ${pin}, ${day}, ${clip(d.time,10)}, ${clip(d.arrLoc,40)}, ${clip(d.schoolTime,20)}, ${clip(d.arrMethod,10)}, ${clip(d.depLoc,40)}, ${clip(d.depMethod,10)}, ${clip(memo,200)}, ${building})
        `;
      }
      return res.status(200).json({ ok: true, overwritten });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
