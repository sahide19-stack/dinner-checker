'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Calendar from '@/components/Calendar';
import WeekView from '@/components/WeekView';
import MemberSelector from '@/components/MemberSelector';
import TodaySummary from '@/components/TodaySummary';
import { DinnerSchedule, Member } from '@/types';

function formatMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function getWeekStart(d: Date): Date {
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay()); // back to Sunday
  start.setHours(0, 0, 0, 0);
  return start;
}

export default function Home() {
  // Stable reference to "today at mount time" — avoids stale comparisons on re-renders
  const nowRef = useRef(new Date());
  const now = nowRef.current;
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Month view state
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Week view state
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(now));

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [schedules, setSchedules] = useState<DinnerSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch members on mount
  useEffect(() => {
    fetch('/api/members')
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data: Member[]) => {
        setMembers(data);
        if (data.length > 0) setSelectedMemberId(data[0].id);
      })
      .catch((e) => {
        console.error(e);
        setError('データの読み込みに失敗しました。環境変数の設定を確認してください。');
      });
  }, []);

  // Fetch schedules — month view uses year/month; week view uses the week's month
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (viewMode === 'month') {
        const res = await fetch(`/api/schedules?month=${formatMonth(year, month)}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const data: DinnerSchedule[] = await res.json();
        setSchedules(data);
      } else {
        // Week may span two months — fetch both if needed
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const startMonth = formatMonth(weekStart.getFullYear(), weekStart.getMonth() + 1);
        const endMonth = formatMonth(weekEnd.getFullYear(), weekEnd.getMonth() + 1);
        const months = startMonth === endMonth ? [startMonth] : [startMonth, endMonth];
        const results = await Promise.all(
          months.map((m) =>
            fetch(`/api/schedules?month=${m}`).then((r) => {
              if (!r.ok) throw new Error(`${r.status}`);
              return r.json();
            })
          )
        );
        setSchedules(results.flat() as DinnerSchedule[]);
      }
    } catch (e) {
      console.error(e);
      setError('スケジュールの読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [viewMode, year, month, weekStart]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleToggle = useCallback(
    async (date: string) => {
      const existing = schedules.find(
        (s) => s.member_id === selectedMemberId && s.date === date
      );

      if (existing) {
        setSchedules((prev) => prev.filter((s) => s.id !== existing.id));
      } else {
        const optimistic: DinnerSchedule = {
          id: -Date.now(),
          member_id: selectedMemberId,
          date,
          status: 'absent',
          updated_at: new Date().toISOString(),
          updated_by: selectedMemberId,
        };
        setSchedules((prev) => [...prev, optimistic]);
      }

      try {
        if (existing) {
          await fetch(`/api/schedules/${existing.id}`, { method: 'DELETE' });
        } else {
          const res = await fetch('/api/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: selectedMemberId, date }),
          });
          const saved: DinnerSchedule = await res.json();
          setSchedules((prev) =>
            prev.map((s) =>
              s.member_id === selectedMemberId && s.date === date && s.id < 0 ? saved : s
            )
          );
        }
      } catch (e) {
        console.error(e);
        setError('保存に失敗しました。再度お試しください。');
        fetchSchedules();
      }
    },
    [schedules, selectedMemberId, fetchSchedules]
  );

  // Month navigation (limit: next month)
  const nextMonthLimit = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  })();
  const isAtLimit = year === nextMonthLimit.year && month === nextMonthLimit.month;

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (isAtLimit) return;
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  // Week navigation
  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    // Limit: week must start within next month
    const limitDate = new Date(nextMonthLimit.year, nextMonthLimit.month, 0); // last day of next month
    if (d > limitDate) return;
    setWeekStart(d);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const isWeekAtLimit = (() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    const limitDate = new Date(nextMonthLimit.year, nextMonthLimit.month, 0);
    return d > limitDate;
  })();

  const weekLabel = (() => {
    const s = weekStart;
    const e = weekEnd;
    if (s.getMonth() === e.getMonth()) {
      return `${s.getFullYear()}年${s.getMonth() + 1}月 ${s.getDate()}〜${e.getDate()}日`;
    }
    return `${s.getMonth() + 1}/${s.getDate()} 〜 ${e.getMonth() + 1}/${e.getDate()}`;
  })();

  // Show "今日" button when navigated away from today's month/week
  const todayWeekStart = getWeekStart(now);
  const isOnToday =
    viewMode === 'month'
      ? year === now.getFullYear() && month === now.getMonth() + 1
      : weekStart.getTime() === todayWeekStart.getTime();

  const goToToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setWeekStart(todayWeekStart);
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen pb-32">
      {/* Header */}
      <header className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between shadow">
        <h1 className="text-lg font-bold tracking-wide">🍱 晩ごはんチェッカー</h1>
        <div className="flex items-center gap-3">
          {!isOnToday && (
            <button
              onClick={goToToday}
              className="text-xs bg-white text-orange-500 font-bold px-2 py-1 rounded-full"
            >
              今日
            </button>
          )}
          <Link href="/settings" className="text-white text-sm opacity-80 hover:opacity-100">
            ⚙ 設定
          </Link>
        </div>
      </header>

      {/* Member Selector */}
      <MemberSelector
        members={members}
        selectedMemberId={selectedMemberId}
        onSelect={setSelectedMemberId}
      />

      {/* View toggle + Navigation */}
      <div className="flex items-center justify-between px-4 py-2 gap-2">
        {/* Prev */}
        <button
          onClick={viewMode === 'month' ? prevMonth : prevWeek}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-white border border-orange-300 text-orange-500 font-bold text-lg hover:bg-orange-50 active:scale-95"
        >
          ‹
        </button>

        {/* Label + toggle */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <h2 className="text-sm font-bold text-gray-800 leading-none">
            {viewMode === 'month' ? `${year}年 ${month}月` : weekLabel}
          </h2>
          <div className="flex rounded-full border border-orange-200 overflow-hidden text-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-0.5 transition-colors ${
                viewMode === 'month' ? 'bg-orange-500 text-white' : 'bg-white text-orange-400'
              }`}
            >
              月
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-0.5 transition-colors ${
                viewMode === 'week' ? 'bg-orange-500 text-white' : 'bg-white text-orange-400'
              }`}
            >
              週
            </button>
          </div>
        </div>

        {/* Next */}
        <button
          onClick={viewMode === 'month' ? nextMonth : nextWeek}
          disabled={viewMode === 'month' ? isAtLimit : isWeekAtLimit}
          className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full border font-bold text-lg transition-colors ${
            (viewMode === 'month' ? isAtLimit : isWeekAtLimit)
              ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
              : 'bg-white border-orange-300 text-orange-500 hover:bg-orange-50 active:scale-95'
          }`}
        >
          ›
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-3 mb-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-start gap-2">
          <span className="text-base leading-none mt-0.5">⚠</span>
          <div className="flex-1">
            <p>{error}</p>
          </div>
          <button
            onClick={fetchSchedules}
            className="text-xs text-red-500 underline whitespace-nowrap"
          >
            再読み込み
          </button>
        </div>
      )}

      {/* Calendar / Week View */}
      {loading ? (
        <div className="flex justify-center py-12 text-orange-400">読み込み中…</div>
      ) : viewMode === 'month' ? (
        <Calendar
          year={year}
          month={month}
          schedules={schedules}
          members={members}
          selectedMemberId={selectedMemberId}
          onToggle={handleToggle}
        />
      ) : (
        <WeekView
          weekStart={weekStart}
          schedules={schedules}
          members={members}
          selectedMemberId={selectedMemberId}
          onToggle={handleToggle}
        />
      )}

      {/* Today Summary (fixed bottom) */}
      <TodaySummary members={members} schedules={schedules} />
    </div>
  );
}
