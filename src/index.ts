import { config } from "dotenv";
import cron from "node-cron";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getStudentAppointments } from "./services/daysmart.js";
import {
  discordClient,
  sendEODStudentReport,
  sendReconciliationReport,
} from "./services/discord.js";
import { writeSpreadsheetData } from "./services/googleSheets.js";
import { handleRadiusOperations } from "./services/radius.js";
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

  // Sun-Thu at 9:00 AM
  // BOD Operations - Fetch student appointments, enrolled students, and payment issues.
  cron.schedule(
    "0 9 * * 0-4",
    async () => {
      const appointments = await getStudentAppointments();
      await writeSpreadsheetData(
        "Instruction Scheduler",
        "DaySmart!B2:G",
        appointments,
      );

      const { enrolledStudents, payments, totalExpected } =
        await handleRadiusOperations();
      await writeSpreadsheetData(
        "Instruction Scheduler",
        "Radius Students - HELPER!A:A",
        enrolledStudents,
      );

      await sendReconciliationReport(payments, totalExpected);
    },
    { timezone: "America/Chicago" },
  );

  // Mon–Thu at 7:15 PM
  // EOD Operations - Run daily report
  cron.schedule(
    "15 19 * * 1-4",
    async () => {
      const { checkedInStudents } = await handleRadiusOperations();
      await sendEODStudentReport(checkedInStudents);
    },
    { timezone: "America/Chicago" },
  );

  // Sun at 5:15 PM
  // EOD Operations - Run daily report
  /* cron.schedule(
    "15 17 * * 0",
    async () => {
      console.log("Running daily report!");
      await sendEODStudentReport();
    },
    { timezone: "America/Chicago" },
  ); */
});
