
const pinterest = require("pinterest-scraper");

module.exports = {
  config: {
    name: "pinterest",
    aliases: ["pin", "pins"],
    version: "1.0.0",
    author: "FENGSAMA",
    countDown: 10,
    role: 0,
    description: "Search and send Pinterest images",
    category: "media",
    guide: {
      en: "{pn} <search query>"
    }
  },

  onStart: async function ({ message, args }) {
    try {
      const query = args.join(" ").trim();

      if (!query) {
        return message.reply(
          "📌 P I N T E R E S T\n\n" +
          "Please provide something to search.\n\n" +
          "Example:\n" +
          "• pinterest anime wallpaper\n" +
          "• pinterest aesthetic\n" +
          "• pinterest couple\n" +
          "• pinterest profile picture"
        );
      }

      const wait = await message.reply(
        `🔎 Searching Pinterest for: ${query}...`
      );

      const results = await pinterest(query);

      if (!results || !results.length) {
        return message.reply("❌ No Pinterest images found.");
      }

      const selected = results
        .map(item => item.image)
        .filter(Boolean)
        .slice(0, 5);

      if (!selected.length) {
        return message.reply("❌ No usable images found.");
      }

      const axios = require("axios");
      const fs = require("fs-extra");
      const path = require("path");

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);

      const attachments = [];

      for (let i = 0; i < selected.length; i++) {
        const response = await axios.get(selected[i], {
          responseType: "arraybuffer",
          timeout: 20000
        });

        const filePath = path.join(
          cacheDir,
          `pinterest_${Date.now()}_${i}.jpg`
        );

        await fs.writeFile(filePath, response.data);
        attachments.push(fs.createReadStream(filePath));
      }

      await message.reply({
        body: `📌 P I N T E R E S T\n\n🔎 Search: ${query}\n🖼️ Results: ${attachments.length}`,
        attachment: attachments
      });

      for (const file of await fs.readdir(cacheDir)) {
        if (file.startsWith("pinterest_")) {
          await fs.remove(path.join(cacheDir, file));
        }
      }

    } catch (error) {
      console.error("Pinterest command error:", error);
      return message.reply(
        "❌ Pinterest search failed.\n" +
        "The image source may be unavailable. Try again later."
      );
    }
  }
};
        
