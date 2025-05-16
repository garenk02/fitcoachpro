"use client"

import React from "react"
import Link from "next/link"
import {
  Calendar,
  Clock,
  UserPlus,
  ChevronRight,
  User
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { MobileNav } from "@/components/ui/mobile-nav"

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between px-4 md:px-6 z-10">
        <h1 className="text-lg font-bold font-heading">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Avatar className="bg-primary text-primary-foreground">
            <AvatarFallback>
              {user?.email?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="grid grid-cols-1 gap-6">
          {/* Today's Sessions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Sessions</CardTitle>
              <CardDescription>Your upcoming training sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Session 1 */}
              <div className="flex items-start justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-md p-2 mt-1">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">John Doe</h3>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      <span>10:00 AM - 11:00 AM</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="default">
                  Details
                </Button>
              </div>

              {/* Session 2 */}
              <div className="flex items-start justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-md p-2 mt-1">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Jane Smith</h3>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      <span>2:30 PM - 3:30 PM</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="default">
                  Details
                </Button>
              </div>

              {/* Session 3 */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-md p-2 mt-1">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Mike Johnson</h3>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      <span>5:00 PM - 6:00 PM</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="default">
                  Details
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm" className="ml-auto flex items-center gap-1" asChild>
                <Link href="/dashboard/schedule">
                  View all sessions
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks for trainers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  className="h-auto py-6 bg-accent hover:bg-accent/90 flex flex-col items-center justify-center gap-2"
                  asChild
                >
                  <Link href="/dashboard/clients/new">
                    <UserPlus className="h-6 w-6" />
                    <span>Add Client</span>
                  </Link>
                </Button>
                <Button
                  className="h-auto py-6 bg-accent hover:bg-accent/90 flex flex-col items-center justify-center gap-2"
                  asChild
                >
                  <Link href="/dashboard/schedule/new">
                    <Calendar className="h-6 w-6" />
                    <span>Schedule Session</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Progress</CardTitle>
              <CardDescription>Client weight updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client 1 Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">John Doe</span>
                  <span className="text-sm text-secondary font-medium">-5.2 lbs</span>
                </div>
                <Progress value={75} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Starting: 185 lbs</span>
                  <span>Current: 179.8 lbs</span>
                </div>
              </div>

              {/* Client 2 Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Jane Smith</span>
                  <span className="text-sm text-secondary font-medium">-3.8 lbs</span>
                </div>
                <Progress value={60} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Starting: 142 lbs</span>
                  <span>Current: 138.2 lbs</span>
                </div>
              </div>

              {/* Client 3 Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Mike Johnson</span>
                  <span className="text-sm text-secondary font-medium">+8.5 lbs</span>
                </div>
                <Progress value={85} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Starting: 165 lbs</span>
                  <span>Current: 173.5 lbs</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm" className="ml-auto flex items-center gap-1" asChild>
                <Link href="/dashboard/clients">
                  View all clients
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>

      {/* Bottom Navigation */}
      <MobileNav />
    </div>
  )
}
