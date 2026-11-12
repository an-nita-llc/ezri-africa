import {
  Activity,
  CreditCard,
  Download,
  History,
  LayoutDashboard,
  Lock,
  LogIn,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof MessageSquare;
};

export const mobileNavItems: NavItem[] = [
  { href: "/", label: "AI Chat", icon: MessageSquare },
  { href: "/virtual-card", label: "Card", icon: CreditCard },
  { href: "/claim", label: "Claim", icon: Download },
  { href: "/dashboard", label: "Ledger", icon: History },
  { href: "/purpose-lock", label: "Settings", icon: Settings },
];

export const adminMobileNavItems: NavItem[] = [
  { href: "/admin", label: "Admin", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/escrows", label: "Escrows", icon: Lock },
  { href: "/admin/virtual-cards", label: "Cards", icon: CreditCard },
  { href: "/admin/settings", label: "Config", icon: Settings },
];

export const sidebarNavItems: NavItem[] = [
  { href: "/", label: "AI Chat & Send", icon: MessageSquare },
  { href: "/virtual-card", label: "Ezri Virtual Card", icon: CreditCard },
  { href: "/claim", label: "Claim Transfer", icon: Download },
  { href: "/dashboard", label: "Transfers Ledger", icon: History },
  { href: "/purpose-lock", label: "Settings & Lock", icon: Settings },
  { href: "/login", label: "Sign in", icon: LogIn },
  { href: "/signup", label: "Sign up", icon: UserPlus },
];

export const adminSidebarNavItems: NavItem[] = [
  { href: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "User Accounts", icon: Users },
  { href: "/admin/escrows", label: "Escrow Control", icon: Lock },
  { href: "/admin/virtual-cards", label: "Virtual Cards Vault", icon: CreditCard },
  { href: "/admin/settings", label: "Platform Config", icon: Settings },
  { href: "/", label: "Switch to Sender App", icon: MessageSquare },
];
