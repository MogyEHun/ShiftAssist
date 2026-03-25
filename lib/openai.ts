import OpenAI from 'openai'

// Alapértelmezett modell
export const AI_MODEL = 'gpt-4o-mini'

// Lazy inicializálás – csak runtime-ban jön létre, build-time nem dob hibát
let _openai: OpenAI | null = null
export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}
