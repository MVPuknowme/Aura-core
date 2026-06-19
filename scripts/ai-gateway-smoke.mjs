import { generateText } from 'ai'

const model = process.env.AI_GATEWAY_MODEL || 'openai/gpt-4o-mini'

console.error('SKYGRID AI Gateway smoke')
console.error('Model:', model)
console.error('VERCEL_OIDC_TOKEN:', process.env.VERCEL_OIDC_TOKEN ? 'present' : 'missing')
console.error('AI_GATEWAY_API_KEY:', process.env.AI_GATEWAY_API_KEY ? 'present' : 'missing')

const result = await generateText({
  model,
  prompt: 'Reply with exactly this sentence: SKYGRID AI Gateway is online.',
})

console.log(result.text)
console.error('Usage:', result.usage)
console.error('Finish reason:', result.finishReason)

if (!result.text.includes('SKYGRID AI Gateway is online')) {
  console.error('Unexpected response text.')
  process.exit(1)
}
