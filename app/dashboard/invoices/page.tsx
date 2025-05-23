"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  Search,
  Calendar,
  ArrowLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Plus
} from "lucide-react"
import { format, parseISO, isAfter } from "date-fns"
import { useOffline } from "@/components/offline-provider"
import { OfflineStatus } from "@/components/offline-status"
import { OfflineFallback } from "@/components/offline-fallback"
import { useOfflineData } from "@/hooks/use-offline-data"
import { ClientOnly } from "@/components/client-only"

import { InvoiceStatusDialog } from "@/components/ui/invoice-status-dialog"
import { Invoice } from "@/types/invoice"
import { toast } from "sonner"

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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn, formatCurrency } from "@/lib/utils"

export default function InvoicesPage() {
  const { isOnline } = useOffline();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const itemsPerPage = 10;

  // Use the offline data hook
  const {
    data: invoices,
    isLoading,
    error,
    updateItem,
  } = useOfflineData<Invoice>({
    table: 'invoices',
    select: `
      id,
      trainer_id,
      client_id,
      pricing_package_id,
      amount,
      status,
      due_date,
      issued_at,
      paid_at,
      clients (
        name
      ),
      pricing_packages (
        name
      )
    `,
    orderColumn: 'due_date',
  });

  // Filter invoices based on search query and filters
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];

    return invoices.filter((invoice) => {
      // Filter by search query (client name)
      const matchesSearch = !searchQuery ||
        invoice.clients?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.pricing_packages?.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by status
      const matchesStatus = !statusFilter || invoice.status === statusFilter;

      // Filter by date
      const matchesDate = !dateFilter ||
        format(parseISO(invoice.due_date), 'yyyy-MM-dd') === format(dateFilter, 'yyyy-MM-dd');

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [invoices, searchQuery, statusFilter, dateFilter]);

  // Update total pages when filtered invoices change
  useEffect(() => {
    if (filteredInvoices) {
      setTotalPages(Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage)));
      // Reset to first page when filters change
      setCurrentPage(1);
    }
  }, [filteredInvoices, itemsPerPage]);

  // Get paginated invoices
  const getPaginatedInvoices = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredInvoices.slice(startIndex, endIndex);
  };

  // Check if an invoice is overdue
  const isOverdue = (invoice: Invoice) => {
    return invoice.status === 'pending' &&
      isAfter(new Date(), parseISO(invoice.due_date)) &&
      !invoice.paid_at;
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string, invoice: Invoice) => {
    if (isOverdue(invoice)) {
      return "bg-red-100 text-accent-red dark:bg-red-900 dark:text-red-300";
    }

    switch (status) {
      case 'paid':
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case 'pending':
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case 'overdue':
        return "bg-red-100 text-accent-red dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  // Handle opening the status dialog
  const handleOpenStatusDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsStatusDialogOpen(true);
  };

  // Handle closing the status dialog
  const handleCloseStatusDialog = () => {
    setIsStatusDialogOpen(false);
    setSelectedInvoice(null);
  };

  // Handle updating the invoice status
  const handleUpdateStatus = async (id: string, status: 'pending' | 'paid' | 'overdue', paidAt: string | null) => {
    if (!isOnline) {
      toast.error("Cannot update invoice status while offline");
      return false;
    }

    try {
      // Update the invoice status
      const success = await updateItem(id, {
        status,
        paid_at: paidAt
      });

      if (success) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Error updating invoice status:", error);
      return false;
    }
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
          <h1 className="text-lg font-bold font-heading">Invoices</h1>
        </div>
        <Button size="sm" className="bg-accent hover:bg-accent-hover" asChild>
          <Link href="/dashboard/invoices/new" className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Generate Invoice
          </Link>
        </Button>
      </header>

      {/* Offline Status Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 flex justify-end">
        <OfflineStatus />
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search by client or package..."
              className="pl-9 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select
              value={statusFilter || "all"}
              onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  className={cn(
                    "w-full sm:w-[180px] justify-start text-left font-normal",
                    !dateFilter && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, "PPP") : "Filter by date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateFilter || undefined}
                  onSelect={(date) => {
                    setDateFilter(date || null);
                    // Close the popover after selection
                    document.body.click(); // This will close the popover
                  }}
                  initialFocus
                />
                {dateFilter && (
                  <div className="p-3 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDateFilter(null)}
                      className="w-full"
                    >
                      Clear Date Filter
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white dark:bg-gray-800 rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="cursor-help underline decoration-dotted">
                        Status
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="max-w-xs">Click on any invoice row to update its status</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-center">Due Date</TableHead>
                <TableHead className="hidden md:table-cell">Issued At</TableHead>
              </TableRow>
            </TableHeader>
            <ClientOnly fallback={
              <TableBody>
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading invoices...</p>
                  </TableCell>
                </TableRow>
              </TableBody>
            }>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <div className="flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">Loading invoices...</p>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <p className="text-destructive">Error loading invoices</p>
                      <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                    </TableCell>
                  </TableRow>
                ) : !isOnline && (!invoices || invoices.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <OfflineFallback
                        title="No offline invoice data"
                        description="Your invoice data is not available offline."
                        onRetry={() => window.location.reload()}
                      />
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <p className="text-muted-foreground">No invoices found</p>
                      <Button
                        variant="default"
                        className="mt-4 bg-accent"
                        asChild
                      >
                        <Link href="/dashboard/invoices/new" className="flex items-center gap-1">
                          <Plus className="h-4 w-4" />
                          Generate Your First Invoice
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  getPaginatedInvoices().map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleOpenStatusDialog(invoice)}
                    >
                      <TableCell className="font-medium">
                        {invoice.clients?.name || "Unknown Client"}
                      </TableCell>
                      <TableCell>
                        {invoice.pricing_packages?.name || "Unknown Package"}
                      </TableCell>
                      <TableCell className="text-right">Rp. {formatCurrency(invoice.amount)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(invoice.status, invoice)}`}>
                          {isOverdue(invoice) ? "Overdue" : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className={isOverdue(invoice) ? "text-center text-accent-red" : "text-center"}>
                        {format(parseISO(invoice.due_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        {invoice.issued_at ? format(parseISO(invoice.issued_at), "MMM d, yyyy") : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </ClientOnly>
          </Table>
        </div>

        {/* Invoice Status Dialog */}
        <InvoiceStatusDialog
          invoice={selectedInvoice}
          isOpen={isStatusDialogOpen}
          onClose={handleCloseStatusDialog}
          onUpdateStatus={handleUpdateStatus}
        />

        {/* Pagination */}
        {filteredInvoices.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 border-t gap-4">
            <div className="text-sm text-muted-foreground text-center sm:text-left w-full sm:w-auto">
              <span className="hidden sm:inline">
                Showing {Math.min(filteredInvoices.length, (currentPage - 1) * itemsPerPage + 1)} to{" "}
                {Math.min(filteredInvoices.length, currentPage * itemsPerPage)} of{" "}
              </span>
              <span className="sm:hidden">
                {Math.min(filteredInvoices.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredInvoices.length, currentPage * itemsPerPage)} of{" "}
              </span>
              {filteredInvoices.length} invoices
            </div>

            {/* Pagination controls */}
            <div className="flex items-center gap-1 sm:gap-2 justify-center w-full sm:w-auto">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                aria-label="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              {/* Page indicator - more compact on mobile */}
              <span className="text-sm px-1 sm:px-2 min-w-[80px] text-center">
                {currentPage} / {totalPages}
              </span>

              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                aria-label="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
