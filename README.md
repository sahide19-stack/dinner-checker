# 🍱 晩ごはんチェッカー

家族4人の「今日の晩ごはん、いる／いらない」をWebカレンダーで管理し、LINE Botで料理担当に通知するアプリ。

**コンセプト**: 「いらない日」だけ登録すればOK。デフォルトは全員「いる」。

## スクリーンショット

```
┌─────────────────────────┐
│  🍱 晩ごはんチェッカー  ⚙│
├─────────────────────────┤
│ [パパ] [ママ] [兄] [妹] │
├─────────────────────────┤
│  ◀  2026年5月  ▶  月|週 │
│  日 月 火 水 木 金 土   │
│              1  2       │
│   3  4  5 ✗  7  8  9   │
│  10 11 12 13 14 15 16   │
├─────────────────────────┤
│ 🍚 いる: パパ ママ 妹   │
│ ✗  いない: お兄ちゃん   │
└─────────────────────────┘
```

## 機能

- **カレンダー登録**: 日付をタップするだけ。もう一度タップで解除（トグル式）
- **楽観的UI更新**: APIレスポンス待ちなしで即反映
- **週表示モード**: 月/週 トグルで切り替え可能
- **今日のサマリー**: 画面下部に「いる/いない」を常時表示
- **LINE通知**: 変更時に料理担当へ即時プッシュ通知
- **朝のまとめ**: 設定した時刻に当日の出欠をプッシュ通知
- **LINEリプライ**: 「今日」「明日」「今週」と送ると状況を返信
- **PWA対応**: ホーム画面に追加してアプリのように使える

## セットアップ

### 1. リポジトリをクローン

```bash
git clone <your-repo-url>
cd dinner-checker
npm install
```

### 2. Supabase セットアップ

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. **SQL Editor** を開き `supabase/schema.sql` の内容を実行
3. プロジェクトの **Settings > API** から以下を取得:
   - Project URL
   - anon / public キー

### 3. 環境変数を設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# LINE Bot（後で設定してもOK）
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. 開発サーバー起動

```bash
npm run dev
```

`http://localhost:3000` で確認。

---

## Vercel デプロイ

### 1. Vercel にデプロイ

```bash
npm i -g vercel
vercel
```

または GitHub リポジトリを [Vercel](https://vercel.com) に接続してデプロイ。

### 2. 環境変数を Vercel に設定

Vercel のプロジェクト設定 **Settings > Environment Variables** に以下を追加:

| 変数名 | 値 |
|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseのProject URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabaseのanon key |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINEチャネルアクセストークン |
| `LINE_CHANNEL_SECRET` | LINEチャネルシークレット |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

> `CRON_SECRET` は Vercel が自動的に設定します。

### 3. Vercel Cron の確認

`vercel.json` に毎時実行のCronが設定済みです。DBの **設定画面** で通知時刻を変更すると±30分以内のCron実行時に送信されます。

---

## LINE Bot セットアップ

### 1. チャネル作成

1. [LINE Developers](https://developers.line.biz/) にログイン
2. プロバイダーを作成 → **Messaging API** チャネルを作成
3. **チャネルアクセストークン（長期）** を発行
4. **チャネルシークレット** を確認

### 2. Webhook 設定

- Webhook URL: `https://your-app.vercel.app/api/line/webhook`
- **Webhook の利用** を ON
- **応答メッセージ** を OFF（Botが自動で返信するため）

### 3. Bot を LINE グループに招待

1. Bot を家族のLINEグループに招待
2. グループIDは Webhook ログから確認（任意）

### 4. 料理担当の User ID を取得

LINE Developers の **Messaging API > Bot** ページ、または Webhook ログから確認。

### 5. アプリの設定画面で登録

`/settings` を開き、**料理担当の LINE User ID** を入力して保存。

### リプライコマンド

グループまたは1対1トークでBotに以下のキーワードを送ると返信:

| キーワード | 応答内容 |
|-----------|---------|
| `今日` | 今日の晩ごはん状況 |
| `明日` | 明日の晩ごはん状況 |
| `今週` | 今週7日分の一覧 |

---

## プロジェクト構成

```
app/
  page.tsx                 # メインページ
  settings/page.tsx        # 設定画面
  api/
    schedules/route.ts     # GET(月別) / POST(absent登録)
    schedules/[id]/route.ts  # DELETE
    members/route.ts       # GET
    members/[id]/route.ts  # PUT（名前・アイコン更新）
    settings/route.ts      # GET / PUT
    line/webhook/route.ts  # LINE Webhook
    cron/morning/route.ts  # 朝の通知（毎時Cron）
components/
  Calendar.tsx             # 月表示カレンダー
  WeekView.tsx             # 週表示
  MemberSelector.tsx       # メンバー選択タブ
  TodaySummary.tsx         # 固定フッター
lib/
  supabase.ts              # Supabaseクライアント
  line.ts                  # LINE通知ヘルパー
supabase/
  schema.sql               # DBスキーマ + RLS + 初期データ
```

## 運用コスト

| サービス | 料金 | 備考 |
|---------|------|------|
| Vercel | 無料 | Hobby プラン |
| Supabase | 無料 | 無料枠（500MB/月2GB転送） |
| LINE Messaging API | 無料 | 月200通まで（約45通/月の見込み） |
| **合計** | **¥0** | |
