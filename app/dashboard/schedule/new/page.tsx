"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format, parse, addHours } from "date-fns"
import { ArrowLeft, Calendar as CalendarIcon, Loader2 } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { ClientCombobox } from "@/components/ui/client-combobox"

// Define form schema with validation
const formSchema = z.object({
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
  recurrence_rule: z.string().optional(),
  num_occurrences: z.number().min(1).max(52).default(12),
});

interface Client {
  id: string
  name: string
}

// Component to handle search params
function SearchParamsHandler({
  onParamsReady
}: {
  onParamsReady: (startParam: string | null, endParam: string | null) => void
}) {
  const searchParams = useSearchParams()

  // Get start and end times from URL if available
  const startParam = searchParams.get("start")
  const endParam = searchParams.get("end")

  // Pass the params to the parent component
  useEffect(() => {
    onParamsReady(startParam, endParam)
  }, [startParam, endParam, onParamsReady])

  return null
}

export default function NewSchedulePage() {
  const { userId } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [startParam, setStartParam] = useState<string | null>(null)
  const [endParam, setEndParam] = useState<string | null>(null)
  const [paramsLoaded, setParamsLoaded] = useState(false)

  // Handler for when search params are ready
  const handleParamsReady = (start: string | null, end: string | null) => {
    setStartParam(start)
    setEndParam(end)
    setParamsLoaded(true)
  }

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    // @ts-expect-error - Resolver type mismatch with react-hook-form
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: "",
      date: new Date(),
      start_time: format(new Date().setMinutes(0), "HH:mm"),
      end_time: format(addHours(new Date().setMinutes(0), 1), "HH:mm"),
      status: "confirmed",
      place: "",
      recurring: false,
      recurrence_rule: "weekly",
      num_occurrences: 12,
    },
    mode: "onSubmit", // Validate on submit
    reValidateMode: "onChange", // Re-validate when fields change after submission
  })

  // Update form values when search params are loaded
  useEffect(() => {
    if (paramsLoaded) {
      form.reset({
        ...form.getValues(),
        date: startParam ? new Date(startParam) : new Date(),
        start_time: startParam
          ? format(new Date(startParam), "HH:mm")
          : format(new Date().setMinutes(0), "HH:mm"),
        end_time: endParam
          ? format(new Date(endParam), "HH:mm")
          : format(addHours(new Date().setMinutes(0), 1), "HH:mm"),
      })
    }
  }, [paramsLoaded, startParam, endParam, form])

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

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userId) {
      toast.error("You must be logged in to create a schedule")
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
          p_exclude_id: null
        });

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
          console.log("All conflicts were with cancelled sessions, proceeding with booking");
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

      // Insert new schedule
      const { data: newSchedule, error } = await supabase
        .from("schedules")
        .insert({
          trainer_id: userId,
          client_id: values.client_id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: values.status,
          place: values.place,
          recurring: values.recurring,
          recurrence_rule: values.recurring ? values.recurrence_rule : null,
          is_exception: false,
        })
        .select()

      // If this is a recurring event, generate instances
      if (!error && values.recurring && newSchedule && newSchedule.length > 0) {
        // Call the stored procedure to generate recurring instances
        const { error: recurrenceError } = await supabase.rpc(
          'generate_recurring_instances',
          {
            parent_id: newSchedule[0].id,
            num_instances: values.num_occurrences || 12
          }
        )

        if (recurrenceError) {
          console.error("Error generating recurring instances:", recurrenceError)
          // Continue anyway, as the main event was created successfully
        }
      }

      if (error) {
        console.error("Error creating schedule:", error)
        toast.error("Failed to create schedule")
        setIsSubmitting(false)
        return
      }

      toast.success("Schedule created successfully")
      router.push("/dashboard/schedule")
    } catch (error) {
      console.error("Error creating schedule:", error)
      toast.error("Failed to create schedule")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Suspense boundary for useSearchParams */}
      <Suspense fallback={<div>Loading...</div>}>
        <SearchParamsHandler onParamsReady={handleParamsReady} />
      </Suspense>

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between px-4 md:px-6 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/schedule">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-lg font-bold font-heading">New Training Session</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Form {...form}>
          {/* @ts-expect-error - Type mismatch between Zod schema and react-hook-form */}
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
                      isLoading={isLoadingClients}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        // Trigger validation after selection
                        form.trigger("client_id");
                      }}
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
                      <SelectItem value="tentative">Tentative</SelectItem>
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
                      This session will repeat at the same time
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("recurring") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  /* @ts-expect-error - Type mismatch between Zod schema and react-hook-form */
                  control={form.control}
                  name="recurrence_rule"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Frequency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="w-full">
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  /* @ts-expect-error - Type mismatch between Zod schema and react-hook-form */
                  control={form.control}
                  name="num_occurrences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Sessions</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={52}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value === '' ? 12 : parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
              <Button
                type="submit"
                disabled={isSubmitting}
                className="float-right"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Session
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  )
}