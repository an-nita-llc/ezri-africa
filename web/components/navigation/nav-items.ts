import {
  Download,
  History,
  Lock,
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

/** Bottom nav — exactly 4 items, shown only when signed in. */
export const mobileNavItems: NavItem[] = [
  { href: "/", label: "AI Chat", icon: MessageSquare },
  { href: "/dashboard", label: "Ledger", icon: History },
  { href: "/claim", label: "Claim", icon: Download },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const sidebarNavItems: NavItem[] = [
  { href: "/", label: "AI Chat & Send", icon: MessageSquare },
  { href: "/dashboard", label: "Transfers Ledger", icon: History },
  { href: "/claim", label: "Claim Transfer", icon: Download },
  { href: "/settings", label: "App Settings", icon: Settings },
  { href: "/purpose-lock", label: "Purpose Lock Config", icon: Lock },
];

export const signedOutNavItems: NavItem[] = [
  { href: "/login", label: "Sign in", icon: LogIn },
  { href: "/signup", label: "Sign up", icon: UserPlus },
];
