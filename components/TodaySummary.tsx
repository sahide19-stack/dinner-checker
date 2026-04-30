'use client';

import { DinnerSchedule, Member } from '@/types';

type Props = {
  members: Member[];
  schedules: DinnerSchedule[];
};

export default function TodaySummary({ members, schedules }: Props) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const absentIds = new Set(
    schedules.filter((s) => s.date === todayStr).map((s) => s.member_id)
  );

  const present = members.filter((m) => !absentIds.has(m.id));
  const absent = members.filter((m) => absentIds.has(m.id));

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-orange-200 px-4 py-3 max-w-[430px] mx-auto shadow-lg">
      <p className="text-xs text-gray-400 font-medium mb-1.5">今日（{todayStr}）</p>
      <div className="flex gap-4">
        <div className="flex-1">
          <p className="text-xs text-green-600 font-semibold mb-1">🍽 いる</p>
          <div className="flex flex-wrap gap-1">
            {present.length === 0 ? (
              <span className="text-xs text-gray-400">なし</span>
            ) : (
              present.map((m) => (
                <span key={m.id} className="text-sm">
                  {m.icon} {m.name}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs text-red-500 font-semibold mb-1">✗ いない</p>
          <div className="flex flex-wrap gap-1">
            {absent.length === 0 ? (
              <span className="text-xs text-gray-400">なし</span>
            ) : (
              absent.map((m) => (
                <span key={m.id} className="text-sm text-gray-500">
                  {m.icon} {m.name}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
