const fs = require("fs-extra");
const path = require("path");
const yts = require("yt-search");
const ytdl = require("@distube/ytdl-core");

module.exports = {
  config: {
    name: "music",
    aliases: ["song", "play"],
    version: "2.0-cookies",
    author: "Feng",
    role: 0,
    category: "media",
    guide: "{pn} song name"
  },

  onStart: async function ({ api, event, args, message }) {
    const query = args.join(" ");
    if (!query) return message.reply("🎵 music <name>");

    const searchMsg = await message.reply(`🔍 Searching "${query}"...`);

    try {
      const search = await yts(query);
      if (!search.videos.length) {
        api.unsendMessage(searchMsg.messageID);
        return message.reply("❌ No results");
      }

      const video = search.videos[0];
      const url = video.url;

      // COOKIES PATH
      const cookiePath = path.join(process.cwd(), "yt_cookies.txt");
      const hasCookies = fs.existsSync(cookiePath);

      // SETUP AGENT WITH COOKIES
      const agent = hasCookies ? ytdl.createAgent(JSON.parse(fs.readFileSync(cookiePath, "utf8").includes("youtube.com") ? "[]" : "[]"), { 
        lang: "en-US" 
      }) : undefined;

      // If using cookies.txt file, use ytdl with cookie file directly
      const options = hasCookies ? {
        filter: "audioonly",
        quality: "highestaudio",
        requestOptions: {
          headers: {
            cookie: fs.readFileSync(cookiePath, "utf8"),
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
          }
        }
      } : { filter: "audioonly", quality: "highestaudio" };

      const cache = path.join(__dirname, "cache");
      fs.ensureDirSync(cache);
      const filePath = path.join(cache, `music_${Date.now()}.mp3`);

      // DOWNLOAD USING YTDL
      await new Promise((resolve, reject) => {
        ytdl(url, options)
          .pipe(fs.createWriteStream(filePath))
          .on("finish", resolve)
          .on("error", reject);
      });

      api.unsendMessage(searchMsg.messageID);

      return api.sendMessage({
        body: `🎵 ${video.title}\n⏱️ ${video.timestamp}\n${hasCookies ? "🍪 cookies: ON" : "⚠️ cookies not found"}`,
        attachment: fs.createReadStream(filePath)
      }, event.threadID, () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, event.messageID);

    } catch (e) {
      api.unsendMessage(searchMsg.messageID);
      return message.reply(`❌ ${e.message}\nCheck yt_cookies.txt`);
    }
  }
};
