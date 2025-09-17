import { NextRequest } from 'next/server'

export function getBaseUrl(req?: NextRequest): string {
  // In development, detect from request headers
  if (process.env.NODE_ENV === 'development' && req) {
    const host = req.headers.get('host')
    const protocol = req.headers.get('x-forwarded-proto') || 'http'
    return `${protocol}://${host}`
  }
  
  // Use environment variable if set
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }
  
  // Fallback to localhost:3000
  return 'http://localhost:3000'
}

export function getServerUrl(): string {
  // For server-side usage without request
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }
  
  // In development, try to detect port from environment
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || '3000'
    return `http://localhost:${port}`
  }
  
  return 'http://localhost:3000'
}