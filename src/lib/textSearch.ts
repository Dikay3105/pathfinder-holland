/** Bỏ dấu tiếng Việt + chữ thường, dùng để tìm kiếm "dai hoc" khớp "Đại học". */
export function normalizeVi(input: string): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Bộ lọc cho cmdk: mọi từ khoá phải xuất hiện (không dấu, không phân biệt thứ tự).
 * Ưu tiên kết quả bắt đầu bằng từ khoá.
 */
export function viCommandFilter(value: string, search: string): number {
  const v = normalizeVi(value);
  const terms = normalizeVi(search).split(' ').filter(Boolean);
  if (!terms.length) return 1;
  if (!terms.every(t => v.includes(t))) return 0;
  return v.startsWith(terms[0]) ? 1 : 0.5;
}
