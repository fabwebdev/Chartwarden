import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

const getBackendApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  const cleanUrl = envUrl.replace(/\/$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

export async function GET() {
  const apiBase = getBackendApiBaseUrl();
  const targetUrl = `${apiBase}/his-pdf/generate-his-pdf`;

  try {
    const incomingHeaders = headers();
    const cookie = incomingHeaders.get('cookie');

    const upstreamResponse = await fetch(targetUrl, {
      headers: {
        ...(cookie ? { cookie } : {})
      },
      // Ensure Next doesn't cache or reuse the response
      cache: 'no-store'
    });

    if (!upstreamResponse.ok) {
      const errorBody = await upstreamResponse.text();
      return NextResponse.json(
        {
          message: 'Failed to generate HIS PDF',
          status: upstreamResponse.status,
          detail: errorBody || upstreamResponse.statusText
        },
        { status: upstreamResponse.status }
      );
    }

    const arrayBuffer = await upstreamResponse.arrayBuffer();
    const contentType = upstreamResponse.headers.get('content-type') || 'application/pdf';
    const contentDisposition =
      upstreamResponse.headers.get('content-disposition') || 'attachment; filename="his.pdf"';

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Content-Length': String(arrayBuffer.byteLength)
      }
    });
  } catch (error: any) {
    console.error('HIS PDF proxy error:', error);
    return NextResponse.json(
      {
        message: 'Unexpected error while generating HIS PDF',
        detail: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

