"use client"

import { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import { Check, Loader2, Receipt } from "lucide-react"
import { toast } from "sonner"
import { useOffline } from "@/components/offline-provider"
import { Invoice } from "@/types/invoice"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/utils"

interface InvoiceStatusDialogProps {
  invoice: Invoice | null
  isOpen: boolean
  onClose: () => void
  onUpdateStatus: (id: string, status: 'pending' | 'paid' | 'overdue', paidAt: string | null) => Promise<boolean>
}

export function InvoiceStatusDialog({
  invoice,
  isOpen,
  onClose,
  onUpdateStatus,
}: InvoiceStatusDialogProps) {
  const { isOnline } = useOffline()
  const [status, setStatus] = useState<'pending' | 'paid' | 'overdue'>("pending")
  const [isUpdating, setIsUpdating] = useState(false)

  // Update status when invoice changes
  useEffect(() => {
    if (invoice) {
      setStatus(invoice.status)
    }
  }, [invoice])

  const handleStatusChange = (newStatus: 'pending' | 'paid' | 'overdue') => {
    setStatus(newStatus)
  }

  // Get status badge class
  const getStatusBadgeClass = (statusValue: string) => {
    switch (statusValue) {
      case 'paid':
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case 'pending':
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case 'overdue':
        return "bg-red-100 text-accent-red dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  }

  const handleUpdateStatus = async () => {
    if (!invoice) return

    setIsUpdating(true)

    try {
      // Set paid_at to current date if status is changed to paid
      const paidAt = status === "paid" ? new Date().toISOString() : null

      const success = await onUpdateStatus(invoice.id, status, paidAt)

      if (success) {
        toast.success("Invoice status updated", {
          description: `Invoice status changed to ${status}`,
        })
        onClose()
      } else {
        toast.error("Failed to update invoice status")
      }
    } catch (error) {
      console.error("Error updating invoice status:", error)
      toast.error("Failed to update invoice status")
    } finally {
      setIsUpdating(false)
    }
  }

  if (!invoice) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Update Invoice Status
          </DialogTitle>
          <DialogDescription>
            Update the status of this invoice for {invoice.clients?.name || "Unknown Client"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Client</Label>
              <p className="font-medium">{invoice.clients?.name || "Unknown Client"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Package</Label>
              <p className="font-medium">{invoice.pricing_packages?.name || "Unknown Package"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Amount</Label>
              <p className="font-medium">Rp. {formatCurrency(invoice.amount)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Due Date</Label>
              <p className="font-medium">{format(parseISO(invoice.due_date), "MMM d, yyyy")}</p>
            </div>
          </div>

          {invoice.paid_at && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3 mt-2">
              <p className="text-green-800 dark:text-green-300 text-sm flex items-center">
                <Check className="h-4 w-4 mr-2" />
                Paid on {format(parseISO(invoice.paid_at), "MMM d, yyyy")}
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="status">Status</Label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                Current: {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
            </div>
            <Select
              defaultValue={invoice.status}
              value={status}
              onValueChange={handleStatusChange}
              disabled={isUpdating || !isOnline}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Select status">
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            {status === "paid" && (
              <p className="text-xs text-muted-foreground">
                Setting status to paid will record today&apos;s date as the payment date.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateStatus}
            disabled={isUpdating || !isOnline || status === invoice.status}
            className={
              status === "paid"
                ? "bg-green-600 hover:bg-green-700"
                : status === "overdue"
                  ? "bg-red-600 hover:bg-red-700"
                  : status === "pending"
                    ? "bg-yellow-600 hover:bg-yellow-700"
                    : ""
            }
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                {status === "paid" ? "Mark as Paid" : `Mark as ${status.charAt(0).toUpperCase() + status.slice(1)}`}
              </>
            )}
          </Button>
        </DialogFooter>

        {!isOnline && (
          <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-3 rounded-md mt-4 text-sm">
            You are currently offline. Status updates require an internet connection.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
