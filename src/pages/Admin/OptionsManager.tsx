import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Download,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Checkbox } from '@/components/ui/checkbox';
import { optionsApi, OptionItem, OptionType, ImportCandidate, OptionImportResult } from '@/services/optionsApi';
import { normalizeVi } from '@/lib/textSearch';
import { exportSheet, readSheet, requireColumns, SheetColumn } from '@/lib/excel';
import ImportPreviewDialog from '@/components/ImportPreviewDialog';

const TYPE_LABEL: Record<OptionType, { one: string; title: string }> = {
  university: { one: 'trường', title: 'Trường đại học' },
  major: { one: 'ngành', title: 'Ngành học mong muốn' },
};

type FilterMode = 'all' | 'active' | 'hidden';

type OptionKey = 'name' | 'active' | 'order';
const COLUMNS: SheetColumn<OptionKey>[] = [
  { key: 'name', header: 'Tên', width: 50, aliases: ['Tên trường', 'Trường', 'Tên ngành', 'Ngành'] },
  { key: 'active', header: 'Hiển thị', width: 10, boolean: true, aliases: ['Đang hiển thị', 'Đang dùng'] },
  { key: 'order', header: 'Thứ tự', width: 8, aliases: ['STT'] },
];

const OptionsManager = () => {
  const { toast } = useToast();
  const [type, setType] = useState<OptionType>('university');
  const [items, setItems] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addText, setAddText] = useState('');
  const [adding, setAdding] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [minCount, setMinCount] = useState(5);
  const [importing, setImporting] = useState(false);
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [picked, setPicked] = useState<Record<string, string | false>>({}); // key = tên gợi ý → tên sẽ thêm (sửa được) | false
  const [previewLoading, setPreviewLoading] = useState(false);

  // Chọn nhiều để xoá
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const [deleting, setDeleting] = useState<OptionItem | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [fileRows, setFileRows] = useState<Record<string, unknown>[] | null>(null);
  const [filePreview, setFilePreview] = useState<OptionImportResult | null>(null);
  const [fileImporting, setFileImporting] = useState(false);

  const label = TYPE_LABEL[type];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await optionsApi.list(type));
    } catch (err) {
      toast({ title: 'Lỗi', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [type, toast]);

  useEffect(() => {
    setEditingId(null);
    setSearch('');
    setSelectMode(false);
    setSelected(new Set());
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = normalizeVi(search);
    return items.filter(i => {
      if (filter === 'active' && !i.active) return false;
      if (filter === 'hidden' && i.active) return false;
      return !q || normalizeVi(i.name).includes(q);
    });
  }, [items, search, filter]);

  const activeCount = items.filter(i => i.active).length;

  /** Thông báo kèm nút "Hoàn tác" (xoá đúng các mục vừa thêm trong lần này) */
  const toastWithUndo = (title: string, description: string, batchId?: string) => {
    toast({
      title,
      description,
      duration: 10000,
      action: batchId ? (
        <ToastAction
          altText="Hoàn tác"
          onClick={async () => {
            try {
              const n = await optionsApi.undoBatch(batchId);
              toast({ title: 'Đã hoàn tác', description: `Xoá ${n} ${label.one} vừa thêm.` });
              load();
            } catch (err) {
              toast({ title: 'Không hoàn tác được', description: (err as Error).message, variant: 'destructive' });
            }
          }}
        >
          Hoàn tác
        </ToastAction>
      ) : undefined,
    });
  };

  const handleAdd = async () => {
    const names = addText.split('\n').map(s => s.trim()).filter(Boolean);
    if (!names.length) return;
    setAdding(true);
    try {
      const { inserted, batchId } = await optionsApi.create(type, names);
      toastWithUndo(
        'Đã thêm',
        inserted === names.length
          ? `Thêm ${inserted} ${label.one}.`
          : `Thêm ${inserted}/${names.length} ${label.one} (bỏ qua tên đã có).`,
        batchId
      );
      setAddText('');
      setAddOpen(false);
      load();
    } catch (err) {
      toast({ title: 'Không thêm được', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const saveEdit = async (item: OptionItem) => {
    const name = editingName.trim();
    if (!name || name === item.name) {
      setEditingId(null);
      return;
    }
    setBusyId(item._id);
    try {
      const updated = await optionsApi.update(item._id, { name });
      setItems(prev => prev.map(i => (i._id === item._id ? updated : i)));
      setEditingId(null);
    } catch (err) {
      toast({ title: 'Không lưu được', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (item: OptionItem, active: boolean) => {
    setItems(prev => prev.map(i => (i._id === item._id ? { ...i, active } : i)));
    try {
      await optionsApi.update(item._id, { active });
    } catch (err) {
      setItems(prev => prev.map(i => (i._id === item._id ? { ...i, active: !active } : i)));
      toast({ title: 'Không cập nhật được', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    try {
      await optionsApi.remove(target._id);
      setItems(prev => prev.filter(i => i._id !== target._id));
      toast({ title: 'Đã xoá', description: target.name });
    } catch (err) {
      toast({ title: 'Không xoá được', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const importFromMajors = async () => {
    try {
      const { inserted, batchId } = await optionsApi.importFromMajors();
      toastWithUndo('Đã nhập', `Thêm ${inserted} ngành từ danh sách ngành Holland.`, inserted ? batchId : undefined);
      load();
    } catch (err) {
      toast({ title: 'Lỗi', description: (err as Error).message, variant: 'destructive' });
    }
  };

  // Xem trước gợi ý từ dữ liệu học sinh (tải lại khi đổi ngưỡng)
  useEffect(() => {
    if (!importOpen) return;
    let cancelled = false;
    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      try {
        const list = await optionsApi.previewFromStudents(type, minCount);
        if (cancelled) return;
        setCandidates(list);
        setPicked(Object.fromEntries(list.map(c => [c.name, c.name]))); // mặc định chọn hết ở ngưỡng hiện tại
      } catch (err) {
        if (!cancelled) toast({ title: 'Lỗi', description: (err as Error).message, variant: 'destructive' });
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [importOpen, minCount, type, toast]);

  const pickedNames = Object.values(picked).filter((v): v is string => typeof v === 'string' && v.trim() !== '');

  const importFromStudents = async () => {
    if (!pickedNames.length) return;
    setImporting(true);
    try {
      const { inserted, batchId } = await optionsApi.create(type, pickedNames);
      toastWithUndo('Đã nhập', `Thêm ${inserted} ${label.one} từ dữ liệu học sinh.`, batchId);
      setImportOpen(false);
      load();
    } catch (err) {
      toast({ title: 'Không nhập được', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  // ===== Excel =====
  const exportExcel = () =>
    exportSheet(type === 'university' ? 'TruongMongMuon' : 'NganhMongMuon', label.title, COLUMNS, items);

  const onFile = async (file: File) => {
    try {
      const { rows, found } = await readSheet(file, COLUMNS);
      requireColumns(found, COLUMNS, ['name']);
      const named = rows.filter(r => String(r.name || '').trim());
      if (!named.length) throw new Error('File không có dòng nào có tên');
      setFilePreview(await optionsApi.importRows(type, named, true));
      setFileRows(named);
    } catch (err) {
      toast({ title: 'Không đọc được file', description: (err as Error).message, variant: 'destructive' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const closeFileImport = () => {
    setFilePreview(null);
    setFileRows(null);
  };

  const confirmFileImport = async () => {
    if (!fileRows) return;
    setFileImporting(true);
    try {
      const r = await optionsApi.importRows(type, fileRows, false);
      toastWithUndo('Đã nhập file', `Thêm ${r.created} ${label.one}, cập nhật ${r.updated}.`, r.batchId || undefined);
      closeFileImport();
      load();
    } catch (err) {
      toast({ title: 'Không nhập được', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setFileImporting(false);
    }
  };

  // ===== Chọn nhiều để xoá =====
  const toggleSelected = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };
  const confirmBulkDelete = async () => {
    setBulkConfirm(false);
    try {
      const n = await optionsApi.bulkDelete([...selected]);
      toast({ title: 'Đã xoá', description: `Xoá ${n} ${label.one}.` });
      exitSelectMode();
      load();
    } catch (err) {
      toast({ title: 'Không xoá được', description: (err as Error).message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <Link to="/admin">
            <Button variant="ghost" size="icon" aria-label="Quay lại">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-2xl">Trường & ngành mong muốn</h1>
            <p className="hidden text-sm text-muted-foreground sm:block">
              Danh sách học sinh chọn ở bước nhập thông tin
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl space-y-4 px-4 py-4 sm:py-6">
        <Tabs value={type} onValueChange={v => setType(v as OptionType)}>
          <TabsList className="grid h-11 w-full grid-cols-2">
            <TabsTrigger value="university" className="h-9">Trường đại học</TabsTrigger>
            <TabsTrigger value="major" className="h-9">Ngành học</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Toolbar */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Tìm ${label.one}...`}
              className="h-11 pl-9 text-base"
            />
          </div>
          <div className="flex gap-2">
            <Button className="h-11 flex-1 sm:flex-none" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Thêm
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-11 flex-1 sm:flex-none">
                  <Upload className="mr-1 h-4 w-4" /> Nhập nhanh
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                {type === 'major' && (
                  <DropdownMenuItem className="py-2.5" onSelect={importFromMajors}>
                    Từ danh sách ngành Holland hiện có
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="py-2.5" onSelect={() => setImportOpen(true)}>
                  Từ {label.one} học sinh đã tự nhập (xem trước)…
                </DropdownMenuItem>
                <DropdownMenuItem className="py-2.5" onSelect={() => fileRef.current?.click()}>
                  Từ file Excel (xem trước)…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={exportExcel} disabled={!items.length}>
              <Download className="mr-1 h-4 w-4" /> Xuất Excel
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {([
            ['all', `Tất cả (${items.length})`],
            ['active', `Đang hiển thị (${activeCount})`],
            ['hidden', `Đã ẩn (${items.length - activeCount})`],
          ] as [FilterMode, string][]).map(([key, text]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full border px-3 py-1.5 transition-colors ${
                filter === key ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent'
              }`}
            >
              {text}
            </button>
          ))}
          <button
            type="button"
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            className={`ml-auto rounded-full border px-3 py-1.5 transition-colors ${
              selectMode ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent'
            }`}
          >
            {selectMode ? 'Xong' : 'Chọn nhiều'}
          </button>
        </div>

        {/* Thanh thao tác khi chọn nhiều */}
        {selectMode && (
          <div className="sticky top-[60px] z-10 flex flex-wrap items-center gap-2 rounded-lg border bg-card/95 px-3 py-2 text-sm shadow-sm backdrop-blur">
            <span className="font-medium">Đã chọn {selected.size}</span>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-primary hover:bg-accent/40"
              onClick={() => setSelected(new Set(visible.map(i => i._id)))}
            >
              Chọn tất cả ({visible.length})
            </button>
            {selected.size > 0 && (
              <button type="button" className="rounded-md px-2 py-1 hover:bg-accent/40" onClick={() => setSelected(new Set())}>
                Bỏ chọn
              </button>
            )}
            <Button
              size="sm"
              variant="destructive"
              className="ml-auto h-9"
              disabled={!selected.size}
              onClick={() => setBulkConfirm(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Xoá {selected.size || ''}
            </Button>
          </div>
        )}

        {/* List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Đang tải...
              </div>
            ) : visible.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {items.length === 0 ? `Chưa có ${label.one} nào.` : 'Không có kết quả phù hợp.'}
              </div>
            ) : (
              <ul className="divide-y">
                {visible.map(item => {
                  const isEditing = editingId === item._id;
                  return (
                    <li
                      key={item._id}
                      className={`flex min-h-14 items-center gap-2 px-3 py-2 sm:px-4 ${
                        selectMode ? 'cursor-pointer hover:bg-accent/20' : ''
                      } ${selectMode && selected.has(item._id) ? 'bg-primary/5' : ''}`}
                      onClick={selectMode ? () => toggleSelected(item._id) : undefined}
                    >
                      {selectMode ? (
                        <>
                          <Checkbox
                            checked={selected.has(item._id)}
                            onCheckedChange={() => toggleSelected(item._id)}
                            onClick={e => e.stopPropagation()}
                            aria-label={`Chọn ${item.name}`}
                            className="h-5 w-5"
                          />
                          <p className={`min-w-0 flex-1 leading-snug ${item.active ? '' : 'text-muted-foreground'}`}>{item.name}</p>
                        </>
                      ) : isEditing ? (
                        <>
                          <Input
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEdit(item);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="h-10 flex-1 text-base"
                            maxLength={150}
                            autoFocus
                          />
                          <Button
                            size="icon"
                            className="h-10 w-10 shrink-0"
                            aria-label="Lưu"
                            disabled={busyId === item._id}
                            onClick={() => saveEdit(item)}
                          >
                            {busyId === item._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 shrink-0"
                            aria-label="Huỷ"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <p className={`leading-snug ${item.active ? '' : 'text-muted-foreground line-through'}`}>
                              {item.name}
                            </p>
                            {!item.active && (
                              <Badge variant="secondary" className="mt-1 text-xs font-normal">Đã ẩn với học sinh</Badge>
                            )}
                          </div>
                          <Switch
                            checked={item.active}
                            onCheckedChange={v => toggleActive(item, v)}
                            aria-label={item.active ? 'Ẩn khỏi danh sách' : 'Hiển thị'}
                            title={item.active ? 'Đang hiển thị — bấm để ẩn' : 'Đang ẩn — bấm để hiển thị'}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 shrink-0"
                            aria-label="Sửa"
                            onClick={() => {
                              setEditingId(item._id);
                              setEditingName(item.name);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 shrink-0 text-destructive hover:text-destructive"
                            aria-label="Xoá"
                            onClick={() => setDeleting(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Mục bị ẩn không hiện cho học sinh nhưng vẫn được tính trong thống kê.
        </p>
      </main>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm {label.one}</DialogTitle>
            <DialogDescription>Mỗi dòng một tên. Tên đã có sẽ được bỏ qua.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={addText}
            onChange={e => setAddText(e.target.value)}
            rows={7}
            className="text-base"
            placeholder={type === 'university' ? 'Đại học Sư phạm TP.HCM\nĐại học Tôn Đức Thắng' : 'Công nghệ thông tin\nMarketing'}
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Huỷ</Button>
            <Button onClick={handleAdd} disabled={adding || !addText.trim()}>
              {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from students dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col">
          <DialogHeader>
            <DialogTitle>Nhập {label.one} từ dữ liệu học sinh</DialogTitle>
            <DialogDescription>
              Các cách viết khác nhau (hoa/thường, dấu, gạch nối) đã được gộp; câu trả lời như "Chưa biết" và {label.one} đã có
              bị bỏ qua. Chọn mục muốn thêm, có thể sửa tên trước khi thêm.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-end gap-3">
            <div className="w-32 space-y-1">
              <Label htmlFor="minCount">Ít nhất (HS ghi)</Label>
              <Input
                id="minCount"
                type="number"
                inputMode="numeric"
                min={1}
                value={minCount}
                onChange={e => setMinCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="h-10 text-base"
              />
            </div>
            <div className="ml-auto flex gap-1 text-sm">
              <button type="button" className="rounded-md px-2 py-1 text-primary hover:bg-accent/40"
                onClick={() => setPicked(Object.fromEntries(candidates.map(c => [c.name, c.name])))}>
                Chọn hết
              </button>
              <button type="button" className="rounded-md px-2 py-1 hover:bg-accent/40"
                onClick={() => setPicked(Object.fromEntries(candidates.map(c => [c.name, false])))}>
                Bỏ hết
              </button>
            </div>
          </div>

          <div className="min-h-[120px] flex-1 overflow-y-auto rounded-md border">
            {previewLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tìm gợi ý…
              </div>
            ) : candidates.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Không có {label.one} mới nào được ghi từ {minCount} lần trở lên.
              </p>
            ) : (
              <ul className="divide-y">
                {candidates.map(c => {
                  const value = picked[c.name];
                  const on = typeof value === 'string';
                  return (
                    <li key={c.name} className="flex items-center gap-2 px-3 py-2">
                      <Checkbox
                        checked={on}
                        onCheckedChange={v => setPicked(p => ({ ...p, [c.name]: v ? c.name : false }))}
                        aria-label={`Chọn ${c.name}`}
                        className="h-5 w-5"
                      />
                      <div className="min-w-0 flex-1">
                        <Input
                          value={on ? (value as string) : c.name}
                          disabled={!on}
                          onChange={e => setPicked(p => ({ ...p, [c.name]: e.target.value.slice(0, 150) }))}
                          className="h-9 text-sm"
                        />
                        {c.variants.length > 1 && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground" title={c.variants.join(' · ')}>
                            Gộp: {c.variants.slice(1).join(' · ')}
                          </p>
                        )}
                      </div>
                      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{c.count} HS</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setImportOpen(false)}>Huỷ</Button>
            <Button onClick={importFromStudents} disabled={importing || !pickedNames.length}>
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Thêm {pickedNames.length} mục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Xác nhận xoá nhiều */}
      <AlertDialog open={bulkConfirm} onOpenChange={setBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá {selected.size} {label.one}?</AlertDialogTitle>
            <AlertDialogDescription>
              Học sinh đã chọn các mục này vẫn giữ nguyên dữ liệu. Thao tác này không hoàn tác được.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <ImportPreviewDialog
        title={`Nhập ${label.title.toLowerCase()} từ Excel`}
        description={`Khớp theo tên (không phân biệt dấu, hoa thường, gạch nối). Tên đã có → cập nhật cột Hiển thị (Có/Không) và Thứ tự nếu điền. Tên mới → thêm vào, có thể hoàn tác. Không xoá mục nào.`}
        unit={label.one.charAt(0).toUpperCase() + label.one.slice(1)}
        summary={filePreview}
        busy={fileImporting}
        onConfirm={confirmFileImport}
        onClose={closeFileImport}
      />

      <AlertDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Học sinh đã chọn mục này vẫn giữ nguyên dữ liệu. Nếu chỉ muốn tạm không cho chọn, hãy dùng nút ẩn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OptionsManager;
