"use client"

import React, { useMemo } from "react"
import Link from "next/link"
import {
  Calendar,
  Clock,
  UserPlus,
  ChevronRight,
  User,
  Users,
  Dumbbell,
  MapPin,
  AlertCircle,
  WifiOff,
  Settings,
  Weight
} from "lucide-react"

import { useOffline } from "@/components/offline-provider"
import { OfflineStatus } from "@/components/offline-status"
import { OfflineFallback } from "@/components/offline-fallback"
import { useOfflineData } from "@/hooks/use-offline-data"
import { useParticipantCount } from "@/hooks/use-participant-count"
import { format, parseISO, startOfDay, endOfDay } from "date-fns"

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


// Define types for sessions
interface Session {
  id: string
  client_id: string | null
  start_time: string
  end_time: string
  status: string
  place: string
  is_group_session: boolean
  max_participants?: number
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

// Format time from ISO string to readable format (e.g., "10:00 AM - 11:00 AM")
const formatSessionTime = (startTime: string, endTime: string) => {
  return `${format(parseISO(startTime), "h:mm a")} - ${format(parseISO(endTime), "h:mm a")}`
}

// Session Item Component
function SessionItem({ session, isLast }: { session: Session; isLast: boolean }) {
  // Always call the hook, but only use its values for group sessions
  const { count: participantCount, isLoading: isLoadingCount } = useParticipantCount({
    scheduleId: session.id
  });

  // For individual sessions, we don't need the participant count
  const displayCount = session.is_group_session ? participantCount : 0;
  const displayLoading = session.is_group_session ? isLoadingCount : false;

  return (
    <div
      className={`flex items-start justify-between ${
        !isLast ? "border-b border-gray-200 dark:border-gray-700 pb-4 mb-4" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 rounded-md p-2 mt-1">
          {session.is_group_session ? (
            <Users className="h-5 w-5 text-primary" />
          ) : (
            <User className="h-5 w-5 text-primary" />
          )}
        </div>
        <div>
          {session.is_group_session ? (
            <h3 className="font-medium flex items-center">
              <span>Group Session</span>
              {session.max_participants && (
                <span className="ml-2 text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
                  {displayLoading ? (
                    "Loading..."
                  ) : (
                    `${displayCount}/${session.max_participants}`
                  )}
                </span>
              )}
            </h3>
          ) : (
            <h3 className="font-medium">{session.clients?.name || "Unnamed Client"}</h3>
          )}
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
        <Link href={`/dashboard/schedule/${session.id}`}>
          Details
        </Link>
      </Button>
    </div>
  );
}

export default function DashboardPage() {
  const { isOnline } = useOffline()
  const today = useMemo(() => {
    const now = new Date()
    return {
      startOfToday: startOfDay(now).toISOString(),
      endOfToday: endOfDay(now).toISOString()
    }
  }, [])

  // Use offline data hook for schedules
  const {
    data: allSchedules,
    isLoading: isLoadingSessions,
    error: sessionsError
  } = useOfflineData<Session>({
    table: 'schedules',
    select: `
      id,
      client_id,
      start_time,
      end_time,
      status,
      place,
      is_group_session,
      max_participants,
      clients(name)
    `,
    orderColumn: 'start_time'
  })

  // Filter today's sessions client-side
  const todaySessions = useMemo(() => {
    if (!allSchedules) return []

    return allSchedules.filter(session => {
      const sessionStart = session.start_time
      return sessionStart >= today.startOfToday && sessionStart <= today.endOfToday
    })
  }, [allSchedules, today])

  // Use offline data hook for clients
  const {
    data: clients,
    isLoading: isLoadingClients
  } = useOfflineData<{ id: string; name: string }>({
    table: 'clients',
    select: 'id, name',
    orderColumn: 'name'
  })

  // Use offline data hook for progress entries
  const {
    data: progressEntries,
    isLoading: isLoadingProgressEntries,
    error: progressEntriesError
  } = useOfflineData<{
    id: string;
    client_id: string;
    date: string;
    weight: number | null;
    body_fat: number | null;
    notes: string | null;
  }>({
    table: 'progress',
    select: 'id, client_id, date, weight, body_fat, notes',
    orderColumn: 'date',
    orderDirection: 'desc'
  })

  // Process progress data
  const recentProgress = useMemo(() => {
    if (isLoadingClients || isLoadingProgressEntries || !clients || !progressEntries) {
      return []
    }

    // Create a map of client IDs to names for quick lookup
    const clientMap = new Map(clients.map(client => [client.id, client.name]))

    // Group progress entries by client
    const clientProgressMap = new Map<string, typeof progressEntries>()

    progressEntries.forEach(entry => {
      if (!clientProgressMap.has(entry.client_id)) {
        clientProgressMap.set(entry.client_id, [])
      }
      clientProgressMap.get(entry.client_id)?.push(entry)
    })

    // Process each client's progress
    const processedProgress: ProgressEntry[] = []

    clientProgressMap.forEach((entries, clientId) => {
      if (entries.length === 0) return

      // Sort entries by date (oldest first for first entry, newest first for latest)
      const sortedEntries = [...entries].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      const firstEntry = sortedEntries[0]
      const latestEntry = sortedEntries[sortedEntries.length - 1]

      if (firstEntry && latestEntry && firstEntry.weight && latestEntry.weight) {
        const startingWeight = firstEntry.weight
        const currentWeight = latestEntry.weight
        const weightChange = currentWeight - startingWeight

        // Calculate progress percentage
        const targetChange = startingWeight * (weightChange < 0 ? -0.1 : 0.1)
        const progressPercentage = Math.min(100, Math.abs(weightChange / targetChange) * 100)

        processedProgress.push({
          ...latestEntry,
          client_name: clientMap.get(clientId) || 'Unknown Client',
          weight_change: weightChange,
          starting_weight: startingWeight,
          current_weight: currentWeight,
          progress_percentage: progressPercentage
        })
      } else if (latestEntry && latestEntry.weight) {
        // If we only have one entry with weight
        processedProgress.push({
          ...latestEntry,
          client_name: clientMap.get(clientId) || 'Unknown Client',
          weight_change: null,
          starting_weight: latestEntry.weight,
          current_weight: latestEntry.weight,
          progress_percentage: 0
        })
      }
    })

    // Sort by most recent date and take top 3
    return processedProgress
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
  }, [clients, progressEntries, isLoadingClients, isLoadingProgressEntries])

  // Determine if we're loading progress data
  const isLoadingProgress = isLoadingClients || isLoadingProgressEntries

  // Determine if there's a progress error
  const progressError = progressEntriesError

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between px-4 md:px-6 z-10">
        <h1 className="text-lg font-bold font-heading">Dashboard</h1>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/settings">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Link>
          </Button>
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
              ) : !isOnline && (!allSchedules || allSchedules.length === 0) ? (
                <div className="py-2">
                  <OfflineFallback
                    title="No offline schedule data"
                    description="Your schedule data is not available offline."
                    onRetry={() => window.location.reload()}
                  />
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
                  <SessionItem
                    key={session.id}
                    session={session}
                    isLast={index === todaySessions.length - 1}
                  />
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
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
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
                  className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                  asChild
                >
                  <Link href="/dashboard/schedule/new">
                    <Calendar className="h-6 w-6" />
                    <span>Schedule Session</span>
                  </Link>
                </Button>
                <Button
                  className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                  asChild
                >
                  <Link href="/dashboard/exercises/new">
                    <Weight className="h-6 w-6" />
                    <span>Exercise Library</span>
                  </Link>
                </Button>
                <Button
                  className="h-auto py-6 bg-accent hover:bg-accent/90 flex flex-col items-center justify-center gap-2"
                  asChild
                >
                  <Link href="/dashboard/workouts/new">
                    <Dumbbell className="h-6 w-6" />
                    <span>Workouts Plan</span>
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
              ) : !isOnline && (!progressEntries || progressEntries.length === 0) ? (
                <div className="py-2">
                  <OfflineFallback
                    title="No offline progress data"
                    description="Your client progress data is not available offline."
                    onRetry={() => window.location.reload()}
                  />
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
                          {progress.weight_change > 0 ? "+" : ""}{progress.weight_change.toFixed(1)} kg
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
                        <span>Starting: {progress.starting_weight} kg</span>
                      )}
                      {progress.current_weight && (
                        <span>Current: {progress.current_weight} kg</span>
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
    </div>
  )
}
