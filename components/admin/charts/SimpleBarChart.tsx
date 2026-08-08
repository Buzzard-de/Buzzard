"use client";

interface BarItem {
  label: string;
  value: number;
}

export default function SimpleBarChart({ items, valuePrefix = "" }: { items: BarItem[]; valuePrefix?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="admin-chart admin-bar-chart" role="img" aria-label="Bar chart">
      {items.map((item) => (
        <div key={item.label} className="admin-bar-row">
          <span className="admin-bar-label">{item.label}</span>
          <div className="admin-bar-track">
            <div className="admin-bar-fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <span className="admin-bar-value">{valuePrefix}{item.value.toLocaleString("de-DE")}</span>
        </div>
      ))}
    </div>
  );
}
