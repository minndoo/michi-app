import { z } from "zod";

export const agentResponseSchema = z.object({
  response: z.string(),
});

export const agentMessageInputSchema = z.object({
  threadId: z.string().min(1),
  message: z.string().min(1),
});
