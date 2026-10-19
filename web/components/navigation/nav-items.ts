import {
  CreditCard,
  Download,
  History,
  LogIn,
  MessageSquare,
  Settings,
  UserPlus,
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

export const sidebarNavItems: NavItem[] = [
  { href: "/", label: "AI Chat & Send", icon: MessageSquare },
  { href: "/virtual-card", label: "Ezri Virtual Card", icon: CreditCard },
  { href: "/claim", label: "Claim Transfer", icon: Download },
  { href: "/dashboard", label: "Transfers Ledger", icon: History },
  { href: "/purpose-lock", label: "Settings & Lock", icon: Settings },
  { href: "/login", label: "Sign in", icon: LogIn },
  { href: "/signup", label: "Sign up", icon: UserPlus },
];
