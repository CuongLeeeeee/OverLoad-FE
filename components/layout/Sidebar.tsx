"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Layout, Server, Database, BookOpen, Wallet } from "lucide-react";

const categoryItems = [
  { value: "frontend", label: "Front-end", icon: Layout },
  { value: "backend", label: "Back-end", icon: Server },
  { value: "database", label: "Database", icon: Database },
];

const navItems = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/courses", label: "Khóa của tôi", icon: BookOpen },
  { href: "/deposit", label: "Nạp tiền", icon: Wallet },
];

type SidebarProps = {
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
  onHomeClick?: () => void;
};

export default function Sidebar({ activeCategory, onCategoryChange, onHomeClick }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleHomeClick = () => {
    onHomeClick?.();
    router.push("/");
  };

  const handleCategoryClick = (category: string) => {
    if (onCategoryChange) {
      onCategoryChange(category);
    } else {
      // If not on the homepage (like /deposit or /courses), redirect to "/" with "?category=..."
      router.push(`/?category=${category}`);
    }
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="mb-6">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <svg viewBox="0 0 40 40" width="24" height="24">
            <path d="M20 4 L34 12 L34 28 L20 36 L6 28 L6 12 Z" fill="none" stroke="white" strokeWidth="3"/>
            <path d="M14 16 Q20 10 26 16 Q20 22 14 16Z" fill="white"/>
            <path d="M14 24 Q20 18 26 24 Q20 30 14 24Z" fill="rgba(255,255,255,0.6)"/>
          </svg>
        </div>
      </div>

      {/* Global Navigation Section (Trang chủ, Khóa của tôi, Nạp tiền) */}
      <div className="space-y-2 mb-4">
        {navItems.map(({ href, label, icon: Icon }) =>
          href === "/" ? (
            <button
              key={href}
              type="button"
              onClick={handleHomeClick}
              className={`sidebar-item w-full justify-start ${pathname === href ? "active" : ""}`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ) : (
            <Link
              key={href}
              href={href}
              className={`sidebar-item ${pathname === href ? "active" : ""}`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          )
        )}
      </div>

      <div className="w-8 h-px bg-slate-200 mb-4 mx-auto" />

      {/* Category Filter Section (Front-end, Back-end, Database) */}
      <div className="space-y-2">
        {categoryItems.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => handleCategoryClick(item.value)}
            className={`sidebar-item w-full justify-start ${
              activeCategory === item.value ? "active" : ""
            }`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
