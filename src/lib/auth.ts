import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

export interface AuthUser {
  userId: string
  username: string
  role: 'admin' | 'user'
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured')
    }
    
    const decoded = jwt.verify(token, jwtSecret) as any
    return {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    }
  } catch (error) {
    return null
  }
}

export function getAuthUser(req: NextRequest): AuthUser | null {
  const token = req.cookies.get('auth-token')?.value || 
                req.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return null
  }
  
  return verifyToken(token)
}

export function requireAuth(req: NextRequest): AuthUser {
  const user = getAuthUser(req)
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

export function requireAdmin(req: NextRequest): AuthUser {
  const user = requireAuth(req)
  if (user.role !== 'admin') {
    throw new Error('Admin access required')
  }
  return user
}