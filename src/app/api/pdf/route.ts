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
    await page.setViewport({ width: 1280, height: 1800, deviceScaleFactor: 2 });

    const target = new URL(targetUrl);
    if (!target.searchParams.has('pdf')) {
      target.searchParams.set('pdf', '1');
    }

    const cookieHeader = req.headers.get('cookie');
    const authHeader = req.headers.get('authorization');
    const extraHeaders: Record<string, string> = {};
    if (cookieHeader) extraHeaders.cookie = cookieHeader;
    if (authHeader) extraHeaders.authorization = authHeader;
    if (Object.keys(extraHeaders).length) {
      await page.setExtraHTTPHeaders(extraHeaders);
    }

    // Use screen media to match the on-screen report layout.
    await page.emulateMediaType('screen');
    await page.goto(target.toString(), { waitUntil: 'networkidle0' });

    await page.waitForSelector('.report-document', { timeout: 30000 });

    // Wait for web fonts to load before rendering.
    await page.evaluate(async () => {
      if (document.fonts && "ready" in document.fonts) {
        await (document.fonts as FontFaceSet).ready;
      }
    });

    await page.evaluate(async () => {
      const images = Array.from(document.images || []);
      await Promise.all(
        images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
              })
        )
      );
    });

    const pageSize = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>(".a4-page");
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    const pdfOptions =
      pageSize && pageSize.width > 0 && pageSize.height > 0
        ? {
            width: `${pageSize.width}px`,
            height: `${pageSize.height}px`,
          }
        : { format: "A4" as const };

    const pdfBuffer = await page.pdf({
      ...pdfOptions,
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
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


