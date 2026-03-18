"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Swords } from "lucide-react";

const links = [
  { href: "/setup", label: "New Debate" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6">
        <Link href="/setup" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Swords className="h-4 w-4 text-primary" />
          AI Debate
        </Link>
        <nav className="flex items-center gap-0.5">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded px-3 py-1.5 text-sm transition-colors",
                pathname.startsWith(href)
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
