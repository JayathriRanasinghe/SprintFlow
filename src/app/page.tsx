'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { generateStandupUpdate, type GenerateStandupUpdateInput, type GenerateStandupUpdateOutput } from '@/ai/flows/generate-standup-update'; // Assuming the AI flow exists
import { Loader2 } from 'lucide-react';

// Mock data - replace with actual data fetching later
const mockTickets = [
  { id: 'TKT-1', name: 'Implement login feature', status: 'In Progress', markForPostScrum: true, postScrumPrepNotes: 'Discuss API contract', postScrumDiscussionResults: 'Agreed on v2 API endpoint', dailyWorkNote: 'Finished frontend validation' },
  { id: 'TKT-2', name: 'Fix button styling', status: 'Todo', markForPostScrum: false, dailyWorkNote: '' },
  { id: 'TKT-3', name: 'Setup CI/CD pipeline', status: 'In Progress', markForPostScrum: false, dailyWorkNote: 'Debugging build script' },
];

export default function Home() {
  const [standupUpdate, setStandupUpdate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dailyWork, setDailyWork] = useState<string>(''); // Example state for daily work input
  const { toast } = useToast();

  const handleGenerateStandup = async () => {
    setIsLoading(true);
    setStandupUpdate('');

    try {
       // Prepare input for the AI flow
       const postScrumTickets = mockTickets.filter(t => t.markForPostScrum).map(t => t.id);
       const postScrumDiscussionPrepNotes: Record<string, string> = {};
       const postScrumDiscussionResults: Record<string, string> = {};
       mockTickets.forEach(t => {
         if (t.markForPostScrum) {
           postScrumDiscussionPrepNotes[t.id] = t.postScrumPrepNotes || '';
           postScrumDiscussionResults[t.id] = t.postScrumDiscussionResults || '';
         }
       });

      const input: GenerateStandupUpdateInput = {
        currentWork: dailyWork || 'Working on assigned tickets.', // Use input or default
        ticketNumbers: mockTickets.map(t => t.id).join(', '),
        postScrumTickets: postScrumTickets,
        postScrumDiscussionPrepNotes: postScrumDiscussionPrepNotes,
        postScrumDiscussionResults: postScrumDiscussionResults,
      };

      const result: GenerateStandupUpdateOutput = await generateStandupUpdate(input);
      setStandupUpdate(result.standupUpdate);
      toast({
        title: "Stand-up Update Generated",
        description: "Your daily stand-up update is ready.",
      });
    } catch (error) {
      console.error("Error generating stand-up update:", error);
      toast({
        title: "Error Generating Update",
        description: "Could not generate stand-up update. Please try again.",
        variant: "destructive",
      });
      setStandupUpdate('Failed to generate stand-up update.');
    } finally {
      setIsLoading(false);
    }
  };

  // Optionally generate on load or keep it manual
  // useEffect(() => {
  //   handleGenerateStandup();
  // }, []);

  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8 space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Daily Stand-up Update</CardTitle>
          <CardDescription>
            Enter your main focus for today and generate your stand-up update. It will include tickets in progress and post-scrum notes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <Textarea
            placeholder="What are you primarily working on today? (e.g., Finishing TKT-1 login UI, starting TKT-2 styling fix...)"
            value={dailyWork}
            onChange={(e) => setDailyWork(e.target.value)}
            className="min-h-[60px]"
          />
          <Button onClick={handleGenerateStandup} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generate Update
          </Button>
          {standupUpdate && (
            <Card className="bg-secondary p-4 mt-4">
              <CardTitle className="text-base mb-2">Generated Update:</CardTitle>
              <p className="text-sm whitespace-pre-wrap">{standupUpdate}</p>
            </Card>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
                <Button variant="link" className="justify-start p-0 h-auto" asChild><a href="/sprints">Manage Sprints</a></Button>
                <Button variant="link" className="justify-start p-0 h-auto" asChild><a href="/tickets">View All Tickets</a></Button>
                 <Button variant="link" className="justify-start p-0 h-auto" asChild><a href="/demo">Prepare Demo Day</a></Button>
            </CardContent>
        </Card>
         <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Current Tickets Overview</CardTitle>
                <CardDescription>Summary of your active tickets.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Replace with dynamic ticket list later */}
                <ul className="list-disc pl-5 space-y-1 text-sm">
                   {mockTickets.filter(t => t.status !== 'Done' && t.status !== 'QA').map(ticket => (
                     <li key={ticket.id}>{ticket.id}: {ticket.name} ({ticket.status})</li>
                   ))}
                </ul>
                 {mockTickets.filter(t => t.status !== 'Done' && t.status !== 'QA').length === 0 && (
                    <p className="text-sm text-muted-foreground">No active tickets found.</p>
                 )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
