import { Client, GatewayIntentBits } from "discord.js";
import { fetchStudentList } from "./googleSheets.js";
import { fetchCheckedInStudents } from "./radius.js";
import { format } from "date-fns";

const discordChannels = new Map([
  ["lead-team", "1457443742842753148"],
  ["automated-reminders", "1489433511470436403"],
  ["test-channel", "1481388054148284569"],
] as const);

type DiscordChannelName = Parameters<typeof discordChannels.get>[0];

export const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

async function fetchChannel(channelName: DiscordChannelName) {
  return await discordClient.channels.fetch(discordChannels.get(channelName)!);
}

export async function sendEODStudentReport() {
  const channel = await fetchChannel("lead-team");

  // Check if the channel exists AND is a text-based channel
  if (!channel) {
    console.error("Channel not found.");
    return;
  }
  if (!channel.isTextBased() || !("send" in channel)) {
    console.error("Channel cannot send messages.");
    return;
  }

  const today = new Date();

  const lastMinuteStudents = await fetchStudentList("Last-Minute");
  const cancelledStudents = await fetchStudentList("Cancelled");
  const noShowStudents = await fetchStudentList("No Show");
  const checkedInStudents = await fetchCheckedInStudents();

  await channel.send(
    `# EOD Report - ${format(today, "eee, MMM d")}\n-# Below is an auto-generated student sessions report for today (${format(today, "MM/dd/yyyy")}). [Click here](https://docs.google.com/spreadsheets/d/1TKA8M9LQciU_NjYczRDpWzhBAYeVFEPPSvhs3UBY4tg/edit?gid=0#gid=0) to navigate to the Instruction Scheduler. For any questions or concerns, please reach out to the admin team.\n\n` +
      [
        lastMinuteStudents,
        cancelledStudents,
        noShowStudents,
        checkedInStudents,
      ].join("\n—————————————————————————\n"),
  );
}
