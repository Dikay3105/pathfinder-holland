// Môn học, tổ hợp, ngành, cấu hình tư vấn (admin quản lý) + dữ liệu form học sinh
const API = import.meta.env.VITE_API_BASE_URL;

export type SubjectKind = 'required' | 'elective' | 'aptitude';
export type HollandType = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

export interface Subject {
  _id: string;
  code: string;
  name: string;
  shortName?: string;
  aliases: string[];
  kind: SubjectKind;
  group: string;
  order: number;
  active: boolean;
  blockCount?: number;
}

export interface ExamBlock {
  _id: string;
  name: string;
  subjects: string[];
  note: string;
  active: boolean;
  majorCount?: number;
}

export interface MajorItem {
  _id: string;
  name: string;
  description: string;
  examBlocks: string[];
  hollandGroups: HollandType[];
  benchmarkScore: number | null;
  keywords: string[];
  active: boolean;
}

export interface RecommendationSettings {
  weights: { holland: number; academic: number; aspiration: number };
  topGroups: { min: number; max: number };
  electiveCount: number;
  scoreBasis: 'current' | 'target' | 'average';
  topMajorCount: number;
  showAlternatives: boolean;
  alternativeCount: number;
  region: string;
  ai: { majorCount: number; allowExternalMajors: boolean; maxExternalMajors: number };
}

/** Dữ liệu form học sinh (GET /api/config) */
export interface PublicConfig {
  subjects: Array<Pick<Subject, 'code' | 'name' | 'shortName' | 'kind' | 'group'>>;
  blocks: Array<{ name: string; subjects: string[]; subjectNames: string[]; aptitude: boolean }>;
  electiveCount: number;
  topGroups: { min: number; max: number };
}

/** 1 ngành trong kết quả xếp hạng (services/recommender.js) */
export interface RankedMajor {
  majorId: string;
  name: string;
  description?: string;
  hollandGroups: string[];
  matchedGroups: string[];
  hollandFit: number;
  matchScore: number;
  aspirationMatch?: boolean;
  aspirationSameField?: boolean;
  benchmarkScore?: number | null;
  requiresAptitude?: boolean;
  noBlockData?: boolean;
  academic?: {
    block: string;
    subjects: string[];
    total: number | null;
    targetTotal: number | null;
    fit: number | null;
    status: 'safe' | 'fit' | 'reach' | null;
    otherBlocks: string[];
  } | null;
}

export interface AlternativeMajor extends RankedMajor {
  block: string;
  missingSubjects: string[];
  missingAptitude: boolean;
}

export interface RecommendationResult {
  topGroups: { type: string; score: number }[];
  hollandCode: string;
  usableBlocks: { name: string; subjects: string[]; aptitude: boolean }[];
  ranked: RankedMajor[];
  alternatives: AlternativeMajor[];
}

export interface CatalogHealth {
  summary: { subjects: number; blocks: number; blocksUsedByMajors: number; majors: number; majorsWithBenchmark: number };
  issues: { level: 'error' | 'warn'; area: 'block' | 'major'; id: string; text: string }[];
}

export interface ImportResult {
  dryRun: boolean;
  created: number;
  updated: number;
  unchanged?: number;
  createdNames: string[];
  updatedNames: string[];
  unknownBlocks: string[];
  errors: string[];
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  let body: { success?: boolean; message?: string } | null = null;
  try {
    body = await res.json();
  } catch {
    /* không có body */
  }
  if (!res.ok || body?.success === false) throw new Error(body?.message || `Lỗi ${res.status}`);
  return body as T;
}

const json = (method: string, data?: unknown): RequestInit => ({ method, body: data === undefined ? undefined : JSON.stringify(data) });

export const catalogApi = {
  publicConfig: () => request<{ data: PublicConfig }>(`${API}/config`).then(r => r.data),

  // Môn học
  listSubjects: () => request<{ data: Subject[] }>(`${API}/admin/subjects`).then(r => r.data),
  createSubject: (d: Partial<Subject>) => request<{ data: Subject }>(`${API}/admin/subjects`, json('POST', d)).then(r => r.data),
  updateSubject: (id: string, d: Partial<Subject>) => request<{ data: Subject }>(`${API}/admin/subjects/${id}`, json('PUT', d)).then(r => r.data),
  deleteSubject: (id: string) => request(`${API}/admin/subjects/${id}`, json('DELETE')),

  // Tổ hợp
  listBlocks: () => request<{ data: ExamBlock[] }>(`${API}/admin/exam-blocks`).then(r => r.data),
  createBlock: (d: Partial<ExamBlock>) => request<{ data: ExamBlock }>(`${API}/admin/exam-blocks`, json('POST', d)).then(r => r.data),
  updateBlock: (id: string, d: Partial<ExamBlock>) => request<{ data: ExamBlock }>(`${API}/admin/exam-blocks/${id}`, json('PUT', d)).then(r => r.data),
  deleteBlock: (id: string) => request<{ removedFromMajors: number }>(`${API}/admin/exam-blocks/${id}`, json('DELETE')),

  // Ngành
  listMajors: () => request<{ data: MajorItem[] }>(`${API}/admin/majors`).then(r => r.data),
  createMajor: (d: Partial<MajorItem>) => request<{ data: MajorItem }>(`${API}/admin/majors`, json('POST', d)).then(r => r.data),
  updateMajor: (id: string, d: Partial<MajorItem>) => request<{ data: MajorItem }>(`${API}/admin/majors/${id}`, json('PUT', d)).then(r => r.data),
  deleteMajor: (id: string) => request(`${API}/admin/majors/${id}`, json('DELETE')),
  bulkMajors: (ids: string[], set: { active?: boolean; addBlocks?: string[]; removeBlocks?: string[] }) =>
    request<{ modified: number }>(`${API}/admin/majors/bulk`, json('POST', { ids, set })),
  importMajors: (rows: Record<string, unknown>[], dryRun: boolean) =>
    request<ImportResult>(`${API}/admin/majors/import`, json('POST', { rows, dryRun })),

  // Cấu hình
  getSettings: () => request<{ data: RecommendationSettings; defaults: RecommendationSettings }>(`${API}/admin/settings`),
  saveSettings: (d: RecommendationSettings) => request<{ data: RecommendationSettings }>(`${API}/admin/settings`, json('PUT', d)).then(r => r.data),
  health: () => request<{ data: CatalogHealth }>(`${API}/admin/catalog/health`).then(r => r.data),
  preview: (input: {
    hollandScores: Record<string, number>;
    electiveSubjects: string[];
    aptitudeSubjects: string[];
    scores: { code: string; currentScore: number; targetScore: number }[];
    aspiration: string;
    settings?: RecommendationSettings;
  }) => request<{ data: RecommendationResult }>(`${API}/admin/recommendation/preview`, json('POST', input)).then(r => r.data),
};

/** Tổ hợp học sinh dùng được từ các môn đang có (cùng quy tắc với backend) */
export function deriveBlocks(config: PublicConfig | null, electives: string[], aptitudes: string[]) {
  if (!config) return [];
  const have = new Set([
    ...config.subjects.filter(s => s.kind === 'required').map(s => s.code),
    ...electives,
    ...aptitudes,
  ]);
  return config.blocks.filter(b => b.subjects.every(c => have.has(c)));
}

export const HOLLAND_TYPES: HollandType[] = ['R', 'I', 'A', 'S', 'E', 'C'];
export const KIND_LABEL: Record<SubjectKind, string> = {
  required: 'Bắt buộc',
  elective: 'Tự chọn',
  aptitude: 'Năng khiếu',
};
