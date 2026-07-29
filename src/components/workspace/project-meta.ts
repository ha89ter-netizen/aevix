import { LineChart, Palette, Wallet, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import type { ProjectKind } from "@/lib/projects";

export const projectKindMeta: Record<ProjectKind, { label: string; icon: LucideIcon; href: Route }> = {
  "design-concept": { label: "Дизайн-концепт", icon: Palette, href: "/app/design-studio" },
  "business-analysis": { label: "Бизнес-анализ", icon: LineChart, href: "/app/business-analysis" },
  "pricing-estimate": { label: "Расчёт стоимости", icon: Wallet, href: "/app/pricing" },
};

export function formatProjectDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
