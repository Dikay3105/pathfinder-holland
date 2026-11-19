import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { optionsApi, OptionItem, OptionType } from '@/services/optionsApi';
import { normalizeVi } from '@/lib/textSearch';

const TYPE_LABEL: Record<OptionType, { one: string; title: string }> = {
  university: { one: 'trường', title: 'Trường đại học' },
  major: { one: 'ngành', title: 'Ngành học mong muốn' },
};

type FilterMode = 'all' | 'active' | 'hidden';

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
  const [minCount, setMinCount] = useState(3);
  const [importing, setImporting] = useState(false);

  const [deleting, setDeleting] = useState<OptionItem | null>(null);

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

  const handleAdd = async () => {
    const names = addText.split('\n').map(s => s.trim()).filter(Boolean);
    if (!names.length) return;
    setAdding(true);
    try {
      const inserted = await optionsApi.create(type, names);
      toast({
        title: 'Đã thêm',
        description:
          inserted === names.length
            ? `Thêm ${inserted} ${label.one}.`
            : `Thêm ${inserted}/${names.length} ${label.one} (bỏ qua tên đã có).`,
      });
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
      const inserted = await optionsApi.importFromMajors();
      toast({ title: 'Đã nhập', description: `Thêm ${inserted} ngành từ danh sách ngành Holland.` });
      load();
    } catch (err) {
      toast({ title: 'Lỗi', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const importFromStudents = async () => {
    setImporting(true);
    try {
      const { inserted, candidates } = await optionsApi.importFromStudents(type, minCount);
      toast({
        title: 'Đã nhập',
        description: `Tìm thấy ${candidates} tên được ghi ≥ ${minCount} lần, thêm mới ${inserted}.`,
      });
      setImportOpen(false);
      load();
    } catch (err) {
      toast({ title: 'Lỗi', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setImporting(false);
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
                  <Download className="mr-1 h-4 w-4" /> Nhập nhanh
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                {type === 'major' && (
                  <DropdownMenuItem className="py-2.5" onSelect={importFromMajors}>
                    Từ danh sách ngành Holland hiện có
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="py-2.5" onSelect={() => setImportOpen(true)}>
                  Từ {label.one} học sinh đã tự nhập…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
        </div>

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
                    <li key={item._id} className="flex min-h-14 items-center gap-2 px-3 py-2 sm:px-4">
                      {isEditing ? (
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nhập {label.one} từ dữ liệu học sinh</DialogTitle>
            <DialogDescription>
              Thêm các {label.one} học sinh đã tự ghi, xuất hiện từ N lần trở lên. Nên kiểm tra lại chính tả sau khi nhập.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="minCount">Số lần xuất hiện tối thiểu</Label>
            <Input
              id="minCount"
              type="number"
              inputMode="numeric"
              min={1}
              value={minCount}
              onChange={e => setMinCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="h-11 text-base"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setImportOpen(false)}>Huỷ</Button>
            <Button onClick={importFromStudents} disabled={importing}>
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Nhập
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
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
