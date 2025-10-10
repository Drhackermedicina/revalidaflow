import { flow } from 'genkit';
import { z } from 'zod';

/**
 * A simple sample flow that returns a greeting.
 */
export const sampleFlow = flow(
  {
    name: 'sampleFlow',
    inputSchema: z.string().optional(),
    outputSchema: z.string(),
  },
  async (name) => {
    return `Hello, ${name || 'world'}! This is a sample flow from Genkit.`;
  }
);