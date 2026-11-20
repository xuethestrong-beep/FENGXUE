const fs = require("fs-extra");
const path = require("path");
const play = require("play-dl");
const yts = require("yt-search");

module.exports = {
  config: {
    name: "music",
    aliases: ["song", "play"],
    version: "6.0-final-fix",
    author: "Feng",
    role: 0,
    category: "media"
  },
  onStart: async function ({ api, event, args, message }) {
    const query = args.join(" ");
    if (!query) return message.reply("🎵 music <name>");

    let searchMsg;
    try { searchMsg = await message.reply(`🔍 Searching "${query}"...`); } catch {}

    try {
      // INIT play-dl (fixes No results on Railway)
      try {
        await play.getFreeClientID();
        await play.setToken({ youtube: { cookie: "" } });
      } catch {}

      const cookiePath = path.join(process.cwd(), "yt_cookies.txt");
      let cookieString = "";
      if (fs.existsSync(cookiePath)) {
        cookieString = fs.readFileSync(cookiePath, "utf8");
        if (cookieString) {
          await play.setToken({ youtube: { cookie: cookieString } }).catch(()=>{});
        }
      }

      let video = null;

      // TRY 1: play-dl search
      try {
        const res = await play.search(query, { limit: 1, source: { youtube: "video" } });
        if (res[0]) video = { url: res[0].url, title: res[0].title, duration: res[0].durationRaw };
      } catch (e) { console.log("play search fail", e.message); }

      // TRY 2: yt-search fallback
      if (!video) {
        try {
          const s = await yts(query);
          if (s.videos[0]) video = { url: s.videos[0].url, title: s.videos[0].title, duration: s.videos[0].timestamp };
        } catch {}
      }

      if (!video) throw new Error(`No results for "${query}" - YouTube blocked search`);

      const cache = path.join(__dirname, "cache");
      await fs.ensureDir(cache);
      const filePath = path.join(cache, `music_${Date.now()}.mp3`);

      // DOWNLOAD
      const stream = await play.stream(video.url, { quality: 2 });
      await new Promise((resolve, reject) => {
        const write = fs.createWriteStream(filePath);
        stream.stream.pipe(write);
        write.on("finish", resolve);
        write.on("error", reject);
        setTimeout(() => reject(new Error("Timeout 60s")), 60000);
      });

      try { api.unsendMessage(searchMsg.messageID); } catch {}

      return api.sendMessage({
        body: `🎵 ${video.title}\n⏱️ ${video.duration}`,
        attachment: fs.createReadStream(filePath)
      }, event.threadID, () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, event.messageID);

    } catch (e) {
      try { if (searchMsg) api.unsendMessage(searchMsg.messageID); } catch {}
      console.error(e);
      return message.reply(`❌ ${e.message}`);
    }
  }
};
