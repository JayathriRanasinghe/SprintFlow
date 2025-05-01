"use client";

import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Rocket, CalendarDays, ListChecks, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AppSidebar() {
  const pathname = usePathname();

  const menuItems = [
    { href: "/", label: "Dashboard", icon: Rocket },
    { href: "/sprints", label: "Sprints", icon: CalendarDays },
    { href: "/tickets", label: "Tickets", icon: ListChecks },
    { href: "/demo", label: "Demo Prep", icon: ClipboardList },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="flex items-center justify-between p-4">
        <Link href="/" className="flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-primary">
            <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold text-lg text-foreground">SprintFlow</span>
        </Link>
        <SidebarTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" />
        </SidebarTrigger>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
                variant={pathname === item.href ? "outline" : "default"}
                className={cn(
                    "flex items-center justify-start gap-3",
                    pathname === item.href && "bg-accent text-accent-foreground"
                 )}
              >
                <Link href={item.href}>
                  <item.icon className="size-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
