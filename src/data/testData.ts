// Holland Test Data từ file được upload
export interface Major {
  id: number;
  name: string;
  examBlocks: string[];
  subjects: string[];
  hollandTypes: string[];
  description: string;
}

export interface TestBlock {
  id: string;
  name: string;
  majors: Major[];
}

export const majorsData: Major[] = [
  {
    id: 1,
    name: "Công nghệ thông tin",
    examBlocks: ["A00", "A01"],
    subjects: ["Toán", "Lý"],
    hollandTypes: ["I", "R"],
    description: "Cần tư duy logic, giỏi công nghệ."
  },
  {
    id: 2,
    name: "Khoa học dữ liệu – AI",
    examBlocks: ["A00", "A01"],
    subjects: ["Toán", "Tin"],
    hollandTypes: ["I", "C"],
    description: "Ngành mới, lương cao, nhiều cơ hội quốc tế."
  },
  {
    id: 3,
    name: "Y khoa",
    examBlocks: ["B00"],
    subjects: ["Toán", "Hóa", "Sinh"],
    hollandTypes: ["S", "I"],
    description: "Đòi hỏi kiên nhẫn, chăm sóc, nghiên cứu."
  },
  {
    id: 4,
    name: "Dược",
    examBlocks: ["B00"],
    subjects: ["Toán", "Hóa", "Sinh"],
    hollandTypes: ["I", "C"],
    description: "Hợp học sinh tỉ mỉ, thích nghiên cứu."
  },
  {
    id: 5,
    name: "Điều dưỡng",
    examBlocks: ["B00", "C00"],
    subjects: ["Sinh", "Văn"],
    hollandTypes: ["S", "C"],
    description: "Cần đồng cảm, chăm sóc con người."
  },
  {
    id: 6,
    name: "Luật",
    examBlocks: ["C00", "D01"],
    subjects: ["Văn", "Sử", "Địa", "Anh"],
    hollandTypes: ["E", "C"],
    description: "Hợp học sinh thích tranh luận, thuyết phục."
  },
  {
    id: 7,
    name: "Kinh tế",
    examBlocks: ["A00", "A01"],
    subjects: ["Toán"],
    hollandTypes: ["C", "E"],
    description: "Nhanh nhẹn, hoát bát, tư duy logic."
  },
  {
    id: 8,
    name: "Quản trị Kinh doanh",
    examBlocks: ["A00", "A01"],
    subjects: ["Toán"],
    hollandTypes: ["E", "C"],
    description: "Ngành phổ biến, thiên về lãnh đạo."
  },
  {
    id: 9,
    name: "Tài chính – Ngân hàng",
    examBlocks: ["A00", "A01"],
    subjects: ["Toán"],
    hollandTypes: ["C", "E"],
    description: "Yêu cầu giỏi số liệu, giao tiếp."
  },
  {
    id: 10,
    name: "Kế toán – Kiểm toán",
    examBlocks: ["A00", "A01"],
    subjects: ["Toán"],
    hollandTypes: ["C", "R"],
    description: "Cần cẩn thận, làm việc chính xác."
  },
  {
    id: 11,
    name: "Marketing",
    examBlocks: ["A00", "A01"],
    subjects: ["Văn", "Toán"],
    hollandTypes: ["E", "A"],
    description: "Ngành hot, cần sáng tạo + phân tích."
  },
  {
    id: 12,
    name: "Thương mại điện tử",
    examBlocks: ["A00", "A01"],
    subjects: ["Toán"],
    hollandTypes: ["E", "I"],
    description: "Kết hợp CNTT + kinh doanh."
  },
  {
    id: 13,
    name: "Ngôn ngữ Anh",
    examBlocks: ["D01"],
    subjects: ["Anh", "Văn"],
    hollandTypes: ["S", "E"],
    description: "Cơ hội du học, làm việc quốc tế."
  },
  {
    id: 14,
    name: "Ngôn ngữ Trung",
    examBlocks: ["D01", "D04"],
    subjects: ["Anh", "Văn"],
    hollandTypes: ["S", "E"],
    description: "Ngành hot do nhu cầu hợp tác kinh tế."
  },
  {
    id: 15,
    name: "Quan hệ quốc tế",
    examBlocks: ["D01", "C00"],
    subjects: ["Anh", "Văn"],
    hollandTypes: ["E", "S"],
    description: "Hợp học sinh hướng ngoại, thích ngoại giao."
  },
  {
    id: 16,
    name: "Báo chí – Truyền thông",
    examBlocks: ["C00", "D01"],
    subjects: ["Văn", "Sử"],
    hollandTypes: ["A", "S"],
    description: "Cần sáng tạo, giao tiếp, nhanh nhạy."
  },
  {
    id: 17,
    name: "Tâm lý học",
    examBlocks: ["B00", "D01"],
    subjects: ["Văn", "Sinh"],
    hollandTypes: ["S", "I"],
    description: "Phù hợp học sinh yêu con người, lắng nghe."
  },
  {
    id: 18,
    name: "Sư phạm Tiểu học",
    examBlocks: ["C00", "D01"],
    subjects: ["Văn", "Sử"],
    hollandTypes: ["S", "A"],
    description: "Cần tình thương, kiên nhẫn."
  },
  {
    id: 19,
    name: "Sư phạm Toán",
    examBlocks: ["A00", "A01"],
    subjects: ["Toán", "Lý"],
    hollandTypes: ["S", "I"],
    description: "Hợp học sinh yêu môn Toán."
  },
  {
    id: 20,
    name: "Kiến trúc",
    examBlocks: ["V00", "H00", "H01"],
    subjects: ["Toán", "Vẽ"],
    hollandTypes: ["A", "R"],
    description: "Cần tư duy không gian, sáng tạo."
  },
  {
    id: 21,
    name: "Thiết kế đồ họa",
    examBlocks: ["H00", "H01", "D01"],
    subjects: ["Vẽ", "Văn"],
    hollandTypes: ["A", "S"],
    description: "Hợp học sinh thích nghệ thuật, công nghệ."
  },
  {
    id: 22,
    name: "Công nghệ kỹ thuật cơ khí",
    examBlocks: ["A00", "A01"],
    subjects: ["Toán", "Lý"],
    hollandTypes: ["R", "I"],
    description: "Cần kỹ năng thực hành, kỹ thuật."
  },
  {
    id: 23,
    name: "Công nghệ kỹ thuật điện – điện tử",
    examBlocks: ["A00", "A01"],
    subjects: ["Toán", "Lý"],
    hollandTypes: ["R", "I"],
    description: "Ứng dụng cao, dễ có việc."
  },
  {
    id: 24,
    name: "Công nghệ sinh học",
    examBlocks: ["B00", "A00"],
    subjects: ["Toán", "Hóa"],
    hollandTypes: ["I", "R"],
    description: "Ngành nghiên cứu ứng dụng y – nông – thực phẩm."
  },
  {
    id: 25,
    name: "Nông nghiệp công nghệ cao",
    examBlocks: ["B00", "A00"],
    subjects: ["Sinh", "Hóa"],
    hollandTypes: ["R", "I"],
    description: "Xu hướng bền vững, khởi nghiệp."
  },
  {
    id: 26,
    name: "Khoa học môi trường",
    examBlocks: ["B00", "A00"],
    subjects: ["Hóa", "Sinh"],
    hollandTypes: ["I", "R", "S"],
    description: "Ngành xanh, nhu cầu tương lai lớn."
  },
  {
    id: 27,
    name: "Logistics & Quản lý chuỗi cung ứng",
    examBlocks: ["A00", "A01", "D01"],
    subjects: ["Toán", "Anh"],
    hollandTypes: [],
    description: "Ngành hot toàn cầu, cần tiếng Anh tốt."
  },
  {
    id: 28,
    name: "Du lịch – Nhà hàng – Khách sạn",
    examBlocks: ["D01", "C00"],
    subjects: ["Văn", "Anh"],
    hollandTypes: ["S", "E"],
    description: "Cần giao tiếp, phục vụ, hướng ngoại."
  },
  {
    id: 29,
    name: "Hàng không (Quản trị, Phi công)",
    examBlocks: ["A00", "A01", "D01"],
    subjects: ["Toán", "Lý"],
    hollandTypes: ["R", "C"],
    description: "Ngành hot, yêu cầu ngoại ngữ và sức khỏe."
  },
  {
    id: 30,
    name: "Công an – Quân đội",
    examBlocks: ["A00", "C00", "D01"],
    subjects: ["Toán", "Văn"],
    hollandTypes: ["C", "E"],
    description: "Cần thể lực, kỷ luật, trách nhiệm."
  }
];

export const testBlocks: TestBlock[] = [
  {
    id: "A00",
    name: "Khối A00 (Toán, Lý, Hóa)",
    majors: majorsData.filter(major => major.examBlocks.includes("A00"))
  },
  {
    id: "A01",
    name: "Khối A01 (Toán, Lý, Anh)",
    majors: majorsData.filter(major => major.examBlocks.includes("A01"))
  },
  {
    id: "B00",
    name: "Khối B00 (Toán, Hóa, Sinh)",
    majors: majorsData.filter(major => major.examBlocks.includes("B00"))
  },
  {
    id: "C00",
    name: "Khối C00 (Văn, Sử, Địa)",
    majors: majorsData.filter(major => major.examBlocks.includes("C00"))
  },
  {
    id: "D01",
    name: "Khối D01 (Văn, Toán, Anh)",
    majors: majorsData.filter(major => major.examBlocks.includes("D01"))
  },
  {
    id: "D04",
    name: "Khối D04 (Văn, Toán, Trung)",
    majors: majorsData.filter(major => major.examBlocks.includes("D04"))
  },
  {
    id: "V00",
    name: "Khối V00 (Toán, Lý, Vẽ)",
    majors: majorsData.filter(major => major.examBlocks.includes("V00"))
  },
  {
    id: "H00",
    name: "Khối H00 (Văn, Sử, Vẽ)",
    majors: majorsData.filter(major => major.examBlocks.includes("H00"))
  },
  {
    id: "H01",
    name: "Khối H01 (Văn, Toán, Vẽ)",
    majors: majorsData.filter(major => major.examBlocks.includes("H01"))
  }
];

export interface HollandQuestion {
  id: number;
  text: string;
  type: 'R' | 'I' | 'A' | 'S' | 'E' | 'C';
}

export const hollandQuestions: HollandQuestion[] = [
  // Realistic (R) - 4 câu hỏi
  { id: 1, text: "Tôi thích làm việc với máy móc, dụng cụ.", type: "R" },
  { id: 2, text: "Tôi thích sửa chữa, lắp ráp.", type: "R" },
  { id: 3, text: "Tôi thấy thoải mái khi làm việc ngoài trời.", type: "R" },
  { id: 4, text: "Tôi thích và học tốt các môn Toán, Lý, Anh, Hóa, Tin (hoặc 3/5 môn này)", type: "R" },

  // Investigative (I) - 4 câu hỏi
  { id: 5, text: "Tôi thích tìm hiểu, phân tích vấn đề.", type: "I" },
  { id: 6, text: "Tôi thích làm thí nghiệm khoa học.", type: "I" },
  { id: 7, text: "Tôi tò mò về cách mọi thứ vận hành.", type: "I" },
  { id: 8, text: "Tôi yêu thích và học tốt trong Toán, Sinh, Hóa, Lý, Tin (hoặc 3/5 môn này)", type: "I" },

  // Artistic (A) - 4 câu hỏi
  { id: 9, text: "Tôi thích vẽ, viết, sáng tác, biểu diễn.", type: "A" },
  { id: 10, text: "Tôi thích thể hiện bản thân qua nghệ thuật, sáng tạo.", type: "A" },
  { id: 11, text: "Tôi không thích công việc lặp lại, gò bó.", type: "A" },
  { id: 12, text: "Tôi yêu thích và học tốt Văn, Toán, Lý, Năng khiếu (vẽ, nhạc,…) (hoặc 3/5 môn này).", type: "A" },

  // Social (S) - 4 câu hỏi
  { id: 13, text: "Tôi thích giúp đỡ, chăm sóc người khác.", type: "S" },
  { id: 14, text: "Tôi dễ đồng cảm, lắng nghe.", type: "S" },
  { id: 15, text: "Tôi muốn làm việc trong môi trường hợp tác.", type: "S" },
  { id: 16, text: "Tôi thích và học tốt Văn, Sử, Địa, Sinh, Ngoại ngữ (hoặc 3/5 môn này).", type: "S" },

  // Enterprising (E) - 4 câu hỏi
  { id: 17, text: "Tôi thích thuyết phục, lãnh đạo người khác.", type: "E" },
  { id: 18, text: "Tôi thích kinh doanh, buôn bán, quản lý.", type: "E" },
  { id: 19, text: "Tôi tự tin trước đám đông.", type: "E" },
  { id: 20, text: "Tôi thích và học tốt Văn, Anh, Toán, Địa, KT&PL (hoặc 3/5 môn này)", type: "E" },

  // Conventional (C) - 4 câu hỏi
  { id: 21, text: "Tôi thích công việc rõ ràng, có quy định.", type: "C" },
  { id: 22, text: "Tôi cẩn thận, tỉ mỉ, thích làm sổ sách.", type: "C" },
  { id: 23, text: "Tôi có khả năng tính toán, quản lý dữ liệu.", type: "C" },
  { id: 24, text: "Tôi thích và học tốt Toán, Tin, Văn, KT&PL, Lý (hoặc 3/5 môn này)", type: "C" }
];

export const hollandTypeDescriptions = {
  R: {
    name: "Realistic (Kỹ thuật, thực tế)",
    description: "Thích làm việc với máy móc, dụng cụ, công việc thực tế",
    color: "education-blue"
  },
  I: {
    name: "Investigative (Nghiên cứu, phân tích)",
    description: "Thích tìm hiểu, phân tích, nghiên cứu khoa học",
    color: "education-purple"
  },
  A: {
    name: "Artistic (Sáng tạo, nghệ thuật)",
    description: "Thích sáng tạo, nghệ thuật, thể hiện bản thân",
    color: "education-pink"
  },
  S: {
    name: "Social (Xã hội, hỗ trợ)",
    description: "Thích giúp đỡ, chăm sóc, làm việc với con người",
    color: "education-green"
  },
  E: {
    name: "Enterprising (Quản lý, kinh doanh)",
    description: "Thích lãnh đạo, thuyết phục, kinh doanh",
    color: "education-orange"
  },
  C: {
    name: "Conventional (Nguyên tắc, tổ chức)",
    description: "Thích công việc có quy định, tổ chức, quản lý dữ liệu",
    color: "education-red"
  }
};