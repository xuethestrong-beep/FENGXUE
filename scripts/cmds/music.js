const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs");
const path = require("path");

const CACHE_DIR = path.join(__dirname, "cache");
const API_TIMEOUT = 60000;
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

const http = axios.create({ 
  timeout: API_TIMEOUT, 
  headers: { "User-Agent": "Mozilla/5.0" } 
});

// FREE API THAT BYPASSES YOUTUBE BLOCK - no cookies needed
const API_BASE = "https://api.ryzumi.vip"; // change if down, use backup below

async function safeUnsend(message, messageID) {
  if (!messageID) return;
  try { await message.unsend(messageID); } catch {}
}
function removeFile(file) {
  try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
}

async function downloadAudio(url) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, `music_${Date.now()}.mp3`);
  try {
    const res = await http.get(url, { responseType: "arraybuffer", maxContentLength: MAX_AUDIO_SIZE, maxBodyLength: MAX_AUDIO_SIZE });
    const data = Buffer.from(res.data);
    if (!data.length) throw new Error("Empty file");
    if (String(res.headers["content-type"]||"").includes("text/html")) throw new Error("API returned webpage");
    fs.writeFileSync(file, data);
    return file;
  } catch (e) {
    removeFile(file);
    throw e;
  }
}

async function getDownloadURL(videoURL) {
  // TRY 1: ryzumi api
  try {
    const r = await http.get(`${API_BASE}/api/downloader/ytmp3?url=${encodeURIComponent(videoURL)}`);
    if (r.data?.url || r.data?.data?.url) return r.data.url || r.data.data.url;
    if (r.data?.downloadUrl) return r.data.downloadUrl;
  } catch {}
  
  // TRY 2: backup - siputzx api (very stable)
  try {
    const r = await http.get(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(videoURL)}`);
    if (r.data?.data?.dl) return r.data.data.dl;
  } catch {}

  // TRY 3: your old ST api if you have it
  try {
    const stapi = new global.utils.STBotApis();
    const first = await http.post(`${stapi.baseURL}/st/ytviddl`, { url: videoURL });
    const formats = first.data?.formats || [];
    const audio = formats.find(f=>f.ext==="mp3") || formats[0];
    if (!audio) throw new Error();
    const second = await http.post(`${stapi.baseURL}/st/ytviddl`, { url: videoURL, formatUrl: audio.url });
    return second.data?.downloadUrl || second.data?.url;
  } catch {}

  throw new Error("All download APIs failed, try again");
}

module.exports = {
  config: {
    name: "music",
    aliases: ["song", "play"],
    version: "9.0-api-bypass",
    author: "Feng - fixed from ST",
    role: 0,
    category: "music"
  },
  onStart: async function({ api, event, args, message }) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("🎵 music <song name>");

    const searching = await message.reply(`🔍 Searching "${query}"...`);
    try {
      const search = await yts(query);
      const video = search.videos[0];
      if (!video) throw new Error("No results");

      await safeUnsend(message, searching.messageID);
      const proc = await message.reply(`⬇️ Processing: ${video.title}`);

      const dlUrl = await getDownloadURL(video.url);
      const file = await downloadAudio(dlUrl);

      await safeUnsend(message, proc.messageID);

      return api.sendMessage({
        body: `🎶 ${video.title}\n👤 ${video.author.name}\n⏱ ${video.timestamp}`,
        attachment: fs.createReadStream(file)
      }, event.threadID, () => removeFile(file), event.messageID);

    } catch (e) {
      await safeUnsend(message, searching.messageID);
      console.log("[MUSIC]", e.message);
      return message.reply(`❌ ${e.message}`);
    }
  }
};
