// API Configuration - Replace these URLs with your actual API endpoints
const API_BASE_URL = process.env.API_BASE_URL; // Replace with your API base URL

const API_ENDPOINTS = {
  GET_QUESTIONS: `${API_BASE_URL}/questions`, // GET request to fetch all Holland questions
  SUBMIT_RESULTS: `${API_BASE_URL}/results`, // POST request to submit test results
  GET_MAJORS: `${API_BASE_URL}/majors`, // GET request to fetch compatible majors
};

// Types for API requests/responses
export interface QuestionResponse {
  id: number;
  text: string;
  type: 'R' | 'I' | 'A' | 'S' | 'E' | 'C';
}

export interface SubmitResultRequest {
  personalInfo: {
    name: string;
    class: string;
  };
  answers: { [questionId: number]: boolean };
  selectedBlocks: string[];
  scores: Array<{
    subject: string;
    currentScore: number;
    targetScore: number;
  }>;
  hollandScores: {
    R: number;
    I: number;
    A: number;
    S: number;
    E: number;
    C: number;
  };
}

export interface ResultResponse {
  success: boolean;
  message?: string;
  recommendedMajors?: Array<{
    _id: string;
    name: string;
    description: string;
    examBlocks: string[];
    hollandTypes: string[];
  }>;
  recommendationText?: string;
}

// Mock data - Remove this section when connecting to real API
// const MOCK_QUESTIONS: QuestionResponse[] = [
//   // Group R (Realistic)
//   { id: 1, text: "Sửa chữa máy móc, thiết bị điện", type: "R" },
//   { id: 2, text: "Làm việc với động vật", type: "R" },
//   { id: 3, text: "Xây dựng nhà cửa", type: "R" },
//   { id: 4, text: "Trồng trọt, chăn nuôi", type: "R" },
//   { id: 5, text: "Lái xe, máy bay", type: "R" },
//   { id: 6, text: "Sản xuất thực phẩm", type: "R" },
//   { id: 7, text: "Làm thủ công mỹ nghệ", type: "R" },
//   { id: 8, text: "Vận hành máy móc", type: "R" },
//   { id: 9, text: "Làm việc ngoài trời", type: "R" },
//   { id: 10, text: "Sử dụng dụng cụ cầm tay", type: "R" },

//   // Group I (Investigative)
//   { id: 11, text: "Nghiên cứu khoa học", type: "I" },
//   { id: 12, text: "Giải quyết các bài toán phức tạp", type: "I" },
//   { id: 13, text: "Làm thí nghiệm trong phòng lab", type: "I" },
//   { id: 14, text: "Phân tích dữ liệu", type: "I" },
//   { id: 15, text: "Nghiên cứu y học", type: "I" },
//   { id: 16, text: "Lập trình máy tính", type: "I" },
//   { id: 17, text: "Nghiên cứu thiên văn học", type: "I" },
//   { id: 18, text: "Đọc các tạp chí khoa học", type: "I" },
//   { id: 19, text: "Tìm hiểu cách thức hoạt động của sự vật", type: "I" },
//   { id: 20, text: "Làm việc độc lập", type: "I" },

//   // Group A (Artistic)
//   { id: 21, text: "Vẽ tranh, thiết kế", type: "A" },
//   { id: 22, text: "Chơi nhạc cụ", type: "A" },
//   { id: 23, text: "Viết truyện, thơ", type: "A" },
//   { id: 24, text: "Diễn xuất, múa", type: "A" },
//   { id: 25, text: "Chụp ảnh, quay phim", type: "A" },
//   { id: 26, text: "Trang trí nội thất", type: "A" },
//   { id: 27, text: "Thiết kế thời trang", type: "A" },
//   { id: 28, text: "Sáng tác âm nhạc", type: "A" },
//   { id: 29, text: "Làm việc sáng tạo", type: "A" },
//   { id: 30, text: "Tham gia các hoạt động văn hóa nghệ thuật", type: "A" },

//   // Group S (Social)
//   { id: 31, text: "Dạy học, hướng dẫn người khác", type: "S" },
//   { id: 32, text: "Chăm sóc người bệnh", type: "S" },
//   { id: 33, text: "Tư vấn, giải quyết tranh chấp", type: "S" },
//   { id: 34, text: "Làm việc với trẻ em", type: "S" },
//   { id: 35, text: "Giúp đỡ người gặp khó khăn", type: "S" },
//   { id: 36, text: "Tổ chức các hoạt động cộng đồng", type: "S" },
//   { id: 37, text: "Làm việc xã hội", type: "S" },
//   { id: 38, text: "Hướng nghiệp cho học sinh", type: "S" },
//   { id: 39, text: "Chăm sóc người cao tuổi", type: "S" },
//   { id: 40, text: "Tham gia hoạt động từ thiện", type: "S" },

//   // Group E (Enterprising)
//   { id: 41, text: "Kinh doanh, buôn bán", type: "E" },
//   { id: 42, text: "Lãnh đạo, quản lý", type: "E" },
//   { id: 43, text: "Bán hàng, quảng cáo", type: "E" },
//   { id: 44, text: "Thuyết phục người khác", type: "E" },
//   { id: 45, text: "Tổ chức sự kiện", type: "E" },
//   { id: 46, text: "Điều hành doanh nghiệp", type: "E" },
//   { id: 47, text: "Đầu tư tài chính", type: "E" },
//   { id: 48, text: "Làm chính trị", type: "E" },
//   { id: 49, text: "Quản lý nhân sự", type: "E" },
//   { id: 50, text: "Khởi nghiệp", type: "E" },

//   // Group C (Conventional)
//   { id: 51, text: "Làm kế toán", type: "C" },
//   { id: 52, text: "Quản lý hồ sơ, tài liệu", type: "C" },
//   { id: 53, text: "Nhập liệu máy tính", type: "C" },
//   { id: 54, text: "Làm thư ký", type: "C" },
//   { id: 55, text: "Kiểm tra chất lượng", type: "C" },
//   { id: 56, text: "Lập báo cáo tài chính", type: "C" },
//   { id: 57, text: "Sắp xếp, phân loại", type: "C" },
//   { id: 58, text: "Tuân thủ quy trình", type: "C" },
//   { id: 59, text: "Làm việc với số liệu", type: "C" },
//   { id: 60, text: "Quản lý kho", type: "C" },
// ];

// const MOCK_RESULT_RESPONSE: ResultResponse = {
//   success: true,
//   message: "Kết quả đã được lưu thành công",
//   recommendedMajors: [
//     {
//       id: "CNTT",
//       name: "Công nghệ thông tin",
//       description: "Thiết kế, phát triển và quản lý các hệ thống công nghệ thông tin",
//       examBlocks: ["A00", "A01", "D01"],
//       hollandTypes: ["I", "C"]
//     },
//     {
//       id: "KTPM",
//       name: "Kỹ thuật phần mềm",
//       description: "Phát triển ứng dụng và hệ thống phần mềm",
//       examBlocks: ["A00", "A01", "D01"],
//       hollandTypes: ["I", "C"]
//     }
//   ]
// };

// API Service Functions
export const apiService = {
  // Fetch Holland test questions
  async getQuestions(): Promise<QuestionResponse[]> {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(API_ENDPOINTS.GET_QUESTIONS);
      if (!response.ok) throw new Error('Failed to fetch questions');
      return await response.json();

      // Mock response - remove this and uncomment above lines

    } catch (error) {
      console.error('Error fetching questions:', error);
      throw new Error('Không thể tải câu hỏi. Vui lòng thử lại sau.');
    }
  },

  // Submit test results and get recommendations
  async submitResults(data: SubmitResultRequest): Promise<ResultResponse> {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(API_ENDPOINTS.SUBMIT_RESULTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to submit results');
      return await response.json();


    } catch (error) {
      console.error('Error submitting results:', error);
      throw new Error('Không thể gửi kết quả. Vui lòng thử lại sau.');
    }
  }
};