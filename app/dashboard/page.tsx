"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  Calendar,
  Clock,
  UserPlus,
  ChevronRight,
  User,
  Dumbbell,
  MapPin,
  AlertCircle,
  WifiOff
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useOffline } from "@/components/offline-provider"
import { OfflineStatus } from "@/components/offline-status"
import { supabase } from "@/lib/supabase"
import { format, parseISO, startOfDay, endOfDay } from "date-fns"

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

// Define types for sessions
interface Session {
  id: string
  client_id: string
  start_time: string
  end_time: string
  status: string
  place: string
  clients?: {
    name: string
  }
}

// Define types for progress entries
interface ProgressEntry {
  id: string
  client_id: string
  date: string
  weight: number | null
  body_fat: number | null
  notes: string | null
  client_name: string
  weight_change: number | null
  starting_weight: number | null
  current_weight: number | null
  progress_percentage: number
}

export default function DashboardPage() {
  const { user, userId } = useAuth()
  const { isOnline } = useOffline()
  const [todaySessions, setTodaySessions] = useState<Session[]>([])
  const [recentProgress, setRecentProgress] = useState<ProgressEntry[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [isLoadingProgress, setIsLoadingProgress] = useState(true)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [progressError, setProgressError] = useState<string | null>(null)

  // Fetch today's sessions
  useEffect(() => {
    const fetchTodaySessions = async () => {
      if (!userId) return

      setIsLoadingSessions(true)
      setSessionsError(null)

      try {
        const today = new Date()
        const startOfToday = startOfDay(today).toISOString()
        const endOfToday = endOfDay(today).toISOString()

        const { data, error } = await supabase
          .from('schedules')
          .select(`
            id,
            client_id,
            start_time,
            end_time,
            status,
            place,
            clients(name)
          `)
          .eq('trainer_id', userId)
          .gte('start_time', startOfToday)
          .lte('start_time', endOfToday)
          .order('start_time', { ascending: true })

        if (error) {
          console.error("Error fetching today's sessions:", error)
          setSessionsError("Failed to load today's sessions")
          return
        }

        setTodaySessions(data || [])
      } catch (error) {
        console.error("Error fetching today's sessions:", error)
        setSessionsError("An unexpected error occurred")
      } finally {
        setIsLoadingSessions(false)
      }
    }

    fetchTodaySessions()
  }, [userId])

  // Fetch recent progress entries
  useEffect(() => {
    const fetchRecentProgress = async () => {
      if (!userId) return

      setIsLoadingProgress(true)
      setProgressError(null)

      try {
        // Define client interface
        interface Client {
          id: string;
          name: string;
        }

        // First, get all clients
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('id, name')
          .eq('trainer_id', userId)

        if (clientsError) {
          console.error("Error fetching clients:", clientsError)
          setProgressError("Failed to load client data")
          return
        }

        if (!clients || clients.length === 0) {
          setRecentProgress([])
          setIsLoadingProgress(false)
          return
        }

        // For each client, get their first and most recent progress entry
        const progressPromises = clients.map(async (client: Client) => {
          // Get the first entry (starting weight)
          const { data: firstEntry, error: firstEntryError } = await supabase
            .from('progress')
            .select('id, client_id, date, weight')
            .eq('client_id', client.id)
            .eq('trainer_id', userId)
            .order('date', { ascending: true })
            .limit(1)
            .maybeSingle()

          if (firstEntryError) {
            console.error(`Error fetching first progress entry for client ${client.id}:`, firstEntryError)
            return null
          }

          // Get the most recent entry
          const { data: latestEntry, error: latestEntryError } = await supabase
            .from('progress')
            .select('id, client_id, date, weight, body_fat, notes')
            .eq('client_id', client.id)
            .eq('trainer_id', userId)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (latestEntryError) {
            console.error(`Error fetching latest progress entry for client ${client.id}:`, latestEntryError)
            return null
          }

          // If we have both entries and weights, calculate the change
          if (firstEntry && latestEntry && firstEntry.weight && latestEntry.weight) {
            const startingWeight = firstEntry.weight
            const currentWeight = latestEntry.weight
            const weightChange = currentWeight - startingWeight

            // Calculate progress percentage (for the progress bar)
            // Use a simple calculation: how much of the goal has been achieved
            // Assuming a default goal of 10% weight loss or gain
            const targetChange = startingWeight * (weightChange < 0 ? -0.1 : 0.1)
            const progressPercentage = Math.min(100, Math.abs(weightChange / targetChange) * 100)

            return {
              ...latestEntry,
              client_name: client.name,
              weight_change: weightChange,
              starting_weight: startingWeight,
              current_weight: currentWeight,
              progress_percentage: progressPercentage
            }
          }

          // If we only have the latest entry with weight
          if (latestEntry && latestEntry.weight) {
            return {
              ...latestEntry,
              client_name: client.name,
              weight_change: null,
              starting_weight: latestEntry.weight,
              current_weight: latestEntry.weight,
              progress_percentage: 0
            }
          }

          return null
        })

        const progressResults = await Promise.all(progressPromises)
        const validProgress = progressResults.filter(Boolean) as ProgressEntry[]

        // Sort by most recent date
        validProgress.sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        })

        // Take the top 3
        setRecentProgress(validProgress.slice(0, 3))
      } catch (error) {
        console.error("Error fetching recent progress:", error)
        setProgressError("An unexpected error occurred")
      } finally {
        setIsLoadingProgress(false)
      }
    }

    fetchRecentProgress()
  }, [userId])

  // Format time from ISO string to readable format (e.g., "10:00 AM - 11:00 AM")
  const formatSessionTime = (startTime: string, endTime: string) => {
    return `${format(parseISO(startTime), "h:mm a")} - ${format(parseISO(endTime), "h:mm a")}`
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between px-4 md:px-6 z-10">
        <h1 className="text-lg font-bold font-heading">Dashboard</h1>
        <div className="flex items-center gap-4">
          <Avatar className="bg-primary text-primary-foreground">
            <AvatarFallback>
              {user?.email?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Offline Status Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 flex justify-end">
        <OfflineStatus />
      </div>

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
              {isLoadingSessions ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Loading sessions...</p>
                </div>
              ) : sessionsError ? (
                <div className="flex flex-col items-center justify-center py-8 text-destructive">
                  {!isOnline ? <WifiOff className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
                  <p className="mt-2">{sessionsError}</p>
                  {!isOnline && (
                    <p className="mt-2 text-sm text-muted-foreground text-center">
                      You are currently offline. Some data may not be available.
                    </p>
                  )}
                </div>
              ) : todaySessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">No sessions scheduled for today</p>
                  <Button
                    variant="default"
                    size="sm"
                    className="mt-4 bg-accent hover:bg-accent/90"
                    asChild
                  >
                    <Link href="/dashboard/schedule/new">
                      Schedule a session
                    </Link>
                  </Button>
                </div>
              ) : (
                todaySessions.map((session, index) => (
                  <div
                    key={session.id}
                    className={`flex items-start justify-between ${
                      index < todaySessions.length - 1 ? "border-b border-gray-200 dark:border-gray-700 pb-4" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 rounded-md p-2 mt-1">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{session.clients?.name || "Unnamed Client"}</h3>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          <span>{formatSessionTime(session.start_time, session.end_time)}</span>
                        </div>
                        {session.place && (
                          <div className="flex items-center text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3.5 w-3.5 mr-1" />
                            <span>{session.place}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="default" asChild>
                      <Link href={`/dashboard/schedule/${session.id}/edit`}>
                        Details
                      </Link>
                    </Button>
                  </div>
                ))
              )}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Button
                  className="h-auto py-6 bg-accent hover:bg-accent/90 flex flex-col items-center justify-center gap-2"
                  asChild
                >
                  <Link href="/dashboard/exercises">
                    <Dumbbell className="h-6 w-6" />
                    <span>Exercise Library</span>
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
              {isLoadingProgress ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Loading progress data...</p>
                </div>
              ) : progressError ? (
                <div className="flex flex-col items-center justify-center py-8 text-destructive">
                  {!isOnline ? <WifiOff className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
                  <p className="mt-2">{progressError}</p>
                  {!isOnline && (
                    <p className="mt-2 text-sm text-muted-foreground text-center">
                      You are currently offline. Some data may not be available.
                    </p>
                  )}
                </div>
              ) : recentProgress.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <User className="h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">No progress data available</p>
                  <Button
                    variant="default"
                    size="sm"
                    className="mt-4 bg-accent hover:bg-accent/90"
                    asChild
                  >
                    <Link href="/dashboard/clients">
                      Add client progress
                    </Link>
                  </Button>
                </div>
              ) : (
                recentProgress.map((progress) => (
                  <div key={progress.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Link href={`/dashboard/clients/${progress.client_id}/progress`} className="font-medium hover:underline">
                        {progress.client_name}
                      </Link>
                      {progress.weight_change !== null && (
                        <span className={`text-sm font-medium ${
                          progress.weight_change < 0 ? "text-secondary" :
                          progress.weight_change > 0 ? "text-accent" : "text-muted-foreground"
                        }`}>
                          {progress.weight_change > 0 ? "+" : ""}{progress.weight_change.toFixed(1)} lbs
                        </span>
                      )}
                    </div>
                    <Progress
                      value={progress.progress_percentage}
                      className={`h-2 ${
                        progress.weight_change && progress.weight_change < 0
                          ? "bg-secondary/20"
                          : "bg-accent/20"
                      }`}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      {progress.starting_weight && (
                        <span>Starting: {progress.starting_weight} lbs</span>
                      )}
                      {progress.current_weight && (
                        <span>Current: {progress.current_weight} lbs</span>
                      )}
                    </div>
                  </div>
                ))
              )}
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
