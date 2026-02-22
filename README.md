# 🎧 Soundix

A powerful music bot for Stoat.chat with queue system, playback controls and YouTube support.

---

## 🚀 Features

- ▶️ Play music from YouTube
- 🔎 Search music without link
- 📜 Queue system
- ⏸️ Pause / Resume
- ⏭️ Skip tracks
- ❌ Remove songs from queue
- 🛑 Stop playback and clear queue

---

## 🎮 Commands

```
!play <name or url>   → Play a song or search automatically
!skip                → Skip current song
!pause               → Pause playback
!resume              → Resume playback
!queue               → Show queue
!remove <number>     → Remove a song from queue
!stop                → Stop and clear queue
!help                → Show help menu
```

---

## 🔐 Configuration

Create a `.env` file in the root folder:

```
TOKEN=your_token_here
```

---

## 💡 Tips

- You must be in a voice channel to use `!play`
- You can search music without a link  
  Example: `!play Imagine Dragons`

---

## 📦 Dependencies

- @stoat/chat
- ytdl-core
- yt-search
- ffmpeg-static
- dotenv

---

## 🧑‍💻 Author
Masuta

---

## ⭐ Support

If you like this project, consider giving it a star ⭐
