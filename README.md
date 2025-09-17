This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Shared Telemetry History (Redis)

The project supports a shared 200-point telemetry history per device using Upstash Redis.

Environment variables (add in Netlify or `.env.local`):

```
UPSTASH_REDIS_REST_URL=your_upstash_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_rest_token
```

API endpoints:

```
GET  /api/telemetry?device=PE-001&limit=200
POST /api/telemetry  { device, ts?, soc, voltage, temperature, health, cycleCount, estimatedRangeKm, chargingStatus, alerts }
```

Storage model: Redis List key `telemetry:<device>` (LPUSH newest, LTRIM to 200).

Client behavior:
- On mount fetch server history (overrides localStorage cache)
- MQTT live updates update UI immediately
- Each new MQTT point is also POSTed (can be disabled once device writes directly)

To disable client forwarding: remove the fetch POST block in `battery-monitor-dashboard.tsx` inside the TELEMETRY_TOPIC handler.
