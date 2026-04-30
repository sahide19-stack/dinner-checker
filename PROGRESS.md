# 晩ごはんチェッカー 進捗

## Phase 1 MVP - 完了 ✅
**完了日: 2026-04-29**

### 実装済み
- [x] Next.js 16 (App Router) + TypeScript + Tailwind プロジェクト作成
- [x] Supabase クライアント設定 (`lib/supabase.ts`)
- [x] DBスキーマ (`supabase/schema.sql`) — members / dinner_schedule / settings
- [x] API Routes
  - [x] `GET /api/members`
  - [x] `GET /api/schedules?month=YYYY-MM`
  - [x] `POST /api/schedules`
  - [x] `DELETE /api/schedules/[id]`
  - [x] `GET /api/settings`
  - [x] `PUT /api/settings`
- [x] UI コンポーネント
  - [x] `MemberSelector` — メンバー選択タブ
  - [x] `Calendar` — 月表示カレンダー（過去日無効、今日ハイライト、✗マーク）
  - [x] `TodaySummary` — 固定フッター「いる/いない」
- [x] 楽観的UI更新
- [x] `npm run build` 通過

### 起動手順
1. Supabaseプロジェクト作成
2. `supabase/schema.sql` をSQL Editorで実行
3. `.env.local.example` → `.env.local` にコピーしてURLとAnon Keyを記入
4. `npm run dev`

---

## Phase 2 LINE連携 - 完了 ✅
**完了日: 2026-04-29**

### 実装済み
- [x] `lib/line.ts` — LINE クライアント + 通知ヘルパー + メッセージフォーマッター
- [x] `app/api/line/webhook/route.ts` — Webhook受信・署名検証・リプライ応答
  - 「今日」「明日」「今週」コマンドに返信
- [x] `app/api/cron/morning/route.ts` — 朝のまとめプッシュ通知
- [x] `vercel.json` — Vercel Cron 毎朝8:00 JST（UTC 23:00）
- [x] 変更時の即時プッシュ通知（POST/DELETE schedules に組み込み）
- [x] `PUT /api/members/[id]` — メンバー名・アイコン更新
- [x] `/settings` ページ — 通知時間・LINE ID・メンバー名/アイコン編集
- [x] `npm run build` 通過

### LINE Bot セットアップ手順
1. [LINE Developers](https://developers.line.biz/) でMessaging APIチャネル作成
2. チャネルアクセストークン（長期）を発行
3. Webhook URL: `https://dinner-checker.vercel.app/api/line/webhook`
4. Botをグループに招待、グループIDを取得
5. 料理担当のUser IDを取得
6. Vercelに環境変数を設定（`.env.local.example` 参照）

### 必要な環境変数（Phase 2追加分）
```
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
LINE_NOTIFY_USER_ID=U...   # 料理担当のUser ID
LINE_GROUP_ID=C...         # グループID（リプライ用）
NEXT_PUBLIC_APP_URL=https://dinner-checker.vercel.app
CRON_SECRET=...            # Vercelが自動設定
```

---

## Phase 3 改善 - 完了 ✅
**完了日: 2026-04-29**

### 実装済み
- [x] PWA対応 — `public/manifest.json` + `public/icon.svg` + layout.tsxにメタタグ
  - `display: standalone` でアプリライクに起動
  - iOS: `apple-mobile-web-app-capable` 対応
- [x] 翌月末まで制限 — `›` ボタンを翌月到達時にdisabled化
- [x] 週表示モード — `components/WeekView.tsx`
  - 月/週トグルボタン
  - 週をまたぐ場合は両月のスケジュールを取得
  - 7日分のグリッド + 日別詳細リスト（いる/いない一覧）

---

## バグ修正・改善 - 完了 ✅
**完了日: 2026-04-29**

### 修正内容
- [x] `notify_user_id` をDBから優先取得（env varはフォールバック）
  - 設定画面で変更 → 即反映されるように
- [x] `morning_notify_time` をDB設定に従うように修正
  - cronを毎時実行 (`0 * * * *`) に変更
  - `isMorningNotifyTime()` で ±29分ウィンドウ内かチェック（JST換算）
- [x] `今週` コマンドのクエリ効率化: 7回個別クエリ → 1回の範囲クエリ+メモリ上でフィルタ
- [x] 「今日」クイック戻りボタン: 別月/週に移動したときヘッダーに表示

---

## 仕上げ - 完了 ✅
**完了日: 2026-04-29**

### 対応内容
- [x] README.md を書き直し（セットアップ手順・Vercelデプロイ・LINE Bot設定・構成図・コスト表）
- [x] Supabase RLS ポリシーを `supabase/schema.sql` に追加
  - `members`: SELECT + UPDATE のみ（INSERT/DELETE不可）
  - `dinner_schedule`: SELECT / INSERT / DELETE（UPSERTのため UPDATE は不要）
  - `settings`: SELECT + UPDATE のみ
- [x] メインページにエラーハンドリング追加
  - API失敗時に赤いバナーで「⚠ エラーメッセージ + 再読み込みボタン」を表示
  - 保存失敗時もエラー表示してスケジュールを再取得

---

## バグ修正・仕上げ 2 - 完了 ✅
**完了日: 2026-04-29**

### 修正内容
- [x] **重大バグ修正**: `dinner_schedule` RLSにUPDATEポリシーを追加
  - `upsert`（INSERT ON CONFLICT UPDATE）はUPDATEポリシーも必要
  - これがないとRLS有効環境で2回目以降の同じ日の登録が失敗する
- [x] 設定画面のエラーハンドリング強化
  - `handleSave`でtry/catchを追加し、失敗時に赤いエラーメッセージを表示
  - 各APIレスポンスのステータスコードも検証
- [x] 設定画面に「テスト通知を送信」ボタンを追加
  - `POST /api/line/test` ルートを新規作成（時刻チェックなしで即送信）
  - User IDが未入力時はボタンをdisable
  - 送信結果（成功/失敗/エラー詳細）をボタン上でフィードバック

---

## バグ修正・仕上げ 3 - 完了 ✅
**完了日: 2026-04-29**

### 修正内容
- [x] `isMorningNotifyTime` のロジック修正
  - ±29分窓 → 「現在のJST時（hour）=== 設定時（hour）」の単純比較に変更
  - 08:30設定時に08:00/09:00cronどちらにも引っかからないデッドゾーンを解消
- [x] `vercel.json` を日次cron（`0 23 * * *`）に戻す
  - Vercel Hobbyプランは日次cronのみサポート
  - 時刻変更する場合のvercel.json更新手順を設定画面ヒントに追加
- [x] `now` を `useRef` で安定化（`page.tsx`）
  - マウント時の日付を固定参照、再レンダーで再生成されなくなった
- [x] 設定ページにバリデーション追加
  - メンバー名・アイコンの空欄チェック
  - 通知時間のフォーマット検証（HH:MM形式）
  - エラーは保存実行前にインライン表示
- [x] カスタム404ページ追加（`app/not-found.tsx`）
  - アプリのデザインに合った暖色系404

---

## 最終レビュー・修正 - 完了 ✅
**完了日: 2026-04-29**

### 修正内容
- [x] 週表示フェッチで `r.ok` チェック漏れを修正（`page.tsx`）
  - 月表示は検証済みだったが週表示の並列フェッチが未検証だった
- [x] `PUT /api/members/[id]` の `icon` バリデーション追加
  - `name` のみ必須チェックしていたが `icon` も同様に必須
- [x] `updated_at` をDBトリガーで自動管理するよう変更
  - `supabase/schema.sql` に `update_updated_at()` トリガー関数を追加
  - APIの upsert payload から `updated_at` を除去（DBに委ねる）

## 完成状態
コードは完成。残りはすべて外部サービスの設定作業のみ：
1. Supabase プロジェクト作成 → `schema.sql` 実行
2. Vercel デプロイ → 環境変数設定
3. LINE Bot 作成 → Webhook URL 設定 → グループ招待
4. 設定画面でテスト通知送信して動作確認
