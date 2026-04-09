import { config } from "dotenv";
import { dirname, join } from "path";
import type { Page } from "puppeteer";
import { fileURLToPath } from "url";
import { launchPuppeteer } from "./puppeteer.js";

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
