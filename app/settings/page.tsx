'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Member, Settings } from '@/types';

export default function SettingsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'idle' | 'ok' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  // Local editable state
  const [memberEdits, setMemberEdits] = useState<Record<string, { name: string; icon: string }>>({});
  const [notifyTime, setNotifyTime] = useState('08:00');
  const [lineGroupId, setLineGroupId] = useState('');
  const [notifyUserId, setNotifyUserId] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/members').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ])
      .then(([m, s]: [Member[], Settings]) => {
        setMembers(m);
        setSettings(s);
        const edits: Record<string, { name: string; icon: string }> = {};
        for (const member of m) edits[member.id] = { name: member.name, icon: member.icon };
        setMemberEdits(edits);
        setNotifyTime(s.morning_notify_time ?? '08:00');
        setLineGroupId(s.line_group_id ?? '');
        setNotifyUserId(s.notify_user_id ?? '');
      })
      .catch(() => {
        setSaveError('データの読み込みに失敗しました。');
        setSaveResult('error');
      });
  }, []);

  const handleSave = async () => {
    // Validate
    for (const m of members) {
      const edit = memberEdits[m.id];
      if (!edit?.name?.trim()) {
        setSaveError(`「${edit?.icon || m.icon}」の名前が空欄です。`);
        setSaveResult('error');
        return;
      }
      if (!edit?.icon?.trim()) {
        setSaveError(`「${edit?.name || m.name}」のアイコンが空欄です。`);
        setSaveResult('error');
        return;
      }
    }
    if (!/^\d{2}:\d{2}$/.test(notifyTime)) {
      setSaveError('通知時間の形式が正しくありません（例: 08:00）');
      setSaveResult('error');
      return;
    }

    setSaving(true);
    setSaveResult('idle');
    setSaveError('');
    try {
      const [settingsRes, ...memberResults] = await Promise.all([
        fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            morning_notify_time: notifyTime,
            line_group_id: lineGroupId || null,
            notify_user_id: notifyUserId || null,
          }),
        }),
        ...members.map((m) =>
          fetch(`/api/members/${m.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(memberEdits[m.id]),
          })
        ),
      ]);

      const failed = [settingsRes, ...memberResults].find((r) => !r.ok);
      if (failed) throw new Error(`サーバーエラー (${failed.status})`);

      setSaveResult('ok');
      setTimeout(() => setSaveResult('idle'), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '保存に失敗しました。');
      setSaveResult('error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    setTestResult('idle');
    setTestError('');
    try {
      const res = await fetch('/api/line/test', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `エラー (${res.status})`);
      }
      setTestResult('ok');
      setTimeout(() => setTestResult('idle'), 4000);
    } catch (e) {
      setTestError(e instanceof Error ? e.message : '送信に失敗しました。');
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  if (!settings && saveResult !== 'error') {
    return <div className="flex justify-center py-16 text-orange-400">読み込み中…</div>;
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <header className="bg-orange-500 text-white px-4 py-3 flex items-center gap-3 shadow">
        <Link href="/" className="text-white text-xl font-bold leading-none">‹</Link>
        <h1 className="text-lg font-bold">設定</h1>
      </header>

      <div className="px-4 py-5 space-y-8">

        {/* Load error */}
        {saveResult === 'error' && !settings && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            ⚠ {saveError}
          </div>
        )}

        {/* Member settings */}
        {settings && (
          <>
            <section>
              <h2 className="text-sm font-bold text-orange-600 uppercase tracking-wide mb-3">
                メンバー
              </h2>
              <div className="space-y-3">
                {members.map((m) => {
                  const edit = memberEdits[m.id] ?? { name: m.name, icon: m.icon };
                  return (
                    <div key={m.id} className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
                      <input
                        value={edit.icon}
                        onChange={(e) =>
                          setMemberEdits((prev) => ({
                            ...prev,
                            [m.id]: { ...prev[m.id], icon: e.target.value },
                          }))
                        }
                        className="text-2xl w-10 text-center border border-gray-200 rounded-lg"
                      />
                      <input
                        value={edit.name}
                        onChange={(e) =>
                          setMemberEdits((prev) => ({
                            ...prev,
                            [m.id]: { ...prev[m.id], name: e.target.value },
                          }))
                        }
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-base"
                        placeholder="名前"
                      />
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Notification time */}
            <section>
              <h2 className="text-sm font-bold text-orange-600 uppercase tracking-wide mb-3">
                朝の通知時間
              </h2>
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                <input
                  type="time"
                  value={notifyTime}
                  onChange={(e) => setNotifyTime(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-base w-full"
                />
                <p className="text-xs text-gray-400 mt-2">
                  設定した時刻と同じ「時」にCronが実行されると通知が送られます。
                  Vercel Hobbyプランで変更する場合は <code className="bg-gray-100 px-1 rounded">vercel.json</code> のスケジュールも更新してください。
                </p>
              </div>
            </section>

            {/* LINE settings */}
            <section>
              <h2 className="text-sm font-bold text-orange-600 uppercase tracking-wide mb-3">
                LINE Bot 設定
              </h2>
              <div className="bg-white rounded-2xl px-4 py-4 shadow-sm space-y-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    料理担当の LINE User ID（プッシュ通知先）
                  </label>
                  <input
                    value={notifyUserId}
                    onChange={(e) => setNotifyUserId(e.target.value)}
                    placeholder="Uxxxxxxxxxxxxxxxxx"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    LINE グループ ID（リプライ応答用）
                  </label>
                  <input
                    value={lineGroupId}
                    onChange={(e) => setLineGroupId(e.target.value)}
                    placeholder="Cxxxxxxxxxxxxxxxxx"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  LINE Developers でチャネルアクセストークンを発行し、環境変数
                  <code className="bg-gray-100 px-1 rounded">LINE_CHANNEL_ACCESS_TOKEN</code> と
                  <code className="bg-gray-100 px-1 rounded">LINE_CHANNEL_SECRET</code> をVercelに設定してください。
                </p>

                {/* Test notification */}
                <div className="pt-1 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">
                    設定が正しいか確認するためにテスト通知を送信できます。
                  </p>
                  <button
                    onClick={handleTestNotification}
                    disabled={testing || !notifyUserId}
                    className={`w-full py-2 rounded-xl text-sm font-medium border transition-colors ${
                      testResult === 'ok'
                        ? 'bg-green-50 border-green-300 text-green-600'
                        : testResult === 'error'
                        ? 'bg-red-50 border-red-300 text-red-600'
                        : testing
                        ? 'bg-gray-50 border-gray-200 text-gray-400'
                        : !notifyUserId
                        ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                        : 'bg-white border-orange-300 text-orange-500 hover:bg-orange-50 active:scale-95'
                    }`}
                  >
                    {testResult === 'ok'
                      ? '✓ 送信しました'
                      : testResult === 'error'
                      ? `⚠ ${testError}`
                      : testing
                      ? '送信中…'
                      : 'テスト通知を送信'}
                  </button>
                  {!notifyUserId && (
                    <p className="text-xs text-gray-400 mt-1">
                      LINE User IDを入力すると送信できます
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Save button + result */}
            <div className="space-y-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`w-full py-3 rounded-2xl text-white font-bold text-base transition-colors ${
                  saveResult === 'ok'
                    ? 'bg-green-500'
                    : saving
                    ? 'bg-orange-300'
                    : 'bg-orange-500 hover:bg-orange-600 active:scale-95'
                }`}
              >
                {saveResult === 'ok' ? '✓ 保存しました' : saving ? '保存中…' : '保存する'}
              </button>
              {saveResult === 'error' && settings && (
                <p className="text-sm text-red-500 text-center">⚠ {saveError}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
