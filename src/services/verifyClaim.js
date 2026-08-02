// Safeguard: detect when the assistant *claims* it changed a task but no
// mutating tool actually succeeded in that turn (i.e. a hallucinated action).
// Pure module (no imports) so it can be unit-tested directly with Node.

export const MUTATING_TOOLS = ['create_task', 'update_task', 'complete_task', 'delete_task']

// Matches affirmative, completed-action claims like:
//   "I've added…", "I have deleted…", "I've just rescheduled…",
//   "The task has been updated", "…has been marked…"
const CLAIM_RE = /\bi(?:'ve| have)?\s+(?:[\w']+\s+and\s+)?(?:just\s+)?(added|created|deleted|removed|updated|rescheduled|reopened|moved|marked|completed|set|changed)\b|\b(?:has|have)\s+been\s+(added|created|deleted|removed|updated|rescheduled|reopened|marked|set|changed)\b/i

// True if the text asserts a task mutation was completed.
export function claimsMutation(text) {
  if (!text) return false
  // "already" implies a pre-existing state, not a fresh action this turn.
  if (/\balready\b/i.test(text)) return false
  return CLAIM_RE.test(text)
}

// Given the final assistant text and the tool calls that ran this turn
// (each { name, ok }), return a warning string if the assistant claimed a
// change that no successful mutating tool performed; otherwise null.
export function verifyClaim({ text, toolCalls }) {
  const mutatingSucceeded = (toolCalls || []).some(
    c => MUTATING_TOOLS.includes(c.name) && c.ok
  )
  if (claimsMutation(text) && !mutatingSucceeded) {
    return "I mentioned making that change, but no matching action was actually recorded — it may not have gone through. Please double-check, or ask me to try again."
  }
  return null
}
