
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { useTickets } from '@/hooks/useTickets'; // Import ticket hook
import { generateStandupUpdate, type GenerateStandupUpdateInput, type GenerateStandupUpdateOutput } from '@/ai/flows/generate-standup-update';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { tickets } = useTickets(); // Use the hook to get tickets
  const [standupUpdate, setStandupUpdate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dailyWork, setDailyWork] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false); // State to track client mount
  const { toast } = useToast();

   // Memoize active tickets
   const activeTickets = useMemo(() => {
     return tickets.filter(t => t.status !== 'Done' && t.status !== 'QA');
   }, [tickets]);

   // Effect to track client-side mount
   useEffect(() => {
     setIsMounted(true);
   }, []);


  const handleGenerateStandup = async () => {
    setIsLoading(true);
    setStandupUpdate('');

    try {
       // Prepare input for the AI flow using data from the hook
       const postScrumTickets = tickets.filter(t => t.markForPostScrum).map(t => t.id);
       const postScrumDiscussionPrepNotes: Record<string, string> = {};
       const postScrumDiscussionResults: Record<string, string> = {};
       tickets.forEach(t => {
         if (t.markForPostScrum) {
           postScrumDiscussionPrepNotes[t.id] = t.postScrumPrepNotes || '';
           postScrumDiscussionResults[t.id] = t.postScrumDiscussionResults || '';
         }
       });

        // Include daily work notes from tickets in the main work description
        const ticketWorkNotes = activeTickets
         .map(t => t.dailyWorkNote ? `${t.id}: ${t.dailyWorkNote}` : null)
         .filter(Boolean) // Remove null entries
         .join('\n');

       const combinedWorkDescription = [
         dailyWork || 'Working on assigned tickets.',
         ticketWorkNotes ? `\nTicket Progress:\n${ticketWorkNotes}` : ''
        ].filter(Boolean).join('\n');


      const input: GenerateStandupUpdateInput = {
        currentWork: combinedWorkDescription,
        ticketNumbers: activeTickets.map(t => t.id).join(', ') || 'No active tickets',
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

  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8 space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Daily Stand-up Update</CardTitle>
          <CardDescription>
            Enter your main focus for today. The update will automatically include progress notes from your active tickets and relevant post-scrum discussion summaries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <Textarea
            placeholder="What is your primary non-ticket focus today? (e.g., Planning meeting, helping team member...)"
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
           {isLoading && !standupUpdate && (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Generating...</p>
                </div>
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
              {/* Defer rendering ticket list until mounted to avoid hydration mismatch */}
              {!isMounted ? (
                 <p className="text-sm text-muted-foreground">Loading tickets...</p>
              ) : activeTickets.length === 0 ? (
                 <p className="text-sm text-muted-foreground">No active tickets found.</p>
              ) : (
                 <ul className="list-disc pl-5 space-y-1 text-sm">
                   {activeTickets.map(ticket => (
                     <li key={ticket.id}>
                        <a href="/tickets" className="hover:underline text-primary">
                            {ticket.id}
                        </a>: {ticket.name} ({ticket.status})
                        {ticket.dailyWorkNote && <p className="text-xs text-muted-foreground pl-2">↳ {ticket.dailyWorkNote}</p>}
                     </li>
                   ))}
                 </ul>
              )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
