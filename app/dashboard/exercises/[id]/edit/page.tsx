"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import { use } from "react"

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

// Define exercise type
type Exercise = {
  id: string
  trainer_id: string
  name: string
  description: string | null
  category: string | null
  created_at: string
}

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

export default function EditExercisePage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params Promise using React.use()
  const unwrappedParams = use(params)
  const exerciseId = unwrappedParams.id

  const { userId } = useAuth()
  const router = useRouter()
  const { isOnline } = useOffline()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use offline data hook for exercises
  const {
    updateItem: updateExercise,
    data: exercises
  } = useOfflineData<Exercise>({
    table: 'exercises',
    select: '*',
    orderColumn: 'name'
  })

  // We'll directly use exercises.find() in the useEffect

  // Initialize form with empty values first
  // We'll reset it with actual values when exercise data is loaded
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
    },
    mode: "onChange", // Validate on change for better UX
  })

  // Fetch exercise data
  useEffect(() => {
    // Don't do anything if we don't have the user ID yet
    if (!userId) return;

    // Don't do anything if exercises data isn't loaded yet
    if (!exercises) {
      console.log("Waiting for exercises data to load...");
      return;
    }

    setIsLoading(true);

    try {
      // Find the exercise in the loaded data
      const exerciseData = exercises.find(ex => ex.id === exerciseId);

      if (!exerciseData) {
        console.error(`Exercise with ID ${exerciseId} not found in loaded data`);
        setError("Exercise not found");
        setIsLoading(false);
        return;
      }

      setError(null);

      // Prepare form values with proper defaults
      const formValues = {
        name: exerciseData.name,
        // Make sure category is never empty - default to "Other" if missing
        category: exerciseData.category || "Other",
        description: exerciseData.description || "",
      };

      // Reset form with the values
      form.reset(formValues);

      // Force update the category field specifically
      form.setValue("category", formValues.category);
    } catch (error) {
      console.error("Error fetching exercise:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [userId, exerciseId, exercises, form])

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userId) {
      setError("You must be logged in to update an exercise")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Update exercise using the offline data hook
      const success = await updateExercise(exerciseId, {
        name: values.name,
        category: values.category,
        description: values.description || null,
      })

      if (!success) {
        throw new Error("Failed to update exercise")
      }

      // Show success toast
      toast.success("Exercise updated", {
        description: `${values.name} has been updated.${!isOnline ? ' Will sync when online.' : ''}`,
        duration: 3000,
      })

      // Redirect to exercise list page
      router.push(`/dashboard/exercises`)
      return
    } catch (error) {
      console.error("Error updating exercise:", error)
      setError("An unexpected error occurred. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between px-1 md:px-6 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/exercises`}>
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-lg font-bold font-heading">Edit Exercise</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md mb-6 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading exercise data...</p>
          </div>
        ) : (
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
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a category" />
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

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}
      </main>
    </div>
  )
}
