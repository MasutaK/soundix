require("dotenv").config();
const Stoat = require("stoat.js");
const ytdl = require("ytdl-core");
const ytSearch = require("yt-search");

const client = new Stoat.Client(process.env.TOKEN);

const PREFIX = "!";
const queues = new Map();

client.on("ready", () => {
    console.log("Bot connected ✅");
});

// Global catch pour éviter crash Node
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection:", reason);
});

client.on("messageCreate", async (message) => {
    try {
        if (!message.content.startsWith(PREFIX)) return;

        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const command = args.shift()?.toLowerCase();
        const guildId = message.guildId;

        if (!queues.has(guildId)) {
            queues.set(guildId, {
                songs: [],
                playing: false,
                connection: null,
                player: null
            });
        }

        const queue = queues.get(guildId);

        // ▶️ PLAY
        if (command === "play") {
            if (!message.member?.voice?.channelId) {
                return message.reply("❌ You must be in a voice channel");
            }
            if (!args[0]) return message.reply("❌ Provide a song name or link");

            let url = args.join(" ");

            if (!ytdl.validateURL(url)) {
                const search = await ytSearch(url);
                if (!search.videos.length) return message.reply("❌ No results found");
                url = search.videos[0].url;
            }

            queue.songs.push(url);
            message.reply(`✅ Added to the queue: ${url}`);

            if (!queue.playing) await playNext(message, queue);
        }

        // ⏭️ SKIP
        if (command === "skip") {
            if (!queue.player) return message.reply("❌ Nothing to skip");
            queue.player.stop();
            message.reply("⏭️ Skipped to next song");
        }

        // ⏸️ PAUSE
        if (command === "pause") {
            if (!queue.player) return message.reply("❌ Nothing is playing");
            queue.player.pause();
            message.reply("⏸️ Paused");
        }

        // ▶️ RESUME
        if (command === "resume") {
            if (!queue.player) return message.reply("❌ Nothing is paused");
            queue.player.resume();
            message.reply("▶️ Resumed");
        }

        // 📜 QUEUE
        if (command === "queue") {
            if (!queue.songs.length) return message.reply("📭 Queue is empty");
            const list = queue.songs.map((s, i) => `${i + 1}. ${s}`).join("\n");
            message.reply("🎶 Current queue:\n" + list);
        }

        // ❌ REMOVE
        if (command === "remove") {
            const index = parseInt(args[0]) - 1;
            if (isNaN(index) || !queue.songs[index]) return message.reply("❌ Invalid index");
            const removed = queue.songs.splice(index, 1);
            message.reply(`❌ Removed from queue: ${removed[0]}`);
        }

        // 🛑 STOP
        if (command === "stop") {
            queue.songs = [];
            queue.player?.stop();
            queue.playing = false;
            message.reply("🛑 Playback stopped + queue cleared");
        }

        // ❓ HELP
        if (command === "help") {
            message.reply(
`🎧 Music Bot Commands:

▶️ !play <name or link>  → Add a song and start playback
⏭️ !skip                 → Skip to next song
⏸️ !pause                → Pause playback
▶️ !resume                → Resume playback
📜 !queue                 → Show the queue
❌ !remove <num>          → Remove a song from the queue
🛑 !stop                  → Stop playback and clear the queue
❓ !help                  → Show this help menu`
            );
        }
    } catch (err) {
        console.error("Error handling message:", err);
        message.reply("❌ An error occurred while processing your command");
    }
});

// 🎧 Play next song in queue
async function playNext(message, queue) {
    if (queue.songs.length === 0) {
        queue.playing = false;
        return;
    }

    queue.playing = true;
    const url = queue.songs[0];

    try {
        const stream = ytdl(url, { filter: "audioonly", quality: "highestaudio" });

        const connection = await client.joinVoiceChannel({
            channelId: message.member.voice.channelId,
            guildId: message.guildId
        });

        queue.connection = connection;
        const player = connection.play(stream);
        queue.player = player;

        player.on("finish", () => {
            queue.songs.shift();
            playNext(message, queue);
        });

    } catch (err) {
        console.error("Error in playNext:", err);
        queue.songs.shift();
        playNext(message, queue);
    }
}

// Login the bot
client.login().catch(err => console.error("Failed to login:", err));
