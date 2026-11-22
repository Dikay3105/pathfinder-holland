// Đọc / ghi file Excel dùng chung cho các trang admin (xuất ra file nào thì nhập lại đúng file đó).
import * as XLSX from 'xlsx';
import { normalizeVi } from '@/lib/textSearch';

export interface SheetColumn<K extends string = string> {
  key: K;
  header: string;
  width?: number;
  /** Tên cột khác vẫn nhận khi nhập (VD: "Nhóm Holland" cho cột "Nhóm") */
  aliases?: string[];
  /** Chỉ có khi xuất, bỏ qua khi nhập */
  exportOnly?: boolean;
  /** Cột Có/Không → true/false */
  boolean?: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

export function exportSheet<K extends string>(
  fileBase: string,
  sheetName: string,
  columns: SheetColumn<K>[],
  rows: Partial<Record<K, unknown>>[]
) {
  const data = rows.map(r =>
    Object.fromEntries(
      columns.map(c => {
        const v = r[c.key];
        if (c.boolean) return [c.header, v === false ? 'Không' : 'Có'];
        if (Array.isArray(v)) return [c.header, v.join(', ')];
        return [c.header, v ?? ''];
      })
    )
  );
  const ws = XLSX.utils.json_to_sheet(data, { header: columns.map(c => c.header) });
  ws['!cols'] = columns.map(c => ({ wch: c.width ?? 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${fileBase}_${today()}.xlsx`);
}

const FALSE_RE = /^(khong|no|false|0|an|tat|off)$/;

/**
 * Đọc sheet đầu tiên → mảng dòng theo key. Ô trống bị bỏ (không ghi đè dữ liệu đang có).
 * Nhận .xlsx/.xls và .csv (UTF-8, có hoặc không có BOM).
 */
export async function readSheet<K extends string>(file: File, columns: SheetColumn<K>[]) {
  const wb = /\.csv$/i.test(file.name)
    ? XLSX.read((await file.text()).replace(/^\uFEFF/, ''), { type: 'string' })
    : XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('File không có sheet nào');
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });

  const byHeader = new Map<string, SheetColumn<K>>();
  for (const c of columns) {
    if (c.exportOnly) continue;
    for (const h of [c.header, c.key, ...(c.aliases || [])]) byHeader.set(normalizeVi(h), c);
  }

  const found = new Set<K>();
  const rows = raw
    .map(r => {
      const out: Partial<Record<K, unknown>> = {};
      for (const [h, v] of Object.entries(r)) {
        const col = byHeader.get(normalizeVi(h));
        if (!col) continue;
        found.add(col.key);
        const s = String(v ?? '').trim();
        if (!s) continue;
        out[col.key] = col.boolean ? !FALSE_RE.test(normalizeVi(s)) : s;
      }
      return out;
    })
    .filter(r => Object.keys(r).length > 0);

  return { rows, found };
}

/** Thông báo lỗi khi file thiếu cột bắt buộc */
export function requireColumns<K extends string>(found: Set<K>, columns: SheetColumn<K>[], required: K[]) {
  const missing = required.filter(k => !found.has(k));
  if (missing.length) {
    const names = missing.map(k => `"${columns.find(c => c.key === k)?.header ?? k}"`).join(', ');
    throw new Error(`File thiếu cột ${names}. Hãy bấm "Xuất Excel" để lấy file mẫu.`);
  }
}
