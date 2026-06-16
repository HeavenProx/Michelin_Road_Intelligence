export function CritBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#27509B] rounded-full" style={{ width: `${(score / 5) * 100}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-3 text-right">{score}</span>
    </div>
  );
}
