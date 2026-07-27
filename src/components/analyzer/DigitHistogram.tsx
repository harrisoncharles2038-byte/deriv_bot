import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";

export function DigitHistogram({ freq }: { freq: number[] }) {
  const total = freq.reduce((a, b) => a + b, 0) || 1;
  const data = freq.map((count, digit) => ({ digit, count, pct: (count / total) * 100 }));
  const max = Math.max(...freq);
  const min = Math.min(...freq);
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="digit" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 10 }} width={28} />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(v: number, name) => (name === "count" ? [`${v} ticks`, "Count"] : v)}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell
                key={d.digit}
                fill={
                  d.count === max
                    ? "hsl(142 71% 45%)"
                    : d.count === min
                      ? "hsl(0 84% 60%)"
                      : "hsl(220 90% 56%)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
