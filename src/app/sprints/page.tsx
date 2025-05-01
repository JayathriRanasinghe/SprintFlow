
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { useToast } from '@/hooks/use-toast';
import { useSprints } from '@/hooks/useSprints'; // Import the hook
import { useTickets } from '@/hooks/useTickets'; // Import useTickets hook for deletion cascade
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


export default function SprintsPage() {
  const { sprints, addSprint, deleteSprint } = useSprints(); // Use the hook
  const { tickets, setTickets } = useTickets(); // Use tickets hook
  const [newSprintName, setNewSprintName] = useState('');
  const [newStartDate, setNewStartDate] = useState<Date | undefined>();
  const [newEndDate, setNewEndDate] = useState<Date | undefined>();
  const { toast } = useToast();

  const handleAddSprint = () => {
    if (!newSprintName || !newStartDate || !newEndDate) {
      toast({
        title: "Missing Information",
        description: "Please provide a name, start date, and end date for the sprint.",
        variant: "destructive",
      });
      return;
    }
    if (newEndDate <= newStartDate) {
       toast({
        title: "Invalid Dates",
        description: "End date must be after start date.",
        variant: "destructive",
      });
      return;
    }

    // Calculate demo day
    const demoDay = subDays(newEndDate, 1);

    // Add sprint using the hook's function
    addSprint({
      name: newSprintName,
      startDate: newStartDate,
      endDate: newEndDate,
      demoDay: demoDay,
    });

    // Reset form
    setNewSprintName('');
    setNewStartDate(undefined);
    setNewEndDate(undefined);
    toast({
      title: "Sprint Added",
      description: `Sprint "${newSprintName}" has been created.`,
    });
  };

  const handleDeleteSprint = (id: string) => {
    // Delete the sprint using the hook
    deleteSprint(id);
    // Also delete associated tickets
    setTickets(prevTickets => prevTickets.filter(ticket => ticket.sprintId !== id));
     toast({
      title: "Sprint Deleted",
      description: "The sprint and its associated tickets have been removed.",
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Manage Sprints</h1>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Add New Sprint</CardTitle>
          <CardDescription>Define the timeline for a new sprint.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label htmlFor="sprintName">Sprint Name</Label>
            <Input
              id="sprintName"
              placeholder="e.g., Sprint 24.07"
              value={newSprintName}
              onChange={(e) => setNewSprintName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newStartDate ? format(newStartDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={newStartDate}
                  onSelect={setNewStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newEndDate ? format(newEndDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={newEndDate}
                  onSelect={setNewEndDate}
                  disabled={(date) =>
                    newStartDate ? date <= newStartDate : false
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleAddSprint}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Sprint
          </Button>
        </CardFooter>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Existing Sprints</h2>
        {sprints.length === 0 ? (
          <Card className="flex items-center justify-center h-40 border-dashed border-2">
             <p className="text-muted-foreground">No sprints created yet. Add one above!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sprints.map((sprint) => (
              <Card key={sprint.id} className="shadow-sm flex flex-col justify-between">
                <CardHeader>
                  <CardTitle>{sprint.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Start:</strong> {format(sprint.startDate, "PPP")}</p>
                  <p><strong>End:</strong> {format(sprint.endDate, "PPP")}</p>
                  <p><strong>Demo Day:</strong> {sprint.demoDay ? format(sprint.demoDay, "PPP") : 'N/A'}</p>
                  {/* Count tickets directly from the tickets hook */}
                  <p><strong>Tickets:</strong> {tickets.filter(t => t.sprintId === sprint.id).length}</p>
                </CardContent>
                 <CardFooter className="flex justify-end">
                   <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                       </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the sprint
                          "{sprint.name}" and all associated tickets.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteSprint(sprint.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

