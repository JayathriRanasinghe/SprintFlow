
'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Ticket } from '@/types/ticket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useSprints } from '@/hooks/useSprints'; // Import sprint hook
import { useTickets } from '@/hooks/useTickets'; // Import ticket hook
import { ClipboardCheck } from 'lucide-react';


export default function DemoPage() {
  const { sprints } = useSprints();
  const { tickets, updateTicket, getTicketsBySprint } = useTickets();
  const { toast } = useToast();

  // Local state for UI control
  const [selectedSprintId, setSelectedSprintId] = useState<string | undefined>(() => sprints.length > 0 ? sprints[0].id : undefined);

    // Update selected sprint when sprints data changes
   React.useEffect(() => {
     if (!selectedSprintId && sprints.length > 0) {
       setSelectedSprintId(sprints[0].id);
     } else if (selectedSprintId && !sprints.some(s => s.id === selectedSprintId)) {
       setSelectedSprintId(sprints.length > 0 ? sprints[0].id : undefined);
     }
   }, [sprints, selectedSprintId]);

  // Derived state
  const currentSprint = useMemo(() => sprints.find(s => s.id === selectedSprintId), [sprints, selectedSprintId]);

  // Filter tickets for the selected sprint that are potentially demo-able
  const demoCandidates = useMemo(() => getTicketsBySprint(selectedSprintId)
    .filter(t => !['Todo', 'In Progress'].includes(t.status)),
    [getTicketsBySprint, selectedSprintId]);

  // --- Ticket Update Callbacks ---
  const handleMarkForDemoChange = useCallback((ticketId: string, checked: boolean) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
        updateTicket({ ...ticket, markForDemo: checked });
        toast({ title: checked ? "Marked for Demo" : "Unmarked for Demo", description: `Ticket ${ticketId} updated.` });
    }
  }, [tickets, updateTicket, toast]);

   const handleDemoDataChange = useCallback((ticketId: string, data: string) => {
     // Note: This updates state immediately, but the actual 'save' happens via the hook
     // which persists to localStorage. We can remove the explicit save button
     // if immediate persistence on change is desired.
     const ticket = tickets.find(t => t.id === ticketId);
     if (ticket) {
         updateTicket({ ...ticket, demoTestData: data });
         // We might not need a toast on every keystroke.
         // Consider toasting only on button click or after a debounce.
     }
  }, [tickets, updateTicket]);

   const handleSaveDemoData = useCallback((ticketId: string) => {
        // The data is already saved via handleDemoDataChange triggering updateTicket.
        // This button can provide user feedback.
        toast({ title: "Demo Data Saved", description: `Test data for ticket ${ticketId} updated.` });
   }, [toast]);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardCheck className="h-8 w-8 text-accent" /> Demo Preparation
            </h1>
             <Select value={selectedSprintId} onValueChange={setSelectedSprintId} disabled={sprints.length === 0}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Select Sprint" />
              </SelectTrigger>
              <SelectContent>
                 {sprints.length === 0 && <SelectItem value="no-sprints" disabled>No Sprints Available</SelectItem>}
                {sprints.map(sprint => (
                  <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>

         {!selectedSprintId && sprints.length > 0 && (
            <Card className="flex items-center justify-center h-40 border-dashed border-2">
                <p className="text-muted-foreground">Please select a sprint to prepare for demo.</p>
            </Card>
        )}
         {!selectedSprintId && sprints.length === 0 && (
            <Card className="flex items-center justify-center h-40 border-dashed border-2">
                <p className="text-muted-foreground">No sprints available. Please <a href="/sprints" className="underline text-primary">create a sprint</a> first.</p>
            </Card>
         )}


        {currentSprint && (
             <div className="space-y-4">
             <h2 className="text-xl font-semibold">Tickets for Sprint: {currentSprint.name}</h2>
             {demoCandidates.length === 0 ? (
                 <Card className="flex items-center justify-center h-40 border-dashed border-2">
                    <p className="text-muted-foreground">No completed or QA-ready tickets found in this sprint for demo.</p>
                 </Card>
             ) : (
                 demoCandidates.map(ticket => (
                    <Card key={ticket.id} className="shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">{ticket.id}: {ticket.name}</CardTitle>
                                <div className="flex items-center space-x-3">
                                     <Label htmlFor={`demo-${ticket.id}`} className="text-sm">Include in Demo:</Label>
                                    <Checkbox
                                        id={`demo-${ticket.id}`}
                                        checked={ticket.markForDemo}
                                        onCheckedChange={(checked) => handleMarkForDemoChange(ticket.id, Boolean(checked))}
                                    />
                                </div>
                            </div>
                            <CardDescription className="text-xs">Status: {ticket.status}</CardDescription>
                        </CardHeader>
                        {ticket.markForDemo && (
                            <CardContent className="pt-2">
                                <Label htmlFor={`test-data-${ticket.id}`} className="text-sm font-medium mb-1 block">Test Data / Demo Steps:</Label>
                                <Textarea
                                    id={`test-data-${ticket.id}`}
                                    value={ticket.demoTestData || ''}
                                    onChange={(e) => handleDemoDataChange(ticket.id, e.target.value)}
                                    placeholder="Enter login credentials, specific data IDs, navigation steps, expected results..."
                                    className="min-h-[80px] text-xs"
                                />
                                 {/* Optional: Keep save button for explicit confirmation */}
                                 <Button size="sm" onClick={() => handleSaveDemoData(ticket.id)} className="mt-2">Save Data</Button>
                            </CardContent>
                        )}
                    </Card>
                 ))
             )}
             </div>
        )}
    </div>
  );
}

