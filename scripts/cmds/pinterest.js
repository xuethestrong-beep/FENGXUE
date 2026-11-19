const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "pinterest",
    aliases: ["pin", "pint"],
    version: "2.1-AUTO-DELETE",
    author: "Feng",
    role: 0,
    category: "media",
    guide: "{pn} naruto - 5"
  },
  onStart: async function ({ api, event, args, message }) {
    let query = args.join(" ").trim();
    if (!query) return message.reply("Usage: pinterest naruto\npinterest naruto - 10");

    let count = 5;
    let countMatch = query.match(/-\s*(\d+)$/);
    if (countMatch) {
      count = Math.min(parseInt(countMatch[1]), 10);
      query = query.replace(/-\s*\d+$/, "").trim();
    }

    // SEND SEARCHING MESSAGE
    let loadMsg;
    try {
      loadMsg = await api.sendMessage(`📌 Searching Pinterest for "${query}"...`, event.threadID);
    } catch {}

    const cacheDir = path.join(__dirname, "cache");
    fs.ensureDirSync(cacheDir);

    let images = [];

    // API 1
    try {
      let res = await axios.get(`https://api.zennjs.me/api/pinterest?search=${encodeURIComponent(query)}`, { timeout: 15000 });
      if (res.data?.result?.length) images = res.data.result;
      else if (Array.isArray(res.data)) images = res.data;
    } catch {}

    // API 2 backup
    if (images.length === 0) {
      try {
        let res = await axios.get(`https://pinterest-api-one.vercel.app/api/pinterest?search=${encodeURIComponent(query)}`, { timeout: 15000 });
        if (res.data?.data?.length) images = res.data.data;
      } catch {}
    }

    if (images.length === 0) {
      if (loadMsg) {
        try { api.unsendMessage(loadMsg.messageID); } catch {}
      }
      return message.reply(`❌ No results for "${query}"`);
    }

    images = images.sort(() => 0.5 - Math.random()).slice(0, count);

    // ✅ AUTO DELETE SEARCHING MESSAGE WHEN DONE
    if (loadMsg) {
      try { api.unsendMessage(loadMsg.messageID); } catch {}
    }

    await message.reply(`📌 Pinterest: "${query}" - ${images.length} results`);

    for (let i = 0; i < images.length; i++) {
      let url = images[i];
      if (typeof url === "object") url = url.image || url.images?.orig?.url || url.url || url.src;
      if (!url || typeof url !== "string") continue;

      try {
        let imgPath = path.join(cacheDir, `pin_${Date.now()}_${i}.jpg`);
        let imgRes = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
        fs.writeFileSync(imgPath, Buffer.from(imgRes.data));

        await api.sendMessage({
          body: `📌 ${query} [${i + 1}/${images.length}]`,
          attachment: fs.createReadStream(imgPath)
        }, event.threadID);

        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        await new Promise(r => setTimeout(r, 700));
      } catch {}
    }
  }
};
