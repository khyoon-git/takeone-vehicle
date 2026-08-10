// GET /api/status  -> 현재 신청 열림 여부 + 기간 정보 (공개)
import { db, getSettings, computeOpen } from './_db.js';

export default async function handler(req, res) {
  const sql = db();
  const st = await getSettings(sql);
  return res.status(200).json({
    open: computeOpen(st),
    enabled: st.enabled,
    start: st.start,
    end: st.end,
  });
}
