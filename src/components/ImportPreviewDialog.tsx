import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface ImportSummary {
  created: number;
  updated: number;
  unchanged?: number;
  createdNames?: string[];
  errors: string[];
  warnings?: string[];
  /** Có lỗi khiến không thể nhập (VD: một nhóm sẽ hết câu hỏi) */
  blocked?: boolean;
}

interface Props {
  title: string;
  /** Cách khớp dữ liệu + các cột nhận được */
  description: string;
  unit: string;
  summary: ImportSummary | null;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Xem trước kết quả nhập file (chưa ghi gì) → bấm "Nhập" mới ghi */
const ImportPreviewDialog = ({ title, description, unit, summary, busy, onConfirm, onClose }: Props) => {
  const nothing = !summary || summary.created + summary.updated === 0;
  return (
    <Dialog open={!!summary} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {summary && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border bg-emerald-50 p-2 text-emerald-800">
                <div className="text-xl font-bold">{summary.created}</div>
                <div className="text-xs">thêm mới</div>
              </div>
              <div className="rounded-lg border bg-blue-50 p-2 text-blue-800">
                <div className="text-xl font-bold">{summary.updated}</div>
                <div className="text-xs">cập nhật</div>
              </div>
              <div className="rounded-lg border bg-muted p-2 text-muted-foreground">
                <div className="text-xl font-bold">{summary.unchanged ?? '—'}</div>
                <div className="text-xs">không đổi</div>
              </div>
            </div>
            {!!summary.createdNames?.length && (
              <p className="text-muted-foreground">
                {unit} mới: {summary.createdNames.join(', ')}
                {summary.created > summary.createdNames.length && '…'}
              </p>
            )}
            {summary.warnings?.map(w => <p key={w} className="text-amber-700">{w}</p>)}
            {summary.errors.length > 0 && (
              <div>
                <p className="font-medium text-destructive">Dòng bị bỏ qua:</p>
                <ul className="list-disc pl-5 text-destructive">{summary.errors.map(e => <li key={e}>{e}</li>)}</ul>
              </div>
            )}
            {nothing && !summary.blocked && <p className="text-muted-foreground">File không có thay đổi nào so với dữ liệu hiện tại.</p>}
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={onConfirm} disabled={busy || nothing || summary?.blocked}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Nhập
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportPreviewDialog;
