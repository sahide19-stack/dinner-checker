'use client';

import { DinnerSchedule, Member } from '@/types';

type Props = {
  year: number;
  month: number; // 1-12
  schedules: DinnerSchedule[];
  members: Member[];
  selectedMemberId: string;
  onToggle: (date: string) => void;
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function Calendar({
  year,
  month,
  schedules,
  members,
  selectedMemberId,
  onToggle,
}: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDow = firstDay.getDay(); // 0=Sun

  // Build absent set per date
  const absentByDate: Record<string, Set<string>> = {};
  for (const s of schedules) {
    if (!absentByDate[s.date]) absentByDate[s.date] = new Set();
    absentByDate[s.date].add(s.member_id);
  }

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
  ];

  // Pad to complete weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="px-3 pb-4">
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
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;

          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const cellDate = new Date(year, month - 1, day);
          cellDate.setHours(0, 0, 0, 0);
          const isPast = cellDate < today;
          const isToday = cellDate.getTime() === today.getTime();
          const absentMembers = absentByDate[dateStr] ?? new Set<string>();
          const isAbsent = absentMembers.has(selectedMemberId);
          const dow = cellDate.getDay();

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
                {day}
              </span>
              {/* Absent icons */}
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
    </div>
  );
}
