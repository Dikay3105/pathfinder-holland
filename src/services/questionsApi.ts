// CRUD câu hỏi Holland cho trang admin
const API = import.meta.env.VITE_API_BASE_URL;

export type HollandType = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

export interface QuestionItem {
  _id: string;
  id: number;
  text: string;
  type: HollandType;
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
  if (!res.ok || body?.success === false) throw new Error(body?.message || `Lỗi ${res.status}`);
  return body as T;
}

export const questionsApi = {
  list: () => request<QuestionItem[]>(`${API}/admin/questions`),

  create: (type: HollandType, texts: string[]) =>
    request<{ inserted: number; skipped: number; data: QuestionItem[] }>(`${API}/admin/questions`, {
      method: 'POST',
      body: JSON.stringify({ type, texts }),
    }),

  update: (id: number, data: Partial<Pick<QuestionItem, 'text' | 'type'>>) =>
    request<{ data: QuestionItem }>(`${API}/admin/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then(r => r.data),

  remove: (id: number) => request(`${API}/admin/questions/${id}`, { method: 'DELETE' }),
};
