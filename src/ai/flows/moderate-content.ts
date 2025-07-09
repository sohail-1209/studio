'use server';

/**
 * @fileOverview Content moderation AI agent.
 *
 * - moderateContent - A function that moderates content based on predefined rules. Immediately removes content that violates policies.
 * - ModerateContentInput - The input type for the moderateContent function.
 * - ModerateContentOutput - The return type for the moderateContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ModerateContentInputSchema = z.object({
  content: z.string().describe('The content to be moderated (text, image URL, or video URL).'),
  contentType: z.enum(['text', 'image', 'video']).describe('The type of the content being moderated.'),
  ruleset: z
    .string()
    .describe('A description of rules. For example, \'No hate speech, no harassment, no illegal activities\'.'),
});
export type ModerateContentInput = z.infer<typeof ModerateContentInputSchema>;

const ModerateContentOutputSchema = z.object({
  isSafe: z.boolean().describe('Whether the content is safe according to the ruleset.'),
  reason: z.string().describe('The reason why the content is considered unsafe, if applicable.'),
  action: z.enum(['remove', 'warn', 'none']).describe('The action to take based on the content moderation result.  If the content violates policy, the action should be remove'),
});
export type ModerateContentOutput = z.infer<typeof ModerateContentOutputSchema>;

export async function moderateContent(input: ModerateContentInput): Promise<ModerateContentOutput> {
  return moderateContentFlow(input);
}

const moderateContentPrompt = ai.definePrompt({
  name: 'moderateContentPrompt',
  input: {schema: ModerateContentInputSchema},
  output: {schema: ModerateContentOutputSchema},
  prompt: `You are an AI content moderator. Your job is to determine whether the given content violates the following ruleset:\n\nRuleset: {{{ruleset}}}\n\nContent type: {{{contentType}}}\n\nContent: {{{content}}}\n\nBased on the ruleset, determine if the content is safe. If it is not safe, explain why and set the 'action' to 'remove'. If the content only has minor issues set the action to 'warn'. Otherwise set the action to 'none'. Return a JSON object with 'isSafe' set to true or false, 'reason' explaining if it is unsafe, and the appropriate 'action'.\n\nConsiderations:\n*   Prioritize user safety and well-being.
*   Be objective and unbiased in your assessment.
*   When in doubt, err on the side of caution and flag the content for human review.\n*   Do not attempt to access external websites or resources.\n`,
});

const moderateContentFlow = ai.defineFlow(
  {
    name: 'moderateContentFlow',
    inputSchema: ModerateContentInputSchema,
    outputSchema: ModerateContentOutputSchema,
  },
  async input => {
    const {output} = await moderateContentPrompt(input);
    return output!;
  }
);
