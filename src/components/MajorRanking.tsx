import { Badge } from '@/components/ui/badge';
import { Compass, Star, TrendingUp } from 'lucide-react';
import type { AlternativeMajor, RankedMajor } from '@/services/catalogApi';

const fmt = (v: number) => String(Math.round(v * 100) / 100).replace('.', ',');

const STATUS: Record<string, { label: string; cls: string }> = {
  safe: { label: 'Điểm an toàn', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  fit: { label: 'Sát điểm chuẩn', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  reach: { label: 'Cần cố gắng thêm', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
};

/** Lý do bằng số liệu: nhóm Holland khớp, điểm tổ hợp, điểm chuẩn, nguyện vọng */
function Reasons({ m }: { m: RankedMajor }) {
  const a = m.academic;
  return (
    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
      <li>
        <span className="font-medium text-foreground">Tính cách:</span> khớp nhóm{' '}
        <span className="font-semibold text-primary">{m.matchedGroups.join(', ')}</span>
        {m.hollandGroups.length > m.matchedGroups.length && (
          <> (ngành thuộc nhóm {m.hollandGroups.join(', ')})</>
        )}
      </li>
      {a?.block && (
        <li>
          <span className="font-medium text-foreground">Học lực:</span> tổ hợp{' '}
          <span className="font-semibold">{a.block}</span> ({a.subjects.join(' – ')})
          {a.total !== null ? (
            <>
              {' '}= <span className="font-semibold text-foreground">{fmt(a.total)}/30</span>
              {a.targetTotal !== null && a.targetTotal !== a.total && <> · mục tiêu {fmt(a.targetTotal)}</>}
            </>
          ) : (
            <> · chưa đủ điểm để tính</>
          )}
          {m.benchmarkScore ? <> · điểm chuẩn tham khảo ~{fmt(m.benchmarkScore)}</> : null}
          {a.otherBlocks.length > 0 && <> · cũng xét được bằng {a.otherBlocks.slice(0, 4).join(', ')}</>}
        </li>
      )}
      {m.noBlockData && <li>Chưa có dữ liệu tổ hợp xét tuyển của ngành này.</li>}
      {(m.aspirationMatch || m.aspirationSameField) && (
        <li>
          <span className="font-medium text-foreground">Nguyện vọng:</span>{' '}
          {m.aspirationMatch ? 'trùng ngành bạn mong muốn' : 'cùng lĩnh vực với ngành bạn mong muốn'}
        </li>
      )}
    </ul>
  );
}

export function MajorRanking({ ranked, alternatives }: { ranked: RankedMajor[]; alternatives?: AlternativeMajor[] }) {
  if (!ranked.length && !alternatives?.length) return null;
  return (
    <div className="space-y-6">
      {ranked.length > 0 && (
        <div>
          <h3 className="mb-1 flex items-center gap-2 text-xl font-bold">
            <TrendingUp className="h-5 w-5" /> Ngành phù hợp với bạn
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Xếp theo độ phù hợp: tính cách (Holland), điểm theo tổ hợp bạn xét tuyển được và nguyện vọng.
          </p>
          <ol className="space-y-3">
            {ranked.map((m, i) => {
              const status = m.academic?.status ? STATUS[m.academic.status] : null;
              return (
                <li key={m.majorId || m.name} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold leading-tight">{m.name}</h4>
                        {m.aspirationMatch && (
                          <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-800">
                            <Star className="h-3 w-3" /> Nguyện vọng
                          </Badge>
                        )}
                        {status && <Badge variant="outline" className={status.cls}>{status.label}</Badge>}
                      </div>
                      {m.description && <p className="mt-0.5 text-sm text-muted-foreground">{m.description}</p>}
                      <Reasons m={m} />
                    </div>
                    <div className="w-16 shrink-0 text-right">
                      <div className="text-xl font-bold tabular-nums text-primary">{m.matchScore}%</div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${m.matchScore}%` }} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {alternatives && alternatives.length > 0 && (
        <div>
          <h3 className="mb-1 flex items-center gap-2 text-lg font-bold">
            <Compass className="h-5 w-5" /> Hợp tính cách nhưng cần đổi môn thi
          </h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Các ngành này hợp nhóm Holland của bạn, nhưng chưa xét tuyển được bằng các môn bạn đã chọn.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {alternatives.map(m => (
              <li key={m.majorId || m.name} className="rounded-lg border border-dashed bg-muted/40 p-3 text-sm">
                <div className="font-semibold">{m.name}</div>
                <div className="text-muted-foreground">
                  Khớp nhóm {m.matchedGroups.join(', ')} · cần thêm{' '}
                  <span className="font-medium text-foreground">{m.missingSubjects.join(', ')}</span> (tổ hợp {m.block})
                  {m.missingAptitude && ' · phải thi năng khiếu'}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
