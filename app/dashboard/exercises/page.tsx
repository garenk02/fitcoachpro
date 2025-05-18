"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, Edit, Trash2, ArrowLeft } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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

export default function ExercisesPage() {
  const { userId } = useAuth()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize add form
  const addForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
    },
  })

  // Initialize edit form
  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
    },
  })

  // Fetch exercises
  useEffect(() => {
    const fetchExercises = async () => {
      if (!userId) return

      try {
        const { data, error } = await supabase
          .from("exercises")
          .select("*")
          .eq("trainer_id", userId)
          .order("name")

        if (error) {
          console.error("Error fetching exercises:", error)
          toast.error("Failed to load exercises")
          setIsLoading(false)
          return
        }

        setExercises(data || [])
        setFilteredExercises(data || [])
      } catch (error) {
        console.error("Error fetching exercises:", error)
        toast.error("Failed to load exercises")
      } finally {
        setIsLoading(false)
      }
    }

    fetchExercises()
  }, [userId])

  // Filter exercises based on search query and category
  useEffect(() => {
    let filtered = [...exercises]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (exercise) =>
          exercise.name.toLowerCase().includes(query) ||
          (exercise.description && exercise.description.toLowerCase().includes(query))
      )
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(
        (exercise) => exercise.category === categoryFilter
      )
    }

    setFilteredExercises(filtered)
  }, [exercises, searchQuery, categoryFilter])

  // Handle add form submission
  const handleAddSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userId) {
      setError("You must be logged in to add an exercise")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Insert new exercise into Supabase
      const { data, error } = await supabase.from("exercises").insert([
        {
          trainer_id: userId,
          name: values.name,
          description: values.description || null,
          category: values.category,
        },
      ]).select()

      if (error) {
        console.error("Error adding exercise:", error)
        setError(error.message)
        setIsSubmitting(false)
        return
      }

      // Add new exercise to state
      setExercises([...exercises, data[0]])

      // Show success toast
      toast.success("Exercise added", {
        description: `${values.name} has been added to your exercise library.`,
        duration: 3000,
      })

      // Reset form and close dialog
      addForm.reset()
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error("Error adding exercise:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle edit form submission
  const handleEditSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userId || !selectedExercise) {
      setError("You must be logged in to edit an exercise")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Update exercise in Supabase
      const { data, error } = await supabase
        .from("exercises")
        .update({
          name: values.name,
          description: values.description || null,
          category: values.category,
        })
        .eq("id", selectedExercise.id)
        .eq("trainer_id", userId)
        .select()

      if (error) {
        console.error("Error updating exercise:", error)
        setError(error.message)
        setIsSubmitting(false)
        return
      }

      // Update exercise in state
      setExercises(
        exercises.map((exercise) =>
          exercise.id === selectedExercise.id ? data[0] : exercise
        )
      )

      // Show success toast
      toast.success("Exercise updated", {
        description: `${values.name} has been updated.`,
        duration: 3000,
      })

      // Reset form and close dialog
      editForm.reset()
      setIsEditDialogOpen(false)
      setSelectedExercise(null)
    } catch (error) {
      console.error("Error updating exercise:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!userId || !selectedExercise) {
      return
    }

    setIsSubmitting(true)

    try {
      // Delete exercise from Supabase
      const { error } = await supabase
        .from("exercises")
        .delete()
        .eq("id", selectedExercise.id)
        .eq("trainer_id", userId)

      if (error) {
        console.error("Error deleting exercise:", error)
        toast.error("Failed to delete exercise")
        setIsSubmitting(false)
        setIsDeleteDialogOpen(false)
        return
      }

      // Remove exercise from state
      setExercises(
        exercises.filter((exercise) => exercise.id !== selectedExercise.id)
      )

      // Show success toast
      toast.success("Exercise deleted", {
        description: `${selectedExercise.name} has been removed from your exercise library.`,
        duration: 3000,
      })

      // Close dialog
      setIsDeleteDialogOpen(false)
      setSelectedExercise(null)
    } catch (error) {
      console.error("Error deleting exercise:", error)
      toast.error("Failed to delete exercise")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle edit button click
  const handleEditClick = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    editForm.reset({
      name: exercise.name,
      description: exercise.description || "",
      category: exercise.category || "",
    })
    setIsEditDialogOpen(true)
  }

  // Handle delete button click
  const handleDeleteClick = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setIsDeleteDialogOpen(true)
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
          <h1 className="text-lg font-bold font-heading">Exercise Library</h1>
        </div>
        <Button size="sm" className="bg-accent" onClick={() => {
          addForm.reset()
          setIsAddDialogOpen(true)
        }}>
          <Plus className="h-4 w-4 mr-1" />
          Add Exercise
        </Button>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search exercises..."
              className="pl-9 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={categoryFilter || "all"}
            onValueChange={(value) => setCategoryFilter(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EXERCISE_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Exercises Table */}
        <div className="bg-white dark:bg-gray-800 rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading exercises...</p>
                  </TableCell>
                </TableRow>
              ) : filteredExercises.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <p className="text-muted-foreground">No exercises found</p>
                    <Button
                      variant="default"
                      className="mt-4 bg-accent"
                      onClick={() => {
                        addForm.reset()
                        setIsAddDialogOpen(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add First Exercise
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExercises.map((exercise) => (
                  <TableRow key={exercise.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <TableCell className="font-medium">{exercise.name}</TableCell>
                    <TableCell>{exercise.category || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-[300px] truncate">
                      {exercise.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(exercise);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(exercise);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Add Exercise Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Exercise</DialogTitle>
            <DialogDescription>
              Add a new exercise to your library. Fill out the details below.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Bench Press" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
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
              <FormField
                control={addForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the exercise, including proper form and technique..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <div className="flex w-full justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin mr-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                        </div>
                        Saving...
                      </>
                    ) : (
                      "Save Exercise"
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Exercise Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Exercise</DialogTitle>
            <DialogDescription>
              Update the details of this exercise.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Bench Press" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
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
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the exercise, including proper form and technique..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <div className="flex w-full justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsEditDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin mr-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                        </div>
                        Saving...
                      </>
                    ) : (
                      "Update Exercise"
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the exercise &quot;
              {selectedExercise?.name}&quot; from your library.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin mr-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  </div>
                  Deleting...
                </>
              ) : (
                "Delete Exercise"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
