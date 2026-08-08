"use client";

interface LinePoint {
  label: string;
  value: number;
}

export default function SimpleLineChart({ points, valuePrefix = "" }: { points: LinePoint[]; valuePrefix?: string }) {
  if (points.length === 0) return <p className="admin-meta">Keine Daten im Zeitraum.</p>;
  const max = Math.max(...points.map((p) => p.value), 1);
  const min = Math.min(...points.map((p) => p.value), 0);
  const width = 640;
  const height = 180;
  const pad = 24;
  const coords = points.map((point, index) => {
    const x = pad + (index / Math.max(points.length - 1, 1)) * (width - pad * 2);
    const y = height - pad - ((point.value - min) / Math.max(max - min, 1)) * (height - pad * 2);
    return { ...point, x, y };
  });
  const path = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="admin-chart admin-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
        {coords.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r="3" fill="currentColor" />
        ))}
      </svg>
      <div className="admin-line-labels">
        {coords.map((p) => (
          <span key={p.label}>{p.label.slice(5)} · {valuePrefix}{p.value.toLocaleString("de-DE")}</span>
        ))}
      </div>
    </div>
  );
}
