'use client'

import { Loader2 } from 'lucide-react'
import { useScheduleParticipants } from '@/hooks/use-schedule-participants'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

interface ScheduleParticipantsReadonlyProps {
  scheduleId: string
  maxParticipants?: number
}

export function ScheduleParticipantsReadonly({
  scheduleId,
  maxParticipants = 10
}: ScheduleParticipantsReadonlyProps) {
  const {
    participants,
    isLoading,
    error,
    refreshParticipants
  } = useScheduleParticipants({ scheduleId })

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
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No participants added to this session yet.</p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell className="font-medium">
                    {participant.client?.name || "Unknown Client"}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(participant.status)}`}>
                      {formatStatus(participant.status)}
                    </span>
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

// Helper function to format status text
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'confirmed': 'Confirmed',
    'attended': 'Attended',
    'cancelled': 'Cancelled',
    'no-show': 'No-show'
  }
  return statusMap[status] || status
}

// Helper function to get status class
function getStatusClass(status: string): string {
  const statusClassMap: Record<string, string> = {
    'confirmed': 'bg-blue-100 text-blue-800',
    'attended': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800',
    'no-show': 'bg-amber-100 text-amber-800'
  }
  return statusClassMap[status] || 'bg-gray-100 text-gray-800'
}
