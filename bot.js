import "dotenv/config";
import { Client } from "@stoat/javascript-client-sdk";
import ytdl from "ytdl-core";
import ytSearch from "yt-search";

const client = new Client({ token: process.env.TOKEN });
const PREFIX = "!";
const queues = new Map();

client.on("ready", () => {
  console.log(`Bot connected as ${client.user.username}!`);
});

client.login().catch(err => console.error("Login error:", err));

client.on("messageCreate", async (evt) => {
  const message = evt.message;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).split(/ +/);
  const command = args.shift()?.toLowerCase();
  const serverId = message.serverId;

  if (!queues.has(serverId)) {
    queues.set(serverId, { songs: [], playing: false });
  }
  const queue = queues.get(serverId);

  try {
    if (command === "play") {
      if (!message.authorVoiceChannel) return client.sendMessage(message.channelId, "❌ Join a voice channel first!");
      if (!args.length) return client.sendMessage(message.channelId, "❌ Provide song name or link");

      let url = args.join(" ");
      if (!ytdl.validateURL(url)) {
        const search = await ytSearch(url);
        if (!search.videos.length) return client.sendMessage(message.channelId, "❌ No results found");
        url = search.videos[0].url;
      }

      queue.songs.push(url);
      await client.sendMessage(message.channelId, "🎶 Added to queue");
      if (!queue.playing) await playNext(message.authorVoiceChannel, queue);

    } else if (command === "skip") {
      await client.sendMessage(message.channelId, "⏭️ Skipped song");
      queue.skipNext = true;

    } else if (command === "pause") {
      // pause logic here…
      await client.sendMessage(message.channelId, "⏸️ Paused");
    } else if (command === "resume") {
      await client.sendMessage(message.channelId, "▶️ Resumed");
    } else if (command === "queue") {
      const list = queue.songs.map((s, i) => `${i + 1}. ${s}`).join("\n");
      await client.sendMessage(message.channelId, "🎶 Queue:\n" + list);
    } else if (command === "stop") {
      queue.songs = [];
      queue.playing = false;
      await client.sendMessage(message.channelId, "🛑 Stopped + cleared queue");
    } else if (command === "help") {
      await client.sendMessage(message.channelId,
        "Commands: !play, !skip, !pause, !resume, !queue, !stop, !help"
      );
    }

  } catch (error) {
    console.error("Command error:", error);
  }
});

async function playNext(channel, queue) {
  if (!queue.songs.length) {
    queue.playing = false;
    return;
  }
  queue.playing = true;
  const url = queue.songs.shift();

  // stream and play logic goes here…
  // Stoat voice stream method must be implemented according to SDK spec
}

client.login().catch(err => console.error("Login error:", err));
