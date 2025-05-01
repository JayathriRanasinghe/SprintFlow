
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react'; // Import useEffect
import type { Ticket, TicketStatus } from '@/types/ticket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Edit, Trash2, GripVertical, AlertCircle, Copy, ClipboardCheck } from 'lucide-react'; // Added Copy, ClipboardCheck
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
// import { postCommentToJira } from '@/services/jira'; // Comment out or remove if not posting automatically
import { Separator } from '@/components/ui/separator'; // Import Separator

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
  const [selectedSprintId, setSelectedSprintId] = useState<string | undefined>(undefined);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); // State to control edit dialog
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false); // State to track mount
  const [generatedComments, setGeneratedComments] = useState<Record<string, string>>({}); // State for generated comments

  // --- Effects ---
  // Set initial sprint selection and track mount
  useEffect(() => {
    setIsMounted(true);
    if (!selectedSprintId && sprints.length > 0) {
      setSelectedSprintId(sprints[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprints]); // Rerun only if sprints list changes

  // Effect to handle sprint list changes (e.g., deletion)
  useEffect(() => {
    if (!isMounted) return; // Don't run on server

    // Check if the currently selected sprint still exists in the list
    if (selectedSprintId && !sprints.some(s => s.id === selectedSprintId)) {
      // If not, select the first available sprint or undefined if none exist
      setSelectedSprintId(sprints.length > 0 ? sprints[0].id : undefined);
    } else if (!selectedSprintId && sprints.length > 0) {
      // If no sprint is selected but sprints exist, select the first one
      setSelectedSprintId(sprints[0].id);
    }
  }, [sprints, selectedSprintId, isMounted]); // Re-run if sprints list or selection changes, or on mount


  // Derived state
  const currentSprint = useMemo(() => sprints.find(s => s.id === selectedSprintId), [sprints, selectedSprintId]);
  const sprintTickets = useMemo(() => getTicketsBySprint(selectedSprintId), [getTicketsBySprint, selectedSprintId]);


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
    setIsEditDialogOpen(false); // Close the dialog on successful update
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


  const handleGenerateJiraComment = useCallback((ticket: Ticket) => {
    if (!ticket.postScrumDiscussionResults) {
      toast({ title: "No Discussion Results", description: "Cannot generate comment without discussion results.", variant: "destructive" });
      return;
    }
    const commentBody = `Post-scrum discussion summary:\n\n${ticket.postScrumDiscussionResults}`;
    setGeneratedComments(prev => ({ ...prev, [ticket.id]: commentBody }));
    toast({ title: "Jira Comment Generated", description: "Comment ready to be copied." });
    // Remove automatic posting for now, focus on display and copy
    // try {
    //   const success = await postCommentToJira(ticket.id, { body: commentBody });
    //   if (success) {
    //     toast({ title: "Comment Posted", description: `Comment added to Jira ticket ${ticket.id}.` });
    //   } else {
    //     throw new Error("Failed to post comment.");
    //   }
    // } catch (error) {
    //   console.error("Failed to post comment to Jira:", error);
    //   toast({ title: "Jira Error", description: "Could not post comment to Jira.", variant: "destructive" });
    // }
  }, [toast]);

  const handleCopyComment = useCallback(async (commentText: string) => {
    try {
        await navigator.clipboard.writeText(commentText);
        toast({ title: "Comment Copied", description: "Jira comment copied to clipboard." });
    } catch (err) {
        console.error('Failed to copy text: ', err);
        toast({ title: "Copy Failed", description: "Could not copy comment to clipboard.", variant: "destructive" });
    }
  }, [toast]);


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

  // --- Dialog Control ---
  const openEditDialog = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setIsEditDialogOpen(true); // Open the edit dialog
  };

  const closeEditDialog = () => {
      setEditingTicket(null);
      setIsEditDialogOpen(false); // Close the edit dialog
  };

  // Render placeholder if not mounted yet to avoid hydration mismatch
  if (!isMounted) {
    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
                {/* Placeholder for select and button */}
                <div className="flex gap-2 w-full md:w-auto h-10">
                    <div className="w-full md:w-[200px] bg-muted rounded-md animate-pulse"></div>
                    <div className="w-[130px] bg-muted rounded-md animate-pulse"></div>
                </div>
            </div>
            <Card className="flex items-center justify-center h-40 border-dashed border-2">
                <p className="text-muted-foreground">Loading...</p>
            </Card>
        </div>
    );
  }


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <Select
            value={selectedSprintId ?? ''} // Ensure value is not undefined for Select
            onValueChange={setSelectedSprintId}
            disabled={sprints.length === 0}
          >
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
      {sprints.length === 0 && ( // Simplified condition
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
                    {/* Edit Button opens the edit dialog */}
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
                {(ticket.markForPostScrum || ticket.specialNotes || ticket.dailyWorkNote || generatedComments[ticket.id]) && ( // Check if comment exists
                  <CardContent className="p-4 pt-0 text-xs space-y-2">
                    {ticket.dailyWorkNote && (
                      <p><strong>Daily Note:</strong> {ticket.dailyWorkNote}</p>
                    )}
                    {ticket.specialNotes && (
                      <p><strong>Special Notes:</strong> {ticket.specialNotes}</p>
                    )}
                    {ticket.markForPostScrum && (
                      <div className="border-t pt-2 mt-2 space-y-1">
                        <p className="flex items-center gap-1 font-semibold"><AlertCircle className="h-3 w-3 text-accent" /> Post-Scrum Marked</p>
                        {ticket.postScrumPrepNotes && <p><strong>Prep:</strong> {ticket.postScrumPrepNotes}</p>}
                        {ticket.postScrumDiscussionResults && <p><strong>Results:</strong> {ticket.postScrumDiscussionResults}</p>}
                        {ticket.postScrumDiscussionResults && !generatedComments[ticket.id] && ( // Only show generate button if no comment exists
                          <Button size="sm" variant="link" className="p-0 h-auto text-xs" onClick={() => handleGenerateJiraComment(ticket)}>
                            Generate Jira Comment
                          </Button>
                        )}
                        {generatedComments[ticket.id] && ( // Show comment and copy button if comment exists
                          <div className="bg-muted p-2 rounded-md mt-1 space-y-1">
                            <p className="font-medium">Generated Comment:</p>
                            <pre className="whitespace-pre-wrap text-xs">{generatedComments[ticket.id]}</pre>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => handleCopyComment(generatedComments[ticket.id]!)}>
                              <Copy className="h-3 w-3 mr-1" /> Copy Comment
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                     {!ticket.markForPostScrum && generatedComments[ticket.id] && ( // Show comment even if not marked for post-scrum anymore, if it exists
                          <div className="border-t pt-2 mt-2 space-y-1 bg-muted p-2 rounded-md">
                             <p className="font-medium">Previously Generated Comment:</p>
                            <pre className="whitespace-pre-wrap text-xs">{generatedComments[ticket.id]}</pre>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => handleCopyComment(generatedComments[ticket.id]!)}>
                              <Copy className="h-3 w-3 mr-1" /> Copy Comment
                            </Button>
                          </div>
                        )}
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* Edit Ticket Dialog - Rendered conditionally based on isEditDialogOpen */}
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
         <TicketFormDialog
           key={editingTicket ? `edit-${editingTicket.id}` : 'closed-edit-form'} // Use ticket ID in key
           sprintId={editingTicket?.sprintId} // Pass sprintId from editingTicket
           onSubmit={handleUpdateTicketSubmit}
           onClose={closeEditDialog}
           initialData={editingTicket ?? undefined} // Pass editingTicket as initialData
           dialogOpen={isEditDialogOpen} // Control visibility
           title={editingTicket ? `Edit Ticket ${editingTicket.id}` : 'Edit Ticket'}
           description="Update the details for this ticket."
         />
       </Dialog>

    </div>
  );
}


// --- Ticket Form Dialog Component ---
interface TicketFormDialogProps {
  sprintId: string | undefined;
  onSubmit: (data: Omit<Ticket, 'order' | 'sprintId'> & { id?: string }) => void; // Allow optional ID for creation override
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
     if (!sprintId && !initialData) { // Check sprintId only if adding a new ticket
        toast({ title: "Missing Sprint ID", description: "Cannot determine sprint for new ticket.", variant: "destructive" });
        return;
     }


    const dataToSubmit: Omit<Ticket, 'order' | 'sprintId'> & { id?: string } = { // Omit fields managed by hook
      name,
      id: ticketId.trim() || undefined, // Submit ID if provided (only for editing), otherwise let hook generate for add
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

     // For adding, ensure the ID is not passed if empty, so the hook generates it.
     // For editing, the ID from initialData should always be present.
     if (!initialData && !ticketId.trim()) {
       delete dataToSubmit.id;
     } else if (initialData) {
        dataToSubmit.id = initialData.id; // Ensure existing ID is used for update
     }


    onSubmit(dataToSubmit);
    // onClose(); // Let the parent component handle closing on successful submission
  };

  return (
     // Wrap the form content in DialogContent
    <DialogContent className="sm:max-w-[700px]">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {/* Assign an ID to the form for the submit button */}
      {/* Removed padding from the form, relies on DialogContent padding */}
      <form id="ticket-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-y-4 gap-x-4 max-h-[70vh] overflow-y-auto p-1"> {/* Added p-1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Nested grid for ID and Name */}
            <div className="space-y-1">
                <Label htmlFor="ticket-id">Ticket ID</Label>
                <Input
                    id="ticket-id"
                    value={ticketId}
                    onChange={e => setTicketId(e.target.value.toUpperCase().trim())}
                    placeholder={initialData ? "(Cannot change)" : "(Optional) TKT-123"}
                    disabled={!!initialData} // Disable editing existing ID
                    className="focus-visible:ring-offset-0" // Remove offset
                />
            </div>
             <div className="space-y-1">
                <Label htmlFor="name">Name*</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required className="focus-visible:ring-offset-0" />
            </div>
        </div>

         <div className="space-y-1">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={desc} onChange={e => setDesc(e.target.value)} className="min-h-[60px] focus-visible:ring-offset-0" />
        </div>

         <div className="space-y-1">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as TicketStatus)}>
                <SelectTrigger className="focus-visible:ring-offset-0">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                {ticketStatuses.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
                </SelectContent>
            </Select>
        </div>

         <div className="space-y-1">
          <Label htmlFor="daily-work">Daily Work Note</Label>
          <Textarea id="daily-work" value={dailyWorkNote} onChange={e => setDailyWorkNote(e.target.value)} placeholder="Note on daily progress..." className="min-h-[60px] focus-visible:ring-offset-0" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="special-notes">Special Notes</Label>
          <Textarea id="special-notes" value={specialNotes} onChange={e => setSpecialNotes(e.target.value)} placeholder="Any specific details (e.g., blockers, dependencies)..." className="min-h-[60px] focus-visible:ring-offset-0" />
        </div>

        <Separator className="my-4" /> {/* Use Separator */}

        <div className="space-y-3 rounded-md border p-4 shadow-sm"> {/* Add border and padding */}
            <h3 className="text-base font-medium mb-2">Post-Scrum Planning</h3>
            <div className="flex items-center space-x-2">
              <Checkbox id="mark-post-scrum" checked={markForPostScrum} onCheckedChange={(checked) => setMarkForPostScrum(Boolean(checked))} />
              <Label htmlFor="mark-post-scrum" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Mark for Post-Scrum Discussion
              </Label>
            </div>
            {markForPostScrum && (
              <div className="space-y-3 pl-6"> {/* Indent notes */}
                 <div className="space-y-1">
                    <Label htmlFor="post-scrum-prep">Preparation Notes</Label>
                    <Textarea id="post-scrum-prep" value={postScrumPrepNotes} onChange={e => setPostScrumPrepNotes(e.target.value)} placeholder="What needs to be discussed or prepared?" className="min-h-[60px] focus-visible:ring-offset-0" />
                 </div>
                 <div className="space-y-1">
                     <Label htmlFor="post-scrum-results">Discussion Results</Label>
                    <Textarea id="post-scrum-results" value={postScrumDiscussionResults} onChange={e => setPostScrumDiscussionResults(e.target.value)} placeholder="Summary of discussion and outcomes..." className="min-h-[60px] focus-visible:ring-offset-0" />
                 </div>
              </div>
            )}
        </div>

        <Separator className="my-4" /> {/* Use Separator */}

        <div className="space-y-3 rounded-md border p-4 shadow-sm"> {/* Add border and padding */}
           <h3 className="text-base font-medium mb-2">Demo Preparation</h3>
            <div className="flex items-center space-x-2">
              <Checkbox id="mark-demo" checked={markForDemo} onCheckedChange={(checked) => setMarkForDemo(Boolean(checked))} />
              <Label htmlFor="mark-demo" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Include in Demo
              </Label>
            </div>
            {markForDemo && (
               <div className="space-y-1 pl-6"> {/* Indent notes */}
                 <Label htmlFor="demo-data">Test Data / Demo Steps</Label>
                 <Textarea id="demo-data" value={demoTestData} onChange={e => setDemoTestData(e.target.value)} placeholder="Login credentials, specific data IDs, navigation steps, expected results..." className="min-h-[60px] focus-visible:ring-offset-0" />
               </div>
            )}
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

    