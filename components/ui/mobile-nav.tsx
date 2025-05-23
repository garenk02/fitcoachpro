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
  Receipt,
  Weight,
  Settings
} from "lucide-react"

import { cn } from "@/lib/utils"

interface MobileNavProps {
  className?: string
}

export function MobileNav({ className }: MobileNavProps) {
  const pathname = usePathname()
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const [showScrollIndicator, setShowScrollIndicator] = React.useState(true)

  // Handle touch/scroll events to stop animation
  const handleInteraction = React.useCallback(() => {
    setShowScrollIndicator(false)
  }, [])

  // Define root paths where mobile nav should be shown
  const rootPaths = [
    "/dashboard",
    "/dashboard/clients",
    "/dashboard/schedule",
    "/dashboard/exercises",
    "/dashboard/workouts",
    "/dashboard/pricing-packages",
    "/dashboard/invoices",
    "/settings"
  ]

  // Check if current path is a root path where nav should be shown
  const shouldShowNav = rootPaths.includes(pathname)

  // Scroll to active item on mount and when pathname changes
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      const activeItem = scrollContainerRef.current.querySelector('[data-active="true"]')
      if (activeItem) {
        const containerWidth = scrollContainerRef.current.offsetWidth
        const itemLeft = (activeItem as HTMLElement).offsetLeft
        const itemWidth = (activeItem as HTMLElement).offsetWidth

        // Center the active item
        scrollContainerRef.current.scrollLeft = itemLeft - (containerWidth / 2) + (itemWidth / 2)
      }

      // Add event listeners to stop animation on interaction
      const scrollContainer = scrollContainerRef.current
      scrollContainer.addEventListener('touchstart', handleInteraction, { passive: true })
      scrollContainer.addEventListener('scroll', handleInteraction, { passive: true })

      return () => {
        scrollContainer.removeEventListener('touchstart', handleInteraction)
        scrollContainer.removeEventListener('scroll', handleInteraction)
      }
    }

    // Hide scroll indicator after 3 seconds
    const timer = setTimeout(() => {
      setShowScrollIndicator(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [pathname, handleInteraction])

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
      name: "Exercises",
      href: "/dashboard/exercises",
      icon: Weight,
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
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ]

  // Don't render the navigation if not on a root path
  if (!shouldShowNav) {
    return null
  }

  return (
    <nav className={cn("fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 h-20", className)}>
      {/* Container to center content on larger screens */}
      <div className="h-full tablet:max-w-3xl tablet:mx-auto desktop:max-w-4xl">
        <div className="relative h-full">
          {/* Left fade effect - only visible on mobile */}
          <div className="absolute left-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-r from-white dark:from-gray-900 to-transparent pointer-events-none tablet:hidden" />

          {/* Scrollable container - centered on tablet and desktop */}
          <div
            ref={scrollContainerRef}
            className={cn(
              "flex h-full items-center overflow-x-auto px-4 scrollbar-hide",
              "tablet:justify-center",
              showScrollIndicator && "scroll-indicator"
            )}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
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
                data-active={isActive}
                className={cn(
                  "flex flex-col items-center justify-center h-full min-w-[80px] px-3",
                  "tablet:min-w-[100px] tablet:px-4",
                  "desktop:min-w-[120px] desktop:px-5",
                  isActive
                    ? "text-primary dark:text-primary"
                    : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <div className="flex flex-col items-center">
                  <item.icon className="h-6 w-6 tablet:h-7 tablet:w-7" />
                  <span className="text-xs mt-1 whitespace-nowrap tablet:text-sm">{item.name}</span>
                </div>
              </Link>
            )
          })}
        </div>

          {/* Right fade effect - only visible on mobile */}
          <div className="absolute right-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none tablet:hidden" />
        </div>
      </div>
    </nav>
  )
}
