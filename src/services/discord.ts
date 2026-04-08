import { Client, GatewayIntentBits } from "discord.js";
import { fetchStudentList } from "./googleSheets.js";

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

  const lastMinuteStudents = await fetchStudentList("Last-Minute");
  const cancelledStudents = await fetchStudentList("Cancelled");
  const noShowStudents = await fetchStudentList("No Show");

  await channel.send(
    [lastMinuteStudents, cancelledStudents, noShowStudents].join(
      "\n—————————————————————————\n",
    ),
  );
}
