-- ============================================================
-- テーブル定義
-- ============================================================

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE dinner_schedule (
  id SERIAL PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'absent',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT NOT NULL,
  UNIQUE(member_id, date)
);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  morning_notify_time TEXT NOT NULL DEFAULT '08:00',
  line_group_id TEXT,
  notify_user_id TEXT
);

-- ============================================================
-- 初期データ
-- ============================================================

INSERT INTO members VALUES
  ('papa', 'パパ', '👨', 1),
  ('mama', 'ママ', '👩', 2),
  ('bro', 'お兄ちゃん', '👦', 3),
  ('sis', '妹', '👧', 4);

INSERT INTO settings (id) VALUES (1);

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dinner_schedule_updated_at
  BEFORE UPDATE ON dinner_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row Level Security
-- 認証なし設計のため anon ロールに必要最低限の権限を付与。
-- 将来的に認証を追加する場合はポリシーを絞り込むこと。
-- ============================================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE dinner_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- members: 読み取りと更新（名前・アイコン変更）のみ許可。追加・削除は不可
CREATE POLICY "anon can read members"
  ON members FOR SELECT TO anon USING (true);

CREATE POLICY "anon can update members"
  ON members FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- dinner_schedule: 全操作許可（出欠トグル + upsert のため UPDATE も必須）
CREATE POLICY "anon can read schedules"
  ON dinner_schedule FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert schedules"
  ON dinner_schedule FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update schedules"
  ON dinner_schedule FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon can delete schedules"
  ON dinner_schedule FOR DELETE TO anon USING (true);

-- settings: 読み取りと更新のみ許可（行の追加・削除は不可）
CREATE POLICY "anon can read settings"
  ON settings FOR SELECT TO anon USING (true);

CREATE POLICY "anon can update settings"
  ON settings FOR UPDATE TO anon USING (true) WITH CHECK (true);
