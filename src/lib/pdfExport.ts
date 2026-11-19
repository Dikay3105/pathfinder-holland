import html2pdf from 'html2pdf.js';

/** Lề trang A4 (mm): trên, phải, dưới, trái */
const MARGIN_MM: [number, number, number, number] = [12, 11, 14, 11];
const MM_TO_PX = 96 / 25.4;
/** Chiều rộng vùng nội dung ở 96dpi: (210 - 22)mm ≈ 710px → ResultReport dùng đúng độ rộng này để in 1:1 */
export const REPORT_WIDTH_PX = 710;
/** Chiều cao 1 trang theo px – khớp cách html2pdf cắt ảnh: (297 - lề trên - lề dưới)mm ở 96dpi */
const PAGE_HEIGHT_PX = (297 - MARGIN_MM[0] - MARGIN_MM[2]) * MM_TO_PX;

/*
 * Khối cần giữ trọn trên 1 trang (theo thứ tự trên → dưới). Không dùng tuỳ chọn `avoid` của html2pdf vì nó đo
 * vị trí mọi phần tử MỘT lần trước khi chèn khoảng trống → khối lồng nhau bị đẩy sai, tiêu đề vẫn bị cắt.
 * Ở đây tự phân trang: đo lại vị trí thật sau mỗi lần chèn.
 */
const KEEP_TOGETHER = [
  '.r-head', '.r-title', '.r-info', '.r-h2', '.r-top-item', '.r-chips', '.r-foot',
  '.adv > *',                                   // từng mục của lời khuyên (mục nào cũng ngắn hơn 1 trang)
  '.adv-roadmap > li', '.adv-list li',          // trong mục dài hơn 1 trang thì giữ từng ý
  '.advice-content > :not(.adv)',               // lời khuyên định dạng cũ: h2 / p / ul
  '.advice-content > ul > li', '.advice-content > ol > li',
].join(',');
// Tiêu đề: nếu phía dưới không còn chỗ cho ít nhất ~90px nội dung thì đẩy sang trang sau cùng nội dung
const HEADINGS = '.r-h2, .adv-h, .advice-content > h2';
const HEADING_KEEP_PX = 90;

/**
 * Chèn khoảng trống để không khối nào vắt qua ranh giới trang. Đo trên bản báo cáo thật (ngoài màn hình,
 * rộng cố định 710px); report.css vô hiệu các CSS responsive nên bố cục đo = bố cục html2canvas vẽ,
 * dù xuất từ điện thoại hay máy tính.
 */
function paginate(root: HTMLElement) {
  const doc = root.ownerDocument;
  root.querySelectorAll('.pdf-spacer').forEach(s => s.remove());
  const items = Array.from(root.querySelectorAll<HTMLElement>(KEEP_TOGETHER));
  for (const el of items) {
    const rootTop = root.getBoundingClientRect().top;
    const rect = el.getBoundingClientRect();
    const top = rect.top - rootTop;
    if (rect.height === 0 || rect.height > PAGE_HEIGHT_PX * 0.92) continue; // quá cao → để tự cắt
    const pageEnd = (Math.floor(top / PAGE_HEIGHT_PX) + 1) * PAGE_HEIGHT_PX;
    const isHeading = el.matches(HEADINGS) || !!el.querySelector(':scope > .adv-h');
    const need = isHeading && rect.height < HEADING_KEEP_PX ? HEADING_KEEP_PX : rect.height;
    if (top + need > pageEnd && top < pageEnd) {
      const spacer = doc.createElement('div');
      spacer.className = 'pdf-spacer';
      spacer.style.height = `${pageEnd - top + 2}px`;
      el.parentNode?.insertBefore(spacer, el);
    }
  }
}

// html2pdf: .then() trả về chính worker (gọi nối .save()/.outputPdf() được) nhưng bộ type khai báo là Promise → dùng any
function buildWorker(element: HTMLElement, filename: string): any {
  return (html2pdf() as any)
    .set({
      margin: MARGIN_MM,
      filename,
      image: { type: 'jpeg', quality: 0.96 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: REPORT_WIDTH_PX + 40, // bố cục giống nhau dù xuất từ điện thoại hay máy tính
        backgroundColor: '#ffffff',
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }, // phân trang đã tự làm ở paginate()
    })
    .from(element)
    .toPdf()
    .get('pdf')
    .then((pdf: any) => {
      // Đánh số trang (chỉ dùng ký tự ASCII vì font mặc định của jsPDF không có dấu tiếng Việt)
      const total = pdf.internal.getNumberOfPages();
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(140, 140, 150);
        pdf.text(`${i} / ${total}`, w - MARGIN_MM[1], h - 6, { align: 'right' });
      }
    });
}

/** Chờ trình duyệt vẽ xong (2 frame) + font sẵn sàng trước khi chụp */
export async function waitForPaint() {
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  if ((document as any).fonts?.ready) await (document as any).fonts.ready;
}

export async function savePdf(element: HTMLElement, filename: string) {
  await waitForPaint();
  paginate(element);
  await buildWorker(element, filename).save();
}

export async function pdfBlob(element: HTMLElement, filename: string): Promise<Blob> {
  await waitForPaint();
  paginate(element);
  return buildWorker(element, filename).outputPdf('blob');
}

/** Tên file an toàn: bỏ ký tự cấm trên Windows/macOS */
export function safeFileName(...parts: Array<string | number | undefined | null>) {
  return parts
    .filter(p => p !== undefined && p !== null && String(p).trim() !== '')
    .map(p => String(p).trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_'))
    .join('_');
}
