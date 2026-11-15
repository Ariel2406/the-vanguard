'use server'

type Turn = { role: 'user' | 'assistant'; content: string }
type AtlasContext = { name: string; pendingExams: string[] }
type AtlasReply = { reply: string } | { error: string }

const model = 'gemini-3.8-flash'
const baseInstructions =
  'You are ATLAS, a conversational assistant for a space crew in a prototype. Always speak in natural English with short sentences, as if talking out loud. Be warm and conversational. Remember what was said in this dialogue. Avoid Markdown and answer in one to three short paragraphs. Do not claim to have read sensors, records or systems. Do not give diagnoses or mission-safety decisions.'
let windowStarted = 0
let requestsInWindow = 0

function isTurn(value: unknown): value is Turn {
  if (!value || typeof value !== 'object') return false
  const turn = value as Record<string, unknown>
  return (turn.role === 'user' || turn.role === 'assistant') &&
    typeof turn.content === 'string' && turn.content.trim().length > 0 && turn.content.length <= 1600
}

function readContext(value: unknown): AtlasContext | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.name !== 'string' || !Array.isArray(raw.pendingExams)) return null
  const exams = raw.pendingExams.filter((item): item is string => typeof item === 'string')
  return {
    name: raw.name.replace(/[^\p{L}\p{N} .'-]/gu, '').slice(0, 60),
    pendingExams: exams.slice(0, 6).map((item) => item.replace(/[\r\n]+/g, ' ').slice(0, 80)),
  }
}

export async function askAtlas(history: unknown, context?: unknown): Promise<AtlasReply> {
  if (!Array.isArray(history) || !history.length || history.length > 13 ||
      !history.every(isTurn) || history[history.length - 1].role !== 'user') {
    return { error: "I couldn't read that message. Try a shorter question." }
  }
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  if (!apiKey) return { error: 'The conversation is not configured yet. Add GOOGLE_GENERATIVE_AI_API_KEY to the server secrets.' }

  const now = Date.now()
  if (now - windowStarted >= 60_000) {
    windowStarted = now
    requestsInWindow = 0
  }
  if (requestsInWindow >= 30) return { error: 'ATLAS received too many requests. Wait a moment and try again.' }
  requestsInWindow++

  const crew = readContext(context)
  const instructions = crew
    ? `${baseInstructions} You are talking with crew member ${crew.name}. Their routine exams still pending today: ${crew.pendingExams.length ? crew.pendingExams.join('; ') : 'none'}.`
    : baseInstructions

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instructions }] },
        contents: history.map((turn) => ({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.content }],
        })),
        generationConfig: { maxOutputTokens: 600 },
      }),
    })
    if (response.status === 400 || response.status === 401 || response.status === 403) return { error: 'Google rejected the server credential. Check the API key and its permissions.' }
    if (response.status === 429) return { error: 'Gemini reached a usage limit. Check the quota or retry in a few seconds.' }
    if (!response.ok) return { error: 'The conversation service is unavailable right now.' }
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> }
    const reply = data.candidates?.[0]?.content?.parts
      ?.filter((part) => typeof part.text === 'string' && !part.thought)
      .map((part) => part.text)
      .join(' ')
      .trim()
      .slice(0, 1600)
    return reply ? { reply } : { error: 'ATLAS did not receive a readable answer. Please try again.' }
  } catch {
    return { error: 'Could not reach Gemini. Check the connection and try again.' }
  }
}
