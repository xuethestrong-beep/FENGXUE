const fs = require("fs-extra");
const path = require("path");
const yts = require("yt-search");
const ytdl = require("@distube/ytdl-core");
const play = require("play-dl");

module.exports = {
  config: {
    name: "music",
    aliases: ["song", "play"],
    version: "4.0-railway-fix",
    author: "Feng",
    role: 0,
    category: "media"
  },
  onStart: async function ({ api, event, args, message }) {
    const query = args.join(" ");
    if (!query) return message.reply("🎵 music <name>");

    const searchMsg = await message.reply(`🔍 Searching "${query}"...`);

    try {
      let videoUrl, videoTitle, videoTime;

      // TRY 1: yt-search
      try {
        const search = await yts(query);
        if (search.videos.length > 0) {
          videoUrl = search.videos[0].url;
          videoTitle = search.videos[0].title;
          videoTime = search.videos[0].timestamp;
        }
      } catch {}

      // TRY 2: play-dl fallback (works on Railway)
      if (!videoUrl) {
        const results = await play.search(query, { limit: 1, source: { youtube: "video" } });
        if (results.length > 0) {
          videoUrl = results[0].url;
          videoTitle = results[0].title;
          videoTime = results[0].durationRaw;
        }
      }

      if (!videoUrl) throw new Error("No results - try more specific title");

      const cache = path.join(__dirname, "cache");
      await fs.ensureDir(cache);
      const filePath = path.join(cache, `music_${Date.now()}.mp3`);

      const cookiePath = path.join(process.cwd(), "yt_cookies.txt");
      let cookieString = "";
      if (fs.existsSync(cookiePath)) {
        cookieString = fs.readFileSync(cookiePath, "utf8");
      }

      await new Promise((resolve, reject) => {
        ytdl(videoUrl, {
          filter: "audioonly",
          quality: "highestaudio",
          requestOptions: {
            headers: {
              cookie: cookieString,
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
          }
        })
        .pipe(fs.createWriteStream(filePath))
        .on("finish", resolve)
        .on("error", reject);
      });

      api.unsendMessage(searchMsg.messageID);

      if (!fs.existsSync(filePath)) throw new Error("Download failed");

      return api.sendMessage({
        body: `🎵 ${videoTitle}\n⏱️ ${videoTime || ""}`,
        attachment: fs.createReadStream(filePath)
      }, event.threadID, () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, event.messageID);

    } catch (e) {
      try { api.unsendMessage(searchMsg.messageID); } catch {}
      return message.reply(`❌ ${e.message}\n\nTip: yt-search blocked on Railway, using play-dl now.`);
    }
  }
};
