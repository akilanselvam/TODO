const ENDPOINT = 'https://api.openai.com/v1/chat/completions'

/**
 * Runs a chat completion with a function-calling loop.
 * - apiKey: OpenAI key (required)
 * - model: model id (default gpt-4o-mini)
 * - messages: array of chat messages (must start with a system message)
 * - tools: OpenAI tool specs
 * - executeTool(name, args) => any (JSON-serialisable result)
 * - onToolActivity({ name, args }) optional callback for UI feedback
 * Returns { content, messages } where messages is the full updated thread.
 */
export async function runAssistant({ apiKey, model = 'gpt-4o-mini', messages, tools, executeTool, onToolActivity, maxSteps = 6 }) {
  if (!apiKey) throw new Error('Missing OpenAI API key')
  const thread = [...messages]

  for (let step = 0; step < maxSteps; step++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: thread,
        tools,
        tool_choice: 'auto',
        temperature: 0.2,
      }),
    })

    if (!res.ok) {
      let detail = ''
      try {
        const err = await res.json()
        detail = err?.error?.message || JSON.stringify(err)
      } catch {
        detail = await res.text()
      }
      throw new Error(`OpenAI ${res.status}: ${detail}`)
    }

    const data = await res.json()
    const msg = data.choices?.[0]?.message
    if (!msg) throw new Error('OpenAI returned no message')

    thread.push(msg)

    if (msg.tool_calls && msg.tool_calls.length) {
      for (const call of msg.tool_calls) {
        let args = {}
        try { args = JSON.parse(call.function.arguments || '{}') } catch { args = {} }
        onToolActivity?.({ name: call.function.name, args })
        let result
        try {
          result = await executeTool(call.function.name, args)
        } catch (e) {
          result = { ok: false, error: String(e?.message || e) }
        }
        thread.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result ?? { ok: true }),
        })
      }
      continue // let the model see tool results and respond
    }

    return { content: msg.content || '', messages: thread }
  }

  return {
    content: "I wasn't able to finish that within a reasonable number of steps. Could you rephrase or break it down?",
    messages: thread,
  }
}
