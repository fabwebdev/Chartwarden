import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  console.log('Request received:', req.url);
  return NextResponse.next();
}
