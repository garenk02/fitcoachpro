"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Plus, X, Dumbbell, Save, Search, ChevronLeft } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { use } from "react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MobileNav } from "@/components/ui/mobile-nav"
import { Workout, ExerciseData } from "@/types/workout"
import { cn } from "@/lib/utils"
import { ClientCombobox } from "@/components/ui/client-combobox"

// Client type for dropdown
type Client = {
  id: string;
  name: string;
}

// Define form schema with validation
const formSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters" }),
  client_id: z.string().optional(),
  exercises: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      sets: z.coerce.number().min(0).optional(),
      reps: z.coerce.number().min(0).optional(),
      duration: z.coerce.number().min(0).optional(),
      rest: z.coerce.number().min(0).optional(),
      notes: z.string().optional(),
    })
  ).min(1, { message: "Add at least one exercise" }),
});

export default function EditWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params Promise using React.use()
  const unwrappedParams = use(params);
  const workoutId = unwrappedParams.id;
  const { userId } = useAuth()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [exercises, setExercises] = useState<ExerciseData[]>([])
  const [filteredExercises, setFilteredExercises] = useState<ExerciseData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      client_id: undefined,
      exercises: [],
    },
  })

  // Get the exercises array from form
  const formExercises = form.watch("exercises") || []

  // Fetch workout, clients and exercises
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return

      setIsLoading(true)
      try {
        // Fetch workout
        const { data: workoutData, error: workoutError } = await supabase
          .from("workouts")
          .select("*")
          .eq("id", workoutId)
          .eq("trainer_id", userId)
          .single()

        if (workoutError) {
          console.error("Error fetching workout:", workoutError)
          setError("Workout not found or you don't have permission to edit it")
          setIsLoading(false)
          return
        }

        setWorkout(workoutData)

        // Set form values
        form.reset({
          title: workoutData.title,
          client_id: workoutData.client_id || undefined,
          exercises: workoutData.exercises || [],
        })

        // Fetch clients
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, name")
          .eq("trainer_id", userId)
          .order("name")

        if (clientsError) {
          console.error("Error fetching clients:", clientsError)
          toast.error("Failed to load clients")
          return
        }

        setClients(clientsData || [])

        // Fetch exercises
        const { data: exercisesData, error: exercisesError } = await supabase
          .from("exercises")
          .select("*")
          .eq("trainer_id", userId)
          .order("name")

        if (exercisesError) {
          console.error("Error fetching exercises:", exercisesError)
          toast.error("Failed to load exercises")
          return
        }

        setExercises(exercisesData || [])
        setFilteredExercises(exercisesData || [])
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [userId, workoutId, form])

  // Filter exercises based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredExercises(exercises)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = exercises.filter(
        (exercise) =>
          exercise.name.toLowerCase().includes(query) ||
          (exercise.description && exercise.description.toLowerCase().includes(query)) ||
          (exercise.category && exercise.category.toLowerCase().includes(query))
      )
      setFilteredExercises(filtered)
    }
  }, [exercises, searchQuery])

  // Add exercise to workout
  const addExercise = (exercise: ExerciseData) => {
    const currentExercises = form.getValues("exercises") || []

    // Check if exercise already exists in the workout
    if (currentExercises.some(e => e.id === exercise.id)) {
      toast.error("Exercise already added to workout")
      return
    }

    // Add exercise to form
    form.setValue("exercises", [
      ...currentExercises,
      {
        id: exercise.id,
        name: exercise.name,
        sets: 3,
        reps: 10,
        duration: 0,
        rest: 60,
        notes: "",
      }
    ])
  }

  // Remove exercise from workout
  const removeExercise = (index: number) => {
    const currentExercises = form.getValues("exercises") || []
    const updatedExercises = [...currentExercises]
    updatedExercises.splice(index, 1)
    form.setValue("exercises", updatedExercises)
  }

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userId || !workout) {
      toast.error("You must be logged in to update a workout")
      return
    }

    setIsSubmitting(true)

    try {
      // Update workout in Supabase
      const { error } = await supabase
        .from("workouts")
        .update({
          client_id: values.client_id || null,
          title: values.title,

          exercises: values.exercises,
        })
        .eq("id", workout.id)
        .eq("trainer_id", userId)
        .select()

      if (error) {
        console.error("Error updating workout:", error)
        toast.error("Failed to update workout")
        setIsSubmitting(false)
        return
      }

      toast.success("Workout updated", {
        description: `${values.title} has been updated successfully.`,
      })

      // Redirect to workouts page
      router.push("/dashboard/workouts")
    } catch (error) {
      console.error("Error updating workout:", error)
      toast.error("Failed to update workout")
      setIsSubmitting(false)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center pr-4 md:px-6 z-10">
          <div className="flex items-center gap-0">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/workouts">
                <ChevronLeft className="h-5 w-5" />
                <span className="sr-only">Back</span>
              </Link>
            </Button>
            <h1 className="text-lg font-bold font-heading">Edit Workout</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 max-w-6xl">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-destructive mb-4">{error}</p>
              <Button asChild>
                <Link href="/dashboard/workouts">Back to Workouts</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between pr-4 md:px-6 z-10">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/workouts">
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-lg font-bold font-heading">Edit Workout</h1>
        </div>
        <Button
          size="sm"
          onClick={form.handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-1" />
              Save Changes
            </>
          )}
        </Button>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Workout Form */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Workout Details</CardTitle>
                  <CardDescription>Edit your workout plan</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form className="space-y-6">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Workout Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Full Body Strength" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />



                      <FormField
                        control={form.control}
                        name="client_id"
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel>Assign to Client (Optional)</FormLabel>
                            <FormControl>
                              <ClientCombobox
                                clients={clients}
                                value={field.value || ""}
                                onChange={(value) => {
                                  field.onChange(value);
                                  // Trigger validation after selection
                                  form.trigger("client_id");
                                }}
                                isLoading={isLoading}
                                onAddClient={() => router.push("/dashboard/clients/new")}
                                className={cn(
                                  form.formState.errors.client_id && "border-destructive"
                                )}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Exercises List */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Exercises</CardTitle>
                  <CardDescription>
                    {formExercises.length === 0
                      ? "Add exercises to your workout from the library"
                      : `${formExercises.length} exercise${formExercises.length !== 1 ? 's' : ''} added`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {formExercises.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No exercises added yet</p>
                      <p className="text-sm mt-1">Select exercises from the library on the right</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formExercises.map((exercise, index) => (
                        <div key={index} className="border rounded-md p-4">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-medium">{exercise.name}</h3>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeExercise(index)}
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground">Sets</label>
                              <Input
                                type="number"
                                value={exercise.sets || 0}
                                onChange={(e) => {
                                  const updatedExercises = [...formExercises]
                                  updatedExercises[index].sets = e.target.value === '' ? 0 : parseInt(e.target.value)
                                  form.setValue("exercises", updatedExercises)
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Reps</label>
                              <Input
                                type="number"
                                value={exercise.reps || 0}
                                onChange={(e) => {
                                  const updatedExercises = [...formExercises]
                                  updatedExercises[index].reps = e.target.value === '' ? 0 : parseInt(e.target.value)
                                  form.setValue("exercises", updatedExercises)
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Duration (sec)</label>
                              <Input
                                type="number"
                                value={exercise.duration || 0}
                                onChange={(e) => {
                                  const updatedExercises = [...formExercises]
                                  updatedExercises[index].duration = e.target.value === '' ? 0 : parseInt(e.target.value)
                                  form.setValue("exercises", updatedExercises)
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Rest (sec)</label>
                              <Input
                                type="number"
                                value={exercise.rest || 0}
                                onChange={(e) => {
                                  const updatedExercises = [...formExercises]
                                  updatedExercises[index].rest = e.target.value === '' ? 0 : parseInt(e.target.value)
                                  form.setValue("exercises", updatedExercises)
                                }}
                              />
                            </div>
                          </div>
                          <div className="mt-3">
                            <label className="text-xs text-muted-foreground">Notes</label>
                            <Input
                              value={exercise.notes || ""}
                              onChange={(e) => {
                                const updatedExercises = [...formExercises]
                                updatedExercises[index].notes = e.target.value
                                form.setValue("exercises", updatedExercises)
                              }}
                              placeholder="Additional instructions..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {form.formState.errors.exercises && (
                    <p className="text-destructive text-sm mt-2">{form.formState.errors.exercises.message}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Exercise Library */}
            <div>
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Exercise Library</CardTitle>
                  <CardDescription>Select exercises to add to your workout</CardDescription>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="search"
                      placeholder="Search exercises..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="max-h-[500px] overflow-y-auto">
                  {filteredExercises.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No exercises found</p>
                      <Button
                        variant="link"
                        asChild
                        className="mt-2"
                      >
                        <Link href="/dashboard/exercises">
                          Add exercises to your library
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredExercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          className={`p-3 border rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                            formExercises.some(e => e.id === exercise.id)
                              ? "border-primary/50 bg-primary/5"
                              : ""
                          }`}
                          onClick={() => addExercise(exercise)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium">{exercise.name}</h4>
                              {exercise.category && (
                                <span className="text-xs text-muted-foreground">
                                  {exercise.category}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={formExercises.some(e => e.id === exercise.id) ? "opacity-0" : ""}
                              onClick={(e) => {
                                e.stopPropagation()
                                addExercise(exercise)
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <MobileNav />
    </div>
  )
}
