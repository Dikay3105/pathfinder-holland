// Danh mục trường / ngành mong muốn + thống kê chi tiết
const API = import.meta.env.VITE_API_BASE_URL;

export type OptionType = 'university' | 'major';

export interface OptionItem {
  _id: string;
  type: OptionType;
  name: string;
  order: number;
  active: boolean;
}

export interface ImportCandidate {
  name: string;
  count: number;
  /** các cách viết học sinh đã dùng (đã gộp) */
  variants: string[];
}

export interface CountItem {
  name: string;
  count: number;
}

export interface DetailedStats {
  filters: { schoolYear: string | null; class: string | null; schoolYears: string[] };
  summary: {
    totalStudents: number;
    totalClasses: number;
    distinctUniversities: number;
    distinctMajors: number;
    withUniversity: number;
    withMajor: number;
    otherMajorCount: number;
    otherUniversityCount: number;
    withAdvice: number;
    withHolland: number;
  };
  byUniversity: CountItem[];
  byMajor: CountItem[];
  otherMajors: CountItem[];
  otherUniversities: CountItem[];
  topPairs: CountItem[];
  holland: {
    dominant: { type: string; count: number }[];
    average: { type: string; value: number }[];
    topCodes: CountItem[];
  };
  examBlocks: CountItem[];
  byClass: CountItem[];
  byDay: CountItem[];
  byGrade: { grade: string; total: number; withHolland: number; dominant: Record<string, number> }[];
  majorFields: { name: string; count: number }[];
  majorFieldsByGrade: { grade: string; total: number; values: Record<string, number> }[];
  universityTypes: { name: string; count: number }[];
  subjects: { subject: string; n: number; avgCurrent: number; avgTarget: number; gap: number }[];
  composition: {
    major: { catalog: number; other: number; none: number };
    university: { catalog: number; other: number; none: number };
    advice: { ai: number; fallback: number; pending: number; none: number };
  };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* không có body */
  }
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || `Lỗi ${res.status}`);
  }
  return body as T;
}

export const optionsApi = {
  /** Danh sách đang hiển thị cho học sinh */
  async getPublic(): Promise<{ universities: string[]; majors: string[] }> {
    const body = await request<{ data: { universities: string[]; majors: string[] } }>(`${API}/options`);
    return body.data;
  },

  async list(type: OptionType): Promise<OptionItem[]> {
    const body = await request<{ data: OptionItem[] }>(`${API}/admin/options?type=${type}`);
    return body.data;
  },

  /** Thêm nhiều tên; batchId dùng để "Hoàn tác" cả lần thêm */
  async create(type: OptionType, names: string[]): Promise<{ inserted: number; batchId: string }> {
    return request(`${API}/admin/options`, {
      method: 'POST',
      body: JSON.stringify({ type, names }),
    });
  },

  async undoBatch(batchId: string): Promise<number> {
    const body = await request<{ deleted: number }>(`${API}/admin/options/batch/${batchId}`, { method: 'DELETE' });
    return body.deleted;
  },

  async bulkDelete(ids: string[]): Promise<number> {
    const body = await request<{ deleted: number }>(`${API}/admin/options/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    return body.deleted;
  },

  async update(id: string, data: Partial<Pick<OptionItem, 'name' | 'active' | 'order'>>): Promise<OptionItem> {
    const body = await request<{ data: OptionItem }>(`${API}/admin/options/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return body.data;
  },

  async remove(id: string): Promise<void> {
    await request(`${API}/admin/options/${id}`, { method: 'DELETE' });
  },

  async importFromMajors(): Promise<{ inserted: number; batchId: string }> {
    return request(`${API}/admin/options/import-majors`, { method: 'POST' });
  },

  /** Gợi ý tên học sinh tự nhập (đã gộp cách viết, bỏ câu trả lời rác và tên đã có) – chưa thêm gì */
  async previewFromStudents(type: OptionType, minCount: number): Promise<ImportCandidate[]> {
    const body = await request<{ data: ImportCandidate[] }>(
      `${API}/admin/options/import-students/preview?type=${type}&minCount=${minCount}`
    );
    return body.data;
  },

  async getDetailedStats(params: { schoolYear?: string; class?: string }): Promise<DetailedStats> {
    const qs = new URLSearchParams();
    if (params.schoolYear) qs.set('schoolYear', params.schoolYear);
    if (params.class) qs.set('class', params.class);
    const body = await request<{ data: DetailedStats }>(`${API}/admin/stats/detailed?${qs.toString()}`);
    return body.data;
  },
};
