// 단체복 신청 통합 API (서버리스 함수 수를 줄이기 위해 하나로 통합)
//   GET  /api/uniform?action=status           -> { open, sizes }           (공개)
//   GET  /api/uniform?action=list             -> { orders }                (관리자)
//   POST /api/uniform { action:'create', ... }  -> 신청 등록                 (공개, 열림)
//   POST /api/uniform { action:'lookup', name, pin } -> { orders }          (공개)
//   POST /api/uniform { action:'edit', name, pin, id, size, qty | mode:'delete' } (공개, 본인, 열림)
//   POST /api/uniform { action:'settings', enabled?, sizes? }               (관리자)
//   POST /api/uniform { action:'admin', mode:'delete'|'delete-all'|'paid'|'edit', ... } (관리자)
import { db, isAdmin, readBody, clip, getUniformSettings, uToRecord, ensureSchema } from './_db.js';

export default async function handler(req, res) {
  const sql = db();
  try {
    await ensureSchema(sql);
    if (req.method === 'GET') {
      const action = (req.query && req.query.action) || 'status';
      if (action === 'list') {
        if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
        const rows = await sql`SELECT * FROM uniform_orders ORDER BY created_at ASC, id ASC`;
        return res.status(200).json({ orders: rows.map(uToRecord) });
      }
      const st = await getUniformSettings(sql);
      return res.status(200).json({ open: st.enabled, sizes: st.sizes });
    }

    if (req.method === 'POST') {
      const b = await readBody(req);
      const action = b.action || 'create';

      if (action === 'create') {
        const st = await getUniformSettings(sql);
        if (!st.enabled) return res.status(403).json({ error: '현재 단체복 신청 기간이 아닙니다.' });
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

      if (action === 'lookup') {
        const n = String(b.name || '').trim();
        const p = String(b.pin || '').trim();
        if (!n || !p) return res.status(400).json({ error: '이름과 PIN을 입력해 주세요' });
        const rows = await sql`SELECT * FROM uniform_orders WHERE name=${n} AND pin=${p} ORDER BY id ASC`;
        return res.status(200).json({ orders: rows.map(uToRecord) });
      }

      if (action === 'edit') {
        const st = await getUniformSettings(sql);
        if (!st.enabled) return res.status(403).json({ error: '현재 단체복 신청 기간이 아닙니다.' });
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
      }

      if (action === 'settings') {
        if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
        const ops = [];
        if (typeof b.enabled === 'boolean') ops.push(['uniform_enabled', b.enabled ? '1' : '0']);
        if (Array.isArray(b.sizes)) {
          const seen = new Set();
          const sizes = [];
          for (const s of b.sizes) {
            const v = clip(s, 20).trim();
            if (v && !seen.has(v)) { seen.add(v); sizes.push(v); }
            if (sizes.length >= 40) break;
          }
          ops.push(['uniform_sizes', JSON.stringify(sizes)]);
        }
        for (const [k, v] of ops) {
          await sql`INSERT INTO settings (key, value) VALUES (${k}, ${v})
                    ON CONFLICT (key) DO UPDATE SET value = ${v}`;
        }
        return res.status(200).json({ ok: true });
      }

      if (action === 'admin') {
        if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
        if (b.mode === 'delete-all') { await sql`DELETE FROM uniform_orders`; return res.status(200).json({ ok: true }); }
        const id = parseInt(b.id, 10);
        if (!id) return res.status(400).json({ error: 'id required' });
        if (b.mode === 'delete') { await sql`DELETE FROM uniform_orders WHERE id=${id}`; return res.status(200).json({ ok: true }); }
        if (b.mode === 'paid') { await sql`UPDATE uniform_orders SET paid=${!!b.paid} WHERE id=${id}`; return res.status(200).json({ ok: true }); }
        if (b.mode === 'edit') {
          const size = clip(b.size, 20).trim();
          const qty = Math.max(1, Math.min(99, parseInt(b.qty, 10) || 0));
          await sql`UPDATE uniform_orders SET size=${size}, qty=${qty} WHERE id=${id}`;
          return res.status(200).json({ ok: true });
        }
        return res.status(400).json({ error: 'invalid mode' });
      }

      return res.status(400).json({ error: 'invalid action' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
