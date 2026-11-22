import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Download, Loader2, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { catalogApi, ExamBlock, HOLLAND_TYPES, HollandType, ImportResult, MajorItem, Subject } from '@/services/catalogApi';
import { normalizeVi } from '@/lib/textSearch';
import { exportSheet, readSheet, requireColumns, SheetColumn } from '@/lib/excel';
import ImportPreviewDialog from '@/components/ImportPreviewDialog';

const HOLLAND_SHORT: Record<HollandType, string> = {
  R: 'Kỹ thuật', I: 'Nghiên cứu', A: 'Nghệ thuật', S: 'Xã hội', E: 'Quản lý', C: 'Nghiệp vụ',
};

// Cột file Excel (xuất ra và nhập vào dùng chung)
type MajorKey = 'name' | 'hollandGroups' | 'examBlocks' | 'benchmarkScore' | 'keywords' | 'description' | 'active';
const COLUMNS: SheetColumn<MajorKey>[] = [
  { key: 'name', header: 'Tên ngành', width: 36, aliases: ['Ngành', 'Tên'] },
  { key: 'hollandGroups', header: 'Nhóm Holland', width: 14, aliases: ['Nhóm', 'Holland'] },
  { key: 'examBlocks', header: 'Tổ hợp', width: 28, aliases: ['Khối', 'Khối thi', 'Tổ hợp xét tuyển'] },
  { key: 'benchmarkScore', header: 'Điểm chuẩn', width: 11 },
  { key: 'keywords', header: 'Từ khoá', width: 28, aliases: ['Từ khóa'] },
  { key: 'description', header: 'Mô tả', width: 60 },
  { key: 'active', header: 'Đang dùng', width: 10, boolean: true },
];

/** Ngành cũ trong DB có thể thiếu trường mới */
const withDefaults = (m: MajorItem): MajorItem => ({
  ...m,
  description: m.description ?? '',
  examBlocks: m.examBlocks ?? [],
  hollandGroups: m.hollandGroups ?? [],
  keywords: m.keywords ?? [],
  benchmarkScore: m.benchmarkScore ?? null,
});

type Filter = 'all' | 'oneGroup' | 'noBlocks' | 'noBenchmark' | 'off';

const emptyMajor = (): Partial<MajorItem> => ({
  name: '', description: '', hollandGroups: [], examBlocks: [], benchmarkScore: null, keywords: [], active: true,
});

const Majors = () => {
  const { toast } = useToast();
  const [majors, setMajors] = useState<MajorItem[]>([]);
  const [blocks, setBlocks] = useState<ExamBlock[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [form, setForm] = useState<Partial<MajorItem> | null>(null);
  const [blockSearch, setBlockSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<MajorItem | null>(null);

  const [bulkBlock, setBulkBlock] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [importRows, setImportRows] = useState<Record<string, unknown>[] | null>(null);
  const [importPreview, setImportPreview] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  const fail = useCallback(
    (err: unknown, title = 'Lỗi') => toast({ title, description: (err as Error).message, variant: 'destructive' }),
    [toast]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, b, s] = await Promise.all([catalogApi.listMajors(), catalogApi.listBlocks(), catalogApi.listSubjects()]);
      setMajors(m.map(withDefaults));
      setBlocks(b);
      setSubjects(s);
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  useEffect(() => {
    load();
  }, [load]);

  const subjectByCode = useMemo(() => new Map(subjects.map(s => [s.code, s])), [subjects]);
  const blockLabel = useCallback(
    (b: ExamBlock) => b.subjects.map(c => subjectByCode.get(c)?.shortName || c).join('-'),
    [subjectByCode]
  );
  const knownBlocks = useMemo(() => new Set(blocks.map(b => b.name)), [blocks]);

  const counts = useMemo(() => ({
    oneGroup: majors.filter(m => m.hollandGroups.length <= 1).length,
    noBlocks: majors.filter(m => !m.examBlocks.length).length,
    noBenchmark: majors.filter(m => m.benchmarkScore == null).length,
    off: majors.filter(m => m.active === false).length,
  }), [majors]);

  const visible = useMemo(() => {
    const terms = normalizeVi(search).split(' ').filter(Boolean);
    return majors.filter(m => {
      if (filter === 'oneGroup' && m.hollandGroups.length > 1) return false;
      if (filter === 'noBlocks' && m.examBlocks.length) return false;
      if (filter === 'noBenchmark' && m.benchmarkScore != null) return false;
      if (filter === 'off' && m.active !== false) return false;
      if (!terms.length) return true;
      const text = normalizeVi([m.name, ...m.examBlocks, ...m.keywords, m.hollandGroups.join('')].join(' '));
      return terms.every(t => text.includes(t));
    });
  }, [majors, search, filter]);

  const allVisibleSelected = visible.length > 0 && visible.every(m => selected.has(m._id));
  const toggleAll = () =>
    setSelected(prev => {
      const next = new Set(prev);
      visible.forEach(m => (allVisibleSelected ? next.delete(m._id) : next.add(m._id)));
      return next;
    });
  const toggleOne = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /* ---------- Lưu / xoá ---------- */
  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const payload = { ...form, keywords: (form.keywords || []).map(k => k.trim()).filter(Boolean) };
      if (form._id) {
        const updated = await catalogApi.updateMajor(form._id, payload);
        setMajors(prev => prev.map(m => (m._id === updated._id ? withDefaults(updated) : m)));
      } else {
        const created = await catalogApi.createMajor(payload);
        setMajors(prev => [...prev, withDefaults(created)].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
      }
      setForm(null);
      toast({ title: 'Đã lưu ngành' });
    } catch (err) {
      fail(err, 'Không lưu được');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (m: MajorItem, active: boolean) => {
    try {
      const updated = await catalogApi.updateMajor(m._id, { active });
      setMajors(prev => prev.map(x => (x._id === m._id ? withDefaults(updated) : x)));
    } catch (err) {
      fail(err, 'Không lưu được');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    try {
      await catalogApi.deleteMajor(target._id);
      setMajors(prev => prev.filter(m => m._id !== target._id));
      toast({ title: 'Đã xoá ngành' });
    } catch (err) {
      fail(err, 'Không xoá được');
    }
  };

  const bulk = async (set: { active?: boolean; addBlocks?: string[]; removeBlocks?: string[] }) => {
    try {
      const r = await catalogApi.bulkMajors([...selected], set);
      toast({ title: 'Đã cập nhật', description: `${r.modified} thay đổi.` });
      setBulkBlock('');
      await load();
    } catch (err) {
      fail(err, 'Không cập nhật được');
    }
  };

  /* ---------- Excel ---------- */
  const exportExcel = () => exportSheet('DanhMucNganh', 'Ngành', COLUMNS, majors);

  const onFile = async (file: File) => {
    try {
      const { rows, found } = await readSheet(file, COLUMNS);
      requireColumns(found, COLUMNS, ['name']);
      const named = rows.filter(r => String(r.name || '').trim());
      if (!named.length) throw new Error('File không có dòng nào có tên ngành');
      const preview = await catalogApi.importMajors(named, true);
      setImportRows(named);
      setImportPreview(preview);
    } catch (err) {
      fail(err, 'Không đọc được file');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    if (!importRows) return;
    setImporting(true);
    try {
      const r = await catalogApi.importMajors(importRows, false);
      toast({ title: 'Đã nhập file', description: `Thêm ${r.created} ngành, cập nhật ${r.updated} ngành.` });
      setImportRows(null);
      setImportPreview(null);
      await load();
    } catch (err) {
      fail(err, 'Không nhập được');
    } finally {
      setImporting(false);
    }
  };

  const formBlocks = useMemo(() => {
    const terms = normalizeVi(blockSearch).split(' ').filter(Boolean);
    return blocks.filter(b => {
      if (!terms.length) return true;
      const text = normalizeVi(`${b.name} ${b.subjects.map(c => `${subjectByCode.get(c)?.name || ''} ${subjectByCode.get(c)?.shortName || ''}`).join(' ')}`);
      return terms.every(t => text.includes(t));
    });
  }, [blocks, blockSearch, subjectByCode]);

  const toggleIn = <T,>(list: T[] = [], v: T) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  const FILTERS: { value: Filter; label: string; count?: number }[] = [
    { value: 'all', label: `Tất cả (${majors.length})` },
    { value: 'oneGroup', label: 'Chỉ 1 nhóm Holland', count: counts.oneGroup },
    { value: 'noBlocks', label: 'Chưa có tổ hợp', count: counts.noBlocks },
    { value: 'noBenchmark', label: 'Chưa có điểm chuẩn', count: counts.noBenchmark },
    { value: 'off', label: 'Đang tắt', count: counts.off },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center gap-2 px-4 py-3">
          <Link to="/admin">
            <Button variant="ghost" size="icon" aria-label="Quay lại"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold sm:text-2xl">Ngành học</h1>
            <p className="hidden text-sm text-muted-foreground sm:block">Dữ liệu dùng để xếp hạng ngành cho học sinh</p>
          </div>
          <Button variant="outline" className="h-10" onClick={exportExcel} disabled={!majors.length}>
            <Download className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Xuất Excel</span>
          </Button>
          <Button variant="outline" className="h-10" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Nhập Excel</span>
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
          <Button className="h-10" onClick={() => { setForm(emptyMajor()); setBlockSearch(''); }}>
            <Plus className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Thêm</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl space-y-4 px-4 py-4 sm:py-6">
        {counts.oneGroup > majors.length / 2 && !loading && (
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>
              {counts.oneGroup}/{majors.length} ngành chỉ có 1 nhóm Holland, nên hệ thống khó phân biệt ngành nào hợp hơn.
              Nên gán 2–3 nhóm cho mỗi ngành (VD: CNTT = I, R, C). Có thể xuất Excel, sửa hàng loạt rồi nhập lại.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên ngành, tổ hợp, nhóm..." className="h-10 pl-9" />
          </div>
          <Select value={filter} onValueChange={v => setFilter(v as Filter)}>
            <SelectTrigger className="h-10 sm:w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FILTERS.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}{f.count !== undefined ? ` (${f.count})` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2 text-sm">
            <span className="px-2 font-medium">Đã chọn {selected.size}</span>
            <Select value={bulkBlock} onValueChange={setBulkBlock}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Chọn tổ hợp" /></SelectTrigger>
              <SelectContent>{blocks.map(b => <SelectItem key={b._id} value={b.name}>{b.name} · {blockLabel(b)}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={!bulkBlock} onClick={() => bulk({ addBlocks: [bulkBlock] })}>Thêm tổ hợp</Button>
            <Button size="sm" variant="outline" disabled={!bulkBlock} onClick={() => bulk({ removeBlocks: [bulkBlock] })}>Gỡ tổ hợp</Button>
            <Button size="sm" variant="outline" onClick={() => bulk({ active: true })}>Bật</Button>
            <Button size="sm" variant="outline" onClick={() => bulk({ active: false })}>Tắt</Button>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>Bỏ chọn</Button>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Đang tải...
              </div>
            ) : visible.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">Không có ngành phù hợp.</p>
            ) : (
              <>
                <label className="flex items-center gap-3 border-b px-4 py-2 text-sm text-muted-foreground">
                  <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} /> Chọn tất cả {visible.length} ngành đang hiện
                </label>
                <ul className="divide-y">
                  {visible.map(m => {
                    const unknown = m.examBlocks.filter(b => !knownBlocks.has(b));
                    return (
                      <li key={m._id} className={`flex items-start gap-3 px-4 py-3 ${m.active === false ? 'opacity-60' : ''}`}>
                        <Checkbox className="mt-1" checked={selected.has(m._id)} onCheckedChange={() => toggleOne(m._id)} aria-label={`Chọn ${m.name}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{m.name}</span>
                            <span className="flex gap-1">
                              {m.hollandGroups.map(g => (
                                <span key={g} title={HOLLAND_SHORT[g]} className="rounded bg-primary/10 px-1.5 text-xs font-bold text-primary">{g}</span>
                              ))}
                              {!m.hollandGroups.length && <span className="text-xs text-destructive">chưa có nhóm Holland</span>}
                            </span>
                            {m.benchmarkScore != null && <span className="text-xs text-muted-foreground">điểm chuẩn ~{m.benchmarkScore}</span>}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {m.examBlocks.length ? m.examBlocks.join(', ') : <span className="text-amber-700">chưa có tổ hợp</span>}
                            {unknown.length > 0 && <span className="text-destructive"> · không có trong danh mục: {unknown.join(', ')}</span>}
                          </div>
                        </div>
                        <Switch checked={m.active !== false} onCheckedChange={v => toggleActive(m, v)} aria-label="Bật/tắt ngành" />
                        <Button size="icon" variant="ghost" aria-label="Sửa" onClick={() => { setForm({ ...m }); setBlockSearch(''); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" aria-label="Xoá" onClick={() => setDeleting(m)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Form ngành */}
      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?._id ? 'Sửa ngành' : 'Thêm ngành'}</DialogTitle>
            <DialogDescription>Ngành chỉ được gợi ý khi có ít nhất 1 nhóm Holland trùng nhóm nổi trội của học sinh.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <div className="space-y-1">
                  <Label>Tên ngành</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Điểm chuẩn (/30)</Label>
                  <Input
                    inputMode="decimal"
                    value={form.benchmarkScore ?? ''}
                    placeholder="Bỏ trống"
                    onChange={e => {
                      const v = e.target.value.replace(',', '.');
                      setForm({ ...form, benchmarkScore: v === '' ? null : Math.min(30, Number(v) || 0) });
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Mô tả</Label>
                <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Nhóm Holland (nên chọn 2–3 nhóm)</Label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {HOLLAND_TYPES.map(g => {
                    const on = form.hollandGroups?.includes(g);
                    return (
                      <button
                        type="button"
                        key={g}
                        onClick={() => setForm({ ...form, hollandGroups: toggleIn(form.hollandGroups, g) })}
                        className={`rounded-lg border-2 px-2 py-1.5 text-left ${on ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/60'}`}
                      >
                        <div className="font-bold">{g}</div>
                        <div className="text-xs opacity-80">{HOLLAND_SHORT[g]}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <Label>Tổ hợp xét tuyển ({form.examBlocks?.length || 0})</Label>
                  {!!form.examBlocks?.length && <span className="text-xs text-muted-foreground">{form.examBlocks.join(', ')}</span>}
                </div>
                <Input value={blockSearch} onChange={e => setBlockSearch(e.target.value)} placeholder="Lọc tổ hợp (VD: toan anh)" className="h-9" />
                <div className="grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto rounded-md border p-2 sm:grid-cols-3">
                  {formBlocks.map(b => {
                    const on = form.examBlocks?.includes(b.name);
                    return (
                      <button
                        type="button"
                        key={b._id}
                        onClick={() => setForm({ ...form, examBlocks: toggleIn(form.examBlocks, b.name) })}
                        className={`rounded border px-2 py-1 text-left text-xs ${on ? 'border-primary bg-primary/10' : 'hover:bg-muted'} ${b.active === false ? 'opacity-50' : ''}`}
                      >
                        <span className="font-bold text-primary">{b.name}</span> {blockLabel(b)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Từ khoá nhận nguyện vọng (cách nhau bằng dấu phẩy)</Label>
                <Input
                  value={(form.keywords || []).join(',')}
                  placeholder="VD: IT, lập trình, phần mềm"
                  onChange={e => setForm({ ...form, keywords: e.target.value.split(',') })}
                />
                <p className="text-xs text-muted-foreground">Khi học sinh ghi nguyện vọng chứa từ khoá này, ngành được cộng điểm nguyện vọng.</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setForm(null)}>Huỷ</Button>
            <Button onClick={save} disabled={saving || !form?.name?.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Xem trước khi nhập Excel */}
      <ImportPreviewDialog
        title="Nhập danh sách ngành"
        description={`Khớp theo tên ngành (không phân biệt dấu, hoa thường). Ô để trống giữ nguyên dữ liệu hiện có. Cột nhận được: ${COLUMNS.map(c => c.header).join(', ')}.`}
        unit="Ngành"
        summary={importPreview && {
          ...importPreview,
          warnings: importPreview.unknownBlocks.length
            ? [`Tổ hợp chưa có trong danh mục (sẽ bị bỏ qua khi xếp hạng): ${importPreview.unknownBlocks.join(', ')}`]
            : [],
        }}
        busy={importing}
        onConfirm={confirmImport}
        onClose={() => { setImportPreview(null); setImportRows(null); }}
      />

      <AlertDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá ngành {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Kết quả học sinh đã làm không bị ảnh hưởng. Muốn ngừng gợi ý tạm thời, hãy tắt ngành thay vì xoá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Majors;
