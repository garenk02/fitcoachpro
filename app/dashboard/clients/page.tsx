"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Search,
  Edit,
  Trash2,
  UserPlus,
  ArrowLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  WifiOff,
  Loader2
} from "lucide-react";
import { useOffline } from "@/components/offline-provider";
import { OfflineStatus } from "@/components/offline-status";
import { useOfflineData } from "@/hooks/use-offline-data";
import { ClientOnly } from "@/components/client-only";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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


// Define client type
type Client = {
  id: string;
  trainer_id: string;
  name: string;
  email: string;
  phone: string | null;
  age: number | null;
  gender: string | null;
  goals: string | null;
  medical_conditions: string | null;
  created_at: string;
};

export default function ClientsPage() {
  // We don't need userId here as it's used in the useOfflineData hook
  const { isOnline } = useOffline();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Use the offline data hook
  const {
    data: clients,
    isLoading,
    error,
    deleteItem: deleteClient,
  } = useOfflineData<Client>({
    table: 'clients',
    orderColumn: 'name',
  });

  const [filteredClients, setFilteredClients] = useState<Client[]>([]);

  // Update filtered clients when clients data changes
  useEffect(() => {
    if (clients) {
      setFilteredClients(clients);
      setTotalPages(Math.ceil(clients.length / itemsPerPage));
    }
  }, [clients, itemsPerPage]);

  // Filter clients based on search query
  useEffect(() => {
    // Skip if clients array is not yet available
    if (!clients || clients.length === 0) {
      return;
    }

    if (searchQuery.trim() === "") {
      setFilteredClients(clients);
      setTotalPages(Math.ceil(clients.length / itemsPerPage));
    } else {
      const filtered = clients.filter(
        (client) =>
          client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (client.phone && client.phone.includes(searchQuery))
      );
      setFilteredClients(filtered);
      setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    }
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchQuery, clients, itemsPerPage]);

  // Handle client deletion
  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      const success = await deleteClient(clientToDelete.id);

      if (success) {
        // Show success toast
        toast.success("Client deleted", {
          description: `${clientToDelete.name} has been removed from your client list.`,
        });

        setIsDeleteDialogOpen(false);
        setClientToDelete(null);
      } else {
        toast.error("Failed to delete client");
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("An unexpected error occurred");
    }
  };

  // Pagination helpers
  const getPaginatedClients = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredClients.slice(startIndex, endIndex);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

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
          <h1 className="text-lg font-bold font-heading">Manage Clients</h1>
        </div>
        <Button size="sm" className="bg-accent hover:bg-accent-hover" asChild>
          <Link href="/dashboard/clients/new" className="flex items-center gap-1">
            <UserPlus className="h-4 w-4 mr-1" />
            Add Client
          </Link>
        </Button>
      </header>

      {/* Offline Status Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 flex justify-end">
        <OfflineStatus />
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search clients..."
              className="pl-9 w-full sm:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white dark:bg-gray-800 rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="hidden md:table-cell">Age</TableHead>
                <TableHead className="hidden md:table-cell">Gender</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <ClientOnly fallback={
              <TableBody>
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading clients...</p>
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
                      <p className="mt-2 text-sm text-muted-foreground">Loading clients...</p>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <div className="flex flex-col items-center justify-center">
                        <WifiOff className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">Error loading clients</p>
                        <p className="text-sm text-muted-foreground mt-1">{error}</p>
                        {!isOnline && (
                          <p className="text-sm text-muted-foreground mt-4">
                            You are currently offline. Some data may not be available.
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : getPaginatedClients().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <p className="text-muted-foreground">No clients found</p>
                      <Button
                        variant="default"
                        className="mt-4 bg-accent"
                        asChild
                      >
                        <Link href="/dashboard/clients/new" className="flex items-center gap-1">
                          <PlusCircle className="h-4 w-4" />
                          Add Your First Client
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  getPaginatedClients().map((client) => (
                    <TableRow key={client.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => router.push(`/dashboard/clients/${client.id}`)}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/clients/${client.id}`} className="hover:underline">
                          {client.name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{client.email}</TableCell>
                      <TableCell>{client.phone || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell">{client.age || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell">{client.gender || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click
                              router.push(`/dashboard/clients/${client.id}/edit`);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click
                              setClientToDelete(client);
                              setIsDeleteDialogOpen(true);
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
            </ClientOnly>
          </Table>

          {/* Pagination */}
          <ClientOnly>
            {!isLoading && filteredClients.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 border-t gap-4">
                <div className="text-sm text-muted-foreground text-center sm:text-left w-full sm:w-auto">
                  <span className="hidden sm:inline">
                    Showing {Math.min(filteredClients.length, (currentPage - 1) * itemsPerPage + 1)} to{" "}
                    {Math.min(filteredClients.length, currentPage * itemsPerPage)} of{" "}
                  </span>
                  <span className="sm:hidden">
                    {Math.min(filteredClients.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredClients.length, currentPage * itemsPerPage)} of{" "}
                  </span>
                  {filteredClients.length} clients
                </div>
                <div className="flex items-center gap-2 justify-center w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9"
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
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
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9"
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </ClientOnly>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {clientToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteClient}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
