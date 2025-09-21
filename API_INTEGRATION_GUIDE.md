# API Integration Guide

## Cách tích hợp API thật của bạn

### 1. Thay đổi API endpoints

Mở file `src/services/api.ts` và thay đổi các URL sau:

```typescript
// Thay đổi URL base và các endpoints
const API_BASE_URL = 'https://your-api-domain.com/api'; // Thay bằng domain API của bạn

const API_ENDPOINTS = {
  GET_QUESTIONS: `${API_BASE_URL}/holland-questions`, // GET - Lấy danh sách câu hỏi
  SUBMIT_RESULTS: `${API_BASE_URL}/holland-results`, // POST - Gửi kết quả
  GET_MAJORS: `${API_BASE_URL}/majors`, // GET - Lấy danh sách ngành học (tùy chọn)
};
```

### 2. Loại bỏ Mock data

Trong file `src/services/api.ts`, xóa phần Mock data và uncomment code API thật:

#### Cho function `getQuestions()`:
```typescript
// Xóa phần mock này:
// return new Promise(resolve => {
//   setTimeout(() => resolve(MOCK_QUESTIONS), 500);
// });

// Uncomment phần API thật:
const response = await fetch(API_ENDPOINTS.GET_QUESTIONS);
if (!response.ok) throw new Error('Failed to fetch questions');
return await response.json();
```

#### Cho function `submitResults()`:
```typescript
// Xóa phần mock này:
// return new Promise(resolve => {
//   setTimeout(() => resolve(MOCK_RESULT_RESPONSE), 1000);
// });

// Uncomment phần API thật:
const response = await fetch(API_ENDPOINTS.SUBMIT_RESULTS, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
if (!response.ok) throw new Error('Failed to submit results');
return await response.json();
```

## Format dữ liệu API

### 1. GET `/holland-questions` - Lấy câu hỏi

**Response format:**
```json
[
  {
    "id": 1,
    "text": "Sửa chữa máy móc, thiết bị điện",
    "type": "R"
  },
  {
    "id": 2,
    "text": "Làm việc với động vật", 
    "type": "R"
  }
]
```

**Holland types:** R, I, A, S, E, C

### 2. POST `/holland-results` - Gửi kết quả

**Request format:**
```json
{
  "personalInfo": {
    "name": "Nguyễn Văn A",
    "class": "12A1"
  },
  "answers": {
    "1": true,
    "2": false,
    "3": true
  },
  "selectedBlocks": ["A00", "A01"],
  "scores": [
    {
      "subject": "Toán",
      "currentScore": 7.5,
      "targetScore": 9.0
    }
  ],
  "hollandScores": {
    "R": 5,
    "I": 8,
    "A": 3,
    "S": 2,
    "E": 6,
    "C": 4
  }
}
```

**Response format:**
```json
{
  "success": true,
  "message": "Kết quả đã được lưu thành công",
  "recommendedMajors": [
    {
      "id": "CNTT",
      "name": "Công nghệ thông tin",
      "description": "Thiết kế, phát triển và quản lý các hệ thống công nghệ thông tin",
      "examBlocks": ["A00", "A01", "D01"],
      "hollandTypes": ["I", "C"]
    }
  ]
}
```

## Xử lý lỗi API

API service đã tích hợp sẵn error handling. Nếu API trả về lỗi:
- User sẽ thấy toast notification với thông báo lỗi
- Có button "Thử lại" để gọi lại API
- Loading states được hiển thị trong quá trình gọi API

## Thêm Authentication (nếu cần)

Nếu API yêu cầu authentication, thêm headers vào các API calls:

```typescript
const response = await fetch(API_ENDPOINTS.GET_QUESTIONS, {
  headers: {
    'Authorization': `Bearer ${your_token}`,
    'Content-Type': 'application/json',
  },
});
```

## Test API Integration

1. Thay đổi URLs trong `api.ts`
2. Xóa mock data, uncomment API code
3. Test trên browser để đảm bảo API hoạt động đúng
4. Kiểm tra Network tab trong DevTools để debug API calls

Chúc bạn tích hợp thành công! 🚀