"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { primaryNavItems } from "./nav-config";

export function WorkspaceSidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <div
        className={cn("workspace-sidebar-backdrop", mobileOpen && "is-open")}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={cn("workspace-sidebar", mobileOpen && "is-open")} aria-label="Навигация Workspace">
        <div className="workspace-sidebar-head">
          <Link href="/app" className="workspace-brand" aria-label="AEVIX, дашборд" onClick={onClose}>
            <span className="workspace-brand-mark">AX</span>
            <span className="workspace-brand-name">AEVIX</span>
          </Link>
          <button type="button" className="workspace-sidebar-close" onClick={onClose} aria-label="Закрыть меню">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="workspace-nav" aria-label="Основные разделы">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("workspace-nav-item", active && "is-active")}
                aria-current={active ? "page" : undefined}
                title={item.label}
                onClick={onClose}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="workspace-nav-spacer" />

        <Link href="/" className="workspace-sidebar-exit" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
          На сайт AEVIX
        </Link>
      </aside>
    </>
  );
}
