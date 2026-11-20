const fs = require("fs-extra");
const path = require("path");
const yts = require("yt-search");
const { exec } = require("child_process");
const youtubedl = require("youtube-dl-exec");

module.exports = {
  config: {
    name: "music",
    aliases: ["song", "play"],
    version: "3.0-final",
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
      
      // DOWNLOAD
      await youtubedl(video.url, {
        extractAudio: true,
        audioFormat: "mp3",
        audioQuality: 0,
        output: filePath,
        cookies: fs.existsSync(cookiePath) ? cookiePath : undefined,
        noWarnings: true,
        noCheckCertificate: true,
        addHeader: ["user-agent: Mozilla/5.0"]
      });

      // AUTO DELETE SEARCHING
      api.unsendMessage(searchMsg.messageID);

      if (!fs.existsSync(filePath)) throw new Error("Download failed");

      return api.sendMessage({
        body: `🎵 ${video.title}`,
        attachment: fs.createReadStream(filePath)
      }, event.threadID, () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, event.messageID);

    } catch (e) {
      // AUTO DELETE EVEN ON ERROR
      try { api.unsendMessage(searchMsg.messageID); } catch {}
      return message.reply(`❌ ${e.message}\n\nCheck:\n1. yt_cookies.txt in root\n2. npm install youtube-dl-exec yt-search fs-extra`);
    }
  }
};
