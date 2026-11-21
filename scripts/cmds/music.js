const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const yts = require("yt-search");

module.exports = {
  config: {
    name: "music",
    version: "5.0 Railway",
    author: "FENG",
    role: 0,
    countDown: 10,
    category: "media",
    guide: "{pn} <song name>"
  },

  onStart: async function({ api, event, args, message }) {
    if (!args.length) return message.reply("🎵 !music take all the love by Arthur Nery");
    const query = args.join(" ");
    const proc = await message.reply(`⬇️ Searching: ${query}`);

    try {
      const search = await yts(query);
      const video = search.videos[0];
      if (!video) throw new Error("No result");
      const videoUrl = video.url;

      const apis = [
        `https://api.siputzx.my.id/api/d/ytmp3?url=${videoUrl}`,
        `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${videoUrl}`,
        `https://api.agatz.xyz/api/ytmp3?url=${videoUrl}`
      ];

      let dlUrl = null;
      for (const apiUrl of apis) {
        try {
          const res = await axios.get(apiUrl, { timeout: 15000 });
          dlUrl = res.data?.data?.url || res.data?.url || res.data?.result || res.data?.download;
          if (dlUrl) break;
        } catch {}
      }

      if (!dlUrl) throw new Error("All download APIs failed");

      const filePath = path.join(__dirname, "cache", `${Date.now()}.mp3`);
      const writer = fs.createWriteStream(filePath);
      const response = await axios({ url: dlUrl, method: "GET", responseType: "stream" });
      response.data.pipe(writer);

      await new Promise((res, rej) => {
        writer.on("finish", res);
        writer.on("error", rej);
      });

      await api.unsendMessage(proc.messageID);
      return api.sendMessage({
        body: `🎵 ${video.title}`,
        attachment: fs.createReadStream(filePath)
      }, event.threadID, () => fs.unlinkSync(filePath), event.messageID);

    } catch (e) {
      await api.unsendMessage(proc.messageID);
      return message.reply(`❌ ${e.message}\nTry again later master`);
    }
  }
};
