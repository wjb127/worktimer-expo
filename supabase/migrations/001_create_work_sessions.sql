-- Work Sessions 테이블 생성
CREATE TABLE IF NOT EXISTS work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration INTEGER DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_work_sessions_date ON work_sessions(date);
CREATE INDEX IF NOT EXISTS idx_work_sessions_end_time ON work_sessions(end_time);

-- RLS (Row Level Security) 활성화
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기/쓰기 가능 (인증 없이 사용할 경우)
-- 나중에 인증 추가 시 이 정책을 수정해야 함
CREATE POLICY "Allow all operations" ON work_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);
