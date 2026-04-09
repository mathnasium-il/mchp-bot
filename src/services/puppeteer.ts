import puppeteer, { Browser, Page, type KeyInput } from "puppeteer";

export async function launchPuppeteer(headless = true) {
  const browser: Browser = await puppeteer.launch({ headless });
  const page: Page = await browser.newPage();
  return { browser, page };
}

export function pressKeyNTimes(page: Page, button: KeyInput, n: number) {
  for (let i = 0; i < n; i++) page.keyboard.press(button);
}
