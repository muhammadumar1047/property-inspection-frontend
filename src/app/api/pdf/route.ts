import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

// GET /api/pdf?url=...&filename=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');
    const filename = searchParams.get('filename') || 'report.pdf';
    if (!targetUrl) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Ensure colors match screen
    await page.emulateMediaType('screen');
    await page.goto(targetUrl, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0.75in', right: '0.75in', bottom: '0.75in', left: '0.75in' },
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });

    await browser.close();

    const pdfBufferNode = Buffer.from(pdfBuffer);

    return new NextResponse(pdfBufferNode as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('PDF generation failed', err);
    return new NextResponse('Failed to generate PDF', { status: 500 });
  }
}


