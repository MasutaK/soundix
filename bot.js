import "dotenv/config";
import Stoat from "stoat.js"; 
import ytdl from "ytdl-core";
import ytSearch from "yt-search";

const client = new Stoat.Client(process.env.TOKEN);
const PREFIX = "!";
const queues = new Map();

client.on("ready", () => {
  console.log(`Bot connected as ${client.user.username}!`);
});

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

    } else if (command === "pause") {
      if (queue.dispatcher) queue.dispatcher.pause();
      await client.sendMessage(message.channelId, "⏸️ Paused");

    } else if (command === "resume") {
      if (queue.dispatcher) queue.dispatcher.resume();
      await client.sendMessage(message.channelId, "▶️ Resumed");

    } else if (command === "queue") {
      if (!queue.songs.length) return client.sendMessage(message.channelId, "🎶 Queue is empty");
      const list = queue.songs.map((s, i) => `${i + 1}. ${s}`).join("\n");
      await client.sendMessage(message.channelId, "🎶 Queue:\n" + list);

    } else if (command === "stop") {
      queue.songs = [];
      queue.playing = false;
      if (queue.dispatcher) queue.dispatcher.stop();
      await client.sendMessage(message.channelId, "🛑 Stopped + cleared queue");

    } else if (command === "help") {
      await client.sendMessage(message.channelId,
        "Commands:\n!play <link or name>\n!skip\n!pause\n!resume\n!queue\n!stop\n!help"
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

  try {
    const stream = ytdl(url, { filter: "audioonly", quality: "highestaudio" });
    const connection = await channel.join();
    
    queue.dispatcher = connection.play(stream);

    queue.dispatcher.on("finish", () => {
      if (queue.skipNext) {
        queue.skipNext = false;
      }
      playNext(channel, queue);
    });

    queue.dispatcher.on("error", (err) => {
      console.error("Dispatcher error:", err);
      playNext(channel, queue);
    });

  } catch (err) {
    console.error("PlayNext error:", err);
    queue.playing = false;
  }
}

client.login().catch(err => console.error("Login error:", err));
