"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Calendar,
  Dumbbell,
  CreditCard,
  Receipt
} from "lucide-react"

import { cn } from "@/lib/utils"

interface MobileNavProps {
  className?: string
}

export function MobileNav({ className }: MobileNavProps) {
  const pathname = usePathname()

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Clients",
      href: "/dashboard/clients",
      icon: Users,
    },
    {
      name: "Schedule",
      href: "/dashboard/schedule",
      icon: Calendar,
    },
    {
      name: "Workouts",
      href: "/dashboard/workouts",
      icon: Dumbbell,
    },
    {
      name: "Pricing",
      href: "/dashboard/pricing-packages",
      icon: CreditCard,
    },
    {
      name: "Invoices",
      href: "/dashboard/invoices",
      icon: Receipt,
    },
  ]

  return (
    <nav className={cn("fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 h-20", className)}>
      <div className="flex h-full items-center justify-around">
        {navItems.map((item) => {
          // For dashboard, only highlight when exact match
          // For other items, highlight when path starts with the href
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center h-full w-full",
                isActive
                  ? "text-primary dark:text-primary"
                  : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              )}
            >
              <div className="flex flex-col items-center">
                <item.icon className="h-6 w-6" />
                <span className="text-xs mt-1">{item.name}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
