import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { requireAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'

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
    // 检查管理员权限
    try {
      const adminUser = requireAdmin(req)
      console.log('[AUTH] Admin user creating new user:', adminUser.username)
    } catch (error) {
      console.log('[AUTH] Unauthorized user creation attempt')
      return NextResponse.json({ 
        error: 'Only administrators can create new users' 
      }, { status: 403 })
    }

    const body = await req.json()
    const { username, password, email, role } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const redis = getRedis()
    // 检查用户名是否已存在
    const existingUser = await redis.get(`user:${username}`)
    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 12)

    // 创建用户对象
    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      username,
      password: hashedPassword,
      email: email || undefined,
      role: role || 'user',
      createdAt: Date.now()
    }

    // 存入Redis
    await redis.set(`user:${username}`, JSON.stringify(user))
    await redis.sadd('users', username)

    console.log('[AUTH] User created:', username, 'role:', user.role)

    // 返回用户信息（不含密码）
    const { password: _, ...userInfo } = user
    return NextResponse.json({ success: true, user: userInfo })

  } catch (error) {
    console.error('[AUTH] User creation error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}