import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import { discordClient, sendEODStudentReport } from "./services/discord.js";
import { fetchEnrolledStudents } from "./services/radius.js";
import { writeSpreadsheetData } from "./services/googleSheets.js";

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

  // Mon–Thu at 7:45 PM
  cron.schedule(
    "45 19 * * 1-4",
    async () => {
      console.log("Running daily report!");
      await sendEODStudentReport();
    },
    {
      timezone: "America/Chicago",
    },
  );

  // Sun at 5:15 PM
  cron.schedule(
    "15 17 * * 0",
    async () => {
      console.log("Running daily report!");
      await sendEODStudentReport();
    },
    {
      timezone: "America/Chicago",
    },
  );

  // Sun-Thu at 7:00 AM
  cron.schedule(
    "0 7 * * 0-4",
    async () => {
      console.log("Fetching enrolled students list!");
      const enrolledStudents = await fetchEnrolledStudents();
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
});
