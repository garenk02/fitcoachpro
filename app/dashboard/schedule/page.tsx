"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { format } from "date-fns" // Used in event formatting
import { Plus, Loader2, ChevronLeft } from "lucide-react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import listPlugin from "@fullcalendar/list"
import { EventSourceInput, DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core"

import { useOffline } from "@/components/offline-provider"
import { OfflineStatus } from "@/components/offline-status"
import { OfflineFallback } from "@/components/offline-fallback"
import { useOfflineData } from "@/hooks/use-offline-data"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { getAll as getAllItems, TABLES } from "@/lib/offline-storage"

import "./calendar.css"

// Define the database schedule type
interface ScheduleData {
  id: string
  client_id: string | null
  start_time: string
  end_time: string
  status: string
  place: string
  recurring: boolean
  series_id?: string
  is_exception?: boolean
  is_group_session?: boolean
  max_participants?: number
  clients?: {
    name: string
  }
}

// Define the schedule event type for FullCalendar
// This interface is used for type safety in the events array passed to FullCalendar
type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  extendedProps: {
    client_id: string | null
    client_name: string
    status: string
    place: string
    recurring?: boolean
    series_id?: string
    is_exception?: boolean
    is_group_session?: boolean
    max_participants?: number
    participant_count?: number
  }
  backgroundColor?: string
  borderColor?: string
  classNames?: string[]
}

export default function SchedulePage() {
  // userId is used indirectly through useOfflineData hooks
  const { isOnline } = useOffline()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [calendarView, setCalendarView] = useState('timeGridDay')
  const calendarRef = useRef<FullCalendar | null>(null)

  // Use offline data hook for schedules
  const {
    data: schedules,
    isLoading,
    // Omit error from destructuring
    updateItem: updateSchedule
  } = useOfflineData<ScheduleData>({
    table: 'schedules',
    select: `
      id,
      client_id,
      start_time,
      end_time,
      status,
      place,
      recurring,
      series_id,
      is_exception,
      is_group_session,
      max_participants,
      clients(name)
    `,
    orderColumn: 'start_time'
  })

  // Detect mobile devices
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
      // Set default view based on screen size
      setCalendarView(window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek')
    }

    // Check on initial load
    checkIfMobile()

    // Add resize listener
    window.addEventListener('resize', checkIfMobile)

    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  // Transform schedules data for FullCalendar
  // Get participant counts for group sessions
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({})

  // Fetch participant counts for group sessions
  useEffect(() => {
    const fetchParticipantCounts = async () => {
      if (!schedules) return

      // Filter group sessions
      const groupSessions = schedules.filter(s => s.is_group_session)
      if (groupSessions.length === 0) return

      // Get participant counts for each group session
      const counts: Record<string, number> = {}

      if (isOnline) {
        // Online: fetch from Supabase
        for (const session of groupSessions) {
          try {
            // Use the get_schedule_participants function to get participants
            const { data, error } = await supabase.rpc(
              'get_schedule_participants',
              { p_schedule_id: session.id }
            );

            if (!error && data) {
              counts[session.id] = data.length;
            } else {
              // Fallback to direct query if RPC fails
              const { data: fallbackData, error: fallbackError } = await supabase
                .from('schedule_participants')
                .select('id')
                .eq('schedule_id', session.id);

              if (!fallbackError && fallbackData) {
                counts[session.id] = fallbackData.length;
              }
            }
          } catch (error) {
            console.error(`Error fetching participants for session ${session.id}:`, error);
          }
        }
      } else {
        // Offline: fetch from IndexedDB
        try {
          const allParticipants = await getAllItems(TABLES.SCHEDULE_PARTICIPANTS);

          // Group participants by schedule_id
          for (const participant of allParticipants) {
            const scheduleId = participant.schedule_id as string;
            if (scheduleId) {
              counts[scheduleId] = (counts[scheduleId] || 0) + 1;
            }
          }
        } catch (error) {
          console.error('Error fetching participants from IndexedDB:', error);
        }
      }

      setParticipantCounts(counts);
    };

    fetchParticipantCounts();
  }, [schedules, isOnline]);

  const events: CalendarEvent[] = useMemo(() => {
    if (!schedules) return []

    return schedules.map((schedule: ScheduleData) => {
      // Set color based on status and session type
      let backgroundColor = "#3b82f6" // blue for default
      const classNames: string[] = []

      if (schedule.status === "completed") {
        backgroundColor = "#10b981" // green
      } else if (schedule.status === "cancelled") {
        backgroundColor = "#ef4444" // red
      } else if (schedule.status === "pending") {
        backgroundColor = "#f59e0b" // amber
      } else if (schedule.is_group_session) {
        backgroundColor = "#8b5cf6" // purple for group sessions
        classNames.push('group-session')
      }

      // Create title based on session type
      let title = ""
      if (schedule.is_group_session) {
        const count = participantCounts[schedule.id] || 0
        const max = schedule.max_participants || 0
        title = `Group Session (${count}/${max})`
        if (schedule.place) {
          title += ` - ${schedule.place}`
        }
        if (schedule.recurring) {
          title += " 🔄"
        }
      } else {
        const clientName = schedule.clients?.name || "Unnamed Client"
        title = schedule.recurring
          ? `${clientName} 🔄` // Add recurring emoji indicator
          : clientName
        if (schedule.place) {
          title += ` - ${schedule.place}`
        }
      }

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
          is_exception: schedule.is_exception,
          is_group_session: schedule.is_group_session,
          max_participants: schedule.max_participants,
          participant_count: participantCounts[schedule.id] || 0
        },
        backgroundColor,
        borderColor: backgroundColor,
        classNames
      }
    })
  }, [schedules, participantCounts])

  // Handle event click
  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventId = clickInfo.event.id
    router.push(`/dashboard/schedule/${eventId}`)
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
      // Update schedule using the offline data hook
      const success = await updateSchedule(eventId, {
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString()
      })

      if (!success) {
        throw new Error("Failed to update schedule")
      }

      toast.success(`Session rescheduled successfully${!isOnline ? ' (will sync when online)' : ''}`)
    } catch (error) {
      console.error("Error updating schedule:", error)
      toast.error("Failed to reschedule session")
      dropInfo.revert()
    }
  }

  // Handle view change
  const handleViewChange = (view: string) => {
    setCalendarView(view)
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(view)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between pr-4 md:px-6 z-10">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ChevronLeft className="h-5 w-5" />
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

      {/* Offline Status Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 flex justify-end">
        <OfflineStatus />
      </div>

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
            ) : !isOnline && (!schedules || schedules.length === 0) ? (
              <div className="py-4">
                <OfflineFallback
                  title="No offline schedule data"
                  description="Your schedule data is not available offline."
                  onRetry={() => window.location.reload()}
                />
              </div>
            ) : (
              <div className="calendar-container">
                <div className="md:hidden mb-4">
                  <div className="flex justify-center gap-2 bg-muted p-2 rounded-md">
                    <Button
                      size="sm"
                      variant={calendarView === 'timeGridDay' ? 'default' : 'secondary'}
                      onClick={() => handleViewChange('timeGridDay')}
                      className={calendarView === 'timeGridDay' ? 'shadow-md' : ''}
                    >
                      Day
                    </Button>
                    <Button
                      size="sm"
                      variant={calendarView === 'timeGridWeek' ? 'default' : 'secondary'}
                      onClick={() => handleViewChange('timeGridWeek')}
                      className={calendarView === 'timeGridWeek' ? 'shadow-md' : ''}
                    >
                      Week
                    </Button>
                    <Button
                      size="sm"
                      variant={calendarView === 'dayGridMonth' ? 'default' : 'secondary'}
                      onClick={() => handleViewChange('dayGridMonth')}
                      className={calendarView === 'dayGridMonth' ? 'shadow-md' : ''}
                    >
                      Month
                    </Button>
                    <Button
                      size="sm"
                      variant={calendarView === 'listWeek' ? 'default' : 'secondary'}
                      onClick={() => handleViewChange('listWeek')}
                      className={calendarView === 'listWeek' ? 'shadow-md' : ''}
                    >
                      List
                    </Button>
                  </div>
                </div>
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                  initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
                  headerToolbar={{
                    left: isMobile ? 'prev,next' : 'prev,next today',
                    center: 'title',
                    right: isMobile ? 'today' : 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
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
                  aspectRatio={isMobile ? 0.8 : 1.8}
                  expandRows={true}
                  stickyHeaderDates={true}
                  allDaySlot={false}
                  slotMinTime="06:00:00"
                  slotMaxTime="22:00:00"
                  eventTimeFormat={{
                    hour: 'numeric',
                    minute: '2-digit',
                    meridiem: 'short'
                  }}
                  moreLinkText="+ more"
                  navLinks={true}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
