import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const viewports = [
    { width: 1440, height: 900, name: 'desktop' },
    { width: 1280, height: 800, name: 'laptop' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 390, height: 844, name: 'mobile' }
  ];

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.waitForTimeout(500); // wait for resize animations
    await page.screenshot({ path: path.join(__dirname, `screenshot_${vp.name}.png`), fullPage: true });
    console.log(`Captured ${vp.name} screenshot`);
  }

  await browser.close();
})();
