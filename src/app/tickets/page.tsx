'use client';

import { useState, useMemo } from 'react';
import type { Ticket, TicketStatus } from '@/types/ticket';
import type { Sprint } from '@/types/sprint';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Edit, Trash2, GripVertical, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { postCommentToJira } from '@/services/jira'; // Assuming service exists
import { generateStandupUpdate } from '@/ai/flows/generate-standup-update'; // Import AI flow if needed here

// Mock data - replace with actual data fetching later
const mockSprints: Sprint[] = [
  { id: 'sprint-1', name: 'Sprint 24.07', startDate: new Date(2024, 6, 1), endDate: new Date(2024, 6, 14), tickets: [] },
  { id: 'sprint-2', name: 'Sprint 24.08', startDate: new Date(2024, 7, 1), endDate: new Date(2024, 7, 14), tickets: [] },
];

const generateTicketId = () => `TKT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
const ticketStatuses: TicketStatus[] = ['Todo', 'In Progress', 'Code Review', 'QA Ready', 'QA', 'Done'];

export default function TicketsPage() {
  const [sprints, setSprints] = useState<Sprint[]>(mockSprints);
  const [tickets, setTickets] = useState<Ticket[]>([]); // Manage tickets globally for now
  const [selectedSprintId, setSelectedSprintId] = useState<string | undefined>(mockSprints[0]?.id);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const currentSprint = useMemo(() => sprints.find(s => s.id === selectedSprintId), [sprints, selectedSprintId]);
  const sprintTickets = useMemo(() => tickets
    .filter(t => t.sprintId === selectedSprintId)
    .sort((a, b) => a.order - b.order), [tickets, selectedSprintId]);

  // --- Ticket CRUD ---
  const handleAddTicket = (formData: Omit<Ticket, 'id' | 'order'>) => {
    if (!selectedSprintId) {
        toast({ title: "No Sprint Selected", description: "Please select a sprint first.", variant: "destructive" });
        return;
    }
    const maxOrder = sprintTickets.reduce((max, t) => Math.max(max, t.order), 0);
    const newTicket: Ticket = {
      ...formData,
      id: generateTicketId(),
      order: maxOrder + 1,
      sprintId: selectedSprintId,
    };
    setTickets([...tickets, newTicket]);
    toast({ title: "Ticket Added", description: `Ticket "${newTicket.name}" created.` });
    setIsAddDialogOpen(false); // Close dialog
  };

  const handleUpdateTicket = (updatedTicket: Ticket) => {
    setTickets(tickets.map(t => t.id === updatedTicket.id ? updatedTicket : t));
    toast({ title: "Ticket Updated", description: `Ticket "${updatedTicket.name}" saved.` });
    setEditingTicket(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteTicket = (id: string) => {
    const ticketToDelete = tickets.find(t => t.id === id);
    setTickets(tickets.filter(t => t.id !== id));
     toast({ title: "Ticket Deleted", description: `Ticket "${ticketToDelete?.name}" removed.` });
  };

  const handleStatusChange = (ticketId: string, newStatus: TicketStatus) => {
     setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
  };

  const handlePostScrumJiraComment = async (ticket: Ticket) => {
    if (!ticket.postScrumDiscussionResults) {
      toast({ title: "No Discussion Results", description: "Cannot generate comment without discussion results.", variant: "destructive" });
      return;
    }
    // TODO: Potentially use AI to refine the comment body
    const commentBody = `Post-scrum discussion summary:\n\n${ticket.postScrumDiscussionResults}`;
    try {
        const success = await postCommentToJira(ticket.id, { body: commentBody });
        if (success) {
            toast({ title: "Comment Posted", description: `Comment added to Jira ticket ${ticket.id}.` });
        } else {
            throw new Error("Failed to post comment.");
        }
    } catch (error) {
        console.error("Failed to post comment to Jira:", error);
        toast({ title: "Jira Error", description: "Could not post comment to Jira.", variant: "destructive" });
    }
  };

  // --- Drag and Drop (Basic Placeholder) ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, ticketId: string) => {
    e.dataTransfer.setData("ticketId", ticketId);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetOrder: number) => {
    const draggedTicketId = e.dataTransfer.getData("ticketId");
    if (!draggedTicketId || !selectedSprintId) return;

    const currentTickets = tickets.filter(t => t.sprintId === selectedSprintId).sort((a, b) => a.order - b.order);
    const draggedIndex = currentTickets.findIndex(t => t.id === draggedTicketId);
    if (draggedIndex === -1) return;

    const draggedTicket = currentTickets[draggedIndex];
    const remainingTickets = currentTickets.filter(t => t.id !== draggedTicketId);

    // Find the index where the ticket should be inserted based on targetOrder
    // This logic needs refinement for precise placement between items
    let insertIndex = remainingTickets.findIndex(t => t.order >= targetOrder);
    if (insertIndex === -1) {
        insertIndex = remainingTickets.length; // Append to end if targetOrder is highest
    } else if (currentTickets[draggedIndex].order < targetOrder) {
         // Adjust index if dragging down
        // insertIndex needs careful calculation based on drop position relative to target element
    }


    const newOrderedTickets = [
        ...remainingTickets.slice(0, insertIndex),
        draggedTicket,
        ...remainingTickets.slice(insertIndex)
    ];

    // Re-assign order based on new position
    const updatedTickets = newOrderedTickets.map((t, index) => ({ ...t, order: index + 1 }));

    // Update global tickets state
    setTickets(prevTickets => [
      ...prevTickets.filter(t => t.sprintId !== selectedSprintId), // Keep tickets from other sprints
      ...updatedTickets // Add the reordered tickets for the current sprint
    ]);

     toast({ title: "Ticket Order Updated", description: "Ticket order saved for this sprint." });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow drop
  };

  const openEditDialog = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
        <div className="flex gap-2 w-full md:w-auto">
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
             <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!selectedSprintId}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Ticket
                </Button>
              </DialogTrigger>
              <TicketFormDialog
                sprintId={selectedSprintId}
                onSubmit={handleAddTicket}
                onClose={() => setIsAddDialogOpen(false)}
                dialogOpen={isAddDialogOpen}
                title="Add New Ticket"
                description="Fill in the details for the new ticket."
              />
            </Dialog>
        </div>
      </div>

       {!selectedSprintId && (
         <Card className="flex items-center justify-center h-40 border-dashed border-2">
            <p className="text-muted-foreground">Please select a sprint to view or add tickets.</p>
        </Card>
       )}

      {currentSprint && (
        <div
          className="space-y-4 min-h-[200px]" // Add min-height for drop zone
          onDrop={(e) => handleDrop(e, sprintTickets.length + 1)} // Drop at the end
          onDragOver={handleDragOver}
        >
          {sprintTickets.length === 0 ? (
             <Card className="flex items-center justify-center h-40 border-dashed border-2">
                <p className="text-muted-foreground">No tickets found for "{currentSprint.name}". Add one!</p>
             </Card>
          ) : (
            sprintTickets.map((ticket, index) => (
              <Card
                key={ticket.id}
                className="shadow-sm hover:shadow-md transition-shadow"
                draggable
                onDragStart={(e) => handleDragStart(e, ticket.id)}
                onDrop={(e) => { e.stopPropagation(); handleDrop(e, ticket.order); }} // Drop onto another ticket
                onDragOver={handleDragOver} // Allow dropping onto tickets
              >
                <CardHeader className="flex flex-row items-start justify-between gap-4 p-4">
                    <div className="flex items-center gap-2 cursor-grab">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <CardTitle className="text-lg">{ticket.id}: {ticket.name}</CardTitle>
                            {ticket.description && <CardDescription className="text-xs mt-1">{ticket.description}</CardDescription>}
                        </div>
                    </div>
                   <div className="flex items-center gap-2 flex-shrink-0">
                     <Select value={ticket.status} onValueChange={(value) => handleStatusChange(ticket.id, value as TicketStatus)}>
                        <SelectTrigger className="w-[150px] text-xs h-8">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            {ticketStatuses.map(status => (
                            <SelectItem key={status} value={status} className="text-xs">{status}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEditDialog(ticket)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete ticket "{ticket.name}".
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTicket(ticket.id)}>
                            Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                {(ticket.markForPostScrum || ticket.specialNotes) && (
                    <CardContent className="p-4 pt-0 text-xs space-y-2">
                         {ticket.specialNotes && (
                            <p><strong>Notes:</strong> {ticket.specialNotes}</p>
                         )}
                         {ticket.markForPostScrum && (
                            <div className="border-t pt-2 mt-2 space-y-1">
                                <p className="flex items-center gap-1 font-semibold"><AlertCircle className="h-3 w-3 text-accent"/> Post-Scrum</p>
                                {ticket.postScrumPrepNotes && <p><strong>Prep:</strong> {ticket.postScrumPrepNotes}</p>}
                                {ticket.postScrumDiscussionResults && <p><strong>Results:</strong> {ticket.postScrumDiscussionResults}</p>}
                                {ticket.postScrumDiscussionResults && (
                                    <Button size="sm" variant="link" className="p-0 h-auto text-xs" onClick={() => handlePostScrumJiraComment(ticket)}>
                                        Generate Jira Comment
                                    </Button>
                                )}
                            </div>
                         )}
                    </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      )}

        {/* Edit Dialog */}
        {editingTicket && (
             <TicketFormDialog
                key={editingTicket.id} // Force re-render on edit
                sprintId={editingTicket.sprintId}
                onSubmit={(data) => handleUpdateTicket({ ...editingTicket, ...data })}
                onClose={() => { setEditingTicket(null); setIsEditDialogOpen(false); }}
                initialData={editingTicket}
                dialogOpen={isEditDialogOpen}
                title={`Edit Ticket ${editingTicket.id}`}
                description="Update the details for this ticket."
              />
        )}

    </div>
  );
}


// --- Ticket Form Dialog Component ---
interface TicketFormDialogProps {
  sprintId: string | undefined;
  onSubmit: (data: Omit<Ticket, 'id' | 'order' | 'sprintId'> & { sprintId?: string }) => void;
  onClose: () => void;
  initialData?: Omit<Ticket, 'order' | 'sprintId'>; // For editing
  dialogOpen: boolean;
  title: string;
  description: string;
}

function TicketFormDialog({ sprintId, onSubmit, onClose, initialData, dialogOpen, title, description }: TicketFormDialogProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [ticketId, setTicketId] = useState(initialData?.id || ''); // Allow specifying ID
  const [desc, setDesc] = useState(initialData?.description || '');
  const [status, setStatus] = useState<TicketStatus>(initialData?.status || 'Todo');
  const [dailyWorkNote, setDailyWorkNote] = useState(initialData?.dailyWorkNote || '');
  const [specialNotes, setSpecialNotes] = useState(initialData?.specialNotes || '');
  const [markForPostScrum, setMarkForPostScrum] = useState(initialData?.markForPostScrum || false);
  const [postScrumPrepNotes, setPostScrumPrepNotes] = useState(initialData?.postScrumPrepNotes || '');
  const [postScrumDiscussionResults, setPostScrumDiscussionResults] = useState(initialData?.postScrumDiscussionResults || '');
  const [markForDemo, setMarkForDemo] = useState(initialData?.markForDemo || false);
  const [demoTestData, setDemoTestData] = useState(initialData?.demoTestData || '');
  const { toast } = useToast();


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast({ title: "Missing Name", description: "Ticket name is required.", variant: "destructive" });
      return;
    }
     // If editing, don't pass sprintId as it shouldn't change via form
     const dataToSubmit: Omit<Ticket, 'id' | 'order' | 'sprintId'> & { id?: string } = {
      name,
      description: desc,
      status,
      dailyWorkNote,
      specialNotes,
      markForPostScrum,
      postScrumPrepNotes,
      postScrumDiscussionResults,
      markForDemo,
      demoTestData,
    };

    if (initialData && ticketId) {
        dataToSubmit.id = ticketId; // Include ID if editing
    } else if (ticketId) {
        dataToSubmit.id = ticketId; // Allow setting ID on creation
    }


    onSubmit(dataToSubmit);
    // Resetting form fields might be needed here if not editing
    if (!initialData) {
      setName('');
      setTicketId('');
      setDesc('');
      setStatus('Todo');
      // ... reset other fields
    }
    // onClose(); // Let the parent component handle closing
  };

  return (
     <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
           <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ticket-id" className="text-right">Ticket ID</Label>
               <Input id="ticket-id" value={ticketId} onChange={e => setTicketId(e.target.value.toUpperCase())} placeholder="(Optional) TKT-123" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name*</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" required />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Description</Label>
            <Textarea id="description" value={desc} onChange={e => setDesc(e.target.value)} className="col-span-3 min-h-[60px]" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="status" className="text-right">Status</Label>
             <Select value={status} onValueChange={(value) => setStatus(value as TicketStatus)}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    {ticketStatuses.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                </SelectContent>
             </Select>
           </div>
           <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="daily-work" className="text-right">Daily Work</Label>
             <Textarea id="daily-work" value={dailyWorkNote} onChange={e => setDailyWorkNote(e.target.value)} placeholder="Note on daily progress..." className="col-span-3 min-h-[60px]" />
           </div>
           <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="special-notes" className="text-right">Special Notes</Label>
             <Textarea id="special-notes" value={specialNotes} onChange={e => setSpecialNotes(e.target.value)} placeholder="Any specific details..." className="col-span-3 min-h-[60px]" />
           </div>

           <div className="col-span-4 border-t my-2"></div>

            <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Post-Scrum</Label>
                <div className="col-span-3 space-y-3">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="mark-post-scrum" checked={markForPostScrum} onCheckedChange={(checked) => setMarkForPostScrum(Boolean(checked))} />
                        <Label htmlFor="mark-post-scrum" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Mark for Post-Scrum Discussion
                        </Label>
                    </div>
                     {markForPostScrum && (
                        <>
                         <Textarea value={postScrumPrepNotes} onChange={e => setPostScrumPrepNotes(e.target.value)} placeholder="Preparation Notes..." className="min-h-[60px]" />
                         <Textarea value={postScrumDiscussionResults} onChange={e => setPostScrumDiscussionResults(e.target.value)} placeholder="Discussion Results..." className="min-h-[60px]" />
                        </>
                     )}
                </div>
            </div>

             <div className="col-span-4 border-t my-2"></div>

            <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Demo Prep</Label>
                 <div className="col-span-3 space-y-3">
                     <div className="flex items-center space-x-2">
                         <Checkbox id="mark-demo" checked={markForDemo} onCheckedChange={(checked) => setMarkForDemo(Boolean(checked))} />
                         <Label htmlFor="mark-demo" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                             Include in Demo
                         </Label>
                     </div>
                     {markForDemo && (
                         <Textarea value={demoTestData} onChange={e => setDemoTestData(e.target.value)} placeholder="Test Data / Demo Steps..." className="min-h-[60px]" />
                     )}
                 </div>
            </div>

        </form>
        <DialogFooter>
          <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </DialogClose>
          {/* Use onClick to trigger form submission via the button */}
          <Button type="submit" form="ticket-form" onClick={handleSubmit}>Save Ticket</Button>
        </DialogFooter>
     </DialogContent>
  );
}
