#!/usr/bin/env tsx

import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import { discordClient, sendEODStudentReport } from "./services/discord.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "../.env.local") });

discordClient.login(process.env.DISCORD_TOKEN);
discordClient.once("clientReady", async () => {
  if (!discordClient.user) {
    console.error("No user found in client.");
    return;
  }
  console.log(`Logged in as ${discordClient.user.tag}`);

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
});
