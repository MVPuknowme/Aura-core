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

const response = await client.responses.create({
  model,
  input: 'Reply with exactly this sentence: SKYGRID OpenAI is online.',
})

const text = response.output_text ?? ''

console.log(text)

if (!text.includes('SKYGRID OpenAI is online')) {
  console.error('Unexpected response text.')
  process.exit(1)
}
