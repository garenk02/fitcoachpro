"use client"

import React from "react"
import { MobileNav } from "@/components/ui/mobile-nav"
import { DebugOfflineData } from "@/components/debug-offline-data"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="relative min-h-screen">
      {children}
      <MobileNav />
      {isDev && <DebugOfflineData />}
    </div>
  )
}
