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

  async create(type: OptionType, names: string[]): Promise<number> {
    const body = await request<{ inserted: number }>(`${API}/admin/options`, {
      method: 'POST',
      body: JSON.stringify({ type, names }),
    });
    return body.inserted;
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

  async importFromMajors(): Promise<number> {
    const body = await request<{ inserted: number }>(`${API}/admin/options/import-majors`, { method: 'POST' });
    return body.inserted;
  },

  async importFromStudents(type: OptionType, minCount: number): Promise<{ inserted: number; candidates: number }> {
    return request(`${API}/admin/options/import-students`, {
      method: 'POST',
      body: JSON.stringify({ type, minCount }),
    });
  },

  async getDetailedStats(params: { schoolYear?: string; class?: string }): Promise<DetailedStats> {
    const qs = new URLSearchParams();
    if (params.schoolYear) qs.set('schoolYear', params.schoolYear);
    if (params.class) qs.set('class', params.class);
    const body = await request<{ data: DetailedStats }>(`${API}/admin/stats/detailed?${qs.toString()}`);
    return body.data;
  },
};
