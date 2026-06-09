"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, isLoggedIn } from "@/lib/auth";

export function useRequireRole(role: "Admin" | "Manager" | "Instructor") {
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    const user = getUser();
    if (user?.role !== role) {
      router.replace("/home?error=unauthorized");
    }
  }, []);
}