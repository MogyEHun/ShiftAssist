import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/admin/companies', req.url))
  res.cookies.delete('sa_view_company')
  return res
}
