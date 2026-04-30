'use client';

import { DinnerSchedule, Member } from '@/types';

type Props = {
  weekStart: Date; // Sunday of the displayed week
  schedules: DinnerSchedule[];
  members: Member[];
  selectedMemberId: string;
  onToggle: (date: string) => void;
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function WeekView({
  weekStart,
  schedules,
  members,
  selectedMemberId,
  onToggle,
}: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const absentByDate: Record<string, Set<string>> = {};
  for (const s of schedules) {
    if (!absentByDate[s.date]) absentByDate[s.date] = new Set();
    absentByDate[s.date].add(s.member_id);
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div className="px-3 pb-4">
      {/* Header row */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-semibold py-1 ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day) => {
          const dateStr = toDateStr(day);
          day.setHours(0, 0, 0, 0);
          const isPast = day < today;
          const isToday = day.getTime() === today.getTime();
          const absentMembers = absentByDate[dateStr] ?? new Set<string>();
          const isAbsent = absentMembers.has(selectedMemberId);
          const dow = day.getDay();

          return (
            <button
              key={dateStr}
              disabled={isPast}
              onClick={() => onToggle(dateStr)}
              className={`
                relative flex flex-col items-center justify-start pt-1 pb-1 rounded-xl mx-0.5
                min-h-[52px] transition-colors
                ${isPast ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                ${isToday ? 'bg-blue-100 ring-2 ring-blue-400' : isAbsent ? 'bg-red-50' : 'bg-white'}
              `}
            >
              <span
                className={`text-sm font-bold leading-none ${
                  dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-gray-800'
                }`}
              >
                {day.getDate()}
              </span>
              <span className="text-[10px] text-gray-400 leading-none mt-0.5">
                {day.getMonth() + 1}/{day.getDate()}
              </span>
              <div className="flex flex-wrap justify-center gap-0.5 mt-1 px-0.5">
                {members
                  .filter((m) => absentMembers.has(m.id))
                  .map((m) =>
                    m.id === selectedMemberId ? (
                      <span key={m.id} className="text-gray-400 text-base leading-none">✗</span>
                    ) : (
                      <span key={m.id} className="text-[10px] leading-none opacity-60">{m.icon}</span>
                    )
                  )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day detail list */}
      <div className="mt-4 space-y-2">
        {days.map((day) => {
          const dateStr = toDateStr(day);
          const absentMembers = absentByDate[dateStr] ?? new Set<string>();
          const present = members.filter((m) => !absentMembers.has(m.id));
          const absent = members.filter((m) => absentMembers.has(m.id));
          const dow = day.getDay();
          day.setHours(0, 0, 0, 0);
          const isToday = day.getTime() === today.getTime();

          return (
            <div
              key={dateStr}
              className={`bg-white rounded-xl px-4 py-3 shadow-sm ${isToday ? 'ring-2 ring-blue-300' : ''}`}
            >
              <p
                className={`text-sm font-bold mb-1 ${
                  dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-gray-700'
                }`}
              >
                {day.getMonth() + 1}/{day.getDate()}（{WEEKDAYS[dow]}）
                {isToday && <span className="ml-2 text-xs text-blue-500 font-normal">今日</span>}
              </p>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-green-600 font-medium">🍚 </span>
                  {present.length > 0 ? present.map((m) => m.name).join('・') : 'なし'}
                </div>
                {absent.length > 0 && (
                  <div className="text-gray-400">
                    <span>✗ </span>
                    {absent.map((m) => m.name).join('・')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
