"use client"

import React from "react"
import { MobileNav } from "@/components/ui/mobile-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen">
      {children}
      <MobileNav />
    </div>
  )
}
