import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

type ShapePoint = [number, number];

let tripShapeIndexCache: Record<string, string> | null = null;
let shapePointsCache: Record<string, ShapePoint[]> | null = null;

function loadJsonFile<T>(filename: string): T {
  const filePath = path.join(process.cwd(), 'app', 'api', 'route-shape', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function ensureCachesLoaded() {
  if (!tripShapeIndexCache) {
    tripShapeIndexCache = loadJsonFile<Record<string, string>>('trip-shape-index.json');
  }
  if (!shapePointsCache) {
    shapePointsCache = loadJsonFile<Record<string, ShapePoint[]>>('shape-points.json');
  }
}

export async function GET(request: Request) {
  try {
    ensureCachesLoaded();

    const { searchParams } = new URL(request.url);
    const tripIdRaw = String(searchParams.get('tripId') || '').trim();
    const tripIdBase = tripIdRaw.split('_')[0];

    if (!tripIdBase) {
      return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });
    }

    const shapeId = tripShapeIndexCache?.[tripIdBase];
    const points = shapeId ? shapePointsCache?.[shapeId] || [] : [];

    return NextResponse.json(
      {
        tripId: tripIdBase,
        shapeId: shapeId || null,
        points,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('Error loading route shape:', error);
    return NextResponse.json({ error: 'Unable to load route shape' }, { status: 500 });
  }
}
