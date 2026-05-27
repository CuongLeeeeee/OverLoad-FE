// Simple auth state helpers (no external lib needed)
import { User } from "./types";

const USER_KEY = "st_user";

export function saveUser(user: User) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("token");
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem("token");
}
