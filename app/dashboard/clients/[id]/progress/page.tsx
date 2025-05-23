"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import {
  Plus,
  Edit,
  Trash2,
  Calendar as CalendarIcon,
  Loader2,
  ArrowLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { use } from "react";
import { toast } from "sonner";
import { ProgressEntry } from "@/types/progress";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { cn } from "@/lib/utils";

// Define form schema with validation
const formSchema = z.object({
  date: z.date({
    required_error: "Date is required",
  }),
  weight: z.coerce.number().min(1, {message: "This is required"}),
  body_fat: z.coerce.number().min(1, {message: "This is required"}),
  muscle_mass: z.coerce.number().min(1, {message: "This is required"}),
  water_content: z.coerce.number().min(1, {message: "This is required"}),
  bone_density: z.coerce.number().min(1, {message: "This is required"}),
  notes: z.string().optional().nullable(),
});

// Define client type
type Client = {
  id: string;
  trainer_id: string;
  name: string;
  phone: string;
  email: string | null;
  age: number | null;
  gender: string | null;
  goals: string | null;
  medical_conditions: string | null;
  created_at: string;
};

export default function ClientProgressPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params Promise using React.use()
  const unwrappedParams = use(params);
  const clientId = unwrappedParams.id;

  const { userId } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ProgressEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      weight: 0.0,
      body_fat: 0.0,
      muscle_mass: 0.0,
      water_content: 0.0,
      bone_density: 0.0,
      notes: "",
    },
  });

  // Initialize edit form
  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      weight: 0.0,
      body_fat: 0.0,
      muscle_mass: 0.0,
      water_content: 0.0,
      bone_density: 0.0,
      notes: "",
    },
  });

  // Fetch client data
  useEffect(() => {
    const fetchClient = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("id", clientId)
          .eq("trainer_id", userId)
          .single();

        if (error) {
          console.error("Error fetching client:", error);
          setError("Client not found or you don't have permission to view this client");
          return;
        }

        if (!data) {
          setError("Client not found");
          return;
        }

        setClient(data);
      } catch (error) {
        console.error("Error fetching client:", error);
        setError("An unexpected error occurred. Please try again.");
      }
    };

    fetchClient();
  }, [userId, clientId]);

  // Fetch progress entries
  useEffect(() => {
    const fetchProgressEntries = async () => {
      if (!userId || !clientId) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("progress")
          .select("*")
          .eq("client_id", clientId)
          .eq("trainer_id", userId)
          .order("date", { ascending: false });

        if (error) {
          console.error("Error fetching progress entries:", error);
          setError("Failed to load progress data");
          return;
        }

        setProgressEntries(data || []);
        setTotalPages(Math.ceil((data?.length || 0) / itemsPerPage));
      } catch (error) {
        console.error("Error fetching progress entries:", error);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgressEntries();
  }, [userId, clientId]);

  // Handle form submission for adding a new progress entry
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userId || !clientId) {
      setError("You must be logged in to add a progress entry");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Insert new progress entry into Supabase
      const { data, error } = await supabase.from("progress").insert([
        {
          client_id: clientId,
          trainer_id: userId,
          date: format(values.date, "yyyy-MM-dd"),
          weight: values.weight,
          body_fat: values.body_fat,
          muscle_mass: values.muscle_mass,
          water_content: values.water_content,
          bone_density: values.bone_density,
          notes: values.notes,
        },
      ]).select();

      if (error) {
        console.error("Error adding progress entry:", error);
        setError(error.message);
        setIsSubmitting(false);
        return;
      }

      // Show success toast
      toast.success("Progress entry added", {
        description: `Progress entry for ${format(values.date, "MMM d, yyyy")} has been added.`,
        duration: 3000,
      });

      // Update local state
      setProgressEntries([data[0], ...progressEntries]);
      setIsAddDialogOpen(false);

      // Reset form
      form.reset({
        date: new Date(),
        weight: 0,
        body_fat: 0,
        muscle_mass: 0,
        water_content: 0,
        bone_density: 0,
        notes: "",
      });
    } catch (error) {
      console.error("Error adding progress entry:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle form submission for editing a progress entry
  async function onEditSubmit(values: z.infer<typeof formSchema>) {
    if (!userId || !clientId || !selectedEntry) {
      setError("You must be logged in to edit a progress entry");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Update progress entry in Supabase
      const { data, error } = await supabase
        .from("progress")
        .update({
          date: format(values.date, "yyyy-MM-dd"),
          weight: values.weight,
          body_fat: values.body_fat,
          muscle_mass: values.muscle_mass,
          water_content: values.water_content,
          bone_density: values.bone_density,
          notes: values.notes,
        })
        .eq("id", selectedEntry.id)
        .eq("trainer_id", userId)
        .select();

      if (error) {
        console.error("Error updating progress entry:", error);
        setError(error.message);
        setIsSubmitting(false);
        return;
      }

      // Show success toast
      toast.success("Progress entry updated", {
        description: `Progress entry for ${format(values.date, "MMM d, yyyy")} has been updated.`,
        duration: 3000,
      });

      // Update local state
      setProgressEntries(
        progressEntries.map((entry) =>
          entry.id === selectedEntry.id ? data[0] : entry
        )
      );
      setIsEditDialogOpen(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error("Error updating progress entry:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle progress entry deletion
  const handleDeleteEntry = async () => {
    if (!selectedEntry) return;

    try {
      const { error } = await supabase
        .from("progress")
        .delete()
        .eq("id", selectedEntry.id)
        .eq("trainer_id", userId);

      if (error) {
        console.error("Error deleting progress entry:", error);
        toast.error("Failed to delete progress entry", {
          description: error.message,
        });
        return;
      }

      // Show success toast
      toast.success("Progress entry deleted", {
        description: `Progress entry for ${format(new Date(selectedEntry.date), "MMM d, yyyy")} has been deleted.`,
      });

      // Update local state
      setProgressEntries(progressEntries.filter((entry) => entry.id !== selectedEntry.id));
      setIsDeleteDialogOpen(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error("Error deleting progress entry:", error);
      toast.error("An unexpected error occurred");
    }
  };

  // Handle edit button click
  const handleEditClick = (entry: ProgressEntry) => {
    setSelectedEntry(entry);
    editForm.reset({
      date: new Date(entry.date),
      weight: entry.weight || 0 ,
      body_fat: entry.body_fat || 0,
      muscle_mass: entry.muscle_mass || 0 ,
      water_content: entry.water_content || 0,
      bone_density: entry.bone_density || 0,
      notes: entry.notes,
    });
    setIsEditDialogOpen(true);
  };

  // Handle delete button click
  const handleDeleteClick = (entry: ProgressEntry) => {
    setSelectedEntry(entry);
    setIsDeleteDialogOpen(true);
  };

  // Get paginated progress entries
  const getPaginatedEntries = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return progressEntries.slice(startIndex, endIndex);
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between pr-4 md:px-6 z-10">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/clients/${clientId}`}>
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-lg font-bold font-heading">
            Client Progress
          </h1>
        </div>
        <Button size="sm" className="bg-accent" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Entry
        </Button>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md mb-6 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading progress data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progress Table */}
            <Card>
              <CardHeader>
                <CardTitle>Progress History</CardTitle>
                <CardDescription>
                  Track weight, body fat percentage, and other measurements over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Body Fat %</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {progressEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10">
                            <p className="text-muted-foreground">No progress entries found</p>
                            <Button
                              variant="default"
                              className="mt-4 bg-accent"
                              onClick={() => setIsAddDialogOpen(true)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add First Entry
                            </Button>
                          </TableCell>
                        </TableRow>
                      ) : (
                        getPaginatedEntries().map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              {format(new Date(entry.date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              {entry.weight ? `${entry.weight} kg` : "-"}
                            </TableCell>
                            <TableCell>
                              {entry.body_fat ? `${entry.body_fat}%` : "-"}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {entry.notes || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditClick(entry)}
                                >
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteClick(entry)}
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

                {/* Pagination */}
                {progressEntries.length > itemsPerPage && (
                  <div className="flex items-center justify-center space-x-2 mt-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Add Progress Entry Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Progress Entry</DialogTitle>
            <DialogDescription>
              Record new measurements and progress for {client?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date*</FormLabel>
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
                              format(field.value, "PPP")
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
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0.0"
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="body_fat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body Fat %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0.0"
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="muscle_mass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Muscle Mass (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0.0"
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="water_content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Water Content (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0.0"
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bone_density"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bone Density (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0.0"
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes or observations"
                        className="resize-none"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="float-right">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Entry"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Progress Entry Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Progress Entry</DialogTitle>
            <DialogDescription>
              Update measurements and progress for {client?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date*</FormLabel>
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
                              format(field.value, "PPP")
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
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0.0"
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="body_fat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body Fat %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0.0"
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="muscle_mass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Muscle Mass (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0.0"
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="water_content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Water Content (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0.0"
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="bone_density"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bone Density (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0.0"
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes or observations"
                        className="resize-none"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="float-right">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Entry"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Progress Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this progress entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDeleteDialogOpen(false)} className="float-left">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEntry} className="float-right">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
