const SIZE = 220;
const CENTER = SIZE / 2;
const STROKE = 16;
const GAP = 6;

export type RingStage = {
  stage: string;
  label: string;
  total: number;
  verified: number;
  pct: number;
  started: boolean;
};

function Ring({
  radius,
  pct,
  active,
}: {
  radius: number;
  pct: number;
  active: boolean;
}) {
  const circumference = 2 * Math.PI * radius;
  const filled = (pct / 100) * circumference;

  return (
    <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
      <circle
        cx={CENTER}
        cy={CENTER}
        r={radius}
        fill="none"
        strokeWidth={STROKE}
        className="stroke-zinc-200 dark:stroke-zinc-700"
      />
      {pct > 0 && (
        <circle
          cx={CENTER}
          cy={CENTER}
          r={radius}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className={`transition-[stroke-dasharray] duration-700 ease-out ${
            active ? "stroke-brand" : "stroke-brand-dark dark:stroke-zinc-300"
          }`}
        />
      )}
    </g>
  );
}

export function ProgressRings({
  stages,
  overallPct,
  currentStage,
}: {
  stages: RingStage[];
  overallPct: number;
  currentStage: string;
}) {
  const maxRadius = CENTER - STROKE / 2 - 2;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0">
        {stages.map((s, i) => (
          <Ring
            key={s.stage}
            radius={maxRadius - i * (STROKE + GAP)}
            pct={s.pct}
            active={s.stage === currentStage}
          />
        ))}
        <text
          x={CENTER}
          y={CENTER - 4}
          textAnchor="middle"
          className="fill-zinc-900 text-2xl font-semibold dark:fill-zinc-100"
        >
          {overallPct}%
        </text>
        <text x={CENTER} y={CENTER + 16} textAnchor="middle" className="fill-zinc-500 text-xs dark:fill-zinc-400">
          overall
        </text>
      </svg>

      <ul className="space-y-2 text-sm">
        {stages.map((s) => (
          <li key={s.stage} className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                s.stage === currentStage ? "bg-brand" : "bg-brand-dark dark:bg-zinc-300"
              }`}
            />
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{s.label}</span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {s.started ? `${s.verified}/${s.total} verified (${s.pct}%)` : "Not started"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
