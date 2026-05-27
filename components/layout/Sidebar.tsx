"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layout, Server, Database, BookOpen, Download } from "lucide-react";

const items = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/frontend", label: "Front- end", icon: Layout },
  { href: "/backend", label: "Back- end", icon: Server },
  { href: "/database", label: "Database", icon: Database },
  { href: "/courses", label: "Khóa của tôi", icon: BookOpen },
  { href: "/downloads", label: "Nạp tiền", icon: Download },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="mb-4">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <svg viewBox="0 0 40 40" width="24" height="24">
            <path d="M20 4 L34 12 L34 28 L20 36 L6 28 L6 12 Z" fill="none" stroke="white" strokeWidth="3"/>
            <path d="M14 16 Q20 10 26 16 Q20 22 14 16Z" fill="white"/>
            <path d="M14 24 Q20 18 26 24 Q20 30 14 24Z" fill="rgba(255,255,255,0.6)"/>
          </svg>
        </div>
      </div>

      <div className="w-8 h-px bg-slate-100 mb-2" />

      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`sidebar-item ${pathname === href ? "active" : ""}`}
        >
          <Icon size={20} />
          <span>{label}</span>
        </Link>
      ))}
    </aside>
  );
}
