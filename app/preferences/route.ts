import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Store preferences in a simple JSON file in /tmp
const dbPath = path.resolve('/tmp', 'mks_prefs.json');

function getPrefs(): Record<string, any> {
  try {
    if (!fs.existsSync(dbPath)) return {};
    const content = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return {};
  }
}

function savePrefs(data: Record<string, any>) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data), 'utf8');
  } catch (e) {
    console.error('Failed to save prefs', e);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
       return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const db = getPrefs();
    return NextResponse.json(db[id] || {});
    
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read pref' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, mks_filter } = body;

    if (!id || typeof mks_filter !== 'string') {
       return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = getPrefs();
    db[id] = { mks_filter, updatedAt: Date.now() };
    savePrefs(db);
    
    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to write pref' }, { status: 500 });
  }
}
