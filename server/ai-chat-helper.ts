import OpenAI from "openai";
import type { ChatPhase, CollectedInfo, StructuredAIResponse } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Phase-specific system prompts
function getSystemPrompt(
  phase: ChatPhase,
  collectedInfo: CollectedInfo | null,
  context?: { subject?: string; description?: string; category?: string; priority?: string; kbContext?: string }
): string {
  const kbSection = context?.kbContext
    ? `\nKB: ${context.kbContext.slice(0, 300)}`
    : "";

  const ticketSection = context?.subject
    ? `\nTICKET: "${context.subject}" — ${context.description || ""}` 
    : "";

  const collectedSection = collectedInfo
    ? `\nINFO GATHERED SO FAR: ${JSON.stringify(collectedInfo)}`
    : "";

  if (phase === "COLLECT_INFO") {
    return `You are Extender Copilot, a concise IT support assistant. You are in COLLECT_INFO phase.

RULES — follow strictly:
- Ask exactly 1 or 2 short clarifying questions. Never more than 2.
- Do NOT give troubleshooting steps, checklists, or solutions yet.
- Do NOT say "while you answer" or provide any steps.
- Keep your message under 60 words.
- End with a question mark.
- Only mention safety if there is actual danger (smoke, sparks, burning smell, swollen battery, liquid spill).
${ticketSection}${collectedSection}${kbSection}

You must respond with valid JSON matching this schema:
{
  "phase": "COLLECT_INFO",
  "message": "<brief intro + your questions in natural language>",
  "questions": ["<question 1>", "<question 2 (optional)>"],
  "next_action": "WAIT_FOR_USER"
}`;
  }

  return `You are Extender Copilot, a concise IT support assistant. You are in DIAGNOSE phase.

RULES — follow strictly:
- Provide 1 to 3 troubleshooting steps. Never more than 3.
- Do NOT ask clarifying questions. You already have enough info.
- Keep your message under 80 words total.
- End with "Did that work?" or "Let me know if that helped."
- If the user says it did not work, provide the NEXT 1–3 steps (still max 3).
- Only mention safety if there is actual danger (smoke, sparks, burning smell, swollen battery, liquid spill).
${ticketSection}${collectedSection}${kbSection}

You must respond with valid JSON matching this schema:
{
  "phase": "DIAGNOSE",
  "message": "<brief context + reference to steps>",
  "steps": ["<step 1>", "<step 2 (optional)>", "<step 3 (optional)>"],
  "next_action": "APPLY_STEPS"
}`;
}

// Determine if we have enough info to transition from COLLECT_INFO to DIAGNOSE
export function hasEnoughInfo(collectedInfo: CollectedInfo | null, userMessage: string): boolean {
  const msg = userMessage.toLowerCase();
  const info = collectedInfo || {};

  const hasOS = !!(info.os) || /windows|mac|linux|ios|android|chromeos/i.test(msg);
  const hasDevice = !!(info.deviceType) || /laptop|desktop|phone|tablet|monitor|pc|computer|screen/i.test(msg);
  const hasContext = !!(info.additionalContext) || msg.split(/\s+/).length >= 5;

  return (hasOS && hasDevice) || hasContext;
}

// Extract info from user message to update collectedInfo
export function extractInfo(existing: CollectedInfo | null, userMessage: string): CollectedInfo {
  const info: CollectedInfo = { ...existing };
  const msg = userMessage.toLowerCase();

  if (!info.os) {
    const osMatch = msg.match(/windows\s*\d*|macos|mac\s*os|linux|ubuntu|ios|android|chromeos/i);
    if (osMatch) info.os = osMatch[0];
  }

  if (!info.deviceType) {
    const deviceMatch = msg.match(/laptop|desktop|phone|tablet|monitor|pc|computer|macbook|imac/i);
    if (deviceMatch) info.deviceType = deviceMatch[0];
  }

  if (!info.symptom) {
    info.symptom = userMessage.slice(0, 200);
  }

  if (userMessage.split(/\s+/).length >= 5) {
    info.additionalContext = (info.additionalContext ? info.additionalContext + " | " : "") + userMessage.slice(0, 300);
  }

  return info;
}

// Main AI helper: calls OpenAI with structured output enforcement
export async function getTwoPhaseResponse(
  phase: ChatPhase,
  collectedInfo: CollectedInfo | null,
  chatHistory: { role: "user" | "assistant"; content: string }[],
  latestMessage: string,
  context?: { subject?: string; description?: string; category?: string; priority?: string; kbContext?: string }
): Promise<StructuredAIResponse> {
  const systemPrompt = getSystemPrompt(phase, collectedInfo, context);

  // Keep only last 6 messages from history to stay within token limits
  const recentHistory = chatHistory.slice(-6);

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...recentHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.slice(0, 300),
    })),
    { role: "user", content: latestMessage.slice(0, 500) },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages,
    max_completion_tokens: 4096,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(raw) as StructuredAIResponse;

    // Ensure message field always exists
    if (!parsed.message) {
      parsed.message = "I'm here to help with your IT issue.";
    }

    // Truncate message to word limit
    const trimToWords = (text: string, maxWords: number): string => {
      const words = text.split(/\s+/);
      return words.length > maxWords ? words.slice(0, maxWords).join(" ") + "..." : text;
    };

    // Enforce constraints server-side
    if (phase === "COLLECT_INFO") {
      parsed.phase = "COLLECT_INFO";
      parsed.next_action = "WAIT_FOR_USER";
      parsed.message = trimToWords(parsed.message, 60);
      delete (parsed as any).steps;
      if (parsed.questions && parsed.questions.length > 2) {
        parsed.questions = parsed.questions.slice(0, 2);
      }
      if (!parsed.questions || parsed.questions.length === 0) {
        parsed.questions = ["Could you share a bit more about what's happening?"];
      }
    } else {
      parsed.phase = "DIAGNOSE";
      parsed.next_action = "APPLY_STEPS";
      parsed.message = trimToWords(parsed.message, 80);
      delete (parsed as any).questions;
      if (parsed.steps && parsed.steps.length > 3) {
        parsed.steps = parsed.steps.slice(0, 3);
      }
      if (!parsed.steps || parsed.steps.length === 0) {
        parsed.steps = ["Try restarting your device and check if the issue persists."];
      }
    }

    return parsed;
  } catch {
    // Fallback: always return a fully valid StructuredAIResponse
    if (phase === "COLLECT_INFO") {
      return {
        phase: "COLLECT_INFO",
        message: raw || "I'd like to help. Could you give me a bit more detail?",
        questions: ["What device are you using (laptop, desktop, phone)?", "What operating system is it running?"],
        next_action: "WAIT_FOR_USER",
      };
    }
    return {
      phase: "DIAGNOSE",
      message: raw || "Let's try a basic fix first.",
      steps: ["Restart your device and see if the issue persists."],
      next_action: "APPLY_STEPS",
    };
  }
}
