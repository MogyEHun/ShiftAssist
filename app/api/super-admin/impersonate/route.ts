import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/app/actions/super-admin'
import { logAction } from '@/app/actions/super-admin'

export async function POST(req: NextRequest) {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let companyId: string
  let companyName: string

  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const body = await req.json()
    companyId = body.companyId
    companyName = body.companyName
  } else {
    const form = await req.formData()
    companyId = form.get('companyId') as string
    companyName = form.get('companyName') as string
  }

  if (!companyId || !companyName) {
    return NextResponse.json({ error: 'Missing companyId or companyName' }, { status: 400 })
  }

  await logAction(superAdmin.email, 'impersonation_start', companyId, companyName)

  const res = NextResponse.redirect(new URL('/dashboard', req.url))
  res.cookies.set('sa_view_company', JSON.stringify({ id: companyId, name: companyName }), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 óra
  })

  return res
}
