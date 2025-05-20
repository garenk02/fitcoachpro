"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Plus, Search, Edit, Trash2, ArrowLeft, User } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useOffline } from "@/components/offline-provider"
import { OfflineStatus } from "@/components/offline-status"
import { OfflineFallback } from "@/components/offline-fallback"
import { useOfflineData } from "@/hooks/use-offline-data"
import { toast } from "sonner"
import { format } from "date-fns"

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
import { MobileNav } from "@/components/ui/mobile-nav"
import { Workout, WorkoutExercise } from "@/types/workout"
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

// Type for workout data from Supabase
type WorkoutData = {
  id: string;
  trainer_id: string;
  client_id?: string | null;
  title: string;
  exercises: WorkoutExercise[];
  created_at?: string;
  clients?: {
    name: string;
  };
}

// Client type for dropdown
type Client = {
  id: string;
  name: string;
}

export default function WorkoutsPage() {
  const { userId } = useAuth()
  const { isOnline } = useOffline()
  const [searchQuery, setSearchQuery] = useState("")
  const [clientFilter, setClientFilter] = useState<string | null>(null)
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Use offline data hook for workouts
  const {
    data: workouts,
    isLoading: isLoadingWorkouts,
    // Omit error from destructuring
    deleteItem: deleteWorkout
  } = useOfflineData<WorkoutData>({
    table: 'workouts',
    select: `
      id,
      trainer_id,
      client_id,
      title,
      exercises,
      created_at,
      clients(name)
    `,
    orderColumn: 'created_at',
    orderDirection: 'desc'
  })

  // Use offline data hook for clients
  const {
    data: clients,
    isLoading: isLoadingClients
  } = useOfflineData<Client>({
    table: 'clients',
    select: 'id, name',
    orderColumn: 'name'
  })

  // Process workouts data to include client names
  const processedWorkouts = useMemo(() => {
    if (!workouts) return []

    return workouts.map(workout => ({
      ...workout,
      client_name: workout.clients?.name || undefined // Use undefined instead of null to match Workout type
    }))
  }, [workouts])

  // Filter workouts based on search query and client filter
  const filteredWorkouts = useMemo(() => {
    let filtered = [...processedWorkouts]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (workout) =>
          workout.title.toLowerCase().includes(query)
      )
    }

    // Apply client filter
    if (clientFilter) {
      if (clientFilter === "null") {
        filtered = filtered.filter(workout => !workout.client_id)
      } else {
        filtered = filtered.filter(workout => workout.client_id === clientFilter)
      }
    }

    return filtered
  }, [processedWorkouts, searchQuery, clientFilter])

  // Determine if we're loading
  const isLoading = isLoadingWorkouts || isLoadingClients

  // Handle workout deletion
  const handleDeleteWorkout = async () => {
    if (!selectedWorkout || !userId) return

    setIsSubmitting(true)

    try {
      const success = await deleteWorkout(selectedWorkout.id)

      if (!success) {
        throw new Error("Failed to delete workout")
      }

      toast.success("Workout deleted", {
        description: `${selectedWorkout.title} has been removed.${!isOnline ? ' Will sync when online.' : ''}`,
      })
    } catch (error) {
      console.error("Error deleting workout:", error)
      toast.error("Failed to delete workout")
    } finally {
      setIsSubmitting(false)
      setIsDeleteDialogOpen(false)
      setSelectedWorkout(null)
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
          <h1 className="text-lg font-bold font-heading">Workout Plans</h1>
        </div>
        <Button size="sm" className="bg-accent" asChild>
          <Link href="/dashboard/workouts/new" className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            New Workout
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
              placeholder="Search workouts..."
              className="pl-9 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={clientFilter || "all"}
            onValueChange={(value) => setClientFilter(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value="null">General Workouts</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Workouts Table */}
        <div className="bg-white dark:bg-gray-800 rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Exercises</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading workouts...</p>
                  </TableCell>
                </TableRow>
              ) : !isOnline && (!workouts || workouts.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10">
                    <OfflineFallback
                      title="No offline workout data"
                      description="Your workout plans are not available offline."
                      onRetry={() => window.location.reload()}
                    />
                  </TableCell>
                </TableRow>
              ) : filteredWorkouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <p className="text-muted-foreground">No workouts found</p>
                    <Button
                      variant="default"
                      className="mt-4 bg-accent"
                      asChild
                    >
                      <Link href="/dashboard/workouts/new" className="flex items-center gap-1">
                        <Plus className="h-4 w-4" />
                        Create Your First Workout
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorkouts.map((workout) => (
                  <TableRow key={workout.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/workouts/${workout.id}/edit`} className="hover:underline">
                        {workout.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {workout.client_name ? (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{workout.client_name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">General</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {workout.exercises?.length || 0} exercises
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {workout.created_at ? format(new Date(workout.created_at), "MMM d, yyyy") : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <Link href={`/dashboard/workouts/${workout.id}/edit`}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            // Cast to Workout type to ensure client_name is handled correctly
                            const workoutWithCorrectTypes = {
                              ...workout,
                              client_name: workout.client_name || undefined
                            };
                            setSelectedWorkout(workoutWithCorrectTypes as unknown as Workout)
                            setIsDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedWorkout?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteWorkout()
              }}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom Navigation */}
      <MobileNav />
    </div>
  )
}
