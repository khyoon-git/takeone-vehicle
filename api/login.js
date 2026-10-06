// POST /api/login  { password }  -> 관리자 비밀번호 확인
import { readBody } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const { password = '' } = await readBody(req);
  const expected = process.env.ADMIN_PASSWORD || '';
  if (expected && password === expected) return res.status(200).json({ ok: true });
  return res.status(401).json({ ok: false });
}
