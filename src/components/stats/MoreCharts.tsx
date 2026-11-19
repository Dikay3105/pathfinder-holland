// Biểu đồ tròn / cột / cột ngang / đường cho trang Thống kê (recharts).
// Quy tắc màu (skill dataviz): 1 chuỗi số liệu = 1 màu xanh; nhóm phân loại = bảng màu đã kiểm tra
// (#2a78d6, #eb6834, #1baf7a) + xám cho "Khác"; luôn có nhãn số → không phụ thuộc vào màu.
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';

const BLUE = '#2a78d6';
export const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a'];
const NEUTRAL = '#c9c8c2';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);

const AXIS_TICK = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  fontSize: 13,
};

export interface NamedCount {
  name: string;
  count: number;
}

const Empty = () => <p className="py-6 text-center text-sm text-muted-foreground">Chưa có dữ liệu</p>;

/* =================== Biểu đồ tròn (donut) =================== */

export function DonutChart({
  data,
  unit = 'học sinh',
  centerLabel = 'học sinh',
}: {
  data: Array<NamedCount & { color?: string }>;
  unit?: string;
  centerLabel?: string;
}) {
  const total = data.reduce((a, d) => a + d.count, 0);
  if (!total) return <Empty />;
  const rows = data.map((d, i) => ({ ...d, color: d.color || CATEGORICAL[i] || NEUTRAL }));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="count"
              nameKey="name"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={1.5}
              stroke="hsl(var(--card))"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {rows.map(r => <Cell key={r.name} fill={r.color} />)}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number, name: string) => [`${fmt(v)} ${unit} (${pct(v, total)}%)`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums">{fmt(total)}</span>
          <span className="text-xs text-muted-foreground">{centerLabel}</span>
        </div>
      </div>
      {/* Chú giải kèm số – nhận diện không cần màu */}
      <ul className="w-full space-y-2 text-sm">
        {rows.map(r => (
          <li key={r.name} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: r.color }} />
            <span className="min-w-0 flex-1 truncate">{r.name}</span>
            <span className="font-semibold tabular-nums">{fmt(r.count)}</span>
            <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{pct(r.count, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =================== Cột dọc (1 chuỗi) =================== */

export function ColumnChart({
  data,
  unit = 'học sinh',
  height = 240,
  labelFormatter,
  valueSuffix = '',
}: {
  data: NamedCount[];
  unit?: string;
  height?: number;
  /** nhãn đầy đủ trong tooltip (VD "R · Kỹ thuật") */
  labelFormatter?: (name: string) => string;
  valueSuffix?: string;
}) {
  if (!data.length) return <Empty />;
  const many = data.length > 10;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 22, right: 4, left: -18, bottom: many ? 24 : 0 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            interval={0}
            angle={many ? -40 : 0}
            textAnchor={many ? 'end' : 'middle'}
            height={many ? 40 : 24}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={44} />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={l => (labelFormatter ? labelFormatter(String(l)) : String(l))}
            formatter={(v: number) => [`${fmt(v)}${valueSuffix} ${unit}`.trim(), '']}
            separator=""
          />
          <Bar dataKey="count" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
            {!many && (
              <LabelList
                dataKey="count"
                position="top"
                formatter={(v: number) => fmt(v) + valueSuffix}
                style={{ fontSize: 11, fill: 'hsl(var(--foreground))', fontWeight: 600 }}
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* =================== Cột ngang (tên dài) =================== */

export function HBarChart({ data, total, unit = 'học sinh' }: { data: NamedCount[]; total: number; unit?: string }) {
  const isMobile = useIsMobile();
  if (!data.length) return <Empty />;
  const rowH = 32;
  const labelW = isMobile ? 120 : 190;
  return (
    <div style={{ height: data.length * rowH + 16 }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 96, left: 0, bottom: 0 }} barCategoryGap={6}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={labelW}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
            tickFormatter={(v: string) => (isMobile && v.length > 18 ? v.slice(0, 17) + '…' : v)}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            contentStyle={TOOLTIP_STYLE}
            formatter={(v: number) => [`${fmt(v)} ${unit} (${pct(v, total)}%)`, '']}
            separator=""
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map(d => (
              <Cell key={d.name} fill={d.name === 'Khác' || d.name === 'Chưa xác định' ? NEUTRAL : BLUE} />
            ))}
            {/* tự vẽ nhãn: LabelList mặc định ngắt dòng theo độ rộng cột → cột ngắn bị chồng chữ */}
            <LabelList
              dataKey="count"
              content={(p: any) => (
                <text
                  x={Number(p.x) + Number(p.width) + 6}
                  y={Number(p.y) + Number(p.height) / 2}
                  dominantBaseline="central"
                  fontSize={11}
                  fill="hsl(var(--muted-foreground))"
                >
                  <tspan fontWeight={600} fill="hsl(var(--foreground))">{fmt(Number(p.value))}</tspan>
                  {` · ${pct(Number(p.value), total)}%`}
                </text>
              )}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* =================== Xu hướng: đường theo ngày / cột theo tuần =================== */

/** Thứ Hai của tuần chứa ngày yyyy-mm-dd */
function weekStart(day: string) {
  const d = new Date(day + 'T00:00:00Z');
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function TrendChart({ byDay }: { byDay: NamedCount[] }) {
  const [mode, setMode] = useState<'week' | 'day'>('week');

  const daily = useMemo(() => {
    if (byDay.length < 2) return byDay.map(d => ({ key: d.name, label: ddmm(d.name), count: d.count }));
    const map = new Map(byDay.map(d => [d.name, d.count]));
    const out: { key: string; label: string; count: number }[] = [];
    const cur = new Date(byDay[0].name + 'T00:00:00Z');
    const end = new Date(byDay[byDay.length - 1].name + 'T00:00:00Z');
    while (cur <= end && out.length < 1000) {
      const k = cur.toISOString().slice(0, 10);
      out.push({ key: k, label: ddmm(k), count: map.get(k) ?? 0 });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return out;
  }, [byDay]);

  const weekly = useMemo(() => {
    const map = new Map<string, number>();
    daily.forEach(d => map.set(weekStart(d.key), (map.get(weekStart(d.key)) || 0) + d.count));
    return [...map.entries()].map(([k, count]) => ({ key: k, label: ddmm(k), count }));
  }, [daily]);

  if (!byDay.length) return <Empty />;
  const peak = (mode === 'week' ? weekly : daily).reduce((a, b) => (b.count > a.count ? b : a), { key: '', label: '', count: 0 });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border p-0.5 text-sm">
          {(['week', 'day'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1 ${mode === m ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {m === 'week' ? 'Theo tuần' : 'Theo ngày'}
            </button>
          ))}
        </div>
        {peak.count > 0 && (
          <span className="text-xs text-muted-foreground">
            Cao nhất: <span className="font-medium text-foreground">{fmt(peak.count)}</span> bài
            {mode === 'week' ? ` (tuần từ ${peak.label})` : ` (${peak.label})`}
          </span>
        )}
      </div>
      <div className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'week' ? (
            <BarChart data={weekly} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} minTickGap={16} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={40} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={l => `Tuần từ ${l}`}
                formatter={(v: number) => [`${fmt(v)} bài test`, '']}
                separator=""
              />
              <Bar dataKey="count" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
            </BarChart>
          ) : (
            <LineChart data={daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} minTickGap={24} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={40} />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3 3' }}
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => [`${fmt(v)} bài test`, '']}
                separator=""
              />
              <Line type="linear" dataKey="count" stroke={BLUE} strokeWidth={2} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
