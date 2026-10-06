// GET /api/uniform-status  -> 단체복 신청 열림 여부 + 사이즈 목록 (공개)
import { db, getUniformSettings } from './_db.js';

export default async function handler(req, res) {
  const sql = db();
  const st = await getUniformSettings(sql);
  return res.status(200).json({ open: st.enabled, sizes: st.sizes });
}
