import { forwardRef, type CSSProperties } from 'react';
import schoolLogo from '@/assets/school-logo1.png';
import { processTopGroups } from '@/utils/processTopGroups';
import { formatSchoolYear } from '@/lib/schoolYear';
import { REPORT_WIDTH_PX } from '@/lib/pdfExport';
import { AdviceView } from '@/components/AdviceView';

const HOLLAND: Record<string, { name: string; desc: string; color: string }> = {
  R: { name: 'Kỹ thuật (Realistic)', desc: 'Thích làm việc với máy móc, dụng cụ, công việc thực tế', color: '#2a78d6' },
  I: { name: 'Nghiên cứu (Investigative)', desc: 'Thích tìm hiểu, phân tích, nghiên cứu khoa học', color: '#6250d6' },
  A: { name: 'Nghệ thuật (Artistic)', desc: 'Thích sáng tạo, nghệ thuật, thể hiện bản thân', color: '#d55181' },
  S: { name: 'Xã hội (Social)', desc: 'Thích giúp đỡ, chăm sóc, làm việc với con người', color: '#1b9e6e' },
  E: { name: 'Quản lý (Enterprising)', desc: 'Thích lãnh đạo, thuyết phục, kinh doanh', color: '#d9711f' },
  C: { name: 'Nghiệp vụ (Conventional)', desc: 'Thích công việc có quy định, tổ chức, dữ liệu', color: '#b8443a' },
};

export interface ReportStudent {
  name?: string;
  class?: string;
  number?: number | string;
  schoolYear?: string;
  createdAt?: string | Date;
  university?: string;
  major?: string;
  selectedBlocks?: string[];
  hollandScores?: Record<string, number>;
  recommendedMajors?: Array<{ name?: string }>;
  advice?: string;
}

interface ResultReportProps {
  student: ReportStudent;
  /** Số câu mỗi nhóm (để ghi "x/10"); không có thì chỉ ghi điểm */
  questionCounts?: Record<string, number>;
}

const fmtDate = (d?: string | Date) => {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};

/**
 * Bản báo cáo dành riêng cho PDF (khổ A4, rộng cố định) – dùng chung cho học sinh và admin.
 * Render ngoài màn hình rồi chụp bằng html2pdf (xem lib/pdfExport.ts).
 */
export const ResultReport = forwardRef<HTMLDivElement, ResultReportProps>(({ student, questionCounts }, ref) => {
  const scores = student.hollandScores || {};
  const top = processTopGroups(scores as Record<string, number>);
  const code = top.map(t => t.type).join('');
  const majors = (student.recommendedMajors || []).map(m => m?.name).filter(Boolean) as string[];
  const hasAdvice = !!student.advice?.trim();

  const info: Array<[string, string]> = [
    ['Họ và tên', student.name || ''],
    ['Lớp', `${student.class || ''}${student.number ? ` · Danh số ${student.number}` : ''}`],
    ['Niên khoá', formatSchoolYear(student.schoolYear)],
    ['Ngày làm test', fmtDate(student.createdAt) || fmtDate(new Date())],
    ['Khối thi đã chọn', (student.selectedBlocks || []).join(', ') || '—'],
    ['Nguyện vọng', [student.major, student.university].filter(Boolean).join(' · ') || '—'],
  ];

  return (
    <div ref={ref} className="report" style={{ width: REPORT_WIDTH_PX }}>
      {/* Header trường */}
      <header className="r-head r-avoid">
        <img src={schoolLogo} alt="" className="r-logo" />
        <div className="r-school">
          <div className="r-dept">SỞ GIÁO DỤC VÀ ĐÀO TẠO TP. HỒ CHÍ MINH</div>
          <div className="r-name">TRƯỜNG THPT NGUYỄN HIỀN</div>
        </div>
        <div className="r-date">Ngày xuất: {fmtDate(new Date())}</div>
      </header>

      <h1 className="r-title">KẾT QUẢ TRẮC NGHIỆM HƯỚNG NGHIỆP HOLLAND</h1>

      {/* Thông tin học sinh */}
      <table className="r-info r-avoid">
        <tbody>
          {[0, 2, 4].map(i => (
            <tr key={i}>
              <th>{info[i][0]}</th>
              <td>{info[i][1]}</td>
              <th>{info[i + 1][0]}</th>
              <td>{info[i + 1][1]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Nhóm Holland nổi trội */}
      <section className="r-block r-avoid">
        <h2 className="r-h2">
          Nhóm Holland nổi trội{code && <span className="r-code">{code}</span>}
        </h2>
        {top.length ? (
          <div className="r-top">
            {top.map((t, i) => {
              const h = HOLLAND[t.type];
              const total = questionCounts?.[t.type];
              return (
                <div key={t.type} className="r-top-item">
                  <div className="r-top-rank" style={{ background: h?.color }}>{t.type}</div>
                  <div className="r-top-body">
                    <div className="r-top-name">#{i + 1} {h?.name}</div>
                    <div className="r-top-desc">{h?.desc}</div>
                  </div>
                  <div className="r-top-score">
                    {t.score}
                    {total ? <span>/{total}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="r-muted">Bạn không thiên hẳn về nhóm Holland nào. Hãy trao đổi thêm với giáo viên.</p>
        )}
      </section>

      {/* Lời khuyên (đã gồm điểm số, phân tích Holland, ngành, lộ trình...) */}
      {hasAdvice && (
        <section className="r-block">
          <h2 className="r-h2">Lời khuyên dành cho bạn</h2>
          <AdviceView html={student.advice!} />
        </section>
      )}

      {/* Danh sách ngành theo nhóm Holland */}
      {majors.length > 0 && (
        <section className="r-block r-avoid">
          <h2 className="r-h2">Ngành tham khảo theo nhóm Holland</h2>
          <div className="r-chips">
            {majors.map(m => <span key={m} className="r-chip">{m}</span>)}
          </div>
        </section>
      )}

      <footer className="r-foot r-avoid">
        Kết quả trắc nghiệm và lời khuyên mang tính tham khảo. Học sinh nên trao đổi thêm với giáo viên chủ nhiệm,
        giáo viên hướng nghiệp và gia đình trước khi quyết định.
      </footer>
    </div>
  );
});
ResultReport.displayName = 'ResultReport';

/** Vùng render ngoài màn hình cho ResultReport (không dùng display:none để html2canvas vẫn đo được bố cục) */
export const OFFSCREEN_STYLE: CSSProperties = {
  position: 'fixed',
  left: -10000,
  top: 0,
  zIndex: -1,
  pointerEvents: 'none',
};
