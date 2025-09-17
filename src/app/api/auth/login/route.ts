import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

interface User {
  id: string
  username: string
  password: string
  email?: string
  role: 'admin' | 'user'
  createdAt: number
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const redis = getRedis()
    
    // Get user from Redis
    const userStr = await redis.get(`user:${username}`)
    if (!userStr) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Handle Upstash Redis returning objects directly
    const user: User = typeof userStr === 'string' ? JSON.parse(userStr) : userStr as any

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Create JWT token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured')
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      jwtSecret,
      { expiresIn: '24h' }
    )

    console.log('[AUTH] User logged in:', username, 'role:', user.role)

    // Return user info and token (without password)
    const { password: _, ...userInfo } = user
    
    const response = NextResponse.json({ 
      success: true, 
      user: userInfo,
      token 
    })

    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    })

    return response

  } catch (error: any) {
    console.error('[AUTH] Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}