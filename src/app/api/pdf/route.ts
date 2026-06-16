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

    console.log('[PdfGen] Starting PDF generation for:', targetUrl);

    console.time('[PdfGen] puppeteer.launch');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    console.timeEnd('[PdfGen] puppeteer.launch');

    const page = await browser.newPage();

    // Capture browser console logs for diagnostics
    page.on('console', (msg) => {
      console.log(`[PdfGen:Browser:${msg.type()}]`, msg.text());
    });
    // Capture unhandled JS errors in the page
    page.on('pageerror', (err) => {
      console.error('[PdfGen:Browser:pageerror]', err.message);
    });
    // Capture failed network requests
    page.on('requestfailed', (req) => {
      console.warn(`[PdfGen:Browser:requestfailed] ${req.url()} — ${req.failure()?.errorText || 'unknown'}`);
    });

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
      console.log('[PdfGen] Forwarding headers:', Object.keys(extraHeaders).join(', '));
      await page.setExtraHTTPHeaders(extraHeaders);
    } else {
      console.warn('[PdfGen] No auth headers to forward — report page may fail to load');
    }

    // Inject the Bearer token into localStorage so the report page's axios interceptor
    // (http.ts:27-28) can attach it to client-side API calls. page.setExtraHTTPHeaders()
    // only applies to the initial navigation, not to subsequent XHR/fetch requests made
    // by the React component.
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7); // strip "Bearer " prefix
      console.log('[PdfGen] Injecting auth token into localStorage (length=%d chars)', token.length);
      await page.evaluateOnNewDocument((t) => {
        try {
          localStorage.setItem('token', t);
          console.log('[PdfGen:Browser:init] localStorage token injected, length=' + t.length);
        } catch (e: any) {
          console.error('[PdfGen:Browser:init] localStorage injection FAILED: ' + e.message);
        }
      }, token);
    } else if (authHeader) {
      console.warn('[PdfGen] authHeader present but not Bearer — cannot inject into localStorage:', authHeader.substring(0, 20) + '...');
    } else {
      console.warn('[PdfGen] No authHeader at all — report page API calls will fail');
    }

    // Inject agency context into localStorage for SuperAdmin users.
    // The report page's axios interceptor (http.ts:42-156) reads `user` and
    // `impersonatedAgencyId` from localStorage to determine whether to inject
    // `agencyId` into API query parameters. Without these, SuperAdmin API calls
    // fail because the backend's TenantAgencyResolver requires agencyId for
    // SuperAdmin users (TenantAgencyResolver.cs:18-20).
    const targetAgencyId = target.searchParams.get('agencyId');
    const targetIsSuperAdmin = target.searchParams.get('isSuperAdmin');
    if (targetAgencyId && targetIsSuperAdmin === 'true') {
      console.log('[PdfGen] Injecting agency context into localStorage: agencyId=%s, isSuperAdmin=true', targetAgencyId);
      await page.evaluateOnNewDocument((agencyId) => {
        try {
          // The http.ts interceptor reads `user` from localStorage and checks
          // `isSuperAdmin` / `IsSuperAdmin` properties. It also reads
          // `impersonatedAgencyId` for the agency scoping logic.
          const user = {
            isSuperAdmin: true,
            IsSuperAdmin: true,
            email: 'pdf-generator',
          };
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('impersonatedAgencyId', agencyId);
          console.log('[PdfGen:Browser:init] agency context injected: agencyId=' + agencyId);
        } catch (e: any) {
          console.error('[PdfGen:Browser:init] agency context injection FAILED: ' + e.message);
        }
      }, targetAgencyId);
    } else {
      console.log('[PdfGen] No agency context in URL — user is likely non-SuperAdmin (agencyId resolved from JWT claims)');
    }

    // Use print media so @media print CSS rules apply (e.g. @page { size: A4 },
    // removing box-shadows, hiding page numbers, and stripping page-break from
    // the last .a4-page to prevent trailing blank pages).
    await page.emulateMediaType('print');
    console.log('[PdfGen] Navigating to:', target.toString());
    console.time('[PdfGen] page.goto');
    // Use networkidle2 instead of networkidle0 — Next.js pages often have
    // persistent connections (HMR, polling) that prevent networkidle0 from resolving.
    await page.goto(target.toString(), { waitUntil: 'networkidle2', timeout: 45_000 });
    console.timeEnd('[PdfGen] page.goto');
    // Log the final URL after redirects
    console.log('[PdfGen] Landed at:', page.url());

    // Diagnostic: check localStorage and page state after navigation
    const pageDiag = await page.evaluate(() => {
      const tokenInLs = localStorage.getItem('token');
      const userInLs = localStorage.getItem('user');
      const hasReportDoc = !!document.querySelector('.report-document');
      const bodyText = (document.body?.innerText || '').substring(0, 300);
      return {
        tokenInLs: tokenInLs ? `present (${tokenInLs.length} chars)` : 'MISSING',
        userInLs: userInLs ? 'present' : 'MISSING',
        hasReportDoc,
        bodyPreview: bodyText,
      };
    });
    console.log('[PdfGen] Post-goto page diagnostics:', JSON.stringify(pageDiag, null, 2));

    console.time('[PdfGen] waitForSelector .report-document');
    try {
      await page.waitForSelector('.report-document', { timeout: 30000 });
    } catch (selectorErr) {
      // On timeout, capture the page HTML to understand what rendered instead
      const htmlSnapshot = await page.evaluate(() => {
        return (document.documentElement?.outerHTML || '').substring(0, 4000);
      });
      console.error('[PdfGen] .report-document NOT FOUND. Page HTML snapshot:', htmlSnapshot);
      throw selectorErr;
    }
    console.timeEnd('[PdfGen] waitForSelector .report-document');

    // Wait for web fonts to load before rendering (raced against a 10s timeout
    // to prevent hanging when a font CDN is unreachable from the server).
    console.time('[PdfGen] document.fonts.ready');
    const fontsLoaded = await page.evaluate(async () => {
      if (!document.fonts || !("ready" in document.fonts)) return true;

      const TIMEOUT_MS = 10_000;
      let timeoutId: ReturnType<typeof setTimeout>;

      const timeout = new Promise<boolean>((resolve) => {
        timeoutId = setTimeout(() => resolve(false), TIMEOUT_MS);
      });

      const ready = (document.fonts as FontFaceSet).ready.then(() => true);

      const result = await Promise.race([ready, timeout]);
      clearTimeout(timeoutId!);
      return result;
    });
    console.timeEnd('[PdfGen] document.fonts.ready');
    if (!fontsLoaded) {
      console.warn('[PdfGen] Font loading timed out after 10s — proceeding without waiting for all fonts');
    }

    console.time('[PdfGen] image-wait');
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
    console.timeEnd('[PdfGen] image-wait');

    // Ensure the last .a4-page has no page-break-after to prevent a trailing
    // blank page. Also strip any fixed-position overlays that may have been
    // left open (media lightbox viewer). These are safety nets in addition to
    // the CSS rules at [data-pdf-mode="true"].
    console.time('[PdfGen] cleanup-document');
    await page.evaluate(() => {
      // Remove page-break from the last .a4-page
      const pages = document.querySelectorAll<HTMLElement>('.a4-page');
      if (pages.length > 0) {
        const lastPage = pages[pages.length - 1];
        lastPage.style.breakAfter = 'auto';
        lastPage.style.pageBreakAfter = 'auto';
      }
      // Hide any fixed-position overlays (media lightbox viewer)
      const overlays = document.querySelectorAll<HTMLElement>('.media-viewer-overlay');
      overlays.forEach((el) => { el.style.display = 'none'; });
      // Ensure the page background is white
      document.body.style.background = 'white';
    });
    console.timeEnd('[PdfGen] cleanup-document');

    console.log('[PdfGen] Rendering PDF with preferCSSPageSize (A4 via @page)');
    console.time('[PdfGen] page.pdf');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });
    console.timeEnd('[PdfGen] page.pdf');

    console.time('[PdfGen] browser.close');
    await browser.close();
    console.timeEnd('[PdfGen] browser.close');

    const pdfBufferNode = Buffer.from(pdfBuffer);

    console.log('[PdfGen] PDF generated successfully, size:', pdfBufferNode.length, 'bytes');
    return new NextResponse(pdfBufferNode as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : '';
    console.error('[PdfGen] PDF generation failed:', errorMessage);
    console.error('[PdfGen] Stack:', errorStack);

    // Include the error message in the response so the backend can relay it
    const detail = errorMessage || 'Unknown error (check Next.js server logs)';
    return new NextResponse(
      `Failed to generate PDF: ${detail}`,
      { status: 500, headers: { 'Content-Type': 'text/plain;charset=UTF-8' } }
    );
  }
}


