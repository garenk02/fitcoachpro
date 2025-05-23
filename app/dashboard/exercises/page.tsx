"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, Edit, Trash2, ArrowLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useOffline } from "@/components/offline-provider"
import { OfflineStatus } from "@/components/offline-status"
import { OfflineFallback } from "@/components/offline-fallback"
import { useOfflineData } from "@/hooks/use-offline-data"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  const { isOnline } = useOffline()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  // Use offline data hook for exercises
  const {
    data: exercises,
    isLoading,
    // Omit error from destructuring
    deleteItem: deleteExercise
  } = useOfflineData<Exercise>({
    table: 'exercises',
    select: '*',
    orderColumn: 'name'
  })

  // Filter exercises based on search query and category
  const filteredExercises = useMemo(() => {
    if (!exercises) return []

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

    return filtered
  }, [exercises, searchQuery, categoryFilter])

  // Update total pages when filtered exercises change
  useEffect(() => {
    if (filteredExercises) {
      setTotalPages(Math.max(1, Math.ceil(filteredExercises.length / itemsPerPage)));
      // Reset to first page when filters change
      setCurrentPage(1);
    }
  }, [filteredExercises, itemsPerPage]);

  // Pagination helpers
  const getPaginatedExercises = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredExercises.slice(startIndex, endIndex);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Handle delete
  const handleDelete = async () => {
    if (!userId || !selectedExercise) {
      return
    }

    try {
      // Delete exercise using the offline data hook
      const success = await deleteExercise(selectedExercise.id)

      if (!success) {
        throw new Error("Failed to delete exercise")
      }

      // Show success toast
      toast.success("Exercise deleted", {
        description: `${selectedExercise.name} has been removed from your exercise library.${!isOnline ? ' Will sync when online.' : ''}`,
        duration: 3000,
      })

      // Close dialog
      setIsDeleteDialogOpen(false)
      setSelectedExercise(null)
    } catch (error) {
      console.error("Error deleting exercise:", error)
      toast.error("Failed to delete exercise")
    }
  }

  // Handle delete button click
  const handleDeleteClick = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setIsDeleteDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between pr-4 md:px-6 z-10">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-lg font-bold font-heading">Exercise Library</h1>
        </div>
        <Button size="sm" className="bg-accent hover:bg-accent-hover" asChild>
          <Link href="/dashboard/exercises/new">
            <Plus className="h-4 w-4 mr-1" />
            Add Exercise
          </Link>
        </Button>
      </header>

      {/* Offline Status Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 flex justify-end">
        <OfflineStatus />
      </div>

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
                <TableHead className="text-center">Actions</TableHead>
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
              ) : !isOnline && (!exercises || exercises.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10">
                    <OfflineFallback
                      title="No offline exercise data"
                      description="Your exercise library is not available offline."
                      onRetry={() => window.location.reload()}
                    />
                  </TableCell>
                </TableRow>
              ) : filteredExercises.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <p className="text-muted-foreground">No exercises found</p>
                    <Button
                      variant="default"
                      className="mt-4 bg-accent"
                      asChild
                    >
                      <Link href="/dashboard/exercises/new">
                        <Plus className="h-4 w-4 mr-1" />
                        Add First Exercise
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                getPaginatedExercises().map((exercise) => (
                  <TableRow key={exercise.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => router.push(`/dashboard/exercises/${exercise.id}/edit`)}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/exercises/${exercise.id}/edit`} className="hover:underline">
                        {exercise.name}
                      </Link>
                    </TableCell>
                    <TableCell>{exercise.category || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-[300px] truncate">
                      {exercise.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/dashboard/exercises/${exercise.id}/edit`}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Link>
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

          {/* Pagination */}
          {!isLoading && filteredExercises.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 border-t gap-4">
              <div className="text-sm text-muted-foreground text-center sm:text-left w-full sm:w-auto">
                <span className="hidden sm:inline">
                  Showing {Math.min(filteredExercises.length, (currentPage - 1) * itemsPerPage + 1)} to{" "}
                  {Math.min(filteredExercises.length, currentPage * itemsPerPage)} of{" "}
                </span>
                <span className="sm:hidden">
                  {Math.min(filteredExercises.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredExercises.length, currentPage * itemsPerPage)} of{" "}
                </span>
                {filteredExercises.length} exercises
              </div>
              <div className="flex items-center gap-2 justify-center w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  aria-label="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm mx-2 min-w-[80px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Last page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>



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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Exercise
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
