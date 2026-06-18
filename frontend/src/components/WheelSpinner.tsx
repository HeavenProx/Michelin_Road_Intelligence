interface Props {
  size?: number;
  className?: string;
}

export function WheelSpinner({ size = 40, className = "" }: Props) {
  const cx = 20, cy = 20;
  const rimR   = 17;
  const hubR   = 2.8;
  const innerR = hubR + 2;
  const numSpokes = 8;

  const spokes = Array.from({ length: numSpokes }, (_, i) => {
    const rad = (i * 2 * Math.PI) / numSpokes;
    return {
      x1: cx + innerR * Math.sin(rad),
      y1: cy - innerR * Math.cos(rad),
      x2: cx + rimR   * Math.sin(rad),
      y2: cy - rimR   * Math.cos(rad),
    };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      aria-hidden="true"
    >
      {/* Jante extérieure */}
      <circle cx={cx} cy={cy} r={rimR} fill="none" stroke="currentColor" strokeWidth="2.5" />
      {/* Jante intérieure */}
      <circle cx={cx} cy={cy} r={rimR - 3.5} fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
      {/* Moyeu */}
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx={cx} cy={cy} r={hubR}   fill="currentColor" />
      {/* Rayons */}
      {spokes.map((s, i) => (
        <line
          key={i}
          x1={s.x1} y1={s.y1}
          x2={s.x2} y2={s.y2}
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
