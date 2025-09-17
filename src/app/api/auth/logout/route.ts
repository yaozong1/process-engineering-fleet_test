import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const res = NextResponse.json({ success: true })
    // clear cookie in an ASCII-only way
    res.cookies.set('auth-token', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    })
    return res
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}