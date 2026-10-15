import {
  History,
  Home,
  LogIn,
  MessageSquare,
  UserPlus,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

export const mobileNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/#send", label: "Send", icon: MessageSquare },
  { href: "/#ledger", label: "Ledger", icon: History },
  { href: "/login", label: "Log in", icon: LogIn },
  { href: "/signup", label: "Sign up", icon: UserPlus },
];

export const sidebarNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/#send", label: "Send", icon: MessageSquare },
  { href: "/#ledger", label: "Ledger", icon: History },
  { href: "/login", label: "Log in", icon: LogIn },
  { href: "/signup", label: "Sign up", icon: UserPlus },
];
