import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { questionsApi, QuestionItem, HollandType } from '@/services/questionsApi';
import { normalizeVi } from '@/lib/textSearch';

const GROUPS: { type: HollandType; short: string; name: string; hint: string }[] = [
  { type: 'R', short: 'Kỹ thuật', name: 'Realistic – Kỹ thuật, thực tế', hint: 'Làm việc với máy móc, dụng cụ, công việc tay chân, ngoài trời' },
  { type: 'I', short: 'Nghiên cứu', name: 'Investigative – Nghiên cứu, phân tích', hint: 'Tìm hiểu, quan sát, phân tích, giải quyết vấn đề khoa học' },
  { type: 'A', short: 'Nghệ thuật', name: 'Artistic – Sáng tạo, nghệ thuật', hint: 'Sáng tạo, thiết kế, biểu diễn, thể hiện bản thân' },
  { type: 'S', short: 'Xã hội', name: 'Social – Xã hội, hỗ trợ', hint: 'Giúp đỡ, chăm sóc, giảng dạy, làm việc với con người' },
  { type: 'E', short: 'Quản lý', name: 'Enterprising – Quản lý, kinh doanh', hint: 'Lãnh đạo, thuyết phục, kinh doanh, tổ chức' },
  { type: 'C', short: 'Nghiệp vụ', name: 'Conventional – Nghiệp vụ, tổ chức', hint: 'Làm việc theo quy trình, sắp xếp, dữ liệu, giấy tờ' },
];

const HollandQuestions = () => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<HollandType>('R');
  const [search, setSearch] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editType, setEditType] = useState<HollandType>('R');
  const [saving, setSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addText, setAddText] = useState('');
  const [adding, setAdding] = useState(false);

  const [deleting, setDeleting] = useState<QuestionItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setQuestions(await questionsApi.list());
    } catch (err) {
      toast({ title: 'Lỗi', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    questions.forEach(q => (c[q.type] = (c[q.type] || 0) + 1));
    return c;
  }, [questions]);

  const groupInfo = GROUPS.find(g => g.type === group)!;
  const groupIndex = GROUPS.findIndex(g => g.type === group);

  const visible = useMemo(() => {
    const q = normalizeVi(search);
    return questions
      .filter(item => (q ? normalizeVi(item.text).includes(q) : item.type === group))
      .sort((a, b) => a.id - b.id);
  }, [questions, group, search]);

  const startEdit = (q: QuestionItem) => {
    setEditingId(q.id);
    setEditText(q.text);
    setEditType(q.type);
  };

  const saveEdit = async (q: QuestionItem) => {
    const text = editText.trim();
    if (text === q.text && editType === q.type) {
      setEditingId(null);
      return;
    }
    setSaving(true);
    try {
      const updated = await questionsApi.update(q.id, { text, type: editType });
      setQuestions(prev => prev.map(item => (item.id === q.id ? updated : item)));
      setEditingId(null);
      if (editType !== q.type) {
        toast({ title: 'Đã chuyển nhóm', description: `Câu hỏi đã chuyển sang nhóm ${editType}.` });
      }
    } catch (err) {
      toast({ title: 'Không lưu được', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    const texts = addText.split('\n').map(s => s.trim()).filter(Boolean);
    if (!texts.length) return;
    setAdding(true);
    try {
      const { inserted, skipped, data } = await questionsApi.create(group, texts);
      setQuestions(prev => [...prev, ...data]);
      toast({
        title: 'Đã thêm câu hỏi',
        description: skipped ? `Thêm ${inserted} câu, bỏ qua ${skipped} câu trùng.` : `Thêm ${inserted} câu vào nhóm ${group}.`,
      });
      setAddText('');
      setAddOpen(false);
    } catch (err) {
      toast({ title: 'Không thêm được', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    try {
      await questionsApi.remove(target.id);
      setQuestions(prev => prev.filter(q => q.id !== target.id));
      toast({ title: 'Đã xoá câu hỏi' });
    } catch (err) {
      toast({ title: 'Không xoá được', description: (err as Error).message, variant: 'destructive' });
    }
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
            <h1 className="truncate text-lg font-bold sm:text-2xl">Câu hỏi Holland</h1>
            <p className="hidden text-sm text-muted-foreground sm:block">
              {questions.length} câu hỏi · 6 nhóm · học sinh làm lần lượt từng nhóm
            </p>
          </div>
          <Button className="h-10" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Thêm
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl space-y-4 px-4 py-4 sm:py-6">
        {/* Chọn nhóm */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {GROUPS.map(g => (
            <button
              key={g.type}
              type="button"
              onClick={() => {
                setGroup(g.type);
                setSearch('');
                setEditingId(null);
              }}
              className={`rounded-lg border px-2 py-2 text-left transition-colors ${
                group === g.type && !search
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-card hover:bg-accent/40'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold">{g.type}</span>
                <span className="text-xs tabular-nums opacity-80">{counts[g.type] || 0}</span>
              </div>
              <div className="truncate text-xs opacity-90">{g.short}</div>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm trong tất cả câu hỏi..."
            className="h-11 pl-9 text-base"
          />
        </div>

        {!search && (
          <div className="rounded-lg border bg-card px-4 py-3 text-sm">
            <p className="font-semibold">{groupInfo.name}</p>
            <p className="text-muted-foreground">
              {groupInfo.hint}. Học sinh gặp nhóm này ở trang {groupIndex + 1}/6.
            </p>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Đang tải...
              </div>
            ) : visible.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {search ? 'Không có câu hỏi phù hợp.' : 'Nhóm này chưa có câu hỏi.'}
              </div>
            ) : (
              <ol className="divide-y">
                {visible.map((q, idx) => {
                  const editing = editingId === q.id;
                  return (
                    <li key={q.id} className="px-3 py-3 sm:px-4">
                      {editing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            rows={2}
                            maxLength={300}
                            className="text-base"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                saveEdit(q);
                              }
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <Select value={editType} onValueChange={v => setEditType(v as HollandType)}>
                              <SelectTrigger className="h-10 w-[200px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {GROUPS.map(g => (
                                  <SelectItem key={g.type} value={g.type}>
                                    Nhóm {g.type} · {g.short}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="ml-auto flex gap-2">
                              <Button variant="ghost" className="h-10" onClick={() => setEditingId(null)}>
                                <X className="mr-1 h-4 w-4" /> Huỷ
                              </Button>
                              <Button className="h-10" disabled={saving || editText.trim().length < 3} onClick={() => saveEdit(q)}>
                                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                                Lưu
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 w-6 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                            {search ? q.type : idx + 1}
                          </span>
                          <p className="min-w-0 flex-1 leading-snug">{q.text}</p>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 shrink-0"
                            aria-label="Sửa"
                            onClick={() => startEdit(q)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                            aria-label="Xoá"
                            onClick={() => setDeleting(q)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Thay đổi áp dụng cho học sinh bắt đầu làm bài sau đó. Kết quả cũ không bị ảnh hưởng.
          {' '}Nên giữ số câu giữa các nhóm bằng nhau để điểm Holland công bằng.
        </p>
      </main>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm câu hỏi vào nhóm {group}</DialogTitle>
            <DialogDescription>
              {groupInfo.name}. Mỗi dòng một câu – nội dung nối tiếp "Nếu có điều kiện, tôi sẽ...".
            </DialogDescription>
          </DialogHeader>
          <Select value={group} onValueChange={v => setGroup(v as HollandType)}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUPS.map(g => (
                <SelectItem key={g.type} value={g.type}>
                  Nhóm {g.type} · {g.short} ({counts[g.type] || 0} câu)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={addText}
            onChange={e => setAddText(e.target.value)}
            rows={6}
            className="text-base"
            placeholder={'Tự sửa chiếc xe đạp của mình\nLắp ráp mô hình theo hướng dẫn'}
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

      <AlertDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá câu hỏi này?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.text}" (nhóm {deleting?.type}). Kết quả của học sinh đã làm không bị ảnh hưởng.
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

export default HollandQuestions;
