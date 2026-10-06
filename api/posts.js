// 게시판(공지사항 등) 통합 API
//   GET  /api/posts?board=notice            -> { posts }  (공개, 목록)
//   GET  /api/posts?id=123                   -> { post }   (공개, 단건)
//   POST /api/posts { action:'create', board, category, title, body, pinned }  (관리자)
//   POST /api/posts { action:'update', id, category, title, body, pinned }      (관리자)
//   POST /api/posts { action:'delete', id }                                     (관리자)
import { db, isAdmin, readBody, clip, ensurePosts, pToRecord } from './_db.js';

export default async function handler(req, res) {
  const sql = db();
  try {
    await ensurePosts(sql);

    if (req.method === 'GET') {
      const id = req.query && req.query.id ? parseInt(req.query.id, 10) : 0;
      if (id) {
        const rows = await sql`SELECT * FROM posts WHERE id=${id} LIMIT 1`;
        if (!rows.length) return res.status(404).json({ error: 'not found' });
        return res.status(200).json({ post: pToRecord(rows[0]) });
      }
      const board = clip((req.query && req.query.board) || 'notice', 20);
      const rows = await sql`SELECT * FROM posts WHERE board=${board} ORDER BY pinned DESC, created_at DESC`;
      return res.status(200).json({ posts: rows.map(pToRecord) });
    }

    if (req.method === 'POST') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
      const b = await readBody(req);
      const action = b.action || 'create';

      if (action === 'delete') {
        const id = parseInt(b.id, 10);
        if (!id) return res.status(400).json({ error: 'id required' });
        await sql`DELETE FROM posts WHERE id=${id}`;
        return res.status(200).json({ ok: true });
      }

      const board = clip(b.board || 'notice', 20);
      const category = clip(b.category || '공지', 20);
      const title = clip(b.title || '', 100).trim();
      const body = clip(b.body || '', 5000);
      const pinned = !!b.pinned;
      if (!title) return res.status(400).json({ error: '제목을 입력해 주세요' });

      if (action === 'create') {
        const rows = await sql`
          INSERT INTO posts (board, category, title, body, pinned)
          VALUES (${board}, ${category}, ${title}, ${body}, ${pinned})
          RETURNING id`;
        return res.status(200).json({ ok: true, id: rows[0] && rows[0].id });
      }
      if (action === 'update') {
        const id = parseInt(b.id, 10);
        if (!id) return res.status(400).json({ error: 'id required' });
        await sql`UPDATE posts SET category=${category}, title=${title}, body=${body}, pinned=${pinned}, updated_at=now() WHERE id=${id}`;
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: 'invalid action' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
