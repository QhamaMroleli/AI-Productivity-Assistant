import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CHAT_PROMPT,
  EMAIL_PROMPT,
  EMAIL_SCHEMA,
  MEETING_PROMPT,
  MEETING_SCHEMA,
  PLANNER_PROMPT,
  PLANNER_SCHEMA,
  RESEARCH_PROMPT,
  RESEARCH_SCHEMA,
  type EmailResult,
  type MeetingResult,
  type ResearchResult,
  type ScheduleResult,
} from "./prompts";

const clean = (max: number) => z.string().trim().max(max);

const emailInput = z.object({
  recipient: clean(200),
  subject: clean(300),
  purpose: clean(3000).min(3, "Describe the purpose of the email."),
  keyPoints: clean(4000),
  tone: z.enum(["Formal", "Friendly", "Persuasive", "Professional", "Apologetic"]),
  emailType: clean(100),
});

export const generateEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emailInput.parse(d))
  .handler(async ({ data, context }) => {
    const { callAIJson, checkRateLimit } = await import("./ai.server");
    checkRateLimit(context.userId);
    const input = `Email type: ${data.emailType}
Tone: ${data.tone}
Recipient: ${data.recipient || "Not specified"}
Subject: ${data.subject || "Not specified (propose one)"}
Purpose: ${data.purpose}
Key points to include:
${data.keyPoints || "None provided"}`;
    return callAIJson<EmailResult>({ system: EMAIL_PROMPT, input, schema: EMAIL_SCHEMA });
  });

const meetingInput = z.object({
  title: clean(200),
  date: clean(50),
  participants: clean(1000),
  notes: clean(30000).min(20, "Paste at least a few lines of meeting notes."),
});

export const summarizeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => meetingInput.parse(d))
  .handler(async ({ data, context }) => {
    const { callAIJson, checkRateLimit } = await import("./ai.server");
    checkRateLimit(context.userId);
    const input = `Meeting title: ${data.title || "Not specified"}
Date: ${data.date || "Not specified"}
Participants: ${data.participants || "Not specified"}
Notes:
"""
${data.notes}
"""`;
    return callAIJson<MeetingResult>({ system: MEETING_PROMPT, input, schema: MEETING_SCHEMA });
  });

const plannerInput = z.object({
  mode: z.enum(["daily", "weekly"]),
  now: clean(60),
  workStart: clean(5),
  workEnd: clean(5),
  breaks: clean(500),
  tasks: z
    .array(
      z.object({
        id: z.string().max(60),
        title: clean(200),
        description: clean(1000).nullable(),
        priority: z.enum(["high", "medium", "low"]),
        duration_minutes: z.number().int().min(5).max(1440),
        deadline: z.string().max(60).nullable(),
        start_time: z.string().max(10).nullable(),
      }),
    )
    .min(1, "Add at least one open task.")
    .max(40),
});

export const planSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => plannerInput.parse(d))
  .handler(async ({ data, context }) => {
    const { callAIJson, checkRateLimit } = await import("./ai.server");
    checkRateLimit(context.userId);
    const input = `Current date/time: ${data.now}
Plan type: ${data.mode}
Working hours: ${data.workStart} to ${data.workEnd}
Break preferences: ${data.breaks || "Short breaks as sensible"}
Open tasks (JSON):
${JSON.stringify(data.tasks, null, 2)}`;
    return callAIJson<ScheduleResult>({ system: PLANNER_PROMPT, input, schema: PLANNER_SCHEMA });
  });

const researchInput = z.object({
  topic: clean(500).min(3, "Enter a research topic or question."),
  material: clean(30000),
  depth: z.enum(["Quick Overview", "Detailed Analysis", "Executive Brief"]),
});

export const runResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => researchInput.parse(d))
  .handler(async ({ data, context }) => {
    const { callAIJson, checkRateLimit } = await import("./ai.server");
    checkRateLimit(context.userId);
    const input = `Research depth: ${data.depth}
Topic / question: ${data.topic}
User-provided material:
"""
${data.material || "(none provided)"}
"""`;
    return callAIJson<ResearchResult>({ system: RESEARCH_PROMPT, input, schema: RESEARCH_SCHEMA });
  });

const chatInput = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: clean(8000).min(1) }))
    .min(1)
    .max(40),
});

export const chatReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => chatInput.parse(d))
  .handler(async ({ data, context }) => {
    const { callAI, checkRateLimit } = await import("./ai.server");
    checkRateLimit(context.userId, 30);
    const text = await callAI({ system: CHAT_PROMPT, input: data.messages });
    return { text };
  });
