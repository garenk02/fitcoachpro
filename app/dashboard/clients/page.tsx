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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
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
import { MobileNav } from "@/components/ui/mobile-nav";

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
  const { userId } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Profile is now created automatically by the database trigger
  // No need to check or create profiles manually

  // Fetch clients from Supabase
  useEffect(() => {
    const fetchClients = async () => {
      if (!userId) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("trainer_id", userId)
          .order("name");

        if (error) {
          console.error("Error fetching clients:", error);
          return;
        }

        setClients(data || []);
        setFilteredClients(data || []);
        setTotalPages(Math.ceil((data?.length || 0) / itemsPerPage));
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [userId]);

  // Filter clients based on search query
  useEffect(() => {
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
  }, [searchQuery, clients]);

  // Handle client deletion
  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientToDelete.id);

      if (error) {
        console.error("Error deleting client:", error);
        toast.error("Failed to delete client", {
          description: error.message,
        });
        return;
      }

      // Show success toast
      toast.success("Client deleted", {
        description: `${clientToDelete.name} has been removed from your client list.`,
      });

      // Update local state
      setClients(clients.filter((client) => client.id !== clientToDelete.id));
      setIsDeleteDialogOpen(false);
      setClientToDelete(null);
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
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between px-4 md:px-6 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-lg font-bold font-heading">Manage Clients</h1>
        </div>
        <Button size="sm" className="bg-accent" asChild>
          <Link href="/dashboard/clients/new" className="flex items-center gap-1">
            <UserPlus className="h-4 w-4 mr-1" />
            Add Client
          </Link>
        </Button>
      </header>

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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
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
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{client.email}</TableCell>
                    <TableCell>{client.phone || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{client.age || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{client.gender || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
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
          </Table>

          {/* Pagination */}
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

      {/* Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
