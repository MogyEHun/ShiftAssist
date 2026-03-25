import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@/lib/openai'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Nincs jogosultságod' }, { status: 403 })
  }

  const { text } = await req.json()
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Hiányzó szöveg' }, { status: 400 })
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Te egy vendéglátóhelyi menedzser segítője vagy. Kaptál egy nyers műszak-naplóbejegyzést.
Feladatod: tömörítsd 2-3 mondatba, strukturáltan, pontosan. Emeld ki a legfontosabb információkat.
Magyar nyelven válaszolj. Maradj tényszerű, ne adj hozzá nem szereplő információt.`,
      },
      {
        role: 'user',
        content: text,
      },
    ],
    max_tokens: 300,
    temperature: 0.3,
  })

  const summary = completion.choices[0]?.message?.content ?? text

  return NextResponse.json({ summary })
}
