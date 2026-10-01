import {
  ApiEnvelope, PagedResult, AuthResult, LoginRequest, RegisterRequest,
  User, MeProfile, UpdateMeRequest, MyCourse, CourseProgress, Wallet, ProPackage,
  UsersQuery, CreateUserRequest, UpdateUserRequest,
  Course, CourseDetail, CoursesQuery, UpsertCourseRequest, CourseLessonItem,
  Lesson, CreateLessonRequest, UpdateLessonRequest, PageQuery,
  Enrollment, EnrollmentsQuery, LessonProgress, UpsertLessonProgressRequest, ProgressQuery,
  Transaction, TransactionsQuery, AdminTransactionsQuery, CheckoutRequest, CheckoutResult, RevenueStats,
  ChatRequest, ChatResult,
} from "./types";
import { getToken, getRefreshToken, storeAuthResult, clearAuth, saveUser } from "./auth";

// NEXT_PUBLIC_API_URL = origin của backend (vd https://overload-api.onrender.com), không kèm /api/v1.
export const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:53483").replace(/\/+$/, "");
export const API_BASE_URL = `${API_ORIGIN}/api/v1`;

// ─── Errors ──────────────────────────────────────────────────────────────────
export class ApiError extends Error {
  /** HTTP status (0 = không kết nối được server) */
  readonly status: number;
  /** `message` gốc từ envelope */
  readonly serverMessage: string;
  /** `errors` từ envelope, vd ["Email: Email không hợp lệ"] */
  readonly errors: string[];

  constructor(status: number, serverMessage: string, errors: string[] = []) {
    super(errors.length ? `${serverMessage} (${errors.join("; ")})` : serverMessage);
    this.name = "ApiError";
    this.status = status;
    this.serverMessage = serverMessage;
    this.errors = errors;
  }
}

export function isApiError(err: unknown, status?: number): err is ApiError {
  return err instanceof ApiError && (status === undefined || err.status === status);
}

// ─── Core fetch ──────────────────────────────────────────────────────────────
interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Không thử refresh khi 401 (login/register/refresh: 401 = sai thông tin) */
  skipRefresh?: boolean;
}

async function readEnvelope<T>(res: Response): Promise<ApiEnvelope<T> | null> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    return null;
  }
}

let refreshPromise: Promise<boolean> | null = null;

// Gọi refresh đúng một lần dù nhiều request cùng dính 401.
function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(false);
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        const env = await readEnvelope<AuthResult>(res);
        if (!res.ok || !env?.success || !env.data) return false;
        storeAuthResult(env.data);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

function redirectToLogin() {
  clearAuth();
  if (typeof window === "undefined") return;
  if (!["/login", "/register"].includes(window.location.pathname)) {
    window.location.href = "/login";
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipRefresh, headers, ...init } = options;

  const send = () => {
    const token = getToken();
    const h: Record<string, string> = { Accept: "application/json", ...(headers as Record<string, string>) };
    let payload: BodyInit | undefined;
    if (body instanceof FormData) {
      payload = body;
    } else if (body !== undefined) {
      payload = JSON.stringify(body);
      h["Content-Type"] = "application/json";
    }
    if (token) h.Authorization = `Bearer ${token}`;
    return fetch(`${API_BASE_URL}${path}`, { ...init, headers: h, body: payload });
  };

  let res: Response;
  try {
    const hadToken = !!getToken();
    res = await send();
    if (res.status === 401 && !skipRefresh && hadToken) {
      if (await refreshAccessToken()) {
        res = await send();
      } else {
        redirectToLogin();
      }
    }
  } catch {
    throw new ApiError(0, "Không thể kết nối tới máy chủ. Vui lòng thử lại.");
  }

  const env = await readEnvelope<T>(res);
  if (res.ok && env === null) return undefined as T; // 204 / body rỗng
  if (!res.ok || !env || !env.success) {
    throw new ApiError(res.status, env?.message || `HTTP ${res.status}`, env?.errors ?? []);
  }
  return env.data as T;
}

function buildQuery(params: object = {}): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return q ? `?${q}` : "";
}

const json = (method: string, body?: unknown): RequestOptions => ({ method, body });

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (body: LoginRequest) =>
    request<AuthResult>("/auth/login", { ...json("POST", body), skipRefresh: true }),

  register: (body: RegisterRequest) =>
    request<AuthResult>("/auth/register", { ...json("POST", body), skipRefresh: true }),

  refresh: (refreshToken: string) =>
    request<AuthResult>("/auth/refresh", { ...json("POST", { refreshToken }), skipRefresh: true }),

  logout: () =>
    request<void>("/auth/logout", { method: "POST", skipRefresh: true }),
};

/** Gọi POST /auth/logout (bỏ qua lỗi) rồi xóa token phía client. */
export async function logout() {
  try {
    if (getToken()) await authApi.logout();
  } catch {
    // token hết hạn / mạng lỗi — vẫn đăng xuất phía client
  }
  clearAuth();
}

// ─── Current user (/me) — userId luôn lấy từ token ───────────────────────────
export const meApi = {
  get: () => request<MeProfile>("/me"),

  update: (body: UpdateMeRequest) => request<User>("/me", json("PUT", body)),

  getCourses: () => request<MyCourse[]>("/me/courses"),

  getCourseProgress: (courseId: number) =>
    request<CourseProgress>(`/me/courses/${courseId}/progress`),

  getLessonProgress: (lessonId: number) =>
    request<LessonProgress>(`/me/lessons/${lessonId}/progress`),

  upsertLessonProgress: (lessonId: number, body: UpsertLessonProgressRequest) =>
    request<LessonProgress>(`/me/lessons/${lessonId}/progress`, json("PUT", body)),

  getWallet: () => request<Wallet>("/me/wallet"),

  purchasePro: (pkg: ProPackage) =>
    request<Wallet>("/me/wallet/purchase-pro", json("POST", { package: pkg })),

  getTransactions: (query: TransactionsQuery = {}) =>
    request<PagedResult<Transaction>>(`/me/transactions${buildQuery(query)}`),
};

/** Lấy lại /me và cập nhật user đã lưu (dùng sau khi thanh toán / mua PRO). */
export async function refreshCurrentUser(): Promise<MeProfile> {
  const me = await meApi.get();
  const { enrollments: _enrollments, ...user } = me;
  saveUser(user);
  return me;
}

// ─── Courses ─────────────────────────────────────────────────────────────────
export const coursesApi = {
  getAll: (query: CoursesQuery = {}) =>
    request<PagedResult<Course>>(`/courses${buildQuery(query)}`),

  getById: (id: number) => request<CourseDetail>(`/courses/${id}`),

  getBySlug: (slug: string) => request<CourseDetail>(`/courses/slug/${encodeURIComponent(slug)}`),

  getByCategory: (category: string, query: CoursesQuery = {}) =>
    request<PagedResult<Course>>(`/courses/category/${encodeURIComponent(category)}${buildQuery(query)}`),

  getLessons: (courseId: number) => request<CourseLessonItem[]>(`/courses/${courseId}/lessons`),

  /** Chỉ khóa miễn phí, hoặc mọi khóa nếu user có PRO. Khóa trả phí → 400; đã ghi danh → 409. */
  enroll: (courseId: number) => request<Enrollment>(`/courses/${courseId}/enroll`, { method: "POST" }),

  create: (body: UpsertCourseRequest) => request<Course>("/courses", json("POST", body)),

  update: (id: number, body: UpsertCourseRequest) => request<Course>(`/courses/${id}`, json("PUT", body)),

  delete: (id: number) => request<void>(`/courses/${id}`, { method: "DELETE" }),
};

// ─── Lessons ─────────────────────────────────────────────────────────────────
export const lessonsApi = {
  getAll: (query: PageQuery = {}) => request<PagedResult<Lesson>>(`/lessons${buildQuery(query)}`),

  /** Bài trả phí: chưa đăng nhập → 401, chưa ghi danh & không PRO → 403. */
  getById: (id: number) => request<Lesson>(`/lessons/${id}`),

  create: (body: CreateLessonRequest) => request<Lesson>("/lessons", json("POST", body)),

  update: (id: number, body: UpdateLessonRequest) => request<Lesson>(`/lessons/${id}`, json("PUT", body)),

  delete: (id: number) => request<void>(`/lessons/${id}`, { method: "DELETE" }),

  complete: (id: number) => request<LessonProgress>(`/lessons/${id}/complete`, { method: "POST" }),
};

// ─── Payment (PayOS) ─────────────────────────────────────────────────────────
export const paymentApi = {
  checkout: (body: CheckoutRequest) => request<CheckoutResult>("/payment/checkout", json("POST", body)),

  getOrder: (orderCode: number | string) =>
    request<Transaction>(`/payment/orders/${encodeURIComponent(String(orderCode))}`),
};

/**
 * Tạo link PayOS và chuyển trang. `fromPath` là trang sẽ quay lại sau khi
 * /payment/success|cancel kiểm tra xong đơn hàng.
 */
export async function startCheckout(body: CheckoutRequest, fromPath: string) {
  const origin = window.location.origin;
  const from = encodeURIComponent(fromPath);
  const res = await paymentApi.checkout({
    ...body,
    returnUrl: `${origin}/payment/success?from=${from}`,
    cancelUrl: `${origin}/payment/cancel?from=${from}`,
  });
  if (!res?.checkoutUrl) throw new Error("Không nhận được liên kết thanh toán từ cổng PayOS.");
  window.location.href = res.checkoutUrl;
}

// ─── Users (Admin) ───────────────────────────────────────────────────────────
export const usersApi = {
  getAll: (query: UsersQuery = {}) => request<PagedResult<User>>(`/users${buildQuery(query)}`),

  getById: (id: number) => request<User>(`/users/${id}`),

  create: (body: CreateUserRequest) => request<User>("/users", json("POST", body)),

  update: (id: number, body: UpdateUserRequest) => request<User>(`/users/${id}`, json("PUT", body)),

  delete: (id: number) => request<void>(`/users/${id}`, { method: "DELETE" }),

  lock: (id: number) => request<User>(`/users/${id}/lock`, { method: "POST" }),

  unlock: (id: number) => request<User>(`/users/${id}/unlock`, { method: "POST" }),

  // TODO(api-v1): chưa có API xác minh sinh viên — các route dưới đây không có trong đặc tả v1, giữ nguyên route cũ.
  uploadStudentCard: (formData: FormData) =>
    request<{ success: boolean; message: string; studentVerificationStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED"; studentCardPath: string }>("/users/me/student-verification", {
      method: "POST",
      body: formData,
    }),

  // TODO(api-v1): chưa có API (hasSeenStudentRejection)
  dismissRejection: () =>
    request<{ success: boolean; message: string }>("/users/me/dismiss-rejection", { method: "POST" }),

  // TODO(api-v1): chưa có API
  getPendingStudentVerifications: () =>
    request<Array<{ id: number; fullName: string; email: string; avatarUrl?: string; studentCardPath: string; updatedAt: string }>>("/users/student-verifications/pending"),

  // TODO(api-v1): chưa có API
  getApprovedStudentVerifications: () =>
    request<Array<{ id: number; fullName: string; email: string; avatarUrl?: string; studentCardPath: string; updatedAt: string }>>("/users/student-verifications/approved"),

  // TODO(api-v1): chưa có API
  verifyStudent: (userId: number, action: "approve" | "reject") =>
    request<{ success: boolean; message: string; studentVerificationStatus: "APPROVED" | "REJECTED" }>("/users/student-verification/verify", json("POST", { userId, action })),
};

// Một số endpoint danh sách có thể trả mảng hoặc PagedResult
function toList<T>(res: T[] | PagedResult<T> | null | undefined): T[] {
  if (!res) return [];
  return Array.isArray(res) ? res : res.items ?? [];
}

// ─── Instructor ──────────────────────────────────────────────────────────────
export const instructorApi = {
  /** Tất cả khóa của tôi (mọi status) */
  getCourses: async () =>
    toList(await request<Course[] | PagedResult<Course>>("/instructor/courses")),

  /** Gửi khóa Draft/Rejected lên Admin duyệt → PendingReview */
  submitCourse: (id: number) => request<Course>(`/instructor/courses/${id}/submit`, { method: "POST" }),
};

// ─── Admin ───────────────────────────────────────────────────────────────────
export const adminApi = {
  getTransactions: (query: AdminTransactionsQuery = {}) =>
    request<PagedResult<Transaction>>(`/admin/transactions${buildQuery(query)}`),

  getRevenueStats: () => request<RevenueStats>("/admin/revenue-stats"),

  /** Hàng đợi duyệt khóa học */
  getPendingCourses: async () =>
    toList(await request<Course[] | PagedResult<Course>>("/admin/courses/pending")),

  approveCourse: (id: number) => request<Course>(`/admin/courses/${id}/approve`, { method: "POST" }),

  rejectCourse: (id: number, reason: string) =>
    request<Course>(`/admin/courses/${id}/reject`, json("POST", { reason })),

  setCoursePrice: (id: number, price: number) =>
    request<Course>(`/admin/courses/${id}/price`, json("PUT", { price })),
};

// ─── Enrollments (Admin/Instructor đọc, Admin ghi) ───────────────────────────
export const enrollmentsApi = {
  getAll: (query: EnrollmentsQuery = {}) =>
    request<PagedResult<Enrollment>>(`/enrollments${buildQuery(query)}`),

  getById: (id: number) => request<Enrollment>(`/enrollments/${id}`),

  /** Admin cấp quyền không cần thanh toán */
  create: (userId: number, courseId: number) =>
    request<Enrollment>("/enrollments", json("POST", { userId, courseId })),

  delete: (id: number) => request<void>(`/enrollments/${id}`, { method: "DELETE" }),
};

// ─── Progress (Admin/Instructor, chỉ đọc) ────────────────────────────────────
export const progressApi = {
  getAll: (query: ProgressQuery = {}) =>
    request<PagedResult<LessonProgress>>(`/progress${buildQuery(query)}`),
};

// ─── Chat AI ─────────────────────────────────────────────────────────────────
export const chatApi = {
  /** AI lỗi → 503 */
  send: (body: ChatRequest) =>
    request<ChatResult>("/chat", json("POST", { ...body, recentHistory: body.recentHistory.slice(-6) })),
};
