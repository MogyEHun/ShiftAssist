import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/app/actions/super-admin'
import { logAction } from '@/app/actions/super-admin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let companyId: string

  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const body = await req.json()
    companyId = body.companyId
  } else {
    const form = await req.formData()
    companyId = form.get('companyId') as string
  }

  if (!companyId) {
    return NextResponse.json({ error: 'Missing companyId' }, { status: 400 })
  }

  // DB validáció: companyId tényleg létezik-e (megelőzi a tetszőleges ID injektálást)
  const adminDb = createAdminClient()
  const { data: company } = await adminDb
    .from('companies')
    .select('id, name')
    .eq('id', companyId)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  await logAction(superAdmin.email, 'impersonation_start', company.id, company.name)

  const res = NextResponse.redirect(new URL('/dashboard', req.url))
  // Cookie-ba DB-ből jövő nevet használjuk (nem a klienstől kapottat)
  res.cookies.set('sa_view_company', JSON.stringify({ id: company.id, name: company.name }), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 óra
  })

  return res
}
