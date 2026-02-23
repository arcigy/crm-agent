import { chromium, Browser, Page } from 'playwright-core';

let browser: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;

// Singleton browser instance — neotvárať nový browser pri každom requeste
async function getBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) return browser;

  if (!browserLaunchPromise) {
    browserLaunchPromise = chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',    // Dôležité pre Railway/Docker
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
      ],
    }).then(b => {
      browser = b;
      browserLaunchPromise = null;
      // Auto-restart ak browser crashne
      b.on('disconnected', () => { browser = null; });
      return b;
    }).catch(e => {
      browserLaunchPromise = null;
      throw e;
    });
  }

  return browserLaunchPromise;
}

export async function renderWithBrowser(url: string): Promise<string> {
  const b = await getBrowser();
  const page: Page = await b.newPage();

  try {
    // Block unnecessary resources — šetrí čas a bandwidth
    await page.route('**/*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,mp4,mp3}', r => r.abort());
    await page.route('**/analytics.js', r => r.abort());
    await page.route('**/gtm.js', r => r.abort());
    await page.route('**/fbevents.js', r => r.abort());

    await page.goto(url, {
      waitUntil: 'domcontentloaded',   // Počkaj kým sa natiahne hlavný DOM (stabilnejšie ako networkidle)
      timeout: 30000,
    });

    // Extra čakanie pre lazy-loaded content
    await page.waitForTimeout(1500);

    // Scroll na spodok stránky pre infinite scroll content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    const html = await page.content();
    return html;

  } finally {
    await page.close();
  }
}
