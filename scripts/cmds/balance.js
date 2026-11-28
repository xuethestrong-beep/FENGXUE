
module.exports = {
  config: {
    name: "balance",
    aliases: ["bal", "money", "wallet"],
    version: "1.0.0",
    author: "FENGSAMA",
    countDown: 3,
    role: 0,
    description: "Check your or another user's wallet balance",
    category: "economy",
    guide: {
      en: "{pn} [@mention]"
    }
  },

  onStart: async function ({ message, event, usersData }) {
    try {
      // Get target user: mention > reply > yourself
      let targetID;

      if (event.mentions && Object.keys(event.mentions).length > 0) {
        targetID = Object.keys(event.mentions)[0];
      } else if (event.messageReply) {
        targetID = event.messageReply.senderID;
      } else {
        targetID = event.senderID;
      }

      // Get user data
      const userData = await usersData.get(targetID);

      if (!userData) {
        return message.reply("❌ Couldn't find that user's data.");
      }

      // Read wallet balance
      const money = userData.money ?? 0;
      const balance = BigInt(String(money));

      // Format large numbers with commas
      const formattedBalance = balance.toLocaleString("en-US");

      // Get user's name
      const name = await usersData.getName(targetID);

      return message.reply(
        `💰 𝐖𝐀𝐋𝐋𝐄𝐓 𝐁𝐀𝐋𝐀𝐍𝐂𝐄\n\n` +
        `👤 Name: ${name || "Unknown"}\n` +
        `🆔 UID: ${targetID}\n` +
        `💵 Balance: $${formattedBalance}`
      );

    } catch (error) {
      console.error("Balance command error:", error);
      return message.reply(
        "❌ Something went wrong while checking the balance."
      );
    }
  }
};
