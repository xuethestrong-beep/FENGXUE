const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "manga",
    aliases: ["manhwa", "manhua", "manwa"],
    version: "5.0-5SOURCES",
    author: "Feng",
    role: 0,
    category: "anime",
    guide: "{pn} title chap"
  },
  onStart: async function ({ api, event, args, message }) {
    let raw = args.join(" ").trim();
    if (!raw) return message.reply("Usage: manga solo leveling 5");
    let chap = parseInt(raw.match(/(\d+)$/)?.[1] || 1);
    let nameRaw = raw.replace(/\s*\d+\s*$/, "").trim();
    const cacheDir = path.join(__dirname, "cache");
    fs.ensureDirSync(cacheDir);

    let loadMsg;
    try { loadMsg = await api.sendMessage(`📚 Searching ${nameRaw} ch.${chap}...`, event.threadID); } catch {}

    const trySend = async (pages, title, src, host, hash, mode) => {
      if (loadMsg) try { api.unsendMessage(loadMsg.messageID); } catch {}
      await sendPages(api, event, message, host, hash, pages, title, chap, cacheDir, mode, src);
      return true;
    };

    // 1. MANGADEX
    try {
      let { data } = await axios.get(`https://api.mangadex.org/manga?title=${encodeURIComponent(nameRaw)}&limit=3`, { timeout: 10000 });
      if (data.data.length) {
        let mangaId = data.data[0].id;
        let title = data.data[0].attributes.title.en || Object.values(data.data[0].attributes.title)[0];
        let { data: cData } = await axios.get(`https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=500`, { timeout: 10000 });
        let found = cData.data.find(c => parseInt(c.attributes.chapter) == chap) || cData.data[chap - 1];
        if (found) {
          let { data: server } = await axios.get(`https://api.mangadex.org/at-home/server/${found.id}`, { timeout: 10000 });
          if (await trySend(server.chapter.data, title, "Mangadex", server.baseUrl, server.chapter.hash, "data")) return;
        }
      }
    } catch {}

    // 2. COMICK
    try {
      if (loadMsg) try { api.editMessage(`📚 Trying Comick...`, loadMsg.messageID); } catch {}
      let { data: search } = await axios.get(`https://api.comick.fun/v1.0/search?query=${encodeURIComponent(nameRaw)}`, { timeout: 10000 });
      if (search[0]) {
        let hid = search[0].hid;
        let { data: chapData } = await axios.get(`https://api.comick.fun/comic/${hid}/chapters?lang=en`, { timeout: 10000 });
        let target = chapData.chapters?.find(c => parseFloat(c.chap) == chap) || chapData.chapters?.[chap - 1];
        if (target) {
          let { data: imgData } = await axios.get(`https://api.comick.fun/chapter/${target.hid}/get_images`, { timeout: 10000 });
          let pages = imgData.chapter.data.map(p => p.url);
          if (pages.length && await trySend(pages, search[0].title, "Comick", "", "", "direct")) return;
        }
      }
    } catch {}

    // 3. CONSUMET MANGAHERE
    try {
      if (loadMsg) try { api.editMessage(`📚 Trying MangaHere...`, loadMsg.messageID); } catch {}
      let { data } = await axios.get(`https://api.consumet.org/manga/mangahere/${encodeURIComponent(nameRaw)}`, { timeout: 10000 });
      let id = data.results?.[0]?.id;
      if (id) {
        let { data: info } = await axios.get(`https://api.consumet.org/manga/mangahere/info/${id}`, { timeout: 10000 });
        let ch = info.chapters?.find(c => c.chapterNumber == chap) || info.chapters?.[chap - 1];
        if (ch) {
          let { data: read } = await axios.get(`https://api.consumet.org/manga/mangahere/read?chapterId=${ch.id}`, { timeout: 15000 });
          let pages = read.map(p => p.img);
          if (pages.length && await trySend(pages, info.title, "MangaHere", "", "", "direct")) return;
        }
      }
    } catch {}

    // 4. CONSUMET MANGAPILL
    try {
      if (loadMsg) try { api.editMessage(`📚 Trying MangaPill...`, loadMsg.messageID); } catch {}
      let { data } = await axios.get(`https://api.consumet.org/manga/mangapill/${encodeURIComponent(nameRaw)}`, { timeout: 10000 });
      let id = data.results?.[0]?.id;
      if (id) {
        let { data: info } = await axios.get(`https://api.consumet.org/manga/mangapill/info/${id}`, { timeout: 10000 });
        let ch = info.chapters?.find(c => c.chapterNumber == chap) || info.chapters?.[chap - 1];
        if (ch) {
          let { data: read } = await axios.get(`https://api.consumet.org/manga/mangapill/read?chapterId=${ch.id}`, { timeout: 15000 });
          let pages = read.map(p => p.img);
          if (pages.length && await trySend(pages, info.title, "MangaPill", "", "", "direct")) return;
        }
      }
    } catch {}

    if (loadMsg) try { api.unsendMessage(loadMsg.messageID); } catch {}
    return message.reply(`❌ Not found in 5 sources: ${nameRaw} ch.${chap}`);
  }
};

async function sendPages(api, event, message, host, hash, pages, title, chap, cacheDir, mode, src) {
  await message.reply(`📖 ${title} Ch.${chap} - ${pages.length} pages | Source: ${src}`);
  for (let start = 0; start < pages.length; start += 5) {
    let batch = pages.slice(start, start + 5);
    let attachments = []; let paths = [];
    for (let i = 0; i < batch.length; i++) {
      try {
        let p = path.join(cacheDir, `manga_${Date.now()}_${start}_${i}.jpg`);
        let url = mode === "data" ? `${host}/data/${hash}/${batch[i]}` : batch[i];
        let r = await axios.get(url, { responseType: "arraybuffer", timeout: 20000, headers: { "Referer": "https://mangadex.org/", "User-Agent": "Mozilla/5.0" } });
        fs.writeFileSync(p, Buffer.from(r.data));
        attachments.push(fs.createReadStream(p)); paths.push(p);
      } catch {}
    }
    if (attachments.length > 0) {
      await api.sendMessage({ body: `📖 ${title} [${start + 1}-${Math.min(start + 5, pages.length)}/${pages.length}]`, attachment: attachments }, event.threadID);
    }
    for (let pp of paths) if (fs.existsSync(pp)) fs.unlinkSync(pp);
    if (global.gc) global.gc();
    await new Promise(r => setTimeout(r, 600));
  }
  await message.reply(`✅ Done! ${title} Ch.${chap} - ${pages.length} pages`);
  }
