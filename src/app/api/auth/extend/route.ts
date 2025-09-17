import { NextResponse } from 'next/server'

// Minimal extend endpoint, keeps cookie fresh
export async function POST() {
  try {
    // no-op body; client treats 200 as success
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}