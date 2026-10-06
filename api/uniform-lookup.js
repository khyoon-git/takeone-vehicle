// POST /api/uniform-lookup  { name, pin }  -> 해당 신청자의 단체복 신청 내역 (공개)
import { db, readBody, uToRecord } from './_db.js';

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
    const rows = await sql`SELECT * FROM uniform_orders WHERE name=${n} AND pin=${p} ORDER BY id ASC`;
    return res.status(200).json({ orders: rows.map(uToRecord) });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
