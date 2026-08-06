import {
  Bot,
  BookOpen,
  Calendar,
  CalendarCheck,
  ChartBar,
  Code,
  CreditCard,
  Globe,
  LifeBuoy,
  Mail,
  Megaphone,
  MessageCircle,
  Nfc,
  Package,
  Send,
  Star,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { CapabilityId } from "./capabilities";

/**
 * Значки возможностей — часть отрисовки, а не данных.
 *
 * Живут отдельно от каталога, потому что каталог участвует в логике графа, а логика не должна
 * тянуть за собой React: иначе её нельзя ни проверить обычным тестом, ни выполнить на сервере.
 */
export const CAPABILITY_ICON: Record<CapabilityId, LucideIcon> = {
  ai: Bot,
  website: Globe,
  crm: Users,
  whatsapp: MessageCircle,
  telegram: Send,
  analytics: ChartBar,
  payments: CreditCard,
  bookings: CalendarCheck,
  reviews: Star,
  automation: Workflow,
  calendar: Calendar,
  support: LifeBuoy,
  email: Mail,
  knowledge: BookOpen,
  nfc: Nfc,
  api: Code,
  inventory: Package,
  marketing: Megaphone,
};
