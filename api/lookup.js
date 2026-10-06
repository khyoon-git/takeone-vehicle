// POST /api/lookup  { name, pin }  -> 해당 학생 신청 내역 (공개, PIN 확인)
import { db, readBody, toRecord } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const sql = db();
  try {
    const { name = '', pin = '' } = await readBody(req);
    const n = String(name).trim();
    const p = String(pin).trim();
    if (!n || !p) return res.status(400).json({ error: '이름과 PIN을 입력해 주세요' });

    const rows = await sql`
      SELECT * FROM records
      WHERE name=${n} AND pin=${p}
      ORDER BY id ASC
    `;
    return res.status(200).json({ records: rows.map(toRecord) });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
