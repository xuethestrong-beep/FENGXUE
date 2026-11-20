const fs = require("fs-extra");
const path = require("path");
const play = require("play-dl");
const yts = require("yt-search");
const ytdl = require("@distube/ytdl-core");

function parseCookies(filePath) {
  if (!fs.existsSync(filePath)) return "";
  const content = fs.readFileSync(filePath, "utf8");
  if (!content.includes("\t")) return content.replace(/[\r\n]+/g, "").trim();
  const cookies = [];
  for (const line of content.split("\n")) {
    if (!line || line.startsWith("#") || line.trim() == "") continue;
    const parts = line.trim().split("\t");
    if (parts.length >= 7) cookies.push(`${parts[5]}=${parts[6]}`);
  }
  return cookies.join("; ");
}

module.exports = {
  config: {
    name: "music",
    aliases: ["song", "play"],
    version: "7.0-hybrid",
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
      await play.getFreeClientID().catch(()=>{});
      const cookiePath = path.join(process.cwd(), "yt_cookies.txt");
      const cookieString = parseCookies(cookiePath);
      if (cookieString) await play.setToken({ youtube: { cookie: cookieString } }).catch(()=>{});

      let video = null;
      try {
        const res = await play.search(query, { limit: 1, source: { youtube: "video" } });
        if (res[0]) video = { url: res[0].url, title: res[0].title, duration: res[0].durationRaw };
      } catch {}
      if (!video) {
        const s = await yts(query);
        if (s.videos[0]) video = { url: s.videos[0].url, title: s.videos[0].title, duration: s.videos[0].timestamp };
      }
      if (!video) throw new Error("No results");

      const cache = path.join(__dirname, "cache");
      await fs.ensureDir(cache);
      const filePath = path.join(cache, `music_${Date.now()}.mp3`);

      // DOWNLOAD WITH ytdl-core (fixes Invalid URL)
      await new Promise((resolve, reject) => {
        ytdl(video.url, {
          filter: "audioonly",
          quality: "highestaudio",
          requestOptions: {
            headers: {
              cookie: cookieString,
              "User-Agent": "Mozilla/5.0"
            }
          }
        })
        .pipe(fs.createWriteStream(filePath))
        .on("finish", resolve)
        .on("error", reject);
        setTimeout(() => reject(new Error("Timeout 60s - cookies may be expired")), 60000);
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
