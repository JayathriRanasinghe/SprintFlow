'use client';

import { useState, useMemo } from 'react';
import type { Ticket } from '@/types/ticket';
import type { Sprint } from '@/types/sprint';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ClipboardCheck } from 'lucide-react';

// Mock data - replace with actual data fetching later
const mockSprints: Sprint[] = [
  { id: 'sprint-1', name: 'Sprint 24.07', startDate: new Date(2024, 6, 1), endDate: new Date(2024, 6, 14), tickets: [] },
  { id: 'sprint-2', name: 'Sprint 24.08', startDate: new Date(2024, 7, 1), endDate: new Date(2024, 7, 14), tickets: [] },
];

const mockTickets: Ticket[] = [
  { id: 'TKT-1', sprintId: 'sprint-1', name: 'Implement login feature', order: 1, status: 'Done', markForPostScrum: false, markForDemo: true, demoTestData: 'User: test@example.com\nPass: password123' },
  { id: 'TKT-2', sprintId: 'sprint-1', name: 'Fix button styling', order: 2, status: 'Done', markForPostScrum: false, markForDemo: false },
  { id: 'TKT-4', sprintId: 'sprint-1', name: 'Add profile page', order: 3, status: 'QA Ready', markForPostScrum: false, markForDemo: true, demoTestData: 'Navigate to /profile, check details load' },
  { id: 'TKT-5', sprintId: 'sprint-2', name: 'Setup database', order: 1, status: 'In Progress', markForPostScrum: false, markForDemo: false },
];


export default function DemoPage() {
  const [sprints] = useState<Sprint[]>(mockSprints);
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [selectedSprintId, setSelectedSprintId] = useState<string | undefined>(mockSprints[0]?.id);
  const { toast } = useToast();

  const currentSprint = useMemo(() => sprints.find(s => s.id === selectedSprintId), [sprints, selectedSprintId]);

  // Filter tickets for the selected sprint that are potentially demo-able (e.g., not 'Todo' or 'In Progress')
  const demoCandidates = useMemo(() => tickets
    .filter(t => t.sprintId === selectedSprintId && !['Todo', 'In Progress'].includes(t.status))
    .sort((a, b) => a.order - b.order), [tickets, selectedSprintId]);

  const handleMarkForDemoChange = (ticketId: string, checked: boolean) => {
    setTickets(tickets.map(t => t.id === ticketId ? { ...t, markForDemo: checked } : t));
    toast({ title: checked ? "Marked for Demo" : "Unmarked for Demo", description: `Ticket ${ticketId} updated.` });
  };

   const handleDemoDataChange = (ticketId: string, data: string) => {
    // Basic debouncing or onBlur might be better here in a real app
     setTickets(tickets.map(t => t.id === ticketId ? { ...t, demoTestData: data } : t));
  };

   const handleSaveDemoData = (ticketId: string) => {
        // In a real app, this would trigger an API call
        // For now, the state is already updated onChange
        toast({ title: "Demo Data Saved", description: `Test data for ticket ${ticketId} updated.` });
   }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardCheck className="h-8 w-8 text-accent" /> Demo Preparation
            </h1>
             <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Select Sprint" />
              </SelectTrigger>
              <SelectContent>
                {sprints.map(sprint => (
                  <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>

         {!selectedSprintId && (
            <Card className="flex items-center justify-center h-40 border-dashed border-2">
                <p className="text-muted-foreground">Please select a sprint to prepare for demo.</p>
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
                                    // Consider adding onBlur save instead of button for better UX
                                    // onBlur={() => handleSaveDemoData(ticket.id)}
                                />
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
