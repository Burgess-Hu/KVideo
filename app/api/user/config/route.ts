/**
 * User Config Sync API Route
 * File-based settings persistence for cross-device and PWA support.
 * Stores user settings (sources, IPTV, display preferences) server-side
 * so they persist across browsers, devices, and PWA installs.
 *
 * No external dependencies required — uses local JSON files.
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data', 'user-config');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function getFilePath(profileId: string): string {
  // Sanitize profileId to prevent path traversal
  const safe = profileId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(DATA_DIR, `${safe}.json`);
}

export async function GET(request: NextRequest) {
  const profileId = request.headers.get('x-profile-id');

  if (!profileId) {
    return NextResponse.json({ error: 'Missing profileId' }, { status: 400 });
  }

  try {
    await ensureDir();
    const filePath = getFilePath(profileId);
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return NextResponse.json({ success: true, data: null });
    }
    console.error('Config read error:', error);
    return NextResponse.json(
      { error: 'Failed to read config' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const profileId = request.headers.get('x-profile-id');

  if (!profileId) {
    return NextResponse.json({ error: 'Missing profileId' }, { status: 400 });
  }

  try {
    await ensureDir();
    const body = await request.json();
    const filePath = getFilePath(profileId);

    // Merge with existing data if present
    let existing: any = {};
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      existing = JSON.parse(content);
    } catch {
      // File doesn't exist yet
    }

    const merged = { ...existing, ...body, updatedAt: Date.now() };
    await fs.writeFile(filePath, JSON.stringify(merged, null, 2), 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Config write error:', error);
    return NextResponse.json(
      { error: 'Failed to save config' },
      { status: 500 }
    );
  }
}
