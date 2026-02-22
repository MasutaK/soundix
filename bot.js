import "dotenv/config";
import { Client } from "@stoat/javascript-client-sdk";
import ytdl from "ytdl-core";
import ytSearch from "yt-search";

// ⚡ Initialisation du bot
const client = new Client({ token: process.env.TOKEN });
const PREFIX = "!";
const queues = new Map(); // Queue par serveur

client.on("ready", () => {
  console.log(`Bot connecté en tant que ${client.user.username}!`);
});

// ⚡ Commandes
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
        return client.sendMessage(message.channelId, "❌ Rejoins un canal vocal d'abord !");
      }
      if (!args.length) {
        return client.sendMessage(message.channelId, "❌ Fournis un nom de chanson ou un lien !");
      }

      let url = args.join(" ");
      if (!ytdl.validateURL(url)) {
        const search = await ytSearch(url);
        if (!search.videos.length) return client.sendMessage(message.channelId, "❌ Aucun résultat trouvé");
        url = search.videos[0].url;
      }

      queue.songs.push(url);
      await client.sendMessage(message.channelId, `🎶 Ajouté à la queue : ${url}`);

      if (!queue.playing) {
        await playNext(message.authorVoiceChannel, queue);
      }

    } else if (command === "skip") {
      if (!queue.playing) return client.sendMessage(message.channelId, "❌ Rien n'est en cours de lecture");
      queue.skipNext = true;
      await client.sendMessage(message.channelId, "⏭️ Chanson suivante");

    } else if (command === "pause") {
      if (queue.dispatcher) queue.dispatcher.pause();
      await client.sendMessage(message.channelId, "⏸️ En pause");

    } else if (command === "resume") {
      if (queue.dispatcher) queue.dispatcher.resume();
      await client.sendMessage(message.channelId, "▶️ Lecture reprise");

    } else if (command === "queue") {
      if (!queue.songs.length) return client.sendMessage(message.channelId, "🎶 La queue est vide");
      const list = queue.songs.map((s, i) => `${i + 1}. ${s}`).join("\n");
      await client.sendMessage(message.channelId, "🎶 Queue:\n" + list);

    } else if (command === "stop") {
      queue.songs = [];
      queue.playing = false;
      if (queue.dispatcher) queue.dispatcher.stop();
      await client.sendMessage(message.channelId, "🛑 Lecture arrêtée et queue vidée");

    } else if (command === "help") {
      await client.sendMessage(message.channelId,
        "Commandes disponibles:\n!play <lien ou nom>\n!skip\n!pause\n!resume\n!queue\n!stop\n!help"
      );
    }

  } catch (error) {
    console.error("Erreur commande:", error);
  }
});

// ⚡ Lecture de la musique
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
      if (queue.skipNext) queue.skipNext = false;
      playNext(channel, queue);
    });

    queue.dispatcher.on("error", (err) => {
      console.error("Erreur dispatcher:", err);
      playNext(channel, queue);
    });

  } catch (err) {
    console.error("Erreur playNext:", err);
    queue.playing = false;
  }
}

// ⚡ Connexion
client.login().catch(err => console.error("Erreur login:", err));
