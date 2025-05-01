
'use server';

/**
 * @fileOverview Rewrites raw post-scrum discussion results into a professional Jira comment.
 *
 * - generateJiraComment - A function that takes discussion results and returns a polished comment.
 * - GenerateJiraCommentInput - The input type for the generateJiraComment function.
 * - GenerateJiraCommentOutput - The return type for the generateJiraComment function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateJiraCommentInputSchema = z.object({
  discussionResults: z.string().describe('The raw notes summarizing the results of a post-scrum discussion.'),
});

export type GenerateJiraCommentInput = z.infer<typeof GenerateJiraCommentInputSchema>;

const GenerateJiraCommentOutputSchema = z.object({
  jiraComment: z.string().describe('The professionally rewritten comment suitable for posting on a Jira ticket.'),
});

export type GenerateJiraCommentOutput = z.infer<typeof GenerateJiraCommentOutputSchema>;

export async function generateJiraComment(input: GenerateJiraCommentInput): Promise<GenerateJiraCommentOutput> {
  return generateJiraCommentFlow(input);
}

const generateJiraCommentPrompt = ai.definePrompt({
  name: 'generateJiraCommentPrompt',
  input: {
    schema: GenerateJiraCommentInputSchema,
  },
  output: {
    schema: GenerateJiraCommentOutputSchema,
  },
  prompt: `You are an assistant helping a software development team. Your task is to rewrite the provided post-scrum discussion results into a clear, concise, professional, and grammatically correct comment suitable for posting on a Jira ticket.

The comment should summarize the key outcomes and decisions from the discussion. Start the comment by indicating it's a summary of a post-scrum discussion.

Raw Discussion Results:
{{{discussionResults}}}

Rewrite the above results into a professional Jira comment:
  `,
});


const generateJiraCommentFlow = ai.defineFlow<
  typeof GenerateJiraCommentInputSchema,
  typeof GenerateJiraCommentOutputSchema
>(
  {
    name: 'generateJiraCommentFlow',
    inputSchema: GenerateJiraCommentInputSchema,
    outputSchema: GenerateJiraCommentOutputSchema,
  },
  async input => {
    const {output} = await generateJiraCommentPrompt(input);
    return output!;
  }
);

