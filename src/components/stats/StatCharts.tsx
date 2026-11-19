// Biểu đồ cho trang Thống kê admin (HTML/CSS thuần, đáp ứng tốt trên điện thoại).
// Màu theo quy tắc dataviz: tuần tự = 1 sắc xanh nhạt→đậm; so sánh 2 mốc = 1 sắc 2 độ đậm;
// thành phần = xanh (series 1) / cam (series 2) / xám trung tính. Chữ luôn dùng màu chữ, không dùng màu series.
import { useState } from 'react';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);

/* =================== Heatmap: nhóm Holland nổi trội theo khối lớp =================== */

// Thang tuần tự xanh (step 100 → 650)
const SEQ = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281'];
const SEQ_DARK_FROM = 7; // từ step 450 trở đi dùng chữ trắng

const HOLLAND_ORDER = ['R', 'I', 'A', 'S', 'E', 'C'] as const;
const HOLLAND_SHORT: Record<string, string> = {
  R: 'Kỹ thuật', I: 'Nghiên cứu', A: 'Nghệ thuật', S: 'Xã hội', E: 'Quản lý', C: 'Nghiệp vụ',
};

export interface GradeRow {
  grade: string;
  total: number;
  withHolland: number;
  dominant: Record<string, number>;
}

export function HollandHeatmap({ rows }: { rows: GradeRow[] }) {
  const data = rows.filter(r => r.withHolland > 0 && r.grade !== 'Khác');
  if (!data.length) return <p className="py-6 text-center text-sm text-muted-foreground">Chưa có dữ liệu</p>;
  const cells = data.flatMap(r => HOLLAND_ORDER.map(t => pct(r.dominant[t] || 0, r.withHolland)));
  const max = Math.max(...cells, 1);
  const colorOf = (v: number) => {
    const i = Math.min(SEQ.length - 1, Math.round((v / max) * (SEQ.length - 1)));
    return { bg: SEQ[i], fg: i >= SEQ_DARK_FROM ? '#ffffff' : 'hsl(222 47% 11%)' };
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-separate" style={{ borderSpacing: 3 }}>
          <thead>
            <tr>
              <th className="w-[54px] sm:w-20" />
              {HOLLAND_ORDER.map(t => (
                <th key={t} className="pb-1 text-center text-xs font-medium text-muted-foreground">
                  <div className="text-sm font-bold text-foreground">{t}</div>
                  <div className="hidden sm:block">{HOLLAND_SHORT[t]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(r => (
              <tr key={r.grade}>
                <th className="pr-1 text-left text-sm font-medium">
                  <span className="sm:hidden">K{r.grade}</span>
                  <span className="hidden sm:inline">Khối {r.grade}</span>
                  <div className="text-xs font-normal text-muted-foreground">{fmt(r.withHolland)} HS</div>
                </th>
                {HOLLAND_ORDER.map(t => {
                  const n = r.dominant[t] || 0;
                  const v = pct(n, r.withHolland);
                  const c = colorOf(v);
                  return (
                    <td
                      key={t}
                      className="h-11 rounded-md text-center text-[11px] font-semibold tabular-nums transition-transform hover:scale-[1.04] sm:h-12 sm:text-sm"
                      style={{ background: c.bg, color: c.fg }}
                      title={`Khối ${r.grade} · ${t} ${HOLLAND_SHORT[t]}: ${fmt(n)}/${fmt(r.withHolland)} học sinh (${v}%)`}
                    >
                      {Math.round(v)}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Chú giải thang màu */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>0%</span>
        <span className="h-2 flex-1 max-w-[180px] rounded-full" style={{ background: `linear-gradient(90deg, ${SEQ[0]}, ${SEQ[SEQ.length - 1]})` }} />
        <span>{Math.round(max)}%</span>
        <span className="ml-auto hidden sm:inline">% học sinh của khối có nhóm này cao điểm nhất</span>
      </div>
    </div>
  );
}

/* =================== Dumbbell: điểm hiện tại → mục tiêu theo môn =================== */

const CUR_COLOR = '#86b6ef'; // step 250
const TGT_COLOR = '#1c5cab'; // step 550

export interface SubjectRow {
  subject: string;
  n: number;
  avgCurrent: number;
  avgTarget: number;
  gap: number;
}

export function ScoreDumbbell({ rows, limit = 10 }: { rows: SubjectRow[]; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">Chưa có dữ liệu điểm</p>;
  const shown = expanded ? rows : rows.slice(0, limit);
  // trục 5 → 10 (điểm trung bình hiếm khi dưới 5) để thấy rõ khoảng cách
  const minAxis = Math.min(5, Math.floor(Math.min(...rows.map(r => r.avgCurrent))));
  const x = (v: number) => `${((v - minAxis) / (10 - minAxis)) * 100}%`;
  const num = (v: number) => v.toLocaleString('vi-VN', { maximumFractionDigits: 1 });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: CUR_COLOR }} /> Điểm hiện tại (TB)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: TGT_COLOR }} /> Điểm mục tiêu (TB)
        </span>
      </div>
      <ol className="space-y-3">
        {shown.map(r => (
          <li
            key={r.subject}
            className="rounded-md px-1 py-0.5 hover:bg-muted/60"
            title={`${r.subject}: ${num(r.avgCurrent)} → ${num(r.avgTarget)} (cần tăng ${num(r.gap)}) · ${fmt(r.n)} học sinh`}
          >
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                {r.subject} <span className="text-xs text-muted-foreground">· {fmt(r.n)} HS</span>
              </span>
              <span className="shrink-0 tabular-nums">
                {num(r.avgCurrent)} → <span className="font-semibold">{num(r.avgTarget)}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">+{num(r.gap)}</span>
              </span>
            </div>
            <div className="relative mt-1.5 h-4">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
              <div
                className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full"
                style={{ left: x(r.avgCurrent), width: `calc(${x(r.avgTarget)} - ${x(r.avgCurrent)})`, background: '#b7d3f6' }}
              />
              <span
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
                style={{ left: x(r.avgCurrent), background: CUR_COLOR }}
              />
              <span
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
                style={{ left: x(r.avgTarget), background: TGT_COLOR }}
              />
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-2 flex justify-between pl-1 text-[11px] text-muted-foreground tabular-nums">
        <span>{minAxis}</span>
        <span>10</span>
      </div>
      {rows.length > limit && (
        <button
          type="button"
          className="mt-2 w-full rounded-md py-1.5 text-sm font-medium hover:bg-muted"
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? 'Thu gọn' : `Xem tất cả ${rows.length} môn`}
        </button>
      )}
    </div>
  );
}


/* =================== Heatmap: lĩnh vực ngành × khối lớp =================== */

export interface FieldGradeRow {
  grade: string;
  total: number;
  values: Record<string, number>;
}

/**
 * Hàng = lĩnh vực (top theo tổng), cột = khối lớp → vừa màn hình điện thoại.
 * Ô = % học sinh của khối chọn lĩnh vực đó (so sánh được giữa các khối dù số HS khác nhau).
 */
export function FieldGradeHeatmap({ rows, limit = 8 }: { rows: FieldGradeRow[]; limit?: number }) {
  const grades = rows.filter(r => r.total > 0 && r.grade !== 'Khác');
  if (!grades.length) return <p className="py-6 text-center text-sm text-muted-foreground">Chưa có dữ liệu</p>;

  const totals: Record<string, number> = {};
  grades.forEach(g => Object.entries(g.values).forEach(([f, n]) => (totals[f] = (totals[f] || 0) + n)));
  const fields = Object.keys(totals)
    .filter(f => f !== 'Khác' && f !== 'Chưa xác định')
    .sort((a, b) => totals[b] - totals[a])
    .slice(0, limit);

  const cell = (g: FieldGradeRow, f: string) => pct(g.values[f] || 0, g.total);
  const max = Math.max(...fields.flatMap(f => grades.map(g => cell(g, f))), 1);
  const colorOf = (v: number) => {
    const i = Math.min(SEQ.length - 1, Math.round((v / max) * (SEQ.length - 1)));
    return { bg: SEQ[i], fg: i >= SEQ_DARK_FROM ? '#ffffff' : 'hsl(222 47% 11%)' };
  };

  return (
    <div>
      <table className="w-full table-fixed border-separate" style={{ borderSpacing: 3 }}>
        <thead>
          <tr>
            <th className="w-[44%]" />
            {grades.map(g => (
              <th key={g.grade} className="pb-1 text-center text-xs font-medium text-muted-foreground">
                <div className="text-sm font-bold text-foreground">Khối {g.grade}</div>
                {fmt(g.total)} HS
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map(f => (
            <tr key={f}>
              <th className="truncate pr-2 text-left text-[13px] font-medium" title={f}>{f}</th>
              {grades.map(g => {
                const v = cell(g, f);
                const c = colorOf(v);
                return (
                  <td
                    key={g.grade}
                    className="h-9 rounded-md text-center text-xs font-semibold tabular-nums"
                    style={{ background: c.bg, color: c.fg }}
                    title={`Khối ${g.grade} · ${f}: ${fmt(g.values[f] || 0)}/${fmt(g.total)} học sinh (${v}%)`}
                  >
                    {Math.round(v)}%
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>0%</span>
        <span className="h-2 max-w-[180px] flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${SEQ[0]}, ${SEQ[SEQ.length - 1]})` }} />
        <span>{Math.round(max)}%</span>
        <span className="ml-auto hidden sm:inline">% học sinh của khối chọn lĩnh vực</span>
      </div>
    </div>
  );
}
