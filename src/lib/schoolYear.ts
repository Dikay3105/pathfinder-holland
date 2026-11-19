// Nguồn duy nhất để tính niên khoá ở FE – cùng quy tắc với BE (src/utils/schoolYear.js).
// Đổi mốc chỉ cần sửa SCHOOL_YEAR_START_MONTH (nhớ đổi cả BE).

export const SCHOOL_YEAR_TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const SCHOOL_YEAR_START_MONTH = 8; // từ tháng 8 trở đi tính là năm học mới
const FIRST_SCHOOL_YEAR = 2025; // niên khoá đầu tiên có dữ liệu

function vnYearMonth(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SCHOOL_YEAR_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);
  return {
    year: Number(parts.find(p => p.type === 'year')?.value),
    month: Number(parts.find(p => p.type === 'month')?.value),
  };
}

/** Năm bắt đầu của niên khoá tại thời điểm `date` (theo giờ Việt Nam). */
export function getSchoolYearStart(date: Date = new Date()): number {
  const { year, month } = vnYearMonth(date);
  return month >= SCHOOL_YEAR_START_MONTH ? year : year - 1;
}

/** Niên khoá dạng "2025-2026". */
export function getSchoolYear(date: Date = new Date()): string {
  const start = getSchoolYearStart(date);
  return `${start}-${start + 1}`;
}

/** Hiển thị: "2025-2026" giữ nguyên; dữ liệu cũ "2025" → "2025-2026". */
export function formatSchoolYear(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '';
  const s = String(value).trim();
  if (/^\d{4}$/.test(s)) return `${s}-${Number(s) + 1}`;
  return s;
}

/** Danh sách niên khoá cho bộ lọc: từ niên khoá kế tiếp lùi về niên khoá đầu tiên. */
export function getSchoolYearOptions(): string[] {
  const list: string[] = [];
  for (let y = getSchoolYearStart() + 1; y >= FIRST_SCHOOL_YEAR; y--) list.push(`${y}-${y + 1}`);
  return list;
}
