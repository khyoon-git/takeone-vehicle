// 공통 헬퍼 (파일명이 _ 로 시작하면 Vercel이 API 경로로 노출하지 않습니다)
import { neon } from '@neondatabase/serverless';

let _sql;
// 요청 처리 시점에 지연 생성 (빌드 중 환경변수 미주입 문제 방지)
export function db() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

// 관리자 인증: 요청 헤더의 x-admin-key 와 환경변수 ADMIN_PASSWORD 비교
export function isAdmin(req) {
  const key = req.headers['x-admin-key'] || '';
  const expected = process.env.ADMIN_PASSWORD || '';
  return expected.length > 0 && key === expected;
}

// 요청 본문(JSON) 안전 파싱
export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return await new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

// 입력 길이 제한 헬퍼
export const clip = (v, n) => String(v == null ? '' : v).slice(0, n);

// DB row -> 프론트엔드가 쓰는 한글 키 객체로 변환
export function toRecord(r) {
  return {
    id: r.id,
    이름: r.name,
    pin: r.pin,
    관: r.building || '',
    요일: r.day,
    희망수업시간: r.class_time || '',
    등원장소: r.arrive_place || '',
    학교하교시간: r.school_time || '',
    등원방법: r.arrive_method || '',
    하원장소: r.depart_place || '',
    하원방법: r.depart_method || '',
    메모: r.memo || '',
  };
}

// ── 신청 기간 설정 ──
// settings 테이블(key/value)에서 설정을 읽어옵니다. 테이블이 없으면 기본값(항상 열림).
export async function getSettings(sqlc) {
  try {
    const rows = await sqlc`SELECT key, value FROM settings`;
    const m = {};
    rows.forEach((r) => { m[r.key] = r.value; });
    return {
      enabled: m.enabled == null ? true : m.enabled === '1',
      start: m.start_ms ? Number(m.start_ms) : null,
      end: m.end_ms ? Number(m.end_ms) : null,
    };
  } catch {
    return { enabled: true, start: null, end: null };
  }
}

// 현재 신청이 열려 있는지 계산 (start/end 는 epoch ms, KST 기준으로 클라이언트가 변환해 저장)
export function computeOpen(st) {
  const now = Date.now();
  if (!st.enabled) return false;
  if (st.start && now < st.start) return false;
  if (st.end && now > st.end) return false;
  return true;
}

// ── 단체복 신청 설정/변환 ──
export async function getUniformSettings(sqlc) {
  try {
    const rows = await sqlc`SELECT key, value FROM settings WHERE key IN ('uniform_enabled','uniform_sizes')`;
    const m = {};
    rows.forEach((r) => { m[r.key] = r.value; });
    let sizes = [];
    try { sizes = m.uniform_sizes ? JSON.parse(m.uniform_sizes) : []; } catch { sizes = []; }
    if (!Array.isArray(sizes)) sizes = [];
    return { enabled: m.uniform_enabled === '1', sizes };
  } catch {
    return { enabled: false, sizes: [] };
  }
}

export function uToRecord(r) {
  return {
    id: r.id,
    이름: r.name,
    학년: r.grade || '',
    소속관: r.building || '',
    사이즈: r.size || '',
    수량: Number(r.qty) || 0,
    입금자명: r.depositor || '',
    pin: r.pin,
    입금확인: r.paid === true || r.paid === 't' || r.paid === 'true',
    created_at: r.created_at,
  };
}

// ── 테이블 자동 생성 (수동 SQL 없이 동작하도록) ──
// CREATE TABLE IF NOT EXISTS 이므로 이미 있으면 아무 일도 하지 않습니다.
let _schemaReady = false;
export async function ensureSchema(sqlc) {
  if (_schemaReady) return;
  await sqlc`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  )`;
  await sqlc`CREATE TABLE IF NOT EXISTS uniform_orders (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    grade TEXT NOT NULL DEFAULT '',
    building TEXT NOT NULL DEFAULT '',
    size TEXT NOT NULL DEFAULT '',
    qty INTEGER NOT NULL DEFAULT 1,
    depositor TEXT NOT NULL DEFAULT '',
    pin TEXT NOT NULL,
    paid BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sqlc`CREATE INDEX IF NOT EXISTS uniform_name_pin_idx ON uniform_orders (name, pin)`;
  _schemaReady = true;
}

// ── 공지사항(posts) ──
export async function ensurePosts(sqlc) {
  await sqlc`CREATE TABLE IF NOT EXISTS posts (
    id BIGSERIAL PRIMARY KEY,
    board TEXT NOT NULL DEFAULT 'notice',
    category TEXT NOT NULL DEFAULT '공지',
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sqlc`CREATE INDEX IF NOT EXISTS posts_board_idx ON posts (board, pinned DESC, created_at DESC)`;
}
export function pToRecord(r) {
  return {
    id: r.id,
    board: r.board,
    카테고리: r.category || '',
    제목: r.title || '',
    본문: r.body || '',
    상단고정: r.pinned === true || r.pinned === 't' || r.pinned === 'true',
    작성일: r.created_at,
    수정일: r.updated_at,
  };
}
