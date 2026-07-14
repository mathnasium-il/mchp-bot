import { config } from "dotenv";
import cron from "node-cron";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getStudentAppointments } from "./services/daySmart.js";
import { discordClient, sendEODStudentReport } from "./services/discord.js";
import { writeSpreadsheetData } from "./services/googleSheets.js";
import { getEnrolledStudents } from "./services/radius.js";
import { isHolidayOrClosure } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "../.env.local") });

discordClient.login(process.env.DISCORD_TOKEN);
discordClient.once("clientReady", async () => {
  if (!discordClient.user) {
    console.error("No user found in client.");
    return;
  }
  console.log(`Logged into Discord as ${discordClient.user.tag}`);

  if (isHolidayOrClosure()) {
    console.log("Skipping daily report due to center closure.");
    return;
  }

  // Mon–Thu at 7:15 PM - Run daily report
  cron.schedule(
    "15 19 * * 1-4",
    async () => {
      console.log("Running daily report...");
      await sendEODStudentReport();
    },
    {
      timezone: "America/Chicago",
    },
  );

  // Sun at 5:15 PM
  /* cron.schedule(
    "15 17 * * 0",
    async () => {
      console.log("Running daily report!");
      await sendEODStudentReport();
    },
    {
      timezone: "America/Chicago",
    },
  ); */

  // Sun-Thu at 7:00 AM - Fetch enrolled students
  cron.schedule(
    "0 7 * * 0-4",
    async () => {
      console.log("Fetching enrolled students list...");
      const enrolledStudents = await getEnrolledStudents();
      await writeSpreadsheetData(
        "Instruction Scheduler",
        "Radius Students - HELPER!A:A",
        enrolledStudents,
      );
    },
    {
      timezone: "America/Chicago",
    },
  );

  // Sun-Thu at 7:00 AM - Fetch student appointments
  cron.schedule(
    "0 7 * * 0-4",
    async () => {
      console.log("Fetching student appointments...");
      const appointments = await getStudentAppointments();
      await writeSpreadsheetData(
        "Instruction Scheduler",
        "DaySmart!B2:G",
        appointments,
      );
    },
    {
      timezone: "America/Chicago",
    },
  );
});
