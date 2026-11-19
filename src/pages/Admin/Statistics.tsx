import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { adminApiService } from '@/services/adminApi';
import { CountItem, DetailedStats, optionsApi } from '@/services/optionsApi';
import { useRealtime } from '@/hooks/useRealtime';
import { FieldGradeHeatmap, HollandHeatmap, ScoreDumbbell } from '@/components/stats/StatCharts';
import { CATEGORICAL, ColumnChart, DonutChart, HBarChart, TrendChart } from '@/components/stats/MoreCharts';

const ALL = '__all__';

const HOLLAND_NAMES: Record<string, string> = {
  R: 'Kỹ thuật (Realistic)',
  I: 'Nghiên cứu (Investigative)',
  A: 'Nghệ thuật (Artistic)',
  S: 'Xã hội (Social)',
  E: 'Quản lý (Enterprising)',
  C: 'Nghiệp vụ (Conventional)',
};

const pct = (n: number, total: number) => (total ? `${Math.round((n / total) * 1000) / 10}%` : '0%');
const fmt = (n: number) => n.toLocaleString('vi-VN');

/* ---------- Building blocks ---------- */

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * Cột ngang xếp hạng, một màu. Nhãn tên trên, số + % bên phải.
 * Dạng HTML để tự xuống dòng tên dài trên điện thoại.
 */
function RankedBars({
  items,
  total,
  limit = 10,
  unit = 'HS',
  emptyText = 'Chưa có dữ liệu',
  showRank = true,
}: {
  items: CountItem[];
  total: number;
  limit?: number;
  unit?: string;
  emptyText?: string;
  /** false khi danh sách theo thứ tự tự nhiên (lớp, RIASEC) chứ không xếp hạng */
  showRank?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;

  const shown = expanded ? items : items.slice(0, limit);
  const max = Math.max(...items.map(i => i.count), 1);

  return (
    <div>
      <ol className="space-y-2.5">
        {shown.map((item, idx) => (
          <li
            key={item.name}
            className="group rounded-md px-1 py-0.5 hover:bg-muted/60"
            title={`${item.name}: ${fmt(item.count)} ${unit}${total > 0 ? ` (${pct(item.count, total)})` : ''}`}
          >
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 leading-snug">
                {showRank && (
                  <span className="mr-1.5 inline-block w-5 text-right text-xs tabular-nums text-muted-foreground">
                    {idx + 1}
                  </span>
                )}
                {item.name}
              </span>
              <span className="shrink-0 tabular-nums">
                <span className="font-semibold">{fmt(item.count)}</span>
                {total > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{pct(item.count, total)}</span>}
              </span>
            </div>
            <div className={`mt-1 h-2 rounded-full bg-muted ${showRank ? 'ml-[26px]' : ''}`}>
              <div
                className="h-2 rounded-full"
                style={{ width: `${Math.max((item.count / max) * 100, 1.5)}%`, background: 'var(--viz-1)' }}
              />
            </div>
          </li>
        ))}
      </ol>
      {items.length > limit && (
        <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => setExpanded(e => !e)}>
          {expanded ? 'Thu gọn' : `Xem tất cả ${items.length} mục`}
        </Button>
      )}
    </div>
  );
}

function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    // min-w-0: cho phép card trong grid co lại trên điện thoại (bảng rộng thì tự cuộn ngang bên trong)
    <Card className={`min-w-0 ${className ?? ""}`}>
      <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">{children}</CardContent>
    </Card>
  );
}

/* ---------- Page ---------- */

const Statistics = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [schoolYear, setSchoolYear] = useState(ALL);
  const [cls, setCls] = useState(ALL);
  const [classes, setClasses] = useState<string[]>([]);
  const [majorView, setMajorView] = useState<'all' | 'other'>('all');
  const [hollandView, setHollandView] = useState<'dominant' | 'average'>('dominant');
  const [classGrade, setClassGrade] = useState<string>('12');

  useEffect(() => {
    adminApiService.getClasses().then(setClasses);
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setStats(
        await optionsApi.getDetailedStats({
          schoolYear: schoolYear === ALL ? undefined : schoolYear,
          class: cls === ALL ? undefined : cls,
        })
      );
    } catch (err) {
      setError((err as Error).message || 'Không tải được thống kê');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolYear, cls]);

  // Realtime: có bài nộp mới → tải lại (gom nhiều sự kiện trong 3 giây thành 1 lần)
  const reloadTimer = React.useRef<ReturnType<typeof setTimeout>>();
  const scheduleReload = () => {
    clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => load(), 3000);
  };
  useEffect(() => () => clearTimeout(reloadTimer.current), []);
  const live = useRealtime({ 'student:upserted': scheduleReload, 'student:deleted': scheduleReload });

  const s = stats?.summary;
  const total = s?.totalStudents ?? 0;


  const exportExcel = () => {
    if (!stats || !s) return;
    const wb = XLSX.utils.book_new();
    const sheet = (name: string, rows: CountItem[], col: string, base = total) =>
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          rows.map((r, i) => ({ STT: i + 1, [col]: r.name, 'Số học sinh': r.count, 'Tỉ lệ': pct(r.count, base) }))
        ),
        name
      );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { 'Chỉ số': 'Niên khoá', 'Giá trị': schoolYear === ALL ? 'Tất cả' : schoolYear },
        { 'Chỉ số': 'Lớp', 'Giá trị': cls === ALL ? 'Tất cả' : cls },
        { 'Chỉ số': 'Học sinh đã làm test', 'Giá trị': s.totalStudents },
        { 'Chỉ số': 'Số lớp', 'Giá trị': s.totalClasses },
        { 'Chỉ số': 'Số trường được chọn', 'Giá trị': s.distinctUniversities },
        { 'Chỉ số': 'Số ngành được chọn', 'Giá trị': s.distinctMajors },
        { 'Chỉ số': 'HS ghi ngành ngoài danh mục', 'Giá trị': s.otherMajorCount },
        { 'Chỉ số': 'HS ghi trường ngoài danh mục', 'Giá trị': s.otherUniversityCount },
        { 'Chỉ số': 'HS có lời khuyên AI', 'Giá trị': s.withAdvice },
      ]),
      'Tổng quan'
    );
    sheet('Trường', stats.byUniversity, 'Trường', s.withUniversity);
    sheet('Ngành', stats.byMajor, 'Ngành', s.withMajor);
    sheet('Ngành tự nhập', stats.otherMajors, 'Ngành', s.withMajor);
    sheet('Ngành + Trường', stats.topPairs, 'Ngành — Trường');
    sheet('Khối thi', stats.examBlocks, 'Khối');
    sheet('Mã Holland', stats.holland.topCodes, 'Mã');
    sheet('Theo lớp', stats.byClass, 'Lớp');
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        (stats.subjects ?? []).map(s => ({ 'Môn': s.subject, 'Số HS': s.n, 'Điểm hiện tại TB': s.avgCurrent, 'Điểm mục tiêu TB': s.avgTarget, 'Cần tăng': s.gap }))
      ),
      'Điểm theo môn'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        (stats.byGrade ?? []).map(g => ({
          'Khối': g.grade,
          'Số HS': g.withHolland,
          ...Object.fromEntries(['R', 'I', 'A', 'S', 'E', 'C'].map(t => [t + ' (%)', g.withHolland ? Math.round(((g.dominant[t] || 0) / g.withHolland) * 1000) / 10 : 0])),
        }))
      ),
      'Holland theo khối'
    );

    const suffix = [schoolYear !== ALL && schoolYear, cls !== ALL && cls].filter(Boolean).join('_') || 'tat-ca';
    XLSX.writeFile(wb, `ThongKe_Holland_${suffix}.xlsx`);
    toast({ title: 'Đã xuất file Excel' });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <Link to="/admin">
            <Button variant="ghost" size="icon" aria-label="Quay lại">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 truncate text-lg font-bold sm:text-2xl">
              Thống kê
              {live && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700" title="Tự cập nhật khi có bài nộp mới">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Trực tiếp
                </span>
              )}
            </h1>
            <p className="hidden text-sm text-muted-foreground sm:block">Lựa chọn trường, ngành và kết quả Holland của học sinh</p>
          </div>
          <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Tải lại">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={exportExcel} disabled={!stats || loading} className="hidden sm:inline-flex">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Xuất Excel
          </Button>
        </div>
      </header>

      <main className="container mx-auto space-y-4 px-4 py-4 sm:space-y-6 sm:py-6">
        {/* Filters — một hàng phía trên biểu đồ */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
          <Select value={schoolYear} onValueChange={setSchoolYear}>
            <SelectTrigger className="h-11 sm:w-48">
              <SelectValue placeholder="Niên khoá" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Mọi niên khoá</SelectItem>
              {(stats?.filters.schoolYears ?? []).map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cls} onValueChange={setCls}>
            <SelectTrigger className="h-11 sm:w-40">
              <SelectValue placeholder="Lớp" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ALL}>Mọi lớp</SelectItem>
              {classes.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportExcel} disabled={!stats || loading} variant="outline" className="col-span-2 h-11 sm:hidden">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Xuất Excel
          </Button>
        </div>

        {error && (
          <Card className="border-destructive/40">
            <CardContent className="flex items-center justify-between gap-3 p-4 text-sm text-destructive">
              {error}
              <Button size="sm" variant="outline" onClick={load}>Thử lại</Button>
            </CardContent>
          </Card>
        )}

        {loading && !stats ? (
          <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Đang tải thống kê...
          </div>
        ) : stats && s ? (
          <div className={`space-y-4 transition-opacity sm:space-y-6 ${loading ? 'opacity-60' : ''}`}>
            {/* KPI */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Học sinh đã làm test" value={fmt(total)} hint={`${fmt(s.totalClasses)} lớp`} />
              <StatTile
                label="Trường được chọn"
                value={fmt(s.distinctUniversities)}
                hint={`${pct(s.withUniversity, total)} HS có chọn trường`}
              />
              <StatTile
                label="Ngành được chọn"
                value={fmt(s.distinctMajors)}
                hint={`${fmt(s.otherMajorCount)} HS ghi ngành ngoài danh mục`}
              />
              <StatTile
                label="Có lời khuyên AI"
                value={pct(s.withAdvice, total)}
                hint={`${fmt(s.withAdvice)}/${fmt(total)} học sinh`}
              />
            </div>

            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <Section title="Học sinh theo khối lớp" description="Số học sinh đã làm test ở mỗi khối">
                <DonutChart
                  data={(stats.byGrade ?? [])
                    .filter(g => g.total > 0)
                    .map((g, i) => ({
                      name: g.grade === 'Khác' ? 'Lớp khác' : `Khối ${g.grade}`,
                      count: g.total,
                      color: g.grade === 'Khác' ? '#c9c8c2' : CATEGORICAL[i],
                    }))}
                />
              </Section>

              <Section title="Nhóm trường mong muốn" description={`Trên ${fmt(s.withUniversity)} học sinh có chọn trường`}>
                <HBarChart data={stats.universityTypes ?? []} total={s.withUniversity} />
              </Section>
            </div>

            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <Section
                title="Lĩnh vực ngành mong muốn"
                description="Gom ngành học sinh tự ghi (kể cả viết khác nhau) vào nhóm lĩnh vực"
              >
                <HBarChart data={stats.majorFields ?? []} total={s.withMajor} />
              </Section>

              <Section
                title="Lĩnh vực ngành theo khối lớp"
                description="So sánh nguyện vọng giữa lớp 10, 11, 12 (8 lĩnh vực phổ biến nhất)"
              >
                <FieldGradeHeatmap rows={stats.majorFieldsByGrade ?? []} />
              </Section>
            </div>

            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <Section title="Trường đại học được chọn nhiều nhất" description={`Trên ${fmt(s.withUniversity)} học sinh có chọn trường`}>
                <RankedBars items={stats.byUniversity} total={s.withUniversity} />
              </Section>

              <Section title="Ngành học mong muốn" description={`Trên ${fmt(s.withMajor)} học sinh có chọn ngành`}>
                <Tabs value={majorView} onValueChange={v => setMajorView(v as 'all' | 'other')} className="mb-3">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="all">Tất cả ngành</TabsTrigger>
                    <TabsTrigger value="other">Ngoài danh mục ({fmt(s.otherMajorCount)})</TabsTrigger>
                  </TabsList>
                </Tabs>
                {majorView === 'all' ? (
                  <RankedBars items={stats.byMajor} total={s.withMajor} />
                ) : (
                  <>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Ngành học sinh tự nhập hoặc không có trong danh mục. Có thể thêm vào danh mục ở trang
                      {' '}<Link to="/admin/options" className="underline">Trường & ngành</Link>.
                    </p>
                    <RankedBars items={stats.otherMajors} total={s.withMajor} emptyText="Không có ngành ngoài danh mục" />
                  </>
                )}
              </Section>
            </div>

            <Section title="Cặp ngành – trường phổ biến" description="Ngành và trường được chọn cùng nhau nhiều nhất">
              <RankedBars items={stats.topPairs} total={total} limit={8} />
            </Section>

            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <Section
                title="Nhóm Holland"
                description={
                  hollandView === 'dominant'
                    ? 'Số học sinh có nhóm này cao điểm nhất (đồng điểm tính cho cả hai nhóm)'
                    : 'Điểm trung bình mỗi nhóm'
                }
              >
                <Tabs value={hollandView} onValueChange={v => setHollandView(v as 'dominant' | 'average')} className="mb-3">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="dominant">Nhóm nổi trội</TabsTrigger>
                    <TabsTrigger value="average">Điểm trung bình</TabsTrigger>
                  </TabsList>
                </Tabs>
                <ColumnChart
                  data={(hollandView === 'dominant' ? stats.holland.dominant.map(d => ({ name: d.type, count: d.count }))
                    : stats.holland.average.map(d => ({ name: d.type, count: d.value })))}
                  unit={hollandView === 'dominant' ? 'học sinh' : 'điểm'}
                  labelFormatter={name => `${name} · ${HOLLAND_NAMES[name] || ''}`}
                />
              </Section>

              <Section title="Mã Holland phổ biến" description="Hai nhóm điểm cao nhất của mỗi học sinh">
                <RankedBars items={stats.holland.topCodes} total={s.withHolland} />
              </Section>
            </div>

            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <Section
                title="Nhóm Holland nổi trội theo khối lớp"
                description="% học sinh mỗi khối có nhóm đó cao điểm nhất (đồng điểm tính cho mọi nhóm bằng nhau)"
              >
                <HollandHeatmap rows={stats.byGrade ?? []} />
              </Section>

              <Section
                title="Điểm trung bình: hiện tại → mục tiêu"
                description="Theo môn, chỉ tính học sinh đã nhập điểm; xếp theo khoảng cách cần cải thiện"
              >
                <ScoreDumbbell rows={stats.subjects ?? []} />
              </Section>
            </div>

            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <Section title="Khối thi được chọn" description="Một học sinh có thể chọn nhiều khối">
                <ColumnChart data={stats.examBlocks.slice(0, 12).map(b => ({ name: b.name, count: b.count }))} />
              </Section>

              <Section title="Số học sinh theo lớp" description="Số học sinh đã làm test ở từng lớp">
                <div className="mb-2 inline-flex rounded-md border p-0.5 text-sm">
                  {['10', '11', '12', 'all'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setClassGrade(g)}
                      className={`rounded px-3 py-1 ${classGrade === g ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                      {g === 'all' ? 'Tất cả' : `Khối ${g}`}
                    </button>
                  ))}
                </div>
                <ColumnChart
                  data={stats.byClass
                    .filter(c => classGrade === 'all' || c.name.startsWith(classGrade))
                    .map(c => ({ name: c.name, count: c.count }))}
                  height={260}
                />
              </Section>
            </div>

            <Section title="Số bài test theo thời gian" description="Theo ngày nộp bài (giờ Việt Nam)">
              <TrendChart byDay={stats.byDay} />
            </Section>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default Statistics;
