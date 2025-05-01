
'use server';

/**
 * @fileOverview Generates a daily stand-up update for a developer, including current work, ticket numbers,
 * and summaries of post-scrum discussions for relevant tickets.
 *
 * - generateStandupUpdate - A function that generates the standup update.
 * - GenerateStandupUpdateInput - The input type for the generateStandupUpdate function.
 * - GenerateStandupUpdateOutput - The return type for the generateStandupUpdate function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateStandupUpdateInputSchema = z.object({
  currentWork: z.string().describe('A description of the work currently being done, including any notes from specific tickets.'),
  ticketNumbers: z.string().optional().describe('A comma-separated list of ACTIVE ticket numbers being worked on. Can be empty.'),
  postScrumTickets: z
    .array(z.string())
    .describe(
      'An array of ticket numbers that have had post-scrum discussions. Include ONLY the ticket number.'
    ),
  postScrumDiscussionPrepNotes: z
    .record(z.string(), z.string())
    .describe(
      'A map of ticket numbers to the preparation notes for the post-scrum discussion for each ticket.'
    ),
  postScrumDiscussionResults: z
    .record(z.string(), z.string())
    .describe(
      'A map of ticket numbers to the results of the post-scrum discussion for each ticket.'
    ),
});

export type GenerateStandupUpdateInput = z.infer<typeof GenerateStandupUpdateInputSchema>;

const GenerateStandupUpdateOutputSchema = z.object({
  standupUpdate: z.string().describe('The generated stand-up update, suitable for posting in Slack or saying verbally.'),
});

export type GenerateStandupUpdateOutput = z.infer<typeof GenerateStandupUpdateOutputSchema>;

export async function generateStandupUpdate(input: GenerateStandupUpdateInput): Promise<GenerateStandupUpdateOutput> {
  return generateStandupUpdateFlow(input);
}

const generateStandupUpdatePrompt = ai.definePrompt({
  name: 'generateStandupUpdatePrompt',
  input: {
    schema: GenerateStandupUpdateInputSchema,
  },
  output: {
    schema: GenerateStandupUpdateOutputSchema,
  },
  prompt: `You are a helpful assistant helping a developer prepare their daily standup update. The output should be concise and ready to be pasted into a chat or read aloud.

    Here is what the developer is currently working on (including specific ticket progress):
    {{{currentWork}}}

    {{#if ticketNumbers}}
    Active ticket numbers: {{{ticketNumbers}}}
    {{else}}
    No specific active tickets assigned currently.
    {{/if}}

    The following tickets had post-scrum discussions. Summarize the results of each discussion concisely and include it in the update IF it seems relevant to the overall status or current work. Phrase it naturally as part of the update.

    {{#each postScrumTickets}}
      Ticket Number: {{this}}
      Preparation Notes: {{{lookup ../postScrumDiscussionPrepNotes this}}}
      Discussion Results: {{{lookup ../postScrumDiscussionResults this}}}
    {{/each}}

    Generate a concise standup update based on the provided information. Focus on clarity and brevity.
  `,
});


const generateStandupUpdateFlow = ai.defineFlow<
  typeof GenerateStandupUpdateInputSchema,
  typeof GenerateStandupUpdateOutputSchema
>(
  {
    name: 'generateStandupUpdateFlow',
    inputSchema: GenerateStandupUpdateInputSchema,
    outputSchema: GenerateStandupUpdateOutputSchema,
  },
  async input => {
    // Ensure empty strings are passed if notes/results are missing, Handlebars expects keys to exist
     const prepNotes = { ...input.postScrumDiscussionPrepNotes };
     const resultsNotes = { ...input.postScrumDiscussionResults };
     input.postScrumTickets.forEach(ticketId => {
         if (!(ticketId in prepNotes)) prepNotes[ticketId] = '';
         if (!(ticketId in resultsNotes)) resultsNotes[ticketId] = '';
     });

     const processedInput = {
         ...input,
         postScrumDiscussionPrepNotes: prepNotes,
         postScrumDiscussionResults: resultsNotes,
     };


    const {output} = await generateStandupUpdatePrompt(processedInput);
    return output!;
  }
);

