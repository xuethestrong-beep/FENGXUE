const fs = require("fs-extra");
const path = require("path");
const play = require("play-dl");

module.exports = {
  config: {
    name: "music",
    aliases: ["song", "play"],
    version: "5.0-final-railway",
    author: "Feng",
    role: 0,
    category: "media"
  },
  onStart: async function ({ api, event, args, message }) {
    const query = args.join(" ");
    if (!query) return message.reply("🎵 music <name>");

    let searchMsg;
    try {
      searchMsg = await message.reply(`🔍 Searching "${query}"...`);
    } catch {}

    try {
      // SEARCH with play-dl
      const results = await play.search(query, { limit: 1, source: { youtube: "video" } });
      if (!results.length) throw new Error("No results");

      const video = results[0];
      const cache = path.join(__dirname, "cache");
      await fs.ensureDir(cache);
      const filePath = path.join(cache, `music_${Date.now()}.mp3`);

      // COOKIES
      const cookiePath = path.join(process.cwd(), "yt_cookies.txt");
      if (fs.existsSync(cookiePath)) {
        const cookies = fs.readFileSync(cookiePath, "utf8");
        // play-dl uses youtube cookie
        await play.setToken({ youtube: { cookie: cookies } }).catch(() => {});
      }

      // DOWNLOAD with play-dl stream (works on Railway)
      const stream = await play.stream(video.url, { quality: 2 });
      await new Promise((resolve, reject) => {
        const write = fs.createWriteStream(filePath);
        stream.stream.pipe(write);
        write.on("finish", resolve);
        write.on("error", reject);
        setTimeout(() => reject(new Error("Download timeout")), 60000);
      });

      try { api.unsendMessage(searchMsg.messageID); } catch {}

      return api.sendMessage({
        body: `🎵 ${video.title}\n⏱️ ${video.durationRaw}`,
        attachment: fs.createReadStream(filePath)
      }, event.threadID, () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, event.messageID);

    } catch (e) {
      try { if (searchMsg) api.unsendMessage(searchMsg.messageID); } catch {}
      return message.reply(`❌ ${e.message}\nCheck yt_cookies.txt in root`);
    }
  }
};
