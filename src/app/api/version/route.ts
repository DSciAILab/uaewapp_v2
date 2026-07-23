import { NextResponse } from 'next/server';

// Identifies the currently-deployed build so open tabs can detect when a new
// version has shipped and reload themselves (see VersionWatcher). On Vercel
// each deployment gets a unique VERCEL_DEPLOYMENT_ID; commit SHA is the
// fallback, and 'dev' locally (constant, so dev tabs never self-reload).
const VERSION =
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  'dev';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    { version: VERSION },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
