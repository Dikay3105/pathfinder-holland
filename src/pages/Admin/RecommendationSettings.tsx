import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, BookOpen, CheckCircle2, FlaskConical, HelpCircle, Loader2, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  catalogApi, CatalogHealth, HOLLAND_TYPES, PublicConfig, RecommendationResult, RecommendationSettings,
} from '@/services/catalogApi';
import { MajorRanking } from '@/components/MajorRanking';

const num = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Number(v) || 0));

/** Chú thích mở/đóng được, để admin đọc khi cần */
function Help({ children }: { children: ReactNode }) {
  return (
    <details className="group mt-1 text-xs">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-primary hover:underline [&::-webkit-details-marker]:hidden">
        <HelpCircle className="h-3.5 w-3.5" />
        <span className="group-open:hidden">Giải thích</span>
        <span className="hidden group-open:inline">Ẩn giải thích</span>
      </summary>
      <div className="mt-1.5 space-y-1.5 rounded-md bg-muted/70 p-2.5 leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}

function Field({ label, hint, help, children }: { label: string; hint?: string; help?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[1fr_200px] sm:items-start sm:gap-4">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {help && <Help>{help}</Help>}
      </div>
      <div>{children}</div>
    </div>
  );
}

/** Nhóm nổi trội theo bậc điểm (giống backend) – dùng để minh hoạ trong chú thích */
function topGroupsOf(scores: Record<string, number>, min: number, max: number) {
  const buckets = new Map<number, string[]>();
  HOLLAND_TYPES.forEach(t => {
    const s = Number(scores[t]) || 0;
    if (s > 0) buckets.set(s, [...(buckets.get(s) || []), t]);
  });
  const sorted = [...buckets.entries()].sort((a, b) => b[0] - a[0]);
  if (!sorted.length || sorted[0][1].length > max) return [];
  const out: string[] = [];
  for (const [, types] of sorted) {
    if (out.length >= min || out.length + types.length > max) break;
    out.push(...types);
  }
  return out;
}

const WEIGHT_HELP: Record<'holland' | 'academic' | 'aspiration', ReactNode> = {
  holland: (
    <>
      <p>So nhóm Holland của ngành với nhóm nổi trội của học sinh, có tính độ mạnh từng nhóm.</p>
      <p>VD học sinh nổi trội I, C, E (I cao nhất): ngành "I, C" hợp hơn ngành chỉ có "E". Ngành không có nhóm nào trùng thì <b>không được gợi ý</b>.</p>
      <p>Tăng phần này nếu muốn gợi ý bám sát tính cách.</p>
    </>
  ),
  academic: (
    <>
      <p>Lấy tổ hợp có tổng điểm cao nhất trong các tổ hợp học sinh xét được, so với điểm chuẩn của ngành:</p>
      <ul className="list-disc pl-4">
        <li>Bằng điểm chuẩn → 50%. Mỗi điểm hơn/kém ≈ ±17%. Hơn từ 3 điểm → 100%, kém từ 3 điểm → 0%.</li>
        <li>Nhãn: <b>an toàn</b> (hơn ≥ 1 điểm), <b>vừa sức</b> (từ kém 1,5 đến hơn dưới 1 điểm), <b>thử thách</b> (kém hơn 1,5 điểm).</li>
        <li>Ngành chưa có điểm chuẩn → tính tổng điểm / 30 (kém chính xác hơn).</li>
      </ul>
      <p>Tăng phần này nếu muốn gợi ý sát khả năng đỗ. Nên nhập điểm chuẩn ở trang Ngành học trước.</p>
    </>
  ),
  aspiration: (
    <>
      <p>Ngành học sinh ghi ở bước nhập thông tin:</p>
      <ul className="list-disc pl-4">
        <li>Trùng tên hoặc trùng <b>từ khoá</b> của ngành (đặt ở trang Ngành học) → 100%.</li>
        <li>Cùng lĩnh vực (VD ghi "Công nghệ thông tin", ngành "Khoa học dữ liệu") → 50%.</li>
      </ul>
      <p>Nên để thấp (10–20%) để nguyện vọng chỉ là điểm cộng, không lấn át tính cách và học lực.</p>
    </>
  ),
};

const RecommendationSettingsPage = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<RecommendationSettings | null>(null);
  const [saved, setSaved] = useState<RecommendationSettings | null>(null);
  const [defaults, setDefaults] = useState<RecommendationSettings | null>(null);
  const [health, setHealth] = useState<CatalogHealth | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Chạy thử
  const [holland, setHolland] = useState<Record<string, number>>({ R: 3, I: 8, A: 2, S: 4, E: 6, C: 7 });
  const [electives, setElectives] = useState<string[]>(['LY', 'ANH']);
  const [aptitudes, setAptitudes] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({ TOAN: '8', VAN: '6.5', LY: '7.5', ANH: '8' });
  const [aspiration, setAspiration] = useState('Công nghệ thông tin');
  const [preview, setPreview] = useState<RecommendationResult | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const fail = useCallback(
    (err: unknown, title = 'Lỗi') => toast({ title, description: (err as Error).message, variant: 'destructive' }),
    [toast]
  );

  useEffect(() => {
    Promise.all([catalogApi.getSettings(), catalogApi.health(), catalogApi.publicConfig()])
      .then(([s, h, c]) => {
        setSettings(s.data);
        setSaved(s.data);
        setDefaults(s.defaults);
        setHealth(h);
        setConfig(c);
      })
      .catch(err => fail(err));
  }, [fail]);

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(saved), [settings, saved]);
  const totalWeight = settings ? settings.weights.holland + settings.weights.academic + settings.weights.aspiration : 0;
  const pct = (v: number) => (totalWeight ? Math.round((v / totalWeight) * 100) : 0);

  const set = <K extends keyof RecommendationSettings>(key: K, value: RecommendationSettings[K]) =>
    setSettings(prev => (prev ? { ...prev, [key]: value } : prev));

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const data = await catalogApi.saveSettings(settings);
      setSettings(data);
      setSaved(data);
      toast({ title: 'Đã lưu cấu hình', description: 'Áp dụng cho học sinh nộp bài từ bây giờ (tối đa 1 phút).' });
    } catch (err) {
      fail(err, 'Không lưu được');
    } finally {
      setSaving(false);
    }
  };

  const runPreview = async () => {
    if (!settings) return;
    setPreviewing(true);
    try {
      const data = await catalogApi.preview({
        hollandScores: holland,
        electiveSubjects: electives,
        aptitudeSubjects: aptitudes,
        scores: Object.entries(scores)
          .filter(([, v]) => v !== '')
          .map(([code, v]) => ({ code, currentScore: Number(v.replace(',', '.')) || 0, targetScore: 0 })),
        aspiration,
        settings,
      });
      setPreview(data);
    } catch (err) {
      fail(err, 'Không chạy thử được');
    } finally {
      setPreviewing(false);
    }
  };

  const required = config?.subjects.filter(s => s.kind === 'required') || [];
  const electiveList = config?.subjects.filter(s => s.kind === 'elective') || [];
  const aptitudeList = config?.subjects.filter(s => s.kind === 'aptitude') || [];
  const scoreSubjects = [...required, ...(config?.subjects.filter(s => electives.includes(s.code) || aptitudes.includes(s.code)) || [])];

  if (!settings) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Đang tải...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center gap-2 px-4 py-3">
          <Link to="/admin">
            <Button variant="ghost" size="icon" aria-label="Quay lại"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold sm:text-2xl">Cấu hình tư vấn</h1>
            <p className="hidden text-sm text-muted-foreground sm:block">Cách hệ thống xếp hạng ngành và viết lời khuyên</p>
          </div>
          {defaults && (
            <Button variant="ghost" className="h-10" onClick={() => setSettings(defaults)} title="Về giá trị mặc định (chưa lưu)">
              <RotateCcw className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Mặc định</span>
            </Button>
          )}
          <Button className="h-10" onClick={save} disabled={!dirty || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin sm:mr-1" /> : <Save className="h-4 w-4 sm:mr-1" />}
            <span className="hidden sm:inline">Lưu</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto grid max-w-6xl gap-4 px-4 py-4 sm:py-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          {/* Hướng dẫn nhanh */}
          <Card>
            <CardContent className="p-4 text-sm">
              <details>
                <summary className="flex cursor-pointer list-none items-center gap-2 font-medium [&::-webkit-details-marker]:hidden">
                  <BookOpen className="h-4 w-4 text-primary" /> Hướng dẫn sử dụng trang này
                  <span className="ml-auto text-xs font-normal text-primary">Xem</span>
                </summary>
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted-foreground">
                  <li>Học sinh làm test → hệ thống tìm <b>nhóm Holland nổi trội</b> và các <b>tổ hợp xét tuyển</b> từ môn thi học sinh chọn.</li>
                  <li>Mỗi ngành trong danh mục được chấm <b>% phù hợp</b> = Tính cách + Học lực + Nguyện vọng theo trọng số bên dưới, rồi xếp từ cao xuống thấp.</li>
                  <li>AI đọc bảng xếp hạng đó để viết lời khuyên (có thể thêm vài ngành ngoài danh mục nếu cho phép).</li>
                  <li>Sửa cấu hình → bấm <b>Chạy thử</b> với vài kiểu học sinh → thấy hợp lý mới bấm <b>Lưu</b>.</li>
                  <li><b>Mặc định</b> đưa mọi giá trị về ban đầu (vẫn phải bấm Lưu). Cấu hình chỉ áp dụng cho bài nộp sau khi lưu, không đổi kết quả cũ.</li>
                </ol>
                <p className="mt-2 text-xs text-muted-foreground">
                  Kết quả tốt hay không phụ thuộc nhiều vào dữ liệu ngành: mỗi ngành nên có 2–3 nhóm Holland, đủ tổ hợp và điểm chuẩn
                  (trang <Link to="/admin/majors" className="underline">Ngành học</Link>).
                </p>
              </details>
            </CardContent>
          </Card>

          {/* Sức khoẻ dữ liệu */}
          {health && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Dữ liệu hiện có</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  {health.summary.subjects} môn · {health.summary.blocks} tổ hợp ({health.summary.blocksUsedByMajors} tổ hợp có ngành dùng) ·{' '}
                  {health.summary.majors} ngành ({health.summary.majorsWithBenchmark} ngành có điểm chuẩn)
                </p>
                {health.issues.length === 0 ? (
                  <p className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Không phát hiện lỗi dữ liệu.</p>
                ) : (
                  <ul className="max-h-40 space-y-1 overflow-y-auto">
                    {health.issues.map((i, k) => (
                      <li key={k} className={`flex gap-2 ${i.level === 'error' ? 'text-destructive' : 'text-amber-700'}`}>
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {i.text}
                      </li>
                    ))}
                  </ul>
                )}
                {health.summary.majorsWithBenchmark === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Chưa ngành nào có điểm chuẩn nên học lực đang được tính theo tổng điểm/30. Nhập điểm chuẩn ở trang{' '}
                    <Link to="/admin/majors" className="underline">Ngành học</Link> để nhận xét "an toàn / sát / cần cố gắng" chính xác hơn.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Trọng số độ phù hợp</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {([
                ['holland', 'Tính cách (Holland)', 'Mức khớp giữa nhóm nổi trội của học sinh và nhóm của ngành'],
                ['academic', 'Học lực', 'Tổng điểm tổ hợp tốt nhất so với điểm chuẩn (hoặc so với 30)'],
                ['aspiration', 'Nguyện vọng', 'Ngành trùng hoặc cùng lĩnh vực với ngành học sinh muốn học'],
              ] as const).map(([key, label, hint]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Label>{label}</Label>
                      <p className="text-xs text-muted-foreground">{hint}</p>
                      <Help>{WEIGHT_HELP[key]}</Help>
                    </div>
                    <span className="text-lg font-bold tabular-nums text-primary">{pct(settings.weights[key])}%</span>
                  </div>
                  <Slider
                    value={[settings.weights[key]]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([v]) => set('weights', { ...settings.weights, [key]: v })}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                % phù hợp của ngành = cộng 3 phần theo tỉ lệ trên (tự quy về 100%, không cần kéo cho đủ 100). Học sinh chưa nhập
                điểm hoặc không ghi nguyện vọng thì phần đó được bỏ và chia lại cho phần còn lại.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Quy tắc</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field
                label="Số môn thi tự chọn"
                hint="Học sinh phải chọn đúng số môn này (thi tốt nghiệp 2025: 2 môn)"
                help={<p>Không tính môn bắt buộc (Toán, Văn). Hệ thống chỉ xét tổ hợp có đủ 3 môn nằm trong các môn học sinh thi. Chỉ đổi khi quy chế thi thay đổi. Danh sách môn sửa ở trang Môn học &amp; tổ hợp.</p>}
              >
                <Input type="number" min={1} max={6} value={settings.electiveCount} onChange={e => set('electiveCount', num(e.target.value, 1, 6))} />
              </Field>
              <Field
                label="Nhóm Holland nổi trội"
                hint="Ít nhất / nhiều nhất bao nhiêu nhóm (nhóm bằng điểm đi cùng nhau)"
                help={
                  <>
                    <p>Lấy các nhóm điểm cao nhất cho đến khi đủ số "ít nhất", không vượt số "nhiều nhất". Nhóm bằng điểm nhau thì lấy cả hoặc bỏ cả.</p>
                    <p>
                      VD với điểm ở khung chạy thử ({HOLLAND_TYPES.map(t => t + '=' + holland[t]).join(', ')}):{' '}
                      <b>{topGroupsOf(holland, settings.topGroups.min, settings.topGroups.max).join(', ') || 'không có nhóm nổi trội'}</b>.
                    </p>
                    <p>Chỉ ngành có ít nhất 1 nhóm trong số này mới được gợi ý. Tăng số nhóm → gợi ý rộng hơn nhưng kém sắc nét. Học sinh trả lời đều tay (quá nhiều nhóm cùng điểm cao nhất) thì không có nhóm nổi trội.</p>
                  </>
                }
              >
                <div className="flex items-center gap-2">
                  <Input type="number" min={1} max={6} value={settings.topGroups.min}
                    onChange={e => set('topGroups', { ...settings.topGroups, min: num(e.target.value, 1, 6) })} />
                  <span>–</span>
                  <Input type="number" min={1} max={6} value={settings.topGroups.max}
                    onChange={e => set('topGroups', { ...settings.topGroups, max: num(e.target.value, 1, 6) })} />
                </div>
              </Field>
              <Field
                label="Điểm dùng để tính học lực"
                help={<p>Học sinh nhập cả điểm hiện tại và điểm mục tiêu từng môn. <b>Hiện tại</b>: thực tế, thận trọng. <b>Mục tiêu</b>: lạc quan, khuyến khích. <b>Trung bình</b>: cân bằng giữa hai.</p>}
              >
                <Select value={settings.scoreBasis} onValueChange={v => set('scoreBasis', v as RecommendationSettings['scoreBasis'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Điểm hiện tại</SelectItem>
                    <SelectItem value="target">Điểm mục tiêu</SelectItem>
                    <SelectItem value="average">Trung bình hiện tại & mục tiêu</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Số ngành hiển thị" hint="Số ngành tối đa trong bảng xếp hạng học sinh thấy">
                <Input type="number" min={3} max={20} value={settings.topMajorCount} onChange={e => set('topMajorCount', num(e.target.value, 3, 20))} />
              </Field>
              <Field
                label="Gợi ý ngành cần đổi môn thi"
                hint="Ngành hợp tính cách nhưng học sinh chưa có tổ hợp"
                help={<p>Hiện thành mục riêng "Hợp tính cách nhưng cần đổi môn thi", kèm môn còn thiếu (VD "Y khoa: cần thêm Hóa học"). Giúp học sinh lớp 10–11 cân nhắc chọn môn. Ô số là số ngành tối đa ở mục này.</p>}
              >
                <div className="flex items-center gap-3">
                  <Switch checked={settings.showAlternatives} onCheckedChange={v => set('showAlternatives', v)} />
                  <Input type="number" min={0} max={10} disabled={!settings.showAlternatives} value={settings.alternativeCount}
                    onChange={e => set('alternativeCount', num(e.target.value, 0, 10))} />
                </div>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Lời khuyên AI</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Khu vực" hint="AI ưu tiên gợi ý trường ở khu vực này" help={<p>Ghi tên tỉnh/thành hoặc vùng, VD "TP.HCM", "Hà Nội", "miền Tây".</p>}>
                <Input value={settings.region} onChange={e => set('region', e.target.value)} />
              </Field>
              <Field label="Số ngành AI phân tích" hint="AI viết lời khuyên cho bao nhiêu ngành đầu bảng" help={<p>Nhiều ngành → lời khuyên dài và chậm hơn. 5–6 ngành là vừa.</p>}>
                <Input type="number" min={3} max={10} value={settings.ai.majorCount}
                  onChange={e => set('ai', { ...settings.ai, majorCount: num(e.target.value, 3, 10) })} />
              </Field>
              <Field
                label="Cho AI gợi ý ngành ngoài danh mục"
                hint='Ngành do AI thêm có nhãn "AI gợi ý thêm"'
                help={<p>Bật để AI được đề xuất thêm ngành phù hợp mà danh mục chưa có (tối đa số trong ô). Tắt nếu chỉ muốn AI bàn về ngành trong danh mục. Nếu AI hay gợi ý cùng một ngành, nên thêm ngành đó vào trang Ngành học.</p>}
              >
                <div className="flex items-center gap-3">
                  <Switch checked={settings.ai.allowExternalMajors} onCheckedChange={v => set('ai', { ...settings.ai, allowExternalMajors: v })} />
                  <Input type="number" min={0} max={5} disabled={!settings.ai.allowExternalMajors} value={settings.ai.maxExternalMajors}
                    onChange={e => set('ai', { ...settings.ai, maxExternalMajors: num(e.target.value, 0, 5) })} />
                </div>
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* Chạy thử */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><FlaskConical className="h-4 w-4" /> Chạy thử với cấu hình đang sửa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-xs text-muted-foreground">
                Nhập một học sinh giả rồi bấm Chạy thử để xem bảng xếp hạng theo cấu hình <b>đang sửa (chưa cần lưu)</b>.
                Không ghi gì vào dữ liệu, không gọi AI.
              </p>
              <div>
                <Label>Điểm Holland</Label>
                <div className="mt-1 grid grid-cols-6 gap-1.5">
                  {HOLLAND_TYPES.map(t => (
                    <label key={t} className="text-center">
                      <span className="text-xs font-bold">{t}</span>
                      <Input inputMode="numeric" className="h-9 px-1 text-center" value={holland[t]}
                        onChange={e => setHolland({ ...holland, [t]: num(e.target.value, 0, 99) })} />
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Môn tự chọn</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {electiveList.map(s => {
                    const on = electives.includes(s.code);
                    return (
                      <button type="button" key={s.code}
                        onClick={() => setElectives(on ? electives.filter(c => c !== s.code) : [...electives, s.code].slice(-settings.electiveCount))}
                        className={`rounded border px-2 py-1 ${on ? 'border-primary bg-primary/10 text-primary' : ''}`}>
                        {s.shortName || s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              {aptitudeList.length > 0 && (
                <div>
                  <Label>Năng khiếu</Label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {aptitudeList.map(s => {
                      const on = aptitudes.includes(s.code);
                      return (
                        <button type="button" key={s.code}
                          onClick={() => setAptitudes(on ? aptitudes.filter(c => c !== s.code) : [...aptitudes, s.code])}
                          className={`rounded border px-2 py-1 ${on ? 'border-violet-400 bg-violet-50 text-violet-800' : ''}`}>
                          {s.shortName || s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <Label>Điểm hiện tại</Label>
                <div className="mt-1 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {scoreSubjects.map(s => (
                    <label key={s.code}>
                      <span className="text-xs">{s.shortName || s.name}</span>
                      <Input inputMode="decimal" className="h-9" value={scores[s.code] ?? ''}
                        onChange={e => setScores({ ...scores, [s.code]: e.target.value })} />
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Nguyện vọng</Label>
                <Input className="mt-1" value={aspiration} onChange={e => setAspiration(e.target.value)} />
              </div>
              <Button className="w-full" onClick={runPreview} disabled={previewing}>
                {previewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Chạy thử
              </Button>
            </CardContent>
          </Card>

          {preview && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm text-muted-foreground">
                  Mã Holland <b className="text-foreground">{preview.hollandCode || '—'}</b> · Tổ hợp dùng được:{' '}
                  {preview.usableBlocks.map(b => b.name).join(', ') || 'không có'}
                </p>
                {preview.ranked.length || preview.alternatives.length ? (
                  <MajorRanking ranked={preview.ranked} alternatives={preview.alternatives} />
                ) : (
                  <p className="text-sm">Không có ngành nào phù hợp.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default RecommendationSettingsPage;
