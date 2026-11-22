import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { catalogApi, ExamBlock, KIND_LABEL, Subject, SubjectKind } from '@/services/catalogApi';
import { normalizeVi } from '@/lib/textSearch';

const APTITUDE_STYLE = 'bg-violet-100 text-violet-800 border-violet-200';
const KINDS: SubjectKind[] = ['required', 'elective', 'aptitude'];

const emptySubject: Partial<Subject> = { code: '', name: '', shortName: '', kind: 'elective', group: '', aliases: [], active: true };
const emptyBlock = (): Partial<ExamBlock> => ({ name: '', subjects: ['', '', ''], note: '', active: true });

type Deleting = { kind: 'subject'; item: Subject } | { kind: 'block'; item: ExamBlock } | null;

const ExamBlocks = () => {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [blocks, setBlocks] = useState<ExamBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [blockFilter, setBlockFilter] = useState<'all' | 'used' | 'unused' | 'aptitude' | 'off'>('all');

  const [subjectForm, setSubjectForm] = useState<Partial<Subject> | null>(null);
  const [blockForm, setBlockForm] = useState<Partial<ExamBlock> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Deleting>(null);

  const fail = useCallback(
    (err: unknown, title = 'Lỗi') => toast({ title, description: (err as Error).message, variant: 'destructive' }),
    [toast]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, b] = await Promise.all([catalogApi.listSubjects(), catalogApi.listBlocks()]);
      setSubjects(s);
      setBlocks(b);
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
  const isAptitudeBlock = useCallback(
    (b: ExamBlock) => b.subjects.some(c => subjectByCode.get(c)?.kind === 'aptitude'),
    [subjectByCode]
  );

  const visibleBlocks = useMemo(() => {
    const terms = normalizeVi(search).split(' ').filter(Boolean);
    return blocks.filter(b => {
      if (blockFilter === 'used' && !b.majorCount) return false;
      if (blockFilter === 'unused' && b.majorCount) return false;
      if (blockFilter === 'aptitude' && !isAptitudeBlock(b)) return false;
      if (blockFilter === 'off' && b.active !== false) return false;
      if (!terms.length) return true;
      const s = b.subjects.map(c => subjectByCode.get(c));
      const text = normalizeVi([b.name, ...s.map(x => `${x?.name || ''} ${x?.shortName || ''}`)].join(' '));
      return terms.every(t => text.includes(t));
    });
  }, [blocks, search, blockFilter, subjectByCode, isAptitudeBlock]);

  /* ---------- Môn học ---------- */
  const saveSubject = async () => {
    if (!subjectForm) return;
    setSaving(true);
    try {
      const payload = { ...subjectForm, aliases: (subjectForm.aliases || []).map(a => a.trim()).filter(Boolean) };
      if (subjectForm._id) {
        const updated = await catalogApi.updateSubject(subjectForm._id, payload);
        setSubjects(prev => prev.map(s => (s._id === updated._id ? { ...s, ...updated } : s)));
      } else {
        const created = await catalogApi.createSubject(payload);
        setSubjects(prev => [...prev, { ...created, blockCount: 0 }]);
      }
      setSubjectForm(null);
      toast({ title: 'Đã lưu môn học' });
    } catch (err) {
      fail(err, 'Không lưu được');
    } finally {
      setSaving(false);
    }
  };

  const toggleSubject = async (s: Subject, active: boolean) => {
    try {
      const updated = await catalogApi.updateSubject(s._id, { active });
      setSubjects(prev => prev.map(x => (x._id === s._id ? { ...x, ...updated } : x)));
    } catch (err) {
      fail(err, 'Không lưu được');
    }
  };

  /* ---------- Tổ hợp ---------- */
  const saveBlock = async () => {
    if (!blockForm) return;
    setSaving(true);
    try {
      const payload = { ...blockForm, subjects: (blockForm.subjects || []).filter(Boolean) };
      if (blockForm._id) {
        const updated = await catalogApi.updateBlock(blockForm._id, payload);
        setBlocks(prev => prev.map(b => (b._id === updated._id ? { ...b, ...updated } : b)));
      } else {
        const created = await catalogApi.createBlock(payload);
        setBlocks(prev => [...prev, { ...created, majorCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setBlockForm(null);
      toast({ title: 'Đã lưu tổ hợp' });
    } catch (err) {
      fail(err, 'Không lưu được');
    } finally {
      setSaving(false);
    }
  };

  const toggleBlock = async (b: ExamBlock, active: boolean) => {
    try {
      const updated = await catalogApi.updateBlock(b._id, { active });
      setBlocks(prev => prev.map(x => (x._id === b._id ? { ...x, ...updated } : x)));
    } catch (err) {
      fail(err, 'Không lưu được');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    try {
      if (target.kind === 'subject') {
        await catalogApi.deleteSubject(target.item._id);
        setSubjects(prev => prev.filter(s => s._id !== target.item._id));
        toast({ title: 'Đã xoá môn học' });
      } else {
        const r = await catalogApi.deleteBlock(target.item._id);
        setBlocks(prev => prev.filter(b => b._id !== target.item._id));
        toast({ title: 'Đã xoá tổ hợp', description: r.removedFromMajors ? `Đã gỡ khỏi ${r.removedFromMajors} ngành.` : undefined });
      }
    } catch (err) {
      fail(err, 'Không xoá được');
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <Link to="/admin">
            <Button variant="ghost" size="icon" aria-label="Quay lại"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold sm:text-2xl">Môn học & tổ hợp</h1>
            <p className="hidden text-sm text-muted-foreground sm:block">
              Học sinh chọn môn thi, hệ thống tự tìm tổ hợp xét tuyển được từ danh mục này
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-4 sm:py-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Đang tải...
          </div>
        ) : (
          <Tabs defaultValue="subjects">
            <TabsList className="mb-4">
              <TabsTrigger value="subjects">Môn học ({subjects.length})</TabsTrigger>
              <TabsTrigger value="blocks">Tổ hợp ({blocks.length})</TabsTrigger>
            </TabsList>

            {/* ================= Môn học ================= */}
            <TabsContent value="subjects" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  <b>Bắt buộc</b>: mọi học sinh đều thi · <b>Tự chọn</b>: học sinh chọn · <b>Năng khiếu</b>: chỉ hiện khi học sinh chọn thi năng khiếu.
                </p>
                <Button onClick={() => setSubjectForm({ ...emptySubject })}><Plus className="mr-1 h-4 w-4" /> Thêm môn</Button>
              </div>
              {KINDS.map(kind => {
                const list = subjects.filter(s => s.kind === kind);
                if (!list.length) return null;
                return (
                  <Card key={kind}>
                    <CardContent className="p-0">
                      <div className="border-b px-4 py-2 text-sm font-semibold">{KIND_LABEL[kind]} ({list.length})</div>
                      <ul className="divide-y">
                        {list.map(s => (
                          <li key={s._id} className={`flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 ${s.active === false ? 'opacity-60' : ''}`}>
                            <code className="hidden w-20 shrink-0 text-xs text-muted-foreground sm:block">{s.code}</code>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium">
                                {s.name}
                                {s.shortName && s.shortName !== s.name && <span className="text-muted-foreground"> · {s.shortName}</span>}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {s.group && <>{s.group} · </>}
                                {s.blockCount || 0} tổ hợp
                                {s.aliases?.length ? <> · tên khác: {s.aliases.join(', ')}</> : null}
                              </div>
                            </div>
                            <Switch checked={s.active !== false} onCheckedChange={v => toggleSubject(s, v)} aria-label="Bật/tắt môn" />
                            <Button size="icon" variant="ghost" aria-label="Sửa" onClick={() => setSubjectForm({ ...s })}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" aria-label="Xoá" onClick={() => setDeleting({ kind: 'subject', item: s })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            {/* ================= Tổ hợp ================= */}
            <TabsContent value="blocks" className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã hoặc môn (VD: toan anh)" className="h-10 pl-9" />
                </div>
                <Select value={blockFilter} onValueChange={v => setBlockFilter(v as typeof blockFilter)}>
                  <SelectTrigger className="h-10 sm:w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="used">Đang có ngành dùng</SelectItem>
                    <SelectItem value="unused">Chưa ngành nào dùng</SelectItem>
                    <SelectItem value="aptitude">Có năng khiếu</SelectItem>
                    <SelectItem value="off">Đang tắt</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="h-10" onClick={() => setBlockForm(emptyBlock())}><Plus className="mr-1 h-4 w-4" /> Thêm tổ hợp</Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  {visibleBlocks.length === 0 ? (
                    <p className="py-10 text-center text-muted-foreground">Không có tổ hợp phù hợp.</p>
                  ) : (
                    <ul className="divide-y">
                      {visibleBlocks.map(b => {
                        const broken = b.subjects.some(c => !subjectByCode.has(c));
                        const names = b.subjects.map(c => {
                          const s = subjectByCode.get(c);
                          return s ? s.shortName || s.name : `⚠ ${c}`;
                        });
                        return (
                          <li key={b._id} className={`flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 ${b.active === false ? 'opacity-60' : ''}`}>
                            <span className="w-12 shrink-0 font-bold text-primary sm:w-14">{b.name}</span>
                            <div className="min-w-0 flex-1">
                              <div className={broken ? 'text-destructive' : ''}>{names.join(' – ')}</div>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                {isAptitudeBlock(b) && <Badge variant="outline" className={APTITUDE_STYLE}>Năng khiếu</Badge>}
                                <span>{b.majorCount ? `${b.majorCount} ngành dùng` : 'chưa ngành nào dùng'}</span>
                                {b.note && <span>· {b.note}</span>}
                              </div>
                            </div>
                            <Switch checked={b.active !== false} onCheckedChange={v => toggleBlock(b, v)} aria-label="Bật/tắt tổ hợp" />
                            <Button size="icon" variant="ghost" aria-label="Sửa" onClick={() => setBlockForm({ ...b, subjects: [...b.subjects] })}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" aria-label="Xoá" onClick={() => setDeleting({ kind: 'block', item: b })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <p className="text-center text-xs text-muted-foreground">
                Tắt tổ hợp = không dùng để gợi ý nhưng vẫn giữ trong dữ liệu ngành. Gán tổ hợp cho ngành ở trang Ngành học.
              </p>
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Form môn học */}
      <Dialog open={!!subjectForm} onOpenChange={o => !o && setSubjectForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{subjectForm?._id ? 'Sửa môn học' : 'Thêm môn học'}</DialogTitle>
            <DialogDescription>Mã môn dùng để liên kết với tổ hợp nên không đổi được sau khi tạo.</DialogDescription>
          </DialogHeader>
          {subjectForm && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Mã môn</Label>
                  <Input
                    value={subjectForm.code}
                    disabled={!!subjectForm._id}
                    placeholder="VD: TIN"
                    onChange={e => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Loại</Label>
                  <Select value={subjectForm.kind} onValueChange={v => setSubjectForm({ ...subjectForm, kind: v as SubjectKind })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{KINDS.map(k => <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tên đầy đủ</Label>
                  <Input value={subjectForm.name} placeholder="VD: Tin học" onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Tên ngắn</Label>
                  <Input value={subjectForm.shortName || ''} placeholder="VD: Tin" onChange={e => setSubjectForm({ ...subjectForm, shortName: e.target.value })} />
                </div>
              </div>
              {subjectForm.kind === 'aptitude' && (
                <div className="space-y-1">
                  <Label>Nhóm năng khiếu</Label>
                  <Input value={subjectForm.group || ''} placeholder="VD: Mỹ thuật – Kiến trúc" onChange={e => setSubjectForm({ ...subjectForm, group: e.target.value })} />
                </div>
              )}
              <div className="space-y-1">
                <Label>Tên gọi khác (cách nhau bằng dấu phẩy)</Label>
                <Input
                  value={(subjectForm.aliases || []).join(',')}
                  placeholder="VD: Tin, Tin học ứng dụng"
                  onChange={e => setSubjectForm({ ...subjectForm, aliases: e.target.value.split(',') })}
                />
                <p className="text-xs text-muted-foreground">Giúp nhận ra điểm học sinh cũ ghi tên môn theo cách khác.</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSubjectForm(null)}>Huỷ</Button>
            <Button onClick={saveSubject} disabled={saving || !subjectForm?.code || !subjectForm?.name}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form tổ hợp */}
      <Dialog open={!!blockForm} onOpenChange={o => !o && setBlockForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{blockForm?._id ? `Sửa tổ hợp ${blockForm.name}` : 'Thêm tổ hợp'}</DialogTitle>
            <DialogDescription>Đổi mã tổ hợp sẽ tự cập nhật trong dữ liệu các ngành đang dùng.</DialogDescription>
          </DialogHeader>
          {blockForm && (
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label>Mã tổ hợp</Label>
                <Input
                  value={blockForm.name}
                  placeholder="VD: X06"
                  onChange={e => setBlockForm({ ...blockForm, name: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="space-y-1">
                    <Label>Môn {i + 1}</Label>
                    <Select
                      value={blockForm.subjects?.[i] || ''}
                      onValueChange={v => {
                        const next = [...(blockForm.subjects || ['', '', ''])];
                        next[i] = v;
                        setBlockForm({ ...blockForm, subjects: next });
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map(s => <SelectItem key={s.code} value={s.code}>{s.shortName || s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <Label>Ghi chú</Label>
                <Input value={blockForm.note || ''} placeholder="VD: Môn Vẽ nhân hệ số 2 ở một số trường" onChange={e => setBlockForm({ ...blockForm, note: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBlockForm(null)}>Huỷ</Button>
            <Button onClick={saveBlock} disabled={saving || !blockForm?.name || new Set((blockForm?.subjects || []).filter(Boolean)).size !== 3}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleting?.kind === 'subject' ? `Xoá môn ${deleting.item.name}?` : `Xoá tổ hợp ${deleting?.item.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.kind === 'subject'
                ? 'Chỉ xoá được môn không nằm trong tổ hợp nào. Muốn ẩn tạm thời, hãy dùng công tắc tắt môn.'
                : `Tổ hợp sẽ bị gỡ khỏi ${deleting?.kind === 'block' ? deleting.item.majorCount || 0 : 0} ngành đang dùng. Muốn ngừng dùng tạm thời, hãy tắt tổ hợp thay vì xoá.`}
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

export default ExamBlocks;
