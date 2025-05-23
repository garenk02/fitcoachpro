"use client"

import { useState } from "react"
import { useScheduleParticipants } from "@/hooks/use-schedule-participants"
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
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MultiClientSelect } from "@/components/ui/multi-client-select"
import { Loader2, Plus, UserPlus, X } from "lucide-react"
import { toast } from "sonner"

interface Client {
  id: string
  name: string
}

interface ScheduleParticipantsProps {
  scheduleId: string
  clients: Client[]
  isLoadingClients: boolean
  maxParticipants?: number
}

export function ScheduleParticipants({
  scheduleId,
  clients,
  isLoadingClients,
  maxParticipants = 10
}: ScheduleParticipantsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [isAddingParticipants, setIsAddingParticipants] = useState(false)

  const {
    participants,
    setParticipants, // Add this to get access to the setter
    isLoading,
    error,
    addParticipant,
    removeParticipant,
    updateParticipantStatus,
    refreshParticipants
  } = useScheduleParticipants({ scheduleId })

  // Filter out clients that are already participants
  const availableClients = clients.filter(
    client => !participants.some(p => p.client_id === client.id)
  )

  const handleAddParticipants = async () => {
    if (selectedClientIds.length === 0) {
      toast.error("Please select at least one client")
      return
    }

    // Check if adding these participants would exceed the maximum
    if (participants.length + selectedClientIds.length > maxParticipants) {
      toast.error(`Cannot add more than ${maxParticipants} participants to this session`)
      return
    }

    setIsAddingParticipants(true)

    try {
      // Add each selected client as a participant
      for (const clientId of selectedClientIds) {
        await addParticipant(clientId)
      }

      // Close dialog and reset selection
      setIsAddDialogOpen(false)
      setSelectedClientIds([])

      // Refresh participants list
      await refreshParticipants()

      toast.success("Participants added successfully")
    } catch (error) {
      console.error("Error adding participants:", error)
      toast.error("Failed to add participants")
    } finally {
      setIsAddingParticipants(false)
    }
  }

  const handleRemoveParticipant = async (participantId: string) => {
    try {
      // Get the participant before removing it
      const participantToRemove = participants.find(p => p.id === participantId);
      if (!participantToRemove) {
        toast.error("Participant not found");
        return;
      }

      // Show a loading toast
      // toast.loading("Removing participant...");

      // Optimistically update the UI immediately
      setParticipants(prev => prev.filter(p => p.id !== participantId));

      // Then try to actually remove it from the database
      try {
        const success = await removeParticipant(participantId);

        // Dismiss the loading toast
        toast.dismiss();

        if (success) {
          // Success! Just refresh to ensure we're in sync
          await refreshParticipants();
          toast.success("Participant removed successfully");

          // Double-check if it's still in the list after refresh
          const stillExists = participants.some(p => p.id === participantId);
          if (stillExists) {
            // Force remove it from the UI again
            console.log("Participant still exists after refresh, forcing UI update");
            setParticipants(prev => prev.filter(p => p.id !== participantId));
          }
        } else {
          // If the database operation failed but we want to keep the UI updated
          console.error("Database operation failed but UI was updated");
          toast.error("Warning: Participant may not have been removed from the database");

          // Force remove it from the UI again to be sure
          setParticipants(prev => prev.filter(p => p.id !== participantId));
        }
      } catch (removeError) {
        // Dismiss the loading toast
        toast.dismiss();

        // If there was an error, log it but don't revert the UI
        console.error("Error in removeParticipant:", removeError);
        toast.error("Warning: Participant may not have been removed from the database");

        // Force remove it from the UI again to be sure
        setParticipants(prev => prev.filter(p => p.id !== participantId));
      }
    } catch (error) {
      // Dismiss any loading toast
      toast.dismiss();

      console.error("Error in handleRemoveParticipant:", error);
      toast.error("Failed to remove participant");

      // Force refresh to ensure UI is in sync with actual data
      await refreshParticipants();
    }
  }

  const handleStatusChange = async (participantId: string, status: string) => {
    try {
      await updateParticipantStatus(participantId, status)
      toast.success("Status updated successfully")
    } catch (error) {
      console.error("Error updating status:", error)
      toast.error("Failed to update status")
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>Error loading participants: {error}</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => refreshParticipants()}
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          Participants ({participants.length}/{maxParticipants})
        </h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-1">
              <UserPlus className="h-4 w-4" />
              <span>Add Participants</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Participants</DialogTitle>
              <DialogDescription>
                Select clients to add to this group session.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <MultiClientSelect
                clients={availableClients}
                selectedClientIds={selectedClientIds}
                onSelect={setSelectedClientIds}
                isLoading={isLoadingClients}
                placeholder="Select clients to add..."
              />
            </div>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddParticipants}
                disabled={isAddingParticipants || selectedClientIds.length === 0}
              >
                {isAddingParticipants && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Participants
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No participants added to this session yet.</p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Participants
          </Button>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell className="font-medium">
                    {participant.client?.name || "Unknown Client"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={participant.status}
                      onValueChange={(value) => handleStatusChange(participant.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="attended">Attended</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="no-show">No-show</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveParticipant(participant.id)}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
