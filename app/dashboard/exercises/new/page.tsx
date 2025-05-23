"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useOffline } from "@/components/offline-provider"
import { useOfflineData } from "@/hooks/use-offline-data"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

// Define form schema with validation
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().optional(),
  category: z.string().min(1, { message: "Please select a category" }),
})

// Exercise categories
const EXERCISE_CATEGORIES = [
  "Strength",
  "Cardio",
  "Flexibility",
  "Balance",
  "Core",
  "Functional",
  "HIIT",
  "Recovery",
  "Other"
]

export default function NewExercisePage() {
  const { userId } = useAuth()
  const router = useRouter()
  const { isOnline } = useOffline()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use offline data hook for creating exercises
  const { createItem: createExercise } = useOfflineData({
    table: 'exercises',
    select: '*',
    orderColumn: 'name'
  })

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
    },
  })

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userId) {
      setError("You must be logged in to add an exercise")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Create new exercise using the offline data hook
      const newExerciseId = await createExercise({
        trainer_id: userId,
        name: values.name,
        category: values.category,
        description: values.description || null,
      })

      if (!newExerciseId) {
        throw new Error("Failed to create exercise")
      }

      // Show success toast
      toast.success("Exercise added", {
        description: `${values.name} has been added to your exercise library.${!isOnline ? ' Will sync when online.' : ''}`,
        duration: 3000,
      })

      // Redirect to exercises list - don't set isSubmitting to false to maintain loading state
      router.push("/dashboard/exercises")
      return // Exit early to maintain loading state
    } catch (error) {
      console.error("Error adding exercise:", error)
      setError("An unexpected error occurred. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between px-1 md:px-6 z-10">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/exercises">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-lg font-bold font-heading">Add New Exercise</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md mb-6 text-sm">
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Bench Press" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Category*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a category"/>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        {EXERCISE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the exercise and how to perform it correctly"
                      className="min-h-32 no-resize"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Include details about proper form, equipment needed, and any variations.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save Exercise
                </>
              )}
            </Button>
          </form>
        </Form>
      </main>
    </div>
  )
}
