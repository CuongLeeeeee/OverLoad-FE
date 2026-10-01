# Vấn đề phía Backend (API v1)

Phát hiện khi kiểm thử frontend nhánh `TopUpAndInstructor` với API v1.

## Còn mở

| Mức | Vấn đề | Chi tiết |
|---|---|---|
| Trung bình | Lọc danh mục phân biệt hoa thường | `GET /courses/category/frontend` → `items: []`, chỉ `/Frontend` có dữ liệu. FE đã tự gửi đúng hoa thường, nhưng BE nên so sánh không phân biệt. |
| Thấp | Thông báo lỗi bằng tiếng Anh | Vd `POST /courses/{id}/enroll` → 400 "This is a paid course...". FE hiển thị nguyên văn `message`. |

## Cần BE xác nhận (FE đang tạm đoán)

- **Danh sách khóa cho Admin trên dashboard:** FE đang dùng `GET /courses?pageSize=100`. Nếu endpoint này chỉ trả khóa Published, Admin sẽ không thấy khóa Draft/Rejected của giảng viên ngoài hàng đợi duyệt. Có endpoint nào cho Admin xem mọi khóa / mọi status không?
- **Dạng response của `GET /instructor/courses` và `GET /admin/courses/pending`:** mảng hay `PagedResult`? FE chấp nhận cả hai.
- **Response của approve / reject / submit / price:** FE giả định trả về `Course` đã cập nhật.
- **Duyệt sinh viên qua `PUT /users/{id}`:** cần biết (1) endpoint lấy danh sách chờ duyệt, (2) tên field và giá trị (`studentVerificationStatus`: `"APPROVED"` hay `"Approved"`?), (3) có phải gửi kèm đủ `fullName`, `role`, `isVerified`... như `UpdateUserRequest` không. Hiện FE vẫn gọi route cũ (404) và chỉ cho Admin vào trang này.
- **Sửa bài học của khóa không ở Draft/Rejected:** BE có chặn `POST/PUT/DELETE /lessons` khi khóa đang PendingReview / Published không? FE hiện chỉ ẩn nút sửa khóa học, chưa chặn sửa bài học.
- **Định dạng `content` bài học:** dữ liệu seed là Markdown, trình soạn bài FE lưu HTML (mỗi bước trong `<section data-step>`). FE đọc được cả hai; cần thống nhất nếu BE/AI có xử lý `content`.

## Chưa có API

- Giới hạn số câu hỏi AI mỗi ngày.
- Bug report (tạo / xem / xử lý).
- Role Manager.

## Đã sửa phía BE

- `POST /chat` trả 500 → đã thêm `GEMINI_API_KEY`, lỗi AI giờ trả 503.
- Revenue stats không tính giao dịch qua ví → đã sửa.
- Slug tiếng Việt (`xa-c`) → `xoa-duoc`.
- Course thiếu `price` → đã có `price` + `PUT /admin/courses/{id}/price`.
- `/me/courses` trả khóa nháp → chỉ trả Published.
