
module.exports = {
  config: {
    name: "gay",
    aliases: ["gayrate", "gaymeter"],
    version: "1.0.0",
    author: "FENGSAMA",
    countDown: 3,
    role: 0,
    description: "Check someone's random gay percentage 🌈",
    category: "fun",
    guide: {
      en: "{pn} [@mention or reply]"
    }
  },

  onStart: async function ({ message, event, usersData }) {
    try {
      let targetID;

      // Mention takes priority
      if (event.mentions && Object.keys(event.mentions).length > 0) {
        targetID = Object.keys(event.mentions)[0];
      }
      // Then reply
      else if (event.messageReply) {
        targetID = event.messageReply.senderID;
      }
      // Otherwise, check yourself
      else {
        targetID = event.senderID;
      }

      const name = await usersData.getName(targetID);
      const percentage = Math.floor(Math.random() * 101);

      let title;
      let emoji;

      if (percentage <= 10) {
        title = "Almost straight... allegedly 👀";
        emoji = "😇";
      } else if (percentage <= 30) {
        title = "A little rainbow energy 🌈";
        emoji = "😏";
      } else if (percentage <= 50) {
        title = "Halfway to the rainbow!";
        emoji = "💅";
      } else if (percentage <= 70) {
        title = "Rainbow vibes detected!";
        emoji = "🏳️‍🌈";
      } else if (percentage <= 90) {
        title = "Maximum fabulousness!";
        emoji = "✨";
      } else {
        title = "THE RAINBOW LEGEND HAS ARRIVED!";
        emoji = "👑";
      }

      const barLength = 10;
      const filled = Math.round(percentage / 10);
      const bar = "🟪".repeat(filled) + "⬜".repeat(barLength - filled);

      return message.reply(
        `🌈 GAY METER 🌈\n\n` +
        `👤 Person: ${name}\n` +
        `📊 Percentage: ${percentage}%\n` +
        `${bar}\n\n` +
        `${emoji} ${title}\n\n` +
        `⚠️ Just for fun. This doesn't represent anyone's real sexuality.`
      );

    } catch (error) {
      console.error("gay.js error:", error);
      return message.reply("❌ Something went wrong while checking the gay meter.");
    }
  }
};
        
