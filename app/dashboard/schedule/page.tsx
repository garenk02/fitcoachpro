"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { format } from "date-fns" // Used in event formatting
import { Plus, ArrowLeft, Loader2 } from "lucide-react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import { EventSourceInput, DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core"

import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

import "./calendar.css"

// Define the database schedule type
interface ScheduleData {
  id: string
  client_id: string
  start_time: string
  end_time: string
  status: string
  place: string
  recurring: boolean
  series_id?: string
  is_exception?: boolean
  clients?: {
    name: string
  }
}

// Define the schedule event type for FullCalendar
interface ScheduleEvent {
  id: string
  title: string
  start: string
  end: string
  extendedProps: {
    client_id: string
    client_name: string
    status: string
    place: string
    recurring?: boolean
    series_id?: string
    is_exception?: boolean
  }
  backgroundColor?: string
  borderColor?: string
}

export default function SchedulePage() {
  const { userId } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const calendarRef = useRef<FullCalendar | null>(null)

  // Fetch schedules from Supabase
  useEffect(() => {
    const fetchSchedules = async () => {
      if (!userId) return

      setIsLoading(true)
      try {
        // Fetch schedules with client names
        const { data, error } = await supabase
          .from('schedules')
          .select(`
            id,
            client_id,
            start_time,
            end_time,
            status,
            place,
            recurring,
            series_id,
            is_exception,
            clients(name)
          `)
          .eq('trainer_id', userId)

        if (error) {
          console.error("Error fetching schedules:", error)
          toast.error("Failed to load schedules")
          return
        }

        // Transform data for FullCalendar
        const formattedEvents = data.map((schedule: ScheduleData) => {
          // Set color based on status
          let backgroundColor = "#3b82f6" // blue for default
          if (schedule.status === "completed") {
            backgroundColor = "#10b981" // green
          } else if (schedule.status === "cancelled") {
            backgroundColor = "#ef4444" // red
          } else if (schedule.status === "pending") {
            backgroundColor = "#f59e0b" // amber
          }

          // Create a title with recurring indicator if needed
          const clientName = schedule.clients?.name || "Unnamed Client"
          const title = schedule.recurring
            ? `${clientName} 🔄` // Add recurring emoji indicator
            : clientName

          return {
            id: schedule.id,
            title: title,
            start: schedule.start_time,
            end: schedule.end_time,
            extendedProps: {
              client_id: schedule.client_id,
              client_name: schedule.clients?.name || "Unnamed Client",
              status: schedule.status,
              place: schedule.place,
              recurring: schedule.recurring,
              series_id: schedule.series_id,
              is_exception: schedule.is_exception
            },
            backgroundColor,
            borderColor: backgroundColor
          }
        })

        setEvents(formattedEvents)
      } catch (error) {
        console.error("Error fetching schedules:", error)
        toast.error("Failed to load schedules")
      } finally {
        setIsLoading(false)
      }
    }

    fetchSchedules()
  }, [userId])

  // Handle event click
  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventId = clickInfo.event.id
    router.push(`/dashboard/schedule/${eventId}/edit`)
  }

  // Handle date select for creating new event
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    router.push(`/dashboard/schedule/new?start=${selectInfo.startStr}&end=${selectInfo.endStr}`)
  }

  // Handle event drag and drop
  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const eventId = dropInfo.event.id
    const newStart = dropInfo.event.start
    const newEnd = dropInfo.event.end

    if (!newStart || !newEnd) {
      toast.error("Invalid date range")
      dropInfo.revert()
      return
    }

    try {
      const { error } = await supabase
        .from('schedules')
        .update({
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString()
        })
        .eq('id', eventId)

      if (error) {
        console.error("Error updating schedule:", error)
        toast.error("Failed to reschedule session")
        dropInfo.revert()
        return
      }

      toast.success("Session rescheduled successfully")
    } catch (error) {
      console.error("Error updating schedule:", error)
      toast.error("Failed to reschedule session")
      dropInfo.revert()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between px-4 md:px-6 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-lg font-bold font-heading">Schedule</h1>
        </div>
        <Button size="sm" className="bg-accent" asChild>
          <Link href="/dashboard/schedule/new" className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            New Session
          </Link>
        </Button>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle>Training Schedule</CardTitle>
            <CardDescription>Manage your training sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="calendar-container">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="timeGridWeek"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                  }}
                  events={events as EventSourceInput}
                  selectable={true}
                  selectMirror={true}
                  dayMaxEvents={true}
                  weekends={true}
                  select={handleDateSelect}
                  eventClick={handleEventClick}
                  eventDrop={handleEventDrop}
                  editable={true}
                  droppable={true}
                  height="auto"
                  aspectRatio={1.8}
                  expandRows={true}
                  stickyHeaderDates={true}
                  allDaySlot={false}
                  slotMinTime="06:00:00"
                  slotMaxTime="22:00:00"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
