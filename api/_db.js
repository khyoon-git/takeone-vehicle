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
