// ===== BE Response envelope (API v1) =====
// Mọi response (kể cả lỗi) đều có dạng này. lib/api.ts tự bóc `data` / ném ApiError.
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: string[] | null;
}

// ===== Pagination =====
export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PageQuery {
  pageNumber?: number; // mặc định 1
  pageSize?: number;   // mặc định 10, tối đa 100
  sortBy?: string;     // tên field, thêm "-" phía trước để giảm dần (vd "-createdAt")
}

// ===== Enums =====
export type Role = "Student" | "Instructor" | "Admin";
export type CourseLevel = "Beginner" | "Intermediate" | "Advanced";
export type ProPackage = "Month" | "Year";
export type TransactionType = "CoursePurchase" | "ProUpgrade" | "Deposit";
export type PaymentMethod = "PayOS" | "Wallet";
export type TransactionStatus = "Pending" | "Success" | "Cancelled";

// ===== Auth =====
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  user: User;
}

// ===== User =====
export interface User {
  id: number;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: Role;
  isVerified: boolean;
  isLocked: boolean;
  isPro: boolean;
  proExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;

  // TODO(api-v1): chưa có API xác minh sinh viên — các field dưới đây BE v1 không còn trả về.
  studentVerificationStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  studentCardPath?: string;
  hasSeenStudentRejection?: boolean;
}

export interface MeEnrollment {
  courseId: number;
  courseTitle: string;
  courseSlug: string;
  progressPercentage: number;
  enrolledAt: string;
  completedAt: string | null;
  lastAccessedAt: string | null;
}

export type MeProfile = User & { enrollments: MeEnrollment[] };

export interface UpdateMeRequest {
  fullName: string;
  avatarUrl?: string;
  bio?: string;
}

export interface MyCourse {
  courseId: number;
  title: string;
  thumbnailUrl: string | null;
  category: string;
  level: CourseLevel;
  price: number;
  progressPercentage: number;
  completedLessons: number;
  totalLessons: number;
  enrolledAt: string;
  lastAccessedAt: string | null;
  completedAt: string | null;
  isCompleted: boolean;
}

export interface CourseProgress {
  courseId: number;
  courseTitle: string;
  progressPercentage: number;
  completedLessons: number;
  totalLessons: number;
  lastAccessedAt: string | null;
  isCompleted: boolean;
}

export interface Wallet {
  balance: number;
  isPro: boolean;
  proExpiresAt: string | null;
}

// Admin
export interface UsersQuery extends PageQuery {
  search?: string;
  role?: Role;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  role: Role;
}

export interface UpdateUserRequest {
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  isVerified: boolean;
  role: Role;
}

// ===== Course =====
// Trạng thái chỉ đổi qua workflow: Instructor gửi duyệt → Admin duyệt / từ chối
export type CourseStatus = "Draft" | "PendingReview" | "Published" | "Rejected";

export interface Course {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  category: string;
  level: CourseLevel;
  status: CourseStatus;
  isPublished: boolean; // = status === "Published"
  rejectionReason: string | null; // chỉ có khi Rejected
  instructorId: number;
  // VND, 0 = miễn phí (Admin đặt qua PUT /admin/courses/{id}/price).
  // Optional: API đang deploy chưa trả field này ở /courses/* → coi như chưa biết giá.
  price?: number | null;
  totalDurationMinutes: number;
  totalLessons: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseDetail extends Course {
  lessons: { id: number; title: string; durationMinutes: number; orderIndex: number; isFree: boolean }[];
  enrollmentCount: number;
}

export interface CoursesQuery extends PageQuery {
  search?: string;
  category?: string;
  level?: CourseLevel;
  isPublished?: boolean; // chỉ có tác dụng với Admin/Instructor
}

// Không có isPublished: trạng thái chỉ đổi qua workflow gửi duyệt
export interface UpsertCourseRequest {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  category?: string;
  level: CourseLevel;
}

export const COURSE_STATUS_LABEL: Record<CourseStatus, string> = {
  Draft: "Nháp",
  PendingReview: "Chờ duyệt",
  Published: "Đã xuất bản",
  Rejected: "Bị từ chối",
};

/** Instructor chỉ sửa / gửi duyệt được khóa Draft hoặc Rejected */
export function canEditCourse(course: Pick<Course, "status">): boolean {
  return course.status === "Draft" || course.status === "Rejected";
}

// Item của GET /courses/{id}/lessons (không có content)
export interface CourseLessonItem {
  id: number;
  title: string;
  durationMinutes: number;
  orderIndex: number;
  isFree: boolean;
  completed: boolean;
  watchPercentage: number;
  lastPositionSeconds: number;
  isLocked: boolean;
}

// ===== Lesson =====
export interface Lesson {
  id: number;
  courseId: number;
  courseTitle: string;
  title: string;
  description: string | null;
  content: string | null;
  durationMinutes: number;
  orderIndex: number;
  isFree: boolean;
  createdAt: string;
  updatedAt: string;
  // FE-only (BE không trả về)
  template?: string;
  language?: "javascript" | "html" | "css";
}

export interface CreateLessonRequest {
  courseId: number;
  title: string;
  description?: string;
  content?: string;
  durationMinutes: number;
  isFree: boolean;
}

export interface UpdateLessonRequest {
  title: string;
  description?: string;
  content?: string;
  durationMinutes: number;
  orderIndex: number;
  isFree: boolean;
}

// ===== Enrollment =====
// Đặc tả v1 không mô tả chi tiết Enrollment — giữ các field BE cũ đã trả về.
export interface Enrollment {
  id: number;
  userId: number;
  userFullName?: string;
  userEmail?: string;
  courseId: number;
  courseTitle?: string;
  courseSlug?: string;
  progressPercentage?: number;
  enrolledAt?: string;
  completedAt?: string | null;
  lastAccessedAt?: string | null;
}

export interface EnrollmentsQuery extends PageQuery {
  userId?: number;
  courseId?: number;
}

// ===== Progress =====
export interface LessonProgress {
  id: number;
  userId: number;
  userFullName: string;
  userEmail: string;
  lessonId: number;
  lessonTitle: string;
  courseId: number;
  courseTitle: string;
  lastScrollPercentage: number;
  unlockedCheckpointIndex: number;
  completed: boolean;
  completedAt: string | null;
  lastPositionSeconds: number;
  watchTimeSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertLessonProgressRequest {
  lastScrollPercentage: number; // 0-100
  unlockedCheckpointIndex: number;
  lastPositionSeconds: number;
  watchTimeSeconds: number;
  completed: boolean; // một chiều: gửi false không bỏ trạng thái hoàn thành
}

export interface ProgressQuery extends PageQuery {
  userId?: number;
  lessonId?: number;
  completed?: boolean;
}

// ===== Payment =====
export interface Transaction {
  transactionId: string;
  orderCode: number;
  userId: number;
  userFullName: string;
  type: TransactionType;
  method: PaymentMethod;
  status: TransactionStatus;
  courseId: number | null;
  courseTitle: string | null;
  proPackage: ProPackage | null;
  amount: number; // luôn dương
  currency: string;
  createdAt: string;
  paidAt: string | null;
}

export interface TransactionsQuery extends PageQuery {
  type?: TransactionType;
  status?: TransactionStatus;
}

export interface AdminTransactionsQuery extends TransactionsQuery {
  userId?: number;
}

type CheckoutUrls = { returnUrl?: string; cancelUrl?: string };
export type CheckoutRequest =
  | ({ type: "Course"; courseId: number } & CheckoutUrls)
  | ({ type: "Pro"; package: ProPackage } & CheckoutUrls)
  | ({ type: "Deposit"; amount: number } & CheckoutUrls);

export interface CheckoutResult {
  orderCode: number;
  amount: number;
  checkoutUrl: string;
}

export interface RevenueStats {
  totalRevenue: number;
  courseRevenue: number;
  proRevenue: number;
  depositRevenue: number;
  coursesSold: number;
  proUpgradesSold: number;
  outstandingWalletBalance: number;
  recentTransactions: Transaction[];
}

// ===== Chat =====
export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface ChatRequest {
  message: string;
  recentHistory: ChatMessage[]; // tối đa 6 item
}

export interface ChatResult {
  reply: string;
  isBlocked: boolean;
  blockReason: string | null;
  inputTokens: number;
  outputTokens: number;
}

// ===== UI helpers (FE-only, not from BE) =====
// Map BE level → UI display
export const LEVEL_LABEL: Record<CourseLevel, string> = {
  Beginner: "Cơ bản",
  Intermediate: "Trung cấp",
  Advanced: "Nâng cao",
};

/** BE có trả giá không (một số endpoint hiện chưa trả `price`) */
export function hasKnownPrice(price: number | null | undefined): price is number {
  return typeof price === "number" && Number.isFinite(price);
}

/**
 * "Miễn phí" hoặc "199.000đ" theo price thật của khóa học (không suy ra từ level).
 * Trả null khi không biết giá — KHÔNG hiển thị "Miễn phí" cho khóa chưa rõ giá.
 */
export function formatCoursePrice(price: number | null | undefined): string | null {
  if (!hasKnownPrice(price)) return null;
  return price > 0 ? `${price.toLocaleString("vi-VN")}đ` : "Miễn phí";
}

export const TRANSACTION_STATUS_LABEL: Record<TransactionStatus, string> = {
  Pending: "Đang chờ",
  Success: "Thành công",
  Cancelled: "Đã hủy",
};

export function describeTransaction(tx: Transaction): string {
  if (tx.type === "CoursePurchase") return tx.courseTitle ?? "Mua khóa học";
  if (tx.type === "ProUpgrade") {
    return tx.proPackage === "Year" ? "Nâng cấp PRO (1 năm)" : tx.proPackage === "Month" ? "Nâng cấp PRO (1 tháng)" : "Nâng cấp PRO";
  }
  return "Nạp tiền vào ví";
}

// Fallback colors per category for course cards
export const CATEGORY_COLORS: Record<string, string> = {
  "HTML": "from-orange-500 to-red-500",
  "CSS": "from-orange-500 to-red-500",
  "JavaScript": "from-yellow-400 to-orange-400",
  "ReactJS": "from-cyan-400 to-blue-500",
  "NodeJS": "from-green-500 to-emerald-600",
  "Sass": "from-pink-500 to-rose-600",
  "Programming": "from-blue-600 to-blue-800",
  "default": "from-blue-500 to-indigo-600",
};

export function getCourseColor(course: Pick<Course, "title" | "category">): string {
  for (const key of Object.keys(CATEGORY_COLORS)) {
    if (course.title.includes(key) || (course.category ?? "").includes(key)) {
      return CATEGORY_COLORS[key];
    }
  }
  return CATEGORY_COLORS["default"];
}
