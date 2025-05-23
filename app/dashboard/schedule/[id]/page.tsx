"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Loader2,
  Edit,
  ChevronLeft,
  MapPin,
  Clock,
  User,
  Users
} from "lucide-react"
import { format } from "date-fns"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScheduleParticipantsReadonly } from "@/components/schedule-participants-readonly"

interface ScheduleData {
  id: string
  client_id: string | null
  trainer_id: string
  start_time: string
  end_time: string
  status: string
  place: string
  recurring: boolean
  series_id?: string
  is_exception?: boolean
  is_group_session: boolean
  max_participants: number
  client?: {
    name: string
  }
}

export default function ScheduleDetailPage() {
  const { userId } = useAuth()
  const params = useParams()
  const [schedule, setSchedule] = useState<ScheduleData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch schedule data
  useEffect(() => {
    const fetchScheduleData = async () => {
      if (!userId || !params.id) return

      setIsLoading(true)
      try {
        const { data, error: fetchError } = await supabase
          .from("schedules")
          .select(`
            id,
            client_id,
            trainer_id,
            start_time,
            end_time,
            status,
            place,
            recurring,
            series_id,
            is_exception,
            is_group_session,
            max_participants,
            client:clients(name)
          `)
          .eq("id", params.id)
          .single()

        if (fetchError) {
          console.error("Error fetching schedule data:", fetchError)
          setError(fetchError.message)
          return
        }

        setSchedule(data)
      } catch (error) {
        console.error("Error fetching schedule data:", error)
        setError(error instanceof Error ? error.message : "Unknown error")
      } finally {
        setIsLoading(false)
      }
    }

    fetchScheduleData()
  }, [userId, params.id])

  // No need to fetch clients for read-only view

  // Format date and time for display
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, "EEEE, MMMM d, yyyy 'at' h:mm a")
  }

  // Format time only
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, "h:mm a")
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !schedule) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-bold mb-4">Error Loading Session</h1>
        <p className="text-muted-foreground mb-6">{error || "Session not found"}</p>
        <Button asChild>
          <Link href="/dashboard/schedule">Back to Schedule</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between pr-4 md:px-6 z-10">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/schedule">
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-lg font-bold font-heading">Session Details</h1>
        </div>
        <Button size="sm" variant="default" asChild>
          <Link href={`/dashboard/schedule/${params.id}/edit`} className="flex items-center gap-1">
            <Edit className="h-4 w-4" />
            Edit
          </Link>
        </Button>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {schedule.is_group_session ? (
                    <>
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span>Group Training Session</span>
                    </>
                  ) : (
                    <>
                      <User className="h-5 w-5 text-muted-foreground" />
                      <span>Individual Training Session</span>
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {formatDateTime(schedule.start_time)}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(schedule.status)}>
                {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!schedule.is_group_session && schedule.client && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Client</h3>
                <p className="text-lg font-medium">{schedule.client.name}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Time
                </h3>
                <p className="text-lg font-medium">
                  {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Location
                </h3>
                <p className="text-lg font-medium">{schedule.place}</p>
              </div>
            </div>

            {schedule.is_group_session && (
              <div className="pt-4">
                <Tabs defaultValue="participants" className="w-full">
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="participants">Participants</TabsTrigger>
                  </TabsList>
                  <TabsContent value="participants" className="pt-4">
                    <ScheduleParticipantsReadonly
                      scheduleId={schedule.id}
                      maxParticipants={schedule.max_participants}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
