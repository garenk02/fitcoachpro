"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ArrowLeft,
  CreditCard,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useOffline } from "@/components/offline-provider"
import { OfflineStatus } from "@/components/offline-status"
import { OfflineFallback } from "@/components/offline-fallback"
import { useOfflineData } from "@/hooks/use-offline-data"
import { ClientOnly } from "@/components/client-only"
import { formatCurrency } from "@/lib/utils";

// Parse currency string back to number
const parseCurrency = (value: string): number => {
  // Remove all non-digit characters (including thousand separators)
  const numStr = value.replace(/[^\d]/g, '');

  // Parse as integer and ensure it's not negative
  return Math.max(0, parseInt(numStr) || 0);
};

// Define the pricing package schema
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  session_count: z.coerce.number().int().min(1, "Session count must be at least 1"),
  is_subscription: z.boolean(),
})

// Define the pricing package type
type PricingPackage = {
  id: string
  trainer_id: string
  name: string
  description?: string
  price: number
  session_count: number
  is_subscription: boolean
  created_at?: string
}

export default function PricingPackagesPage() {
  const { isOnline } = useOffline()
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentPackage, setCurrentPackage] = useState<PricingPackage | null>(null)
  const [isAddingPackage, setIsAddingPackage] = useState(false)
  const [isEditingPackage, setIsEditingPackage] = useState(false)
  const [isDeletingPackage, setIsDeletingPackage] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  // Use the offline data hook for pricing packages
  const {
    data: pricingPackages,
    isLoading,
    createItem: createPricingPackage,
    updateItem: updatePricingPackage,
    deleteItem: deletePricingPackage
  } = useOfflineData<PricingPackage>({
    table: 'pricing_packages',
    select: '*',
    orderColumn: 'name'
  })

  // Initialize add form
  const addForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      session_count: 1,
      is_subscription: false,
    },
  })

  // Initialize edit form
  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      session_count: 1,
      is_subscription: false,
    },
  })

  // Filter pricing packages based on search query and type filter
  const filteredPackages = useMemo(() => {
    if (!pricingPackages) return []

    let filtered = [...pricingPackages]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (pkg) =>
          pkg.name.toLowerCase().includes(query) ||
          (pkg.description && pkg.description.toLowerCase().includes(query))
      )
    }

    // Apply type filter
    if (typeFilter) {
      if (typeFilter === "subscription") {
        filtered = filtered.filter(pkg => pkg.is_subscription)
      } else if (typeFilter === "one-time") {
        filtered = filtered.filter(pkg => !pkg.is_subscription)
      }
    }

    return filtered
  }, [pricingPackages, searchQuery, typeFilter])

  // Update total pages when filtered packages change
  useEffect(() => {
    if (filteredPackages) {
      setTotalPages(Math.max(1, Math.ceil(filteredPackages.length / itemsPerPage)));
      // Reset to first page when filters change
      setCurrentPage(1);
    }
  }, [filteredPackages, itemsPerPage]);

  // Pagination helpers
  const getPaginatedPackages = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPackages.slice(startIndex, endIndex);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Handle form submission for adding a new pricing package
  const handleAddSubmit = async (values: z.infer<typeof formSchema>) => {
    if (isAddingPackage) return

    setIsAddingPackage(true)
    try {
      await createPricingPackage(values)
      toast.success("Pricing package created successfully")
      setIsAddDialogOpen(false)
      addForm.reset()
    } catch (error) {
      console.error("Error creating pricing package:", error)
      toast.error("Failed to create pricing package")
    } finally {
      setIsAddingPackage(false)
    }
  }

  // Handle form submission for editing a pricing package
  const handleEditSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentPackage || isEditingPackage) return

    setIsEditingPackage(true)
    try {
      await updatePricingPackage(currentPackage.id, values)
      toast.success("Pricing package updated successfully")
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error("Error updating pricing package:", error)
      toast.error("Failed to update pricing package")
    } finally {
      setIsEditingPackage(false)
    }
  }

  // Handle deleting a pricing package
  const handleDelete = async () => {
    if (!currentPackage || isDeletingPackage) return

    setIsDeletingPackage(true)
    try {
      await deletePricingPackage(currentPackage.id)
      toast.success("Pricing package deleted successfully")
      setIsDeleteDialogOpen(false)
      setCurrentPackage(null)
    } catch (error) {
      console.error("Error deleting pricing package:", error)
      toast.error("Failed to delete pricing package")
    } finally {
      setIsDeletingPackage(false)
    }
  }

  // Handle edit button click
  const handleEditClick = (pkg: PricingPackage) => {
    setCurrentPackage(pkg)
    editForm.reset({
      name: pkg.name,
      description: pkg.description || "",
      price: pkg.price,
      session_count: pkg.session_count,
      is_subscription: pkg.is_subscription,
    })
    setIsEditDialogOpen(true)
  }

  // Handle delete button click
  const handleDeleteClick = (pkg: PricingPackage) => {
    setCurrentPackage(pkg)
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
          <h1 className="text-lg font-bold font-heading">Pricing Packages</h1>
        </div>
        <Button size="sm" className="bg-accent" onClick={() => {
          addForm.reset()
          setIsAddDialogOpen(true)
        }}>
          <Plus className="h-4 w-4 mr-1" />
          Add Package
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
              placeholder="Search packages..."
              className="pl-9 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={typeFilter || "all"}
            onValueChange={(value) => setTypeFilter(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="one-time">One-Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pricing Packages Table */}
        <div className="bg-white dark:bg-gray-800 rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <ClientOnly fallback={
              <TableBody>
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading pricing packages...</p>
                  </TableCell>
                </TableRow>
              </TableBody>
            }>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">Loading pricing packages...</p>
                    </TableCell>
                  </TableRow>
                ) : !isOnline && (!pricingPackages || pricingPackages.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <OfflineFallback
                        title="No offline pricing data"
                        description="Your pricing packages data is not available offline."
                        onRetry={() => window.location.reload()}
                      />
                    </TableCell>
                  </TableRow>
                ) : filteredPackages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <div className="flex flex-col items-center justify-center">
                        <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No pricing packages found</p>
                        <Button
                          variant="default"
                          className="mt-4 bg-accent"
                          onClick={() => {
                            addForm.reset()
                            setIsAddDialogOpen(true)
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Your First Package
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  getPaginatedPackages().map((pkg) => (
                    <TableRow key={pkg.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-[300px] truncate">
                        {pkg.description || "-"}
                      </TableCell>
                      <TableCell>Rp {formatCurrency(pkg.price)}</TableCell>
                      <TableCell>{pkg.session_count}</TableCell>
                      <TableCell>
                        {pkg.is_subscription ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                            Subscription
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                            One-Time
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(pkg);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(pkg);
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
            </ClientOnly>
          </Table>

          {/* Pagination */}
          {!isLoading && filteredPackages.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 border-t gap-4">
              <div className="text-sm text-muted-foreground text-center sm:text-left w-full sm:w-auto">
                <span className="hidden sm:inline">
                  Showing {Math.min(filteredPackages.length, (currentPage - 1) * itemsPerPage + 1)} to{" "}
                  {Math.min(filteredPackages.length, currentPage * itemsPerPage)} of{" "}
                </span>
                <span className="sm:hidden">
                  {Math.min(filteredPackages.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredPackages.length, currentPage * itemsPerPage)} of{" "}
                </span>
                {filteredPackages.length} packages
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
                  <ChevronLeft className="h-4 w-4" />
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

      {/* Add Pricing Package Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Pricing Package</DialogTitle>
            <DialogDescription>
              Create a new pricing package for your clients.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Basic Package" {...field} />
                    </FormControl>
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
                      <Input placeholder="e.g., Includes basic training sessions" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (Rp) *</FormLabel>
                      <FormControl>
                        <div>
                          <Input
                            type="text"
                            value={formatCurrency(field.value)}
                            onChange={(e) => {
                              const value = parseCurrency(e.target.value);
                              field.onChange(value);
                            }}
                            onBlur={(e) => {
                              e.target.value = formatCurrency(field.value);
                              field.onBlur();
                            }}
                            placeholder="1000000"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="session_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sessions *</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={addForm.control}
                name="is_subscription"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Subscription</FormLabel>
                      <FormDescription>
                        Is this a recurring subscription package?
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="float-left"
                  disabled={isAddingPackage}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="float-right"
                  disabled={isAddingPackage}
                >
                  {isAddingPackage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Pricing Package Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Pricing Package</DialogTitle>
            <DialogDescription>
              Update the details of this pricing package.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Basic Package" {...field} />
                    </FormControl>
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
                      <Input placeholder="e.g., Includes basic training sessions" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (Rp) *</FormLabel>
                      <FormControl>
                        <div>
                          <Input
                            type="text"
                            value={formatCurrency(field.value)}
                            onChange={(e) => {
                              const value = parseCurrency(e.target.value);
                              field.onChange(value);
                            }}
                            onBlur={(e) => {
                              e.target.value = formatCurrency(field.value);
                              field.onBlur();
                            }}
                            placeholder="1000000"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="session_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sessions *</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="is_subscription"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Subscription</FormLabel>
                      <FormDescription>
                        Is this a recurring subscription package?
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="float-left"
                  disabled={isEditingPackage}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="float-right"
                  disabled={isEditingPackage}
                >
                  {isEditingPackage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
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
              This will permanently delete the pricing package &quot;{currentPackage?.name}&quot;.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="float-left" disabled={isDeletingPackage}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="float-right"
              disabled={isDeletingPackage}
            >
              {isDeletingPackage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
