"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Calendar as CalendarIcon, Trash2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format, parse, addHours } from "date-fns"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

// Define types for schedule items
interface ScheduleItem {
  id: string;
  client_id: string;
  start_time: string;
  end_time: string;
  status: string;
  place?: string;
  recurring?: boolean;
  series_id?: string;
  is_exception?: boolean;
}

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ClientCombobox } from "@/components/ui/client-combobox"

// Define form schema with validation
const formSchema = z.object({
  id: z.string().optional(),
  client_id: z.string({
    required_error: "Please select a client",
  }).min(1, { message: "Please select a client" }),
  date: z.date({
    required_error: "Please select a date",
  }),
  start_time: z.string({
    required_error: "Please select a start time",
  }),
  end_time: z.string({
    required_error: "Please select an end time",
  }),
  status: z.string({
    required_error: "Please select a status",
  }).default("confirmed"),
  place: z.string({
    required_error: "Please enter a location",
  }).min(2, { message: "Place must be at least 2 characters" }),
  recurring: z.boolean().default(false),
  series_id: z.string().optional(),
  is_exception: z.boolean().default(false),
  update_all: z.boolean().default(false),
});

interface Client {
  id: string
  name: string
}

export default function EditSchedulePage() {
  const { userId } = useAuth()
  const router = useRouter()
  const params = useParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [sessionData, setSessionData] = useState<{
    id: string;
    client_id: string;
    start_time: string;
    end_time: string;
    status: string;
    place: string;
    recurring: boolean;
    series_id?: string;
    is_exception?: boolean;
  } | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteAllFuture, setDeleteAllFuture] = useState(false)

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    /* @ts-expect-error - Resolver type mismatch with react-hook-form */
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: "",
      date: new Date(),
      start_time: format(new Date().setMinutes(0), "HH:mm"),
      end_time: format(addHours(new Date().setMinutes(0), 1), "HH:mm"),
      status: "confirmed",
      place: "",
      recurring: false,
      series_id: "",
      is_exception: false,
      update_all: false,
    },
    mode: "onSubmit", // Validate on submit
    reValidateMode: "onChange", // Re-validate when fields change after submission
  })

  // Fetch session data based on ID
  useEffect(() => {
    const fetchSessionData = async () => {
      if (!userId || !params.id) return

      setIsLoadingClients(true)
      try {
        const { data: session, error: sessionError } = await supabase
          .from("schedules")
          .select("id, client_id, start_time, end_time, status, place, recurring, series_id, is_exception")
          .eq("id", params.id)
          .single()

        if (sessionError) {
          console.error("Error fetching session data:", sessionError)
          toast.error("Failed to load session data")
          return
        }

        setSessionData(session)
        form.reset({
          id: session.id,
          client_id: session.client_id,
          date: new Date(session.start_time), // Use start_time for date since there's no date column
          start_time: format(new Date(session.start_time), "HH:mm"),
          end_time: format(new Date(session.end_time), "HH:mm"),
          status: session.status,
          place: session.place,
          recurring: session.recurring,
          series_id: session.series_id || session.id,
          is_exception: session.is_exception || false,
          update_all: false,
        })
      } catch (error) {
        console.error("Error fetching session data:", error)
        toast.error("Failed to load session data")
      } finally {
        setIsLoadingClients(false)
      }
    }

    fetchSessionData()
  }, [userId, params.id, form])

  // Fetch clients from Supabase
  useEffect(() => {
    const fetchClients = async () => {
      if (!userId) return

      setIsLoadingClients(true)
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("id, name")
          .eq("trainer_id", userId)
          .order("name")

        if (error) {
          console.error("Error fetching clients:", error)
          toast.error("Failed to load clients")
          return
        }

        setClients(data || [])
      } catch (error) {
        console.error("Error fetching clients:", error)
        toast.error("Failed to load clients")
      } finally {
        setIsLoadingClients(false)
      }
    }

    fetchClients()
  }, [userId])

  // Handle session deletion
  const handleDeleteSession = async () => {
    if (!userId || !params.id) {
      toast.error("You must be logged in to delete a session")
      return
    }

    setIsDeleting(true)
    try {
      // Check if this is part of a recurring series
      if (sessionData && sessionData.recurring && sessionData.series_id) {
        // Ask if user wants to delete all future occurrences or just this one
        if (deleteAllFuture) {
          // Delete all future occurrences in the series
          const { error } = await supabase
            .from("schedules")
            .delete()
            .eq("series_id", sessionData?.series_id || "")
            .gte("start_time", new Date(sessionData?.start_time || "").toISOString())

          if (error) {
            console.error("Error deleting recurring sessions:", error)
            toast.error("Failed to delete recurring sessions")
            setIsDeleting(false)
            return
          }

          toast.success("All future recurring sessions deleted")
        } else {
          // Delete just this occurrence
          const { error } = await supabase
            .from("schedules")
            .delete()
            .eq("id", params.id)

          if (error) {
            console.error("Error deleting session:", error)
            toast.error("Failed to delete session")
            setIsDeleting(false)
            return
          }

          toast.success("Session deleted successfully")
        }
      } else {
        // Regular delete for non-recurring events
        const { error } = await supabase
          .from("schedules")
          .delete()
          .eq("id", params.id)

        if (error) {
          console.error("Error deleting session:", error)
          toast.error("Failed to delete session")
          setIsDeleting(false)
          return
        }

        toast.success("Session deleted successfully")
      }

      // Close dialog and redirect
      setIsDeleteDialogOpen(false)
      router.push("/dashboard/schedule")
    } catch (error) {
      console.error("Error deleting session:", error)
      toast.error("Failed to delete session")
      setIsDeleting(false)
    }
  }

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userId || !params.id) {
      toast.error("You must be logged in to edit a schedule")
      return
    }

    // Extra validation for client_id
    if (!values.client_id || values.client_id.trim() === "") {
      form.setError("client_id", {
        type: "manual",
        message: "Please select a client"
      });
      toast.error("Please select a client");
      return;
    }

    setIsSubmitting(true)
    try {
      // Combine date and time
      const startDateTime = parse(
        `${format(values.date, "yyyy-MM-dd")} ${values.start_time}`,
        "yyyy-MM-dd HH:mm",
        new Date()
      )

      const endDateTime = parse(
        `${format(values.date, "yyyy-MM-dd")} ${values.end_time}`,
        "yyyy-MM-dd HH:mm",
        new Date()
      )

      // Check if end time is after start time
      if (endDateTime <= startDateTime) {
        toast.error("End time must be after start time")
        setIsSubmitting(false)
        return
      }

      // Get conflicts using stored procedure
      const { data: conflictsData, error: conflictError } = await supabase
        .rpc('check_schedule_conflicts', {
          p_trainer_id: userId,
          p_start_time: startDateTime.toISOString(),
          p_end_time: endDateTime.toISOString(),
          p_exclude_id: params.id
        })

      // Initialize conflicts variable that we can modify
      let scheduleConflicts: ScheduleItem[] = [];

      // Check for conflicts
      if (conflictError) {
        console.error("Error checking conflicts with stored procedure:", conflictError);

        // Fallback to direct query if stored procedure fails
        console.log("Falling back to direct query for conflict detection");

        const { data: fallbackConflicts, error: fallbackError } = await supabase
          .from("schedules")
          .select("id, client_id, start_time, end_time")
          .eq("trainer_id", userId)
          .eq("status", "confirmed")
          .neq("id", params.id)
          .or(
            `start_time.gte.${startDateTime.toISOString()}.and.start_time.lt.${endDateTime.toISOString()},` +
            `end_time.gt.${startDateTime.toISOString()}.and.end_time.lte.${endDateTime.toISOString()},` +
            `start_time.lte.${startDateTime.toISOString()}.and.end_time.gte.${endDateTime.toISOString()}`
          );

        if (fallbackError) {
          console.error("Error with fallback conflict check:", fallbackError);
          toast.error("Failed to check scheduling conflicts");
          setIsSubmitting(false);
          return;
        }

        // Use the fallback conflicts instead
        scheduleConflicts = fallbackConflicts as ScheduleItem[];
        console.log("Fallback conflicts found:", scheduleConflicts);
      } else {
        // Use the conflicts from the stored procedure
        scheduleConflicts = conflictsData as ScheduleItem[] || [];
      }

      // Filter out cancelled sessions and get client names for conflicts
      if (scheduleConflicts && scheduleConflicts.length > 0) {
        // Filter out cancelled sessions
        scheduleConflicts = scheduleConflicts.filter((c: ScheduleItem) => c.status !== 'cancelled');

        if (scheduleConflicts.length === 0) {
          console.log("All conflicts were with cancelled sessions, proceeding with update");
        } else {
          // Fetch client names for the conflicts
          const clientIds = scheduleConflicts.map((c: ScheduleItem) => c.client_id).filter(Boolean);

          let clientNames: Record<string, string> = {};
          if (clientIds.length > 0) {
            const { data: clientData } = await supabase
              .from("clients")
              .select("id, name")
              .in("id", clientIds);

            if (clientData) {
              clientNames = clientData.reduce((acc: Record<string, string>, client: { id: string, name: string }) => {
                acc[client.id] = client.name;
                return acc;
              }, {});
            }
          }

          const conflictMessage = scheduleConflicts.map((c: ScheduleItem) => {
            const clientName = clientNames[c.client_id] || 'Unnamed client';
            return `${clientName}: ${format(new Date(c.start_time), "h:mm a")} - ${format(new Date(c.end_time), "h:mm a")}`;
          }).join(", ");

          toast.error(`Schedule conflicts with existing sessions: ${conflictMessage}`);
          setIsSubmitting(false);
          return;
        }
      }

      // Check if this is part of a recurring series and we need to update all instances
      if (values.recurring && values.series_id && values.update_all) {
        // Update all future instances in the series
        const { error: seriesError } = await supabase
          .from("schedules")
          .update({
            client_id: values.client_id,
            status: values.status,
            place: values.place,
          })
          .eq("series_id", values.series_id)
          .gte("start_time", startDateTime.toISOString())

        if (seriesError) {
          console.error("Error updating series:", seriesError)
          toast.error("Failed to update all recurring sessions")
          setIsSubmitting(false)
          return
        }

        toast.success("All future recurring sessions updated")
      } else {
        // If this is a recurring event but we're only updating this instance
        if (values.recurring && values.series_id && !values.is_exception && !values.update_all) {
          // Mark this as an exception
          const { error } = await supabase
            .from("schedules")
            .update({
              client_id: values.client_id,
              start_time: startDateTime.toISOString(),
              end_time: endDateTime.toISOString(),
              status: values.status,
              place: values.place,
              recurring: values.recurring,
              is_exception: true,
            })
            .eq("id", params.id)

          if (error) {
            console.error("Error updating schedule:", error)
            toast.error("Failed to update session")
            setIsSubmitting(false)
            return
          }
        } else {
          // Regular update for non-recurring or already exception events
          const { error } = await supabase
            .from("schedules")
            .update({
              client_id: values.client_id,
              start_time: startDateTime.toISOString(),
              end_time: endDateTime.toISOString(),
              status: values.status,
              place: values.place,
              recurring: values.recurring,
            })
            .eq("id", params.id)

          if (error) {
            console.error("Error updating schedule:", error)
            toast.error("Failed to update session")
            setIsSubmitting(false)
            return
          }
        }
      }

      toast.success("Session updated successfully")
      router.push("/dashboard/schedule")
    } catch (error) {
      console.error("Error updating schedule:", error)
      toast.error("Failed to update schedule")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between px-4 md:px-6 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/schedule">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-lg font-bold font-heading">Edit Training Session</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setIsDeleteDialogOpen(true)}
        >
          <Trash2 className="h-5 w-5" />
          <span className="sr-only">Delete</span>
        </Button>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Form {...form}>
          {/* @ts-expect-error Type mismatch between Zod schema and react-hook-form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Client Selection */}
            <FormField
              /* @ts-expect-error - Type mismatch between Zod schema and react-hook-form */
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Client</FormLabel>
                  <FormControl>
                    <ClientCombobox
                      clients={clients}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        // Trigger validation after selection
                        form.trigger("client_id");
                      }}
                      isLoading={isLoadingClients}
                      onAddClient={() => router.push("/dashboard/clients/new")}
                      className={cn(
                        "w-full",
                        form.formState.errors.client_id && "border-destructive"
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Selection */}
            <FormField
              /* @ts-expect-error - Type mismatch between Zod schema and react-hook-form */
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="secondary"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            <span>{format(field.value, "PPP")}</span>
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          // Close the popover after selection
                          document.body.click(); // This will close the popover
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                /* @ts-expect-error - Type mismatch between Zod schema and react-hook-form */
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                /* @ts-expect-error - Type mismatch between Zod schema and react-hook-form */
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Place */}
            <FormField
              /* @ts-expect-error - Type mismatch between Zod schema and react-hook-form */
              control={form.control}
              name="place"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Gym, Park, Client's home, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              /* @ts-expect-error - Type mismatch between Zod schema and react-hook-form */
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="w-full">
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurring */}
            <FormField
              /* @ts-expect-error - Type mismatch between Zod schema and react-hook-form */
              control={form.control}
              name="recurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Recurring Session</FormLabel>
                    <FormDescription>
                      This session will repeat weekly at the same time
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Update all future sessions - only shown for recurring events that are part of a series */}
            {form.watch("recurring") && form.watch("series_id") && (
              <FormField
                /* @ts-expect-error - Type mismatch between Zod schema and react-hook-form */
                control={form.control}
                name="update_all"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Update all future sessions</FormLabel>
                      <FormDescription>
                        Apply these changes to all future occurrences of this recurring session
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* Form Actions */}
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/dashboard/schedule")}
                className="float-left"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="float-right">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Session
              </Button>
            </div>
          </form>
        </Form>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) setDeleteAllFuture(false);
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              {sessionData?.recurring && sessionData?.series_id
                ? "This is a recurring session. Do you want to delete just this occurrence or all future occurrences?"
                : "Are you sure you want to delete this session? This action cannot be undone."
              }
            </DialogDescription>

            {/* Checkbox for recurring sessions */}
            {sessionData?.recurring && sessionData?.series_id && (
              <div className="mt-4">
                <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <Checkbox
                    checked={deleteAllFuture}
                    onCheckedChange={(checked) => setDeleteAllFuture(checked === true)}
                    id="delete-all-future"
                  />
                  <div className="space-y-1 leading-none">
                    <label
                      htmlFor="delete-all-future"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Delete all future occurrences
                    </label>
                    <span className="text-sm text-muted-foreground block">
                      This will delete all future sessions in this recurring series
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSession}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
