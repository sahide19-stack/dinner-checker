'use client';

import { Member } from '@/types';

type Props = {
  members: Member[];
  selectedMemberId: string;
  onSelect: (memberId: string) => void;
};

export default function MemberSelector({ members, selectedMemberId, onSelect }: Props) {
  return (
    <div className="flex gap-2 justify-center flex-wrap px-4 py-3">
      {members.map((member) => {
        const isSelected = member.id === selectedMemberId;
        return (
          <button
            key={member.id}
            onClick={() => onSelect(member.id)}
            className={`flex flex-col items-center px-4 py-2 rounded-2xl border-2 transition-all min-w-[72px] ${
              isSelected
                ? 'border-orange-500 bg-orange-500 text-white shadow-md'
                : 'border-orange-200 bg-white text-gray-700 hover:border-orange-400'
            }`}
          >
            <span className="text-2xl">{member.icon}</span>
            <span className="text-sm font-medium mt-1">{member.name}</span>
          </button>
        );
      })}
    </div>
  );
}
