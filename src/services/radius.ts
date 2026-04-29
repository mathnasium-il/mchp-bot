import { config } from "dotenv";
import { dirname, join } from "path";
import type { Page } from "puppeteer";
import { fileURLToPath } from "url";
import { launchPuppeteer, pressKeyNTimes } from "./puppeteer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "../../.env.local") });

async function logIntoRadius(page: Page) {
  const [username, password] = [
    process.env.RADIUS_USER,
    process.env.RADIUS_PWD,
  ];

  if (!username || !password) {
    throw new Error("RADIUS_USER and RADIUS_PWD must be set in .env.local");
  }

  await console.log("Logging into Radius...");
  await page.goto("https://radius.mathnasium.com/Account/Login");
  let url = page.url();
  while (url.includes("Login")) {
    await page.type("#UserName", username);
    await page.type("#Password", password);
    await Promise.all([page.click("#login"), page.waitForNavigation()]);
    url = page.url();
  }
  await console.log(`Logged into Radius as ${username}`);
}

export async function fetchCheckedInStudents(): Promise<string> {
  const { browser, page } = await launchPuppeteer();
  await logIntoRadius(page);
  await console.log("Fetching checked-in students...");
  await page.goto("https://radius.mathnasium.com/Attendance/Roster");
  await page.waitForSelector("tr.k-master-row");
  await page.click("#btnsearch");

  const checkedInStudents = await page
    .$$eval("tr.k-master-row", (rows) => {
      return rows.map((row) => {
        const cells = Array.from(row.cells);
        return cells.map((cell) => cell.innerText);
      });
    })
    .then(
      (students) =>
        students
          .filter((row) => row[4] === "true") // Filter for checked-in students
          .map((row, i) => `${i + 1}. ${[row[7], row[8]].join(" ")}`.trim()), // Display only first and last name
    );

  const studentList =
    checkedInStudents.length > 0
      ? `**The following students are not checked out in Radius:**\n` +
        checkedInStudents.join("\n")
      : "All students have been checked out in Radius!";

  await browser.close();
  // await console.log(studentList);
  return studentList;
}

export async function fetchEnrolledStudents() {
  const { browser, page } = await launchPuppeteer();
  await logIntoRadius(page);
  // await console.log("Fetching enrolled students...");
  await page.goto("https://radius.mathnasium.com/Student");

  await pressKeyNTimes(page, "Tab", 2);
  await page.keyboard.type("Enrolled", { delay: 100 });
  await page.keyboard.press("Enter");
  await page.waitForSelector("tr.k-master-row");

  const clicksPerRow = 3;
  await pressKeyNTimes(page, "Tab", 100 * clicksPerRow + 19);

  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await pressKeyNTimes(page, "ArrowDown", 3);
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => document.querySelectorAll("tr.k-master-row").length > 100,
  );

  const enrolledStudents = await page
    .$$eval("tr.k-master-row", (rows) => {
      return rows.map((row) => {
        const cells = Array.from(row.cells);
        return cells.map((cell) => cell.innerText);
      });
    })
    .then(
      (students) =>
        students
          .map((row) => [row[0], row[1]].join(" ").trim()) // First and last name
          .sort() // Sort alphabetically by full name
          .filter((name) => name !== "") // Filter out empty names
          .map((name) => [name]), // Wrap each name in an array to match the expected format for Google Sheets
    );

  await browser.close();
  return enrolledStudents;
}
