"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PaymentCancelPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const fromPath = params.get("from") || "/";
      
      try {
        const url = new URL(fromPath, window.location.origin);
        url.searchParams.set("payment", "cancel");
        router.replace(url.pathname + url.search);
      } catch (e) {
        router.replace(`/?payment=cancel`);
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#070d19] flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-rose-500" />
    </div>
  );
}
