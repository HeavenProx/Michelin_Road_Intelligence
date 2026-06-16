export function GaugeWear({ percent }: { percent: number }) {
  const r = 70; const cx = 100; const cy = 92;
  const circumference = Math.PI * r;
  const filled = (Math.min(100, percent) / 100) * circumference;
  const color = percent >= 80 ? "#B71C1C" : percent >= 55 ? "#E65100" : "#2E7D32";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 100" className="w-56">
        <defs>
          <linearGradient id="wearGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#4CAF50" />
            <stop offset="50%"  stopColor="#FFC107" />
            <stop offset="100%" stopColor="#D32F2F" />
          </linearGradient>
        </defs>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#E0E0E0" strokeWidth="14" strokeLinecap="round" />
        {percent > 0 && (
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="url(#wearGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
          />
        )}
        <text x={cx} y={cy - 16} textAnchor="middle" fontSize="34" fontWeight="800" fill={color} fontFamily="sans-serif">{Math.round(percent)}%</text>
        <text x={cx} y={cy - 1}  textAnchor="middle" fontSize="9"  fill="#999" fontFamily="sans-serif" letterSpacing="3">USURE</text>
      </svg>
    </div>
  );
}
