
module.exports = {
  config: {
    name: "lesbian",
    aliases: ["lesbianrate", "lesbianmeter"],
    version: "1.0.0",
    author: "FENGSAMA",
    countDown: 3,
    role: 0,
    description: "Check someone's random lesbian percentage 🌈",
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
        title = "A little rainbow energy! 🌈";
        emoji = "😇";
      } else if (percentage <= 30) {
        title = "The rainbow is loading...";
        emoji = "💗";
      } else if (percentage <= 50) {
        title = "Halfway to fabulous!";
        emoji = "💅";
      } else if (percentage <= 70) {
        title = "Rainbow vibes detected!";
        emoji = "🏳️‍🌈";
      } else if (percentage <= 90) {
        title = "Certified rainbow queen!";
        emoji = "👑";
      } else {
        title = "THE ULTIMATE LESBIAN LEGEND!";
        emoji = "🔥";
      }

      const barLength = 10;
      const filled = Math.round(percentage / 10);
      const bar = "🩷".repeat(filled) + "⬜".repeat(barLength - filled);

      return message.reply(
        `🌈 LESBIAN METER 🌈\n\n` +
        `👤 Person: ${name}\n` +
        `📊 Percentage: ${percentage}%\n` +
        `${bar}\n\n` +
        `${emoji} ${title}\n\n` +
        `⚠️ Just for fun. This doesn't represent anyone's real sexuality.`
      );

    } catch (error) {
      console.error("lesbian.js error:", error);
      return message.reply("❌ Something went wrong with the lesbian meter.");
    }
  }
};
        
