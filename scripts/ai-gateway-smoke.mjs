import OpenAI from 'openai'

const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

console.error('SKYGRID OpenAI smoke')
console.error('Model:', model)
console.error(
  'OPENAI_API_KEY:',
  process.env.OPENAI_API_KEY ? 'present' : 'missing',
)

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is required.')
  process.exit(1)
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

let response

try {
  response = await client.responses.create({
    model,
    input: 'Reply with exactly this sentence: SKYGRID OpenAI is online.',
  })
} catch (error) {
  const code = error?.code || error?.error?.code
  const type = error?.type || error?.error?.type
  const status = error?.status
  const message = error?.message || 'OpenAI smoke request failed.'

  if (
    status === 429 &&
    (code === 'credit_balance_exhausted' || type === 'insufficient_quota')
  ) {
    console.error(
      '::warning title=SKYGRID AI Gateway smoke blocked::OpenAI API credits are exhausted. The key is present, but the organization needs billing credits before live AI smoke can run.',
    )
    console.error('OpenAI status:', status)
    console.error('OpenAI code:', code)
    console.error('OpenAI type:', type)
    console.error('Result: quota_blocked_not_code_failure')
    process.exit(0)
  }

  console.error(message)
  if (status) console.error('OpenAI status:', status)
  if (code) console.error('OpenAI code:', code)
  if (type) console.error('OpenAI type:', type)
  process.exit(1)
}

const text = response.output_text ?? ''

console.log(text)

if (!text.includes('SKYGRID OpenAI is online')) {
  console.error('Unexpected response text.')
  process.exit(1)
}
