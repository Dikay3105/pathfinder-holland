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
  { id: "A00", name: "Khối A00 (Toán, Lý, Hóa)", majors: majorsData.filter(m => m.examBlocks.includes("A00")) },
  { id: "A01", name: "Khối A01 (Toán, Lý, Anh)", majors: majorsData.filter(m => m.examBlocks.includes("A01")) },
  { id: "A02", name: "Khối A02 (Toán, Lý, Sinh)", majors: majorsData.filter(m => m.examBlocks.includes("A02")) },
  { id: "A03", name: "Khối A03 (Toán, Lý, Sử)", majors: majorsData.filter(m => m.examBlocks.includes("A03")) },
  { id: "A04", name: "Khối A04 (Toán, Lý, Địa)", majors: majorsData.filter(m => m.examBlocks.includes("A04")) },
  { id: "A05", name: "Khối A05 (Toán, Hóa, Sử)", majors: majorsData.filter(m => m.examBlocks.includes("A05")) },
  { id: "A06", name: "Khối A06 (Toán, Hóa, Địa)", majors: majorsData.filter(m => m.examBlocks.includes("A06")) },
  { id: "A07", name: "Khối A07 (Toán, Sử, Địa)", majors: majorsData.filter(m => m.examBlocks.includes("A07")) },
  { id: "A08", name: "Khối A08 (Toán, Sử, GD Kinh tế & Pháp luật)", majors: majorsData.filter(m => m.examBlocks.includes("A08")) },
  { id: "A09", name: "Khối A09 (Toán, Địa, GD Kinh tế & Pháp luật)", majors: majorsData.filter(m => m.examBlocks.includes("A09")) },
  { id: "A10", name: "Khối A10 (Toán, Lý, GD Kinh tế & Pháp luật)", majors: majorsData.filter(m => m.examBlocks.includes("A10")) },
  { id: "A11", name: "Khối A11 (Toán, Hóa, GD Kinh tế & Pháp luật)", majors: majorsData.filter(m => m.examBlocks.includes("A11")) },

  { id: "B00", name: "Khối B00 (Toán, Hóa, Sinh)", majors: majorsData.filter(m => m.examBlocks.includes("B00")) },
  { id: "B01", name: "Khối B01 (Toán, Sử, Sinh)", majors: majorsData.filter(m => m.examBlocks.includes("B01")) },
  { id: "B02", name: "Khối B02 (Toán, Địa, Sinh)", majors: majorsData.filter(m => m.examBlocks.includes("B02")) },
  { id: "B03", name: "Khối B03 (Toán, Văn, Sinh)", majors: majorsData.filter(m => m.examBlocks.includes("B03")) },
  { id: "B08", name: "Khối B08 (Toán, Anh, Sinh)", majors: majorsData.filter(m => m.examBlocks.includes("B08")) },

  { id: "C00", name: "Khối C00 (Văn, Sử, Địa)", majors: majorsData.filter(m => m.examBlocks.includes("C00")) },
  { id: "C01", name: "Khối C01 (Văn, Toán, Lý)", majors: majorsData.filter(m => m.examBlocks.includes("C01")) },
  { id: "C02", name: "Khối C02 (Văn, Toán, Hóa)", majors: majorsData.filter(m => m.examBlocks.includes("C02")) },
  { id: "C03", name: "Khối C03 (Văn, Toán, Sử)", majors: majorsData.filter(m => m.examBlocks.includes("C03")) },
  { id: "C04", name: "Khối C04 (Văn, Toán, Địa)", majors: majorsData.filter(m => m.examBlocks.includes("C04")) },
  { id: "C05", name: "Khối C05 (Văn, Lý, Hóa)", majors: majorsData.filter(m => m.examBlocks.includes("C05")) },
  { id: "C06", name: "Khối C06 (Văn, Lý, Sinh)", majors: majorsData.filter(m => m.examBlocks.includes("C06")) },
  { id: "C07", name: "Khối C07 (Văn, Lý, Sử)", majors: majorsData.filter(m => m.examBlocks.includes("C07")) },
  { id: "C08", name: "Khối C08 (Văn, Hóa, Sinh)", majors: majorsData.filter(m => m.examBlocks.includes("C08")) },
  { id: "C09", name: "Khối C09 (Văn, Lý, Địa)", majors: majorsData.filter(m => m.examBlocks.includes("C09")) },
  { id: "C10", name: "Khối C10 (Văn, Hóa, Sử)", majors: majorsData.filter(m => m.examBlocks.includes("C10")) },
  { id: "C12", name: "Khối C12 (Văn, Sinh, Sử)", majors: majorsData.filter(m => m.examBlocks.includes("C12")) },
  { id: "C13", name: "Khối C13 (Văn, Sinh, Địa)", majors: majorsData.filter(m => m.examBlocks.includes("C13")) },
  { id: "C14", name: "Khối C14 (Văn, Toán, GD Kinh tế & Pháp luật)", majors: majorsData.filter(m => m.examBlocks.includes("C14")) },
  { id: "C16", name: "Khối C16 (Văn, Lý, GD Kinh tế & Pháp luật)", majors: majorsData.filter(m => m.examBlocks.includes("C16")) },
  { id: "C17", name: "Khối C17 (Văn, Hóa, GD Kinh tế & Pháp luật)", majors: majorsData.filter(m => m.examBlocks.includes("C17")) },
  { id: "C19", name: "Khối C19 (Văn, Sử, GD Kinh tế & Pháp luật)", majors: majorsData.filter(m => m.examBlocks.includes("C19")) },

  { id: "D01", name: "Khối D01 (Toán, Văn, Anh)", majors: majorsData.filter(m => m.examBlocks.includes("D01")) },
  { id: "D07", name: "Khối D07 (Toán, Hóa, Anh)", majors: majorsData.filter(m => m.examBlocks.includes("D07")) },
  { id: "D08", name: "Khối D08 (Toán, Sinh, Anh)", majors: majorsData.filter(m => m.examBlocks.includes("D08")) },
  { id: "D09", name: "Khối D09 (Toán, Anh, Sử)", majors: majorsData.filter(m => m.examBlocks.includes("D09")) },
  { id: "D10", name: "Khối D10 (Toán, Địa, Anh)", majors: majorsData.filter(m => m.examBlocks.includes("D10")) },
  { id: "D12", name: "Khối D12 (Văn, Hóa, Anh)", majors: majorsData.filter(m => m.examBlocks.includes("D12")) },
  { id: "D13", name: "Khối D13 (Văn, Sinh, Anh)", majors: majorsData.filter(m => m.examBlocks.includes("D13")) },
  { id: "D14", name: "Khối D14 (Văn, Sử, Anh)", majors: majorsData.filter(m => m.examBlocks.includes("D14")) },
  { id: "D15", name: "Khối D15 (Văn, Địa, Anh)", majors: majorsData.filter(m => m.examBlocks.includes("D15")) },
  { id: "D66", name: "Khối D66 (Văn, GD Kinh tế & Pháp luật, Anh)", majors: majorsData.filter(m => m.examBlocks.includes("D66")) },
  { id: "D84", name: "Khối D84 (Toán, GD Kinh tế & Pháp luật, Anh)", majors: majorsData.filter(m => m.examBlocks.includes("D84")) }
]
  ;


export interface HollandQuestion {
  id: number;
  text: string;
  type: 'R' | 'I' | 'A' | 'S' | 'E' | 'C';
}

export const hollandQuestions: HollandQuestion[] = [
  // Realistic (R) - Nhóm kỹ thuật - 10 câu hỏi
  { id: 1, text: "Tự mua và lắp ráp máy vi tính theo ý của mình", type: "R" },
  { id: 2, text: "Lắp ráp tủ theo hướng dẫn của youtube", type: "R" },
  { id: 3, text: "Trang điểm cho mình hay bạn theo hướng dẫn của youtube", type: "R" },
  { id: 4, text: "Cắt tỉa cây cảnh", type: "R" },
  { id: 5, text: "Tháo điện thoại di động hay máy tính để tìm hiểu", type: "R" },
  { id: 6, text: "Tham gia một chuyến du lịch thám hiểm (như khám phá hang động, núi rừng)", type: "R" },
  { id: 7, text: "Chăm sóc vật nuôi", type: "R" },
  { id: 8, text: "Sửa xe", type: "R" },
  { id: 9, text: "Làm đồ nội thất", type: "R" },
  { id: 10, text: "Chơi một môn thể thao", type: "R" },

  // Social (S) - Nhóm xã hội - 10 câu hỏi
  { id: 11, text: "Kết nối hai người bạn với nhau", type: "S" },
  { id: 12, text: "Tham gia ngày Trái Đất bằng cách lượm rác hay tắt điện", type: "S" },
  { id: 13, text: "Hướng dẫn khách nước ngoài chỗ ăn ngon", type: "S" },
  { id: 14, text: "Cứu động vật bị bỏ rơi ngoài đường", type: "S" },
  { id: 15, text: "Kể chuyện cười cho bạn bè nghe", type: "S" },
  { id: 16, text: "Dạy trẻ con chơi một trò chơi hay một môn thể thao", type: "S" },
  { id: 17, text: "Lắng nghe bạn bè tâm sự về vấn đề của họ", type: "S" },
  { id: 18, text: "Giúp bạn bè giải quyết vấn đề liên quan tới tình yêu", type: "S" },
  { id: 19, text: "Tham gia một chuyến đi từ thiện", type: "S" },
  { id: 20, text: "Sẵn sàng giúp thầy cô, bạn bè khi thấy họ cần", type: "S" },

  // Investigative (I) - Nhóm Nghiên cứu - 10 câu hỏi
  { id: 21, text: "Thăm bảo tàng công nghệ", type: "I" },
  { id: 22, text: "Tìm hiểu sự hình thành các vì sao", type: "I" },
  { id: 23, text: "Tìm hiểu về văn hóa quốc gia mà mình thích", type: "I" },
  { id: 24, text: "Tìm hiểu về tâm lý con người", type: "I" },
  { id: 25, text: "Đọc một cuốn sách về tương lai con người trong một triệu năm nữa", type: "I" },
  { id: 26, text: "Đọc sách báo hay xem youtube video về vũ trụ", type: "I" },
  { id: 27, text: "Tìm hiểu về nguồn gốc của một dịch bệnh", type: "I" },
  { id: 28, text: "Đọc các bài báo về ảnh hưởng của AI (trí tuệ nhân tạo) lên nghề nghiệp tương lai", type: "I" },
  { id: 29, text: "Xem youtube video về thế giới động vật", type: "I" },
  { id: 30, text: "Tiến hành thí nghiệm hóa học", type: "I" },

  // Artistic (A) - Nhóm Nghệ thuật - 10 câu hỏi
  { id: 31, text: "Vẽ tranh", type: "A" },
  { id: 32, text: "Viết truyện ngắn", type: "A" },
  { id: 33, text: "Chơi một nhạc cụ", type: "A" },
  { id: 34, text: "Chỉnh sửa phim", type: "A" },
  { id: 35, text: "Thiết kế poster cho một sự kiện", type: "A" },
  { id: 36, text: "Vẽ phim hoạt hình", type: "A" },
  { id: 37, text: "Hát cho một ban nhạc", type: "A" },
  { id: 38, text: "Biểu diễn nhảy hiện đại", type: "A" },
  { id: 39, text: "Dẫn chương trình (MC) cho một sự kiện", type: "A" },
  { id: 40, text: "Viết kịch bản cho phim hoặc chương trình truyền hình", type: "A" },

  // Enterprising (E) - Nhóm Quản lý - 10 câu hỏi
  { id: 41, text: "Làm cán bộ lớp", type: "E" },
  { id: 42, text: "Tham gia một khóa học về quản lý tài chính", type: "E" },
  { id: 43, text: "Tham dự một trại huấn luyện kỹ năng lãnh đạo dành cho lứa tuổi thanh thiếu niên", type: "E" },
  { id: 44, text: "Lập kế hoạch làm việc cho thành viên nhóm", type: "E" },
  { id: 45, text: "Kiếm tiền bằng cách kinh doanh online", type: "E" },
  { id: 46, text: "Nói trước đám đông về một đề tài bạn thích", type: "E" },
  { id: 47, text: "Tham gia xây dựng các luật lệ mới cho lớp/trường", type: "E" },
  { id: 48, text: "Thuyết phục cha mẹ theo ý mình", type: "E" },
  { id: 49, text: "Tổ chức đi chơi cho một nhóm bạn", type: "E" },
  { id: 50, text: "Kiếm tiền bằng cách làm thêm", type: "E" },

  // Conventional (C) - Nhóm Nghiệp vụ - 10 câu hỏi
  { id: 51, text: "Lập kế hoạch chi tiêu hàng tháng", type: "C" },
  { id: 52, text: "Chuẩn bị ngân sách cho chuyến đi chơi tập thể lớp", type: "C" },
  { id: 53, text: "Lập kế hoạch cho kỳ nghỉ hè/Tết", type: "C" },
  { id: 54, text: "Đếm và sắp xếp tiền", type: "C" },
  { id: 55, text: "Sắp xếp lại bàn học, tủ quần áo, nhà cửa", type: "C" },
  { id: 56, text: "Viết kế hoạch học tập cho học kỳ mới", type: "C" },
  { id: 57, text: "Hoàn tất bài tập theo đúng hạn được giao", type: "C" },
  { id: 58, text: "Dò lỗi chính tả cho phụ đề của một phim yêu thích", type: "C" },
  { id: 59, text: "Làm thủ quỹ của lớp", type: "C" },
  { id: 60, text: "Giúp ba mẹ quản lí tiền chợ của gia đình (mua gì, khi nào, mua bao nhiêu)", type: "C" }
];

export const universityNames = [
  // Đại học Quốc gia TP.HCM
  "Đại học Quốc gia TP.HCM",
  "Đại học Bách khoa TP.HCM",
  "Đại học Công nghệ Thông tin TP.HCM",
  "Đại học Khoa học Tự nhiên TP.HCM",
  "Đại học Khoa học Xã hội và Nhân văn TP.HCM",
  "Đại học Kinh tế - Luật TP.HCM",
  "Đại học Quốc tế TP.HCM",
  "Đại học Khoa học Sức khỏe TP.HCM",
  "Khoa Y - ĐH Quốc gia TP.HCM",
  // Các trường Đại học công lập khác
  "Đại học An ninh nhân dân",
  "Đại học Cảnh sát nhân dân",
  "Đại học Công nghiệp TP.HCM",
  "Đại học Công Thương TP.HCM",
  "Đại học Giao thông Vận tải TP.HCM",
  "Phân hiệu Đại học Giao thông Vận tải tại TP.HCM",
  "Đại học Kiến trúc TP.HCM",
  "Đại học Kinh tế TP.HCM",
  "Đại học Lao động - Xã hội (Cơ sở 2)",
  "Đại học Luật TP.HCM",
  "Đại học Mở TP.HCM",
  "Đại học Mỹ thuật TP.HCM",
  "Đại học Ngân hàng TP.HCM",
  "Phân hiệu Đại học Ngoại thương tại TP.HCM",
  "Đại học Nông Lâm TP.HCM",
  "Đại học Sài Gòn",
  "Đại học Sân khấu – Điện ảnh TP.HCM",
  "Đại học Sư phạm Kỹ thuật TP.HCM",
  "Đại học Sư phạm TP.HCM",
  "Đại học Sư phạm Thể dục Thể thao TP.HCM",
  "Đại học Tài chính - Marketing TP.HCM",
  "Đại học Tài nguyên và Môi trường TP.HCM",
  "Đại học Thể dục Thể thao TP.HCM",
  "Phân hiệu Đại học Thủy lợi (Cơ sở 2)",
  "Đại học Tôn Đức Thắng",
  "Đại học Trần Đại Nghĩa",
  "Đại học Văn hóa TP.HCM",
  "Đại học Y Dược TP.HCM",
  "Đại học Y khoa Phạm Ngọc Thạch",
  "Đại học Dầu khí Việt Nam (cơ sở TP.HCM)",
  "Học viện Cán bộ TP.HCM",
  "Học viện Công nghệ Bưu chính Viễn thông (Cơ sở phía Nam)",
  "Học viện Hàng không Việt Nam",
  "Học viện Phật giáo Việt Nam tại TP.HCM",
  "Nhạc viện Thành phố Hồ Chí Minh",
  "Trường Dự bị Đại học TP.HCM",
  // Các trường Đại học tư thục/quốc tế
  "Đại học Công nghệ Sài Gòn",
  "Đại học Công nghệ TP.HCM",
  "Đại học FPT TP.HCM",
  "Đại học Gia Định",
  "Đại học Hoa Sen",
  "Đại học Hùng Vương TP.HCM",
  "Đại học Kinh tế - Tài chính TP.HCM",
  "Đại học Ngoại ngữ - Tin học TP.HCM",
  "Đại học Nguyễn Tất Thành",
  "Đại học Quản lý và Công nghệ TP.HCM",
  "Đại học Quốc tế Hồng Bàng",
  "Đại học Quốc tế Sài Gòn",
  "Đại học Văn Hiến",
  "Đại học Văn Lang",
  "Đại học Việt Đức",
  "Đại học RMIT Việt Nam (Cơ sở Nam Sài Gòn)",
  "Đại học Mỹ thuật Công nghiệp Á Châu (Cơ sở TP.HCM)",
  // Các trường Cao đẳng
  "Cao đẳng Sư phạm Trung ương TP.HCM",
  "Cao đẳng Bách khoa Nam Sài Gòn",
  "Cao đẳng Công nghệ Thủ Đức",
  "Cao đẳng Công Thương TP.HCM",
  "Cao đẳng Điện lực TP.HCM",
  "Cao đẳng Kinh tế - Công nghệ TP.HCM",
  "Cao đẳng Kinh tế Đối ngoại",
  "Cao đẳng Kinh tế - Kỹ thuật TP.HCM",
  "Cao đẳng Kinh tế Vinatex TP.HCM",
  "Cao đẳng Kinh tế TP.HCM",
  "Cao đẳng Kỹ thuật Cao Thắng",
  "Cao đẳng Lý Tự Trọng TP.HCM",
  "Cao đẳng Phát thanh Truyền hình II",
  "Cao đẳng Xây dựng TP.HCM",
  "Cao đẳng Công nghệ Thông tin TP.HCM",
  "Cao đẳng Y Dược Sài Gòn",
  "Cao đẳng Y Khoa Phạm Ngọc Thạch",
  "Cao đẳng Văn hóa Nghệ thuật TP.HCM",
  "Cao đẳng Quốc tế TP.HCM",
  "Cao đẳng Thủ Thiêm TP.HCM",
  "Cao đẳng Nghề TP.HCM",
  "Cao đẳng Tài chính Hải quan TP.HCM",
  "Cao đẳng Sài Gòn",
  "Cao đẳng Công nghệ TP.HCM",
  "Cao đẳng Quốc tế Kent"
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