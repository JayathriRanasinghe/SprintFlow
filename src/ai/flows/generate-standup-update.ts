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
  currentWork: z.string().describe('A description of the work currently being done.'),
  ticketNumbers: z.string().describe('A comma-separated list of ticket numbers being worked on.'),
  postScrumTickets: z
    .array(z.string())
    .describe(
      'An array of ticket numbers that have had post-scrum discussions.  Include ONLY the ticket number, not the full details.'
    ),
  postScrumDiscussionPrepNotes: z
    .record(z.string(), z.string())
    .describe(
      'A map of ticket numbers to the preparation notes for the post-scrum discussion for each ticket. The keys are ticket numbers and the values are the notes.'
    ),
  postScrumDiscussionResults: z
    .record(z.string(), z.string())
    .describe(
      'A map of ticket numbers to the results of the post-scrum discussion for each ticket. The keys are ticket numbers and the values are the results.'
    ),
});

export type GenerateStandupUpdateInput = z.infer<typeof GenerateStandupUpdateInputSchema>;

const GenerateStandupUpdateOutputSchema = z.object({
  standupUpdate: z.string().describe('The generated stand-up update.'),
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
  prompt: `You are a helpful assistant helping a developer prepare their daily standup update.

    Here is what the developer is currently working on: {{{currentWork}}}
    Here are the ticket numbers they are working on: {{{ticketNumbers}}}

    The following tickets had post-scrum discussions.  For each ticket, you are provided with the preparation notes and the results of the discussion.  Summarize the results of each discussion and include it in the standup update IF it seems relevant to the developer's work.

    {{#each postScrumTickets}}
      Ticket Number: {{this}}
      Preparation Notes: {{{../postScrumDiscussionPrepNotes.[this]}}}
      Discussion Results: {{{../postScrumDiscussionResults.[this]}}}
    {{/each}}

    Generate a concise standup update, including the current work, ticket numbers, and summaries of any relevant post-scrum discussions.
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
    const {output} = await generateStandupUpdatePrompt(input);
    return output!;
  }
);
