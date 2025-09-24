// Admin API Configuration - Replace these URLs with your actual API endpoints
const ADMIN_API_BASE_URL = 'http://localhost:5000/api'; // Replace with your API base URL

const ADMIN_API_ENDPOINTS = {
  // Exam Blocks
  GET_EXAM_BLOCKS: `${ADMIN_API_BASE_URL}/exam-blocks`,
  CREATE_EXAM_BLOCK: `${ADMIN_API_BASE_URL}/exam-blocks`,
  UPDATE_EXAM_BLOCK: (id: string) => `${ADMIN_API_BASE_URL}/exam-blocks/${id}`,
  DELETE_EXAM_BLOCK: (id: string) => `${ADMIN_API_BASE_URL}/exam-blocks/${id}`,

  // Holland Questions
  GET_HOLLAND_QUESTIONS: `${ADMIN_API_BASE_URL}/holland-questions`,
  CREATE_HOLLAND_QUESTION: `${ADMIN_API_BASE_URL}/holland-questions`,
  UPDATE_HOLLAND_QUESTION: (id: number) => `${ADMIN_API_BASE_URL}/holland-questions/${id}`,
  DELETE_HOLLAND_QUESTION: (id: number) => `${ADMIN_API_BASE_URL}/holland-questions/${id}`,

  // Majors
  GET_MAJORS: `${ADMIN_API_BASE_URL}/majors`,
  CREATE_MAJOR: `${ADMIN_API_BASE_URL}/majors`,
  UPDATE_MAJOR: (id: string) => `${ADMIN_API_BASE_URL}/majors/${id}`,
  DELETE_MAJOR: (id: string) => `${ADMIN_API_BASE_URL}/majors/${id}`,

  // Student Results
  GET_STUDENT_RESULTS: `${ADMIN_API_BASE_URL}/students`,
  GET_STUDENT_RESULT_PDF: (id: string) => `${ADMIN_API_BASE_URL}/student-results/${id}/pdf`,
  SEARCH_STUDENT_RESULTS: `${ADMIN_API_BASE_URL}/students/search`,
};

// Types for Admin API
export interface ExamBlock {
  _id?: string;
  id: string;
  name: string;
  subjects: string[];
  description?: string;
}

export interface HollandQuestion {
  _id?: string;
  id: number;
  text: string;
  type: 'R' | 'I' | 'A' | 'S' | 'E' | 'C';
}

export interface Major {
  _id?: string;
  id?: number;
  name: string;
  description: string;
  examBlocks: string[];
  hollandTypes: string[];
  characteristics?: string;
}

export interface StudentResult {
  _id: string;
  name: string;
  class: string;
  number: string;
  createdAt: string;
  hollandScores: {
    R: number;
    I: number;
    A: number;
    S: number;
    E: number;
    C: number;
  };
  recommendedMajors: Major[];
  recommendationText: string;
  pdfPath?: string;
}

export interface SearchFilters {
  studentName?: string;
  studentClass?: string;
  studentNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// Mock Data - Replace with actual API calls
const MOCK_EXAM_BLOCKS: ExamBlock[] = [
  { _id: '1', id: 'A00', name: 'Khối A00', subjects: ['Toán', 'Lý', 'Hóa'], description: 'Khối tự nhiên cơ bản' },
  { _id: '2', id: 'A01', name: 'Khối A01', subjects: ['Toán', 'Lý', 'Anh'], description: 'Khối tự nhiên có tiếng Anh' },
  { _id: '3', id: 'B00', name: 'Khối B00', subjects: ['Toán', 'Hóa', 'Sinh'], description: 'Khối sinh học' },
  { _id: '4', id: 'C00', name: 'Khối C00', subjects: ['Văn', 'Sử', 'Địa'], description: 'Khối xã hội' },
  { _id: '5', id: 'D01', name: 'Khối D01', subjects: ['Văn', 'Toán', 'Anh'], description: 'Khối ngoại ngữ' },
];

const MOCK_HOLLAND_QUESTIONS: HollandQuestion[] = [
  { _id: '1', id: 1, text: 'Tự mua và lắp ráp máy vi tính theo ý của mình', type: 'R' },
  { _id: '2', id: 2, text: 'Lắp ráp tủ theo hướng dẫn của youtube', type: 'R' },
  { _id: '3', id: 3, text: 'Kết nối hai người bạn với nhau', type: 'S' },
  { _id: '4', id: 4, text: 'Tham gia ngày Trái Đất bằng cách lượm rác hay tắt điện', type: 'S' },
  { _id: '5', id: 5, text: 'Thăm bảo tàng công nghệ', type: 'I' },
];

const MOCK_MAJORS: Major[] = [
  {
    _id: '1',
    name: 'Công nghệ thông tin',
    description: 'Thiết kế, phát triển và quản lý các hệ thống công nghệ thông tin',
    examBlocks: ['A00', 'A01', 'D01'],
    hollandTypes: ['I', 'C'],
    characteristics: 'Cần tư duy logic, giỏi công nghệ'
  },
  {
    _id: '2',
    name: 'Y khoa',
    description: 'Chẩn đoán, điều trị và chăm sóc sức khỏe con người',
    examBlocks: ['B00'],
    hollandTypes: ['S', 'I'],
    characteristics: 'Đòi hỏi kiên nhẫn, chăm sóc, nghiên cứu'
  }
];

const MOCK_STUDENT_RESULTS: StudentResult[] = [
  {
    _id: '1',
    studentName: 'Nguyễn Văn A',
    studentClass: '12A1',
    studentNumber: 'SBD001',
    testDate: '2024-01-15',
    hollandScores: { R: 8, I: 9, A: 3, S: 5, E: 4, C: 7 },
    recommendedMajors: MOCK_MAJORS,
    recommendationText: 'Bạn phù hợp với ngành Công nghệ thông tin và Y khoa',
    pdfPath: '/pdfs/student_001.pdf'
  }
];

// Admin API Service Functions
export const adminApiService = {
  // Exam Blocks CRUD
  async getExamBlocks(): Promise<ExamBlock[]> {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(ADMIN_API_ENDPOINTS.GET_EXAM_BLOCKS);
      return await response.json();

      // return Promise.resolve(MOCK_EXAM_BLOCKS);
    } catch (error) {
      console.error('Error fetching exam blocks:', error);
      throw new Error('Không thể tải danh sách khối thi');
    }
  },

  async createExamBlock(examBlock: Omit<ExamBlock, '_id'>): Promise<ExamBlock> {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(ADMIN_API_ENDPOINTS.CREATE_EXAM_BLOCK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examBlock),
      });
      return await response.json();

      // const newBlock = { ...examBlock, _id: Date.now().toString() };
      // return Promise.resolve(newBlock);
    } catch (error) {
      console.error('Error creating exam block:', error);
      throw new Error('Không thể tạo khối thi mới');
    }
  },

  async updateExamBlock(id: string, examBlock: Partial<ExamBlock>): Promise<ExamBlock> {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(ADMIN_API_ENDPOINTS.UPDATE_EXAM_BLOCK(id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examBlock),
      });
      return await response.json();

      // return Promise.resolve({ ...examBlock, _id: id } as ExamBlock);
    } catch (error) {
      console.error('Error updating exam block:', error);
      throw new Error('Không thể cập nhật khối thi');
    }
  },

  async deleteExamBlock(id: string): Promise<void> {
    try {
      // TODO: Replace with actual API call
      await fetch(ADMIN_API_ENDPOINTS.DELETE_EXAM_BLOCK(id), {
        method: 'DELETE',
      });

      return Promise.resolve();
    } catch (error) {
      console.error('Error deleting exam block:', error);
      throw new Error('Không thể xóa khối thi');
    }
  },

  // Holland Questions CRUD
  async getHollandQuestions(): Promise<HollandQuestion[]> {
    try {
      // TODO: Replace with actual API call
      return Promise.resolve(MOCK_HOLLAND_QUESTIONS);
    } catch (error) {
      console.error('Error fetching Holland questions:', error);
      throw new Error('Không thể tải danh sách câu hỏi');
    }
  },

  async createHollandQuestion(question: Omit<HollandQuestion, '_id'>): Promise<HollandQuestion> {
    try {
      // TODO: Replace with actual API call
      const newQuestion = { ...question, _id: Date.now().toString() };
      return Promise.resolve(newQuestion);
    } catch (error) {
      console.error('Error creating Holland question:', error);
      throw new Error('Không thể tạo câu hỏi mới');
    }
  },

  async updateHollandQuestion(id: number, question: Partial<HollandQuestion>): Promise<HollandQuestion> {
    try {
      // TODO: Replace with actual API call
      return Promise.resolve({ ...question, _id: id.toString() } as HollandQuestion);
    } catch (error) {
      console.error('Error updating Holland question:', error);
      throw new Error('Không thể cập nhật câu hỏi');
    }
  },

  async deleteHollandQuestion(id: number): Promise<void> {
    try {
      // TODO: Replace with actual API call
      return Promise.resolve();
    } catch (error) {
      console.error('Error deleting Holland question:', error);
      throw new Error('Không thể xóa câu hỏi');
    }
  },

  // Majors CRUD
  async getMajors(): Promise<Major[]> {
    try {
      // TODO: Replace with actual API call
      return Promise.resolve(MOCK_MAJORS);
    } catch (error) {
      console.error('Error fetching majors:', error);
      throw new Error('Không thể tải danh sách ngành học');
    }
  },

  async createMajor(major: Omit<Major, '_id'>): Promise<Major> {
    try {
      // TODO: Replace with actual API call
      const newMajor = { ...major, _id: Date.now().toString() };
      return Promise.resolve(newMajor);
    } catch (error) {
      console.error('Error creating major:', error);
      throw new Error('Không thể tạo ngành học mới');
    }
  },

  async updateMajor(id: string, major: Partial<Major>): Promise<Major> {
    try {
      // TODO: Replace with actual API call
      return Promise.resolve({ ...major, _id: id } as Major);
    } catch (error) {
      console.error('Error updating major:', error);
      throw new Error('Không thể cập nhật ngành học');
    }
  },

  async deleteMajor(id: string): Promise<void> {
    try {
      // TODO: Replace with actual API call
      return Promise.resolve();
    } catch (error) {
      console.error('Error deleting major:', error);
      throw new Error('Không thể xóa ngành học');
    }
  },

  // Student Results
  async getStudentResults(): Promise<StudentResult[]> {
    try {
      const res = await fetch(ADMIN_API_ENDPOINTS.GET_STUDENT_RESULTS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data: StudentResult[] = await res.json();
      return data;
    } catch (error) {
      console.error('Error fetching student results:', error);
      throw new Error('Không thể tải danh sách kết quả');
    }
  }
  ,

  async searchStudentResults(filters: SearchFilters): Promise<{
    results: StudentResult[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      // Tạo query string từ filters
      const queryString = new URLSearchParams({
        studentName: filters.studentName ?? '',
        studentClass: filters.studentClass ?? '',
        studentNumber: filters.studentNumber ?? '',
        page: String(filters.page ?? 1),
        limit: String(filters.limit ?? 10),
      }).toString();

      const res = await fetch(ADMIN_API_ENDPOINTS.SEARCH_STUDENT_RESULTS + `?${queryString}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      return (await res.json()) as {
        results: StudentResult[];
        total: number;
        page: number;
        totalPages: number;
      };
    } catch (error) {
      console.error('Error searching student results:', error);
      throw new Error('Không thể tìm kiếm kết quả');
    }
  }
  ,

  async getStudentResultPDF(id: string): Promise<string> {
    try {
      // TODO: Replace with actual API call
      // return ADMIN_API_ENDPOINTS.GET_STUDENT_RESULT_PDF(id);
      return Promise.resolve(`/api/student-results/${id}/pdf`);
    } catch (error) {
      console.error('Error getting PDF URL:', error);
      throw new Error('Không thể tải PDF');
    }
  }
};