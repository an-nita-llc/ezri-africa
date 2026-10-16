import {
  Download,
  History,
  Lock,
  LogIn,
  MessageSquare,
  UserPlus,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof MessageSquare;
};

export const mobileNavItems: NavItem[] = [
  { href: "/", label: "AI Chat", icon: MessageSquare },
  { href: "/claim", label: "Claim", icon: Download },
  { href: "/purpose-lock", label: "Lock Config", icon: Lock },
  { href: "/dashboard", label: "Ledger", icon: History },
  { href: "/login", label: "Sign in", icon: LogIn },
  { href: "/signup", label: "Sign up", icon: UserPlus },
];

export const sidebarNavItems: NavItem[] = [
  { href: "/", label: "AI Chat & Send", icon: MessageSquare },
  { href: "/claim", label: "Claim Transfer", icon: Download },
  { href: "/purpose-lock", label: "Purpose Lock Config", icon: Lock },
  { href: "/dashboard", label: "Transfers Ledger", icon: History },
  { href: "/login", label: "Sign in", icon: LogIn },
  { href: "/signup", label: "Sign up", icon: UserPlus },
];
