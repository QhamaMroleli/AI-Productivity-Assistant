import type { MeetingResult, ResearchResult } from "./prompts";

const list = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join("\n") : "- Not specified");

export function meetingToMarkdown(m: MeetingResult, meta: { title?: string; date?: string; participants?: string }) {
  return `# ${meta.title || "Meeting summary"}
Date: ${meta.date || "Not specified"}
Participants: ${meta.participants || "Not specified"}

## Executive summary
${m.executive_summary}

## Key discussion points
${list(m.key_points)}

## Decisions made
${list(m.decisions)}

## Action items
${m.action_items.length ? m.action_items.map((a) => `- [ ] ${a.task} — Owner: ${a.owner || "Not specified"} — Deadline: ${a.deadline || "Not specified"}`).join("\n") : "- Not specified"}

## Unresolved questions
${list(m.unresolved_questions)}
`;
}

export function researchToMarkdown(r: ResearchResult, topic: string) {
  return `# Research: ${topic}

> Based on AI model knowledge and user-provided material only. No live web search was used. Verify before relying on it.

## Overview
${r.overview}

## Key findings
${list(r.key_findings)}

## Important concepts
${r.concepts.length ? r.concepts.map((c) => `- **${c.term}**: ${c.explanation}`).join("\n") : "- Not specified"}

## Opportunities
${list(r.opportunities)}

## Challenges
${list(r.challenges)}

## Practical insights
${list(r.practical_insights)}

## Recommendations
${list(r.recommendations)}

## Follow-up questions
${list(r.follow_up_questions)}

## From your material
${list(r.from_user_material)}

## Limitations
${r.limitations}
`;
}
