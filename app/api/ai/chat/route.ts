import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { openai, AI_MODEL } from '@/lib/openai'

const RATE_LIMIT = 20 // kérés/óra

export async function POST(req: NextRequest) {
  // 1. Session ellenőrzés
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Profil + cég adatok (visszafejtve)
  const { getUserById } = await import('@/lib/data/users')
  const profile = await getUserById(user.id)
  if (!profile) return NextResponse.json({ error: 'Profil nem található' }, { status: 404 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 3. Rate limit ellenőrzés
  const { count } = await admin
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', new Date(Date.now() - 3600 * 1000).toISOString())

  if ((count ?? 0) >= RATE_LIMIT) {
    return NextResponse.json(
      { error: `Elérted az óránkénti limitet (${RATE_LIMIT} kérés). Próbáld újra egy óra múlva.` },
      { status: 429 }
    )
  }

  // 4. Rate limit rögzítése
  await admin.from('ai_usage').insert({ user_id: user.id, company_id: profile.company_id })

  // 5. Kérelem body
  const { messages } = await req.json()

  // 6. Company knowledge lekérése
  const { data: knowledge } = await admin
    .from('company_knowledge')
    .select('title, content, category')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })

  // 7. Cég neve
  const { data: company } = await admin
    .from('companies')
    .select('name')
    .eq('id', profile.company_id)
    .single()

  // 8. System prompt
  const knowledgeText = knowledge && knowledge.length > 0
    ? '\n\nCéges tudásbázis:\n' + knowledge.map(k =>
        `[${k.category ?? 'Általános'}] ${k.title}:\n${k.content}`
      ).join('\n\n')
    : ''

  // Csak keresztnevet küldünk az AI-nak (nem teljes nevet) — adatvédelem
  const firstName = profile.full_name?.split(' ').pop() ?? 'Kollega'

  const systemPrompt = `Te egy segítőkész asszisztens vagy a ${company?.name ?? 'cég'} nevű vállalkozásnál.
Felhasználó keresztneve: ${firstName}
Szerepköre: ${profile.role}
ADATVÉDELMI SZABÁLYOK (kötelező betartani):
- Soha ne ismételd vissza a dolgozók teljes nevét vagy email címét a válaszban
- Csak keresztnévvel hivatkozz a dolgozókra
- Ne tárold és ne idézd a személyes adatokat
- Ha érzékeny adatot kapsz, azt csak a válasz kontextusában használd, ne ismételd szó szerint
Válaszolj magyarul, tömören és pontosan. Ha nem tudod a választ, mondd meg őszintén.${knowledgeText}`

  // 9. Streaming OpenAI hívás
  const stream = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    stream: true,
    max_tokens: 1000,
    temperature: 0.7,
  })

  // 10. Native ReadableStream visszaküldése
  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) controller.enqueue(encoder.encode(text))
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
