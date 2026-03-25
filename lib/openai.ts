import OpenAI from 'openai'

// OpenAI kliens inicializálása
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Alapértelmezett modell
export const AI_MODEL = 'gpt-4o-mini'
