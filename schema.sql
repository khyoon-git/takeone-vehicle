-- 차량 신청 데이터베이스 스키마
-- Neon SQL Editor(또는 Vercel 대시보드 → Storage → Query)에 붙여넣고 실행하세요.

CREATE TABLE IF NOT EXISTS records (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,              -- 학생 이름
  pin           TEXT NOT NULL,              -- 4자리 PIN
  day           TEXT NOT NULL,              -- 요일 (월요일 ~ 금요일)
  class_time    TEXT NOT NULL DEFAULT '',   -- 희망 수업 시간
  arrive_place  TEXT NOT NULL DEFAULT '',   -- 등원 장소
  school_time   TEXT NOT NULL DEFAULT '',   -- 학교 하교 시간 (예: "3시:30분")
  arrive_method TEXT NOT NULL DEFAULT '',   -- 등원 방법
  depart_place  TEXT NOT NULL DEFAULT '',   -- 하원 장소
  depart_method TEXT NOT NULL DEFAULT '',   -- 하원 방법
  memo          TEXT NOT NULL DEFAULT '',   -- 자유 메모
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 한 학생은 한 요일에 하나의 신청만 갖도록(같은 이름+요일 재신청 시 덮어쓰기)
CREATE UNIQUE INDEX IF NOT EXISTS records_name_day_uidx ON records (name, day);

-- 조회 속도용 인덱스
CREATE INDEX IF NOT EXISTS records_name_pin_idx ON records (name, pin);
