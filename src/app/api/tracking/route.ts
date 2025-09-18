import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

// 轨迹点结构
interface TrackingPoint {
  device: string;
  ts: number;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  status?: string;
  extra?: Record<string, any>;
}

const HISTORY_LIMIT = 1000;

// POST: 设备上报轨迹点（topic 统一 fleet/tracking，device 字段区分设备）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { device, ts, lat, lng } = body;
    if (
      typeof device !== 'string' ||
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      typeof ts !== 'number'
    ) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const point: TrackingPoint = {
      device,
      ts,
      lat,
      lng,
      speed: typeof body.speed === 'number' ? body.speed : undefined,
      heading: typeof body.heading === 'number' ? body.heading : undefined,
      altitude: typeof body.altitude === 'number' ? body.altitude : undefined,
      status: typeof body.status === 'string' ? body.status : undefined,
      extra: typeof body.extra === 'object' ? body.extra : undefined
    };
    const redis = getRedis();
    const LATEST_KEY = `tracking:${device}:latest`;
    const HISTORY_KEY = `tracking:${device}:history`;
    await redis.set(LATEST_KEY, JSON.stringify(point));
    await redis.lpush(HISTORY_KEY, JSON.stringify(point));
    await redis.ltrim(HISTORY_KEY, 0, HISTORY_LIMIT - 1);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}

// GET: 查询最新/历史轨迹点（支持多设备）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const device = searchParams.get('device') || 'PE-001';
  const limit = parseInt(searchParams.get('limit') || '1', 10);
  const type = searchParams.get('type') || 'latest';
  try {
    const redis = getRedis();
    const LATEST_KEY = `tracking:${device}:latest`;
    const HISTORY_KEY = `tracking:${device}:history`;
    if (type === 'latest') {
      const data = await redis.get(LATEST_KEY);
      if (!data) return NextResponse.json({ point: null });
      return NextResponse.json({ point: JSON.parse(data as string) });
    } else if (type === 'history') {
      const items = await redis.lrange(HISTORY_KEY, 0, limit - 1);
      const points = items.map((item: string) => JSON.parse(item));
      return NextResponse.json({ points });
    }
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}
