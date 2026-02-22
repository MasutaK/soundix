import "dotenv/config";
import { Client } from "@stoat/javascript-client-sdk";
import ytdl from "ytdl-core";
import ytSearch from "yt-search";

// Initialisation du client Stoat
const client = new Client({ token: process.env.TOKEN });

const PREFIX = "!";
const queues = new Map(); // Queue par serveur

// Quand le bot est prêt
client.on("ready", () => {
  console.log(`Bot connecté en tant que ${client.user.username}!`);
});

// Gestion des messages
client.on("messageCreate", async (evt) => {
  const message = evt.message;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).split(/ +/);
  const command = args.shift()?.toLowerCase();
  const serverId = message.serverId;

  if (!queues.has(serverId)) {
    queues.set(serverId, { songs: [], playing: false, skipNext: false });
  }
  const queue = queues.get(serverId);

  try {
    if (command === "play") {
      if (!message.authorVoiceChannel) {
        return client.sendMessage(message.channelId, "❌ Join a voice channel first!");
      }
      if (!args.length) {
        return client.sendMessage(message.channelId, "❌ Provide song name or link");
      }

      let url = args.join(" ");
      if (!ytdl.validateURL(url)) {
        const search = await ytSearch(url);
        if (!search.videos.length) return client.sendMessage(message.channelId, "❌ No results found");
        url = search.videos[0].url;
      }

      queue.songs.push(url);
      await client.sendMessage(message.channelId, `🎶 Added to queue: ${url}`);

      if (!queue.playing) {
        await playNext(message.authorVoiceChannel, queue);
      }

    } else if (command === "skip") {
      if (!queue.playing) return client.sendMessage(message.channelId, "❌ Nothing is playing");
      queue.skipNext = true;
      await client.sendMessage(message.channelId, "⏭️ Skipped song");

    } else if (command === "queue") {
      if (!queue.songs.length) return client.sendMessage(message.channelId, "🎶 Queue is empty");
      const list = queue.songs.map((s, i) => `${i + 1}. ${s}`).join("\n");
      await client.sendMessage(message.channelId, "🎶 Queue:\n" + list);

    } else if (command === "stop") {
      queue.songs = [];
      queue.playing = false;
      try {
        await client.stopAudio(message.authorVoiceChannel.id);
      } catch {}
      await client.sendMessage(message.channelId, "🛑 Stopped + cleared queue");

    } else if (command === "help") {
      await client.sendMessage(message.channelId,
        "Commands:\n!play <link or name>\n!skip\n!queue\n!stop\n!help"
      );
    }

  } catch (error) {
    console.error("Command error:", error);
  }
});

// Fonction pour jouer la prochaine chanson
async function playNext(voiceChannel, queue) {
  if (!queue.songs.length) {
    queue.playing = false;
    return;
  }

  queue.playing = true;
  const url = queue.songs.shift();

  try {
    // Rejoindre le canal vocal
    const connection = await client.joinVoiceChannel(voiceChannel.id);

    // Récupérer le stream audio
    const stream = ytdl(url, { filter: "audioonly", quality: "highestaudio" });

    // Jouer le stream
    await connection.playAudio(stream);

    // Quand la chanson se termine
    connection.on("finish", () => {
      if (queue.skipNext) queue.skipNext = false;
      playNext(voiceChannel, queue);
    });

    // En cas d'erreur
    connection.on("error", (err) => {
      console.error("Voice connection error:", err);
      queue.playing = false;
    });

  } catch (err) {
    console.error("PlayNext error:", err);
    queue.playing = false;
  }
}

// Login du bot
client.login().catch(err => console.error("Login error:", err));
