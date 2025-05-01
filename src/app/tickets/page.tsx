
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { Ticket, TicketStatus } from '@/types/ticket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Edit, Trash2, GripVertical, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSprints } from '@/hooks/useSprints'; // Import sprint hook
import { useTickets } from '@/hooks/useTickets'; // Import ticket hook
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

const ticketStatuses: TicketStatus[] = ['Todo', 'In Progress', 'Code Review', 'QA Ready', 'QA', 'Done'];

export default function TicketsPage() {
  const { sprints } = useSprints(); // Use hook to get sprints
  const {
    tickets,
    addTicket,
    updateTicket,
    deleteTicket,
    updateTicketStatus,
    updateTicketsOrder,
    getTicketsBySprint,
    setTickets, // Get setTickets for direct manipulation if needed (e.g., delete sprint cascade)
  } = useTickets(); // Use hook for ticket management

  // Local state for UI control
  const [selectedSprintId, setSelectedSprintId] = useState<string | undefined>(() => sprints.length > 0 ? sprints[0].id : undefined);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  // Derived state
  const currentSprint = useMemo(() => sprints.find(s => s.id === selectedSprintId), [sprints, selectedSprintId]);
  const sprintTickets = useMemo(() => getTicketsBySprint(selectedSprintId), [getTicketsBySprint, selectedSprintId]);


  // --- Select Sprint Logic ---
  // Update selected sprint when sprints data changes (e.g., on initial load or after delete)
   React.useEffect(() => {
     if (!selectedSprintId && sprints.length > 0) {
       setSelectedSprintId(sprints[0].id);
     } else if (selectedSprintId && !sprints.some(s => s.id === selectedSprintId)) {
       // If the selected sprint was deleted, select the first available one or none
       setSelectedSprintId(sprints.length > 0 ? sprints[0].id : undefined);
     }
   }, [sprints, selectedSprintId]);


  // --- Ticket Operations ---
  const handleAddTicketSubmit = useCallback((formData: Omit<Ticket, 'id' | 'order'> & { id?: string }) => {
    if (!selectedSprintId) {
        toast({ title: "No Sprint Selected", description: "Please select a sprint first.", variant: "destructive" });
        return;
    }
    const createdTicket = addTicket({ ...formData, sprintId: selectedSprintId });
    toast({ title: "Ticket Added", description: `Ticket "${createdTicket.name}" created.` });
    setIsAddDialogOpen(false);
  }, [selectedSprintId, addTicket, toast]);

  const handleUpdateTicketSubmit = useCallback((updatedTicketData: Omit<Ticket, 'order' | 'sprintId'>) => {
     if (!editingTicket) return;
     const fullUpdatedTicket = { ...editingTicket, ...updatedTicketData }; // Ensure all fields are present
    updateTicket(fullUpdatedTicket);
    toast({ title: "Ticket Updated", description: `Ticket "${fullUpdatedTicket.name}" saved.` });
    setEditingTicket(null);
    setIsEditDialogOpen(false);
  }, [editingTicket, updateTicket, toast]);

  const handleDeleteTicketConfirm = useCallback((id: string) => {
    const ticketToDelete = tickets.find(t => t.id === id);
    deleteTicket(id);
     toast({ title: "Ticket Deleted", description: `Ticket "${ticketToDelete?.name}" removed.` });
  }, [deleteTicket, toast, tickets]);

   const handleStatusChange = useCallback((ticketId: string, newStatus: TicketStatus) => {
     updateTicketStatus(ticketId, newStatus);
      // Optionally toast success
     // toast({ title: "Status Updated", description: `Ticket ${ticketId} status changed to ${newStatus}.` });
  }, [updateTicketStatus]);


  const handlePostScrumJiraComment = async (ticket: Ticket) => {
    if (!ticket.postScrumDiscussionResults) {
      toast({ title: "No Discussion Results", description: "Cannot generate comment without discussion results.", variant: "destructive" });
      return;
    }
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

  // --- Drag and Drop ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, ticketId: string) => {
    e.dataTransfer.setData("ticketId", ticketId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetOrder: number) => {
    e.preventDefault(); // Prevent default drop behavior
    const draggedTicketId = e.dataTransfer.getData("ticketId");
    if (!draggedTicketId || !selectedSprintId) return;

    const currentTickets = getTicketsBySprint(selectedSprintId); // Get sorted tickets for the current sprint
    const draggedIndex = currentTickets.findIndex(t => t.id === draggedTicketId);
    if (draggedIndex === -1) return;

    const draggedTicket = currentTickets[draggedIndex];
    const remainingTickets = currentTickets.filter(t => t.id !== draggedTicketId);

    // Calculate the correct insertion index based on targetOrder
    // If dropping onto a ticket, targetOrder is that ticket's order.
    // If dropping into the empty space at the end, targetOrder can be tickets.length + 1
    let insertIndex = 0;
     if (targetOrder > draggedTicket.order) {
         // Dragging down: Find the index AFTER the target's original position
         insertIndex = remainingTickets.findIndex(t => t.order >= targetOrder);
         if (insertIndex === -1) {
             insertIndex = remainingTickets.length; // Insert at the end
         }
     } else {
         // Dragging up: Find the index AT the target's original position
        insertIndex = remainingTickets.findIndex(t => t.order >= targetOrder);
        if (insertIndex === -1 && remainingTickets.length > 0) {
             // This case shouldn't typically happen if targetOrder is valid, but handle defensively
             insertIndex = 0;
        } else if (insertIndex === -1 && remainingTickets.length === 0) {
            insertIndex = 0; // Inserting the only item
        }
     }


    const newOrderedTickets = [
        ...remainingTickets.slice(0, insertIndex),
        draggedTicket,
        ...remainingTickets.slice(insertIndex)
    ];

    updateTicketsOrder(selectedSprintId, newOrderedTickets); // Update order via hook

     toast({ title: "Ticket Order Updated", description: "Ticket order saved for this sprint." });
  };

   const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Necessary to allow drop
        e.dataTransfer.dropEffect = "move"; // Indicate it's a move operation
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
             <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!selectedSprintId}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Ticket
                </Button>
              </DialogTrigger>
              <TicketFormDialog
                key={isAddDialogOpen ? 'add-form' : 'closed-add-form'} // Force re-render on open/close if needed
                sprintId={selectedSprintId}
                onSubmit={handleAddTicketSubmit}
                onClose={() => setIsAddDialogOpen(false)}
                dialogOpen={isAddDialogOpen}
                title="Add New Ticket"
                description="Fill in the details for the new ticket."
              />
            </Dialog>
        </div>
      </div>

       {!selectedSprintId && sprints.length > 0 && (
         <Card className="flex items-center justify-center h-40 border-dashed border-2">
            <p className="text-muted-foreground">Please select a sprint to view or add tickets.</p>
        </Card>
       )}
        {!selectedSprintId && sprints.length === 0 && (
         <Card className="flex items-center justify-center h-40 border-dashed border-2">
            <p className="text-muted-foreground">No sprints available. Please <a href="/sprints" className="underline text-primary">create a sprint</a> first.</p>
        </Card>
       )}


      {currentSprint && (
        <div
          className="space-y-4 min-h-[200px]" // Add min-height for drop zone
          onDrop={(e) => handleDrop(e, sprintTickets.length + 1)} // Drop at the end
          onDragOver={handleDragOver}
        >
          {sprintTickets.length === 0 ? (
             <Card className="flex items-center justify-center h-40 border-dashed border-2" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 1)}>
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
                    <div className="flex items-center gap-2 cursor-grab flex-1 min-w-0" title="Drag to reorder">
                        <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">{ticket.id}: {ticket.name}</CardTitle>
                            {ticket.description && <CardDescription className="text-xs mt-1 line-clamp-2">{ticket.description}</CardDescription>}
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
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEditDialog(ticket)} title="Edit Ticket">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit Ticket</span>
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className="h-8 w-8" title="Delete Ticket">
                                <Trash2 className="h-4 w-4" />
                                 <span className="sr-only">Delete Ticket</span>
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
                            <AlertDialogAction onClick={() => handleDeleteTicketConfirm(ticket.id)}>
                            Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                {(ticket.markForPostScrum || ticket.specialNotes || ticket.dailyWorkNote) && (
                    <CardContent className="p-4 pt-0 text-xs space-y-2">
                         {ticket.dailyWorkNote && (
                            <p><strong>Daily Note:</strong> {ticket.dailyWorkNote}</p>
                         )}
                         {ticket.specialNotes && (
                             <p><strong>Special Notes:</strong> {ticket.specialNotes}</p>
                         )}
                         {ticket.markForPostScrum && (
                            <div className="border-t pt-2 mt-2 space-y-1">
                                <p className="flex items-center gap-1 font-semibold"><AlertCircle className="h-3 w-3 text-accent"/> Post-Scrum Marked</p>
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
                onSubmit={handleUpdateTicketSubmit}
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
  onSubmit: (data: Omit<Ticket, 'id' | 'order' | 'sprintId'> & { id?: string }) => void; // Allow optional ID for creation override
  onClose: () => void;
  initialData?: Ticket; // Use full Ticket type for editing
  dialogOpen: boolean;
  title: string;
  description: string;
}

function TicketFormDialog({ sprintId, onSubmit, onClose, initialData, dialogOpen, title, description }: TicketFormDialogProps) {
    // Initialize state based on initialData or defaults
  const [name, setName] = useState(initialData?.name ?? '');
  const [ticketId, setTicketId] = useState(initialData?.id ?? ''); // Allow specifying/editing ID
  const [desc, setDesc] = useState(initialData?.description ?? '');
  const [status, setStatus] = useState<TicketStatus>(initialData?.status ?? 'Todo');
  const [dailyWorkNote, setDailyWorkNote] = useState(initialData?.dailyWorkNote ?? '');
  const [specialNotes, setSpecialNotes] = useState(initialData?.specialNotes ?? '');
  const [markForPostScrum, setMarkForPostScrum] = useState(initialData?.markForPostScrum ?? false);
  const [postScrumPrepNotes, setPostScrumPrepNotes] = useState(initialData?.postScrumPrepNotes ?? '');
  const [postScrumDiscussionResults, setPostScrumDiscussionResults] = useState(initialData?.postScrumDiscussionResults ?? '');
  const [markForDemo, setMarkForDemo] = useState(initialData?.markForDemo ?? false);
  const [demoTestData, setDemoTestData] = useState(initialData?.demoTestData ?? '');
  const { toast } = useToast();

   // Reset form fields when the dialog opens for adding a new ticket,
   // or when the initialData changes (e.g., opening edit for a different ticket)
   React.useEffect(() => {
     if (dialogOpen) {
         setName(initialData?.name ?? '');
         setTicketId(initialData?.id ?? '');
         setDesc(initialData?.description ?? '');
         setStatus(initialData?.status ?? 'Todo');
         setDailyWorkNote(initialData?.dailyWorkNote ?? '');
         setSpecialNotes(initialData?.specialNotes ?? '');
         setMarkForPostScrum(initialData?.markForPostScrum ?? false);
         setPostScrumPrepNotes(initialData?.postScrumPrepNotes ?? '');
         setPostScrumDiscussionResults(initialData?.postScrumDiscussionResults ?? '');
         setMarkForDemo(initialData?.markForDemo ?? false);
         setDemoTestData(initialData?.demoTestData ?? '');
     }
   }, [dialogOpen, initialData]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast({ title: "Missing Name", description: "Ticket name is required.", variant: "destructive" });
      return;
    }

     const dataToSubmit: Omit<Ticket, 'order' | 'sprintId'> & { id?: string } = { // Omit fields managed by hook
      name,
      id: ticketId.trim() || undefined, // Submit ID if provided, otherwise let hook generate
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

    onSubmit(dataToSubmit);
    // onClose(); // Parent component handles closing after submission
  };

  return (
     <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {/* Assign an ID to the form for the submit button */}
        <form id="ticket-form" onSubmit={handleSubmit} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
           <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ticket-id" className="text-right">Ticket ID</Label>
               <Input
                  id="ticket-id"
                  value={ticketId}
                  onChange={e => setTicketId(e.target.value.toUpperCase().trim())}
                  placeholder={initialData ? "(Cannot change)" : "(Optional) TKT-123"}
                  className="col-span-3"
                  disabled={!!initialData} // Disable editing existing ID
                />
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
          {/* Use type="submit" and form="ticket-form" to trigger the form's onSubmit */}
          <Button type="submit" form="ticket-form">Save Ticket</Button>
        </DialogFooter>
     </DialogContent>
  );
}
