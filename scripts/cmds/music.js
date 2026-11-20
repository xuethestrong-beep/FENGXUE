const fs = require("fs-extra");
const path = require("path");
const yts = require("yt-search");
const ytdl = require("@distube/ytdl-core");

module.exports = {
  config: {
    name: "music",
    aliases: ["song", "play"],
    version: "3.1-railway",
    author: "Feng",
    role: 0,
    category: "media"
  },
  onStart: async function ({ api, event, args, message }) {
    const query = args.join(" ");
    if (!query) return message.reply("🎵 music <name>");

    const searchMsg = await message.reply(`🔍 Searching "${query}"...`);

    try {
      const search = await yts(query);
      const video = search.videos[0];
      if (!video) throw new Error("No results");

      const cache = path.join(__dirname, "cache");
      await fs.ensureDir(cache);
      const filePath = path.join(cache, `music_${Date.now()}.mp3`);

      const cookiePath = path.join(process.cwd(), "yt_cookies.txt");
      let cookieString = "";
      if (fs.existsSync(cookiePath)) {
        cookieString = fs.readFileSync(cookiePath, "utf8");
      }

      // DOWNLOAD WITH YTDL + COOKIES
      await new Promise((resolve, reject) => {
        const stream = ytdl(video.url, {
          filter: "audioonly",
          quality: "highestaudio",
          requestOptions: {
            headers: {
              cookie: cookieString,
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          }
        });
        stream.pipe(fs.createWriteStream(filePath))
          .on("finish", resolve)
          .on("error", reject);
      });

      api.unsendMessage(searchMsg.messageID);

      return api.sendMessage({
        body: `🎵 ${video.title}`,
        attachment: fs.createReadStream(filePath)
      }, event.threadID, () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, event.messageID);

    } catch (e) {
      try { api.unsendMessage(searchMsg.messageID); } catch {}
      return message.reply(`❌ ${e.message}`);
    }
  }
};
