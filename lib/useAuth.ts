"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, isLoggedIn } from "@/lib/auth";

export function useRequireRole(role: "Admin" | "Manager" | "Instructor") {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Dùng setTimeout để đảm bảo localStorage đã được ghi xong sau khi navigate
    const timer = setTimeout(() => {
      if (!isLoggedIn()) {
        router.replace("/login");
        return;
      }

      const user = getUser();

      // Log để debug (có thể xóa sau khi fix)
      console.log("[useRequireRole] user from localStorage:", user);
      console.log("[useRequireRole] required role:", role);

      if (!user) {
        // Không tìm thấy user trong localStorage → về login
        router.replace("/login");
        return;
      }

      // So sánh case-insensitive để tránh lỗi "admin" vs "Admin"
      if (user.role?.toLowerCase() !== role.toLowerCase()) {
        console.warn(
          `[useRequireRole] Role mismatch: user.role="${user.role}" vs required="${role}"`
        );
        router.replace("/home?error=unauthorized");
        return;
      }

      setChecked(true);
    }, 0); // setTimeout(fn, 0) đủ để flush microtask queue của localStorage

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return checked;
}