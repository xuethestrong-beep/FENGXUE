
module.exports = {
  config: {
    name: "bank",
    aliases: ["atm"],
    version: "1.0.0",
    author: "FENGSAMA",
    countDown: 3,
    role: 0,
    description: "Manage your wallet and bank account",
    category: "economy",
    guide: {
      en: "{pn}\n{pn} deposit <amount>\n{pn} withdraw <amount>"
    }
  },

  onStart: async function ({ message, event, args, usersData }) {
    try {
      const userID = event.senderID;
      const userData = await usersData.get(userID);

      if (!userData) {
        return message.reply("❌ Your account data could not be found.");
      }

      const wallet = BigInt(String(userData.money ?? 0));
      const bank = BigInt(String(userData.bank ?? 0));

      const format = amount => amount.toLocaleString("en-US");

      // Show balances
      if (!args[0]) {
        return message.reply(
          `🏦 𝐅𝐄𝐍𝐆𝐒𝐀𝐌𝐀 𝐁𝐀𝐍𝐊\n\n` +
          `👤 Account: ${await usersData.getName(userID)}\n\n` +
          `💵 Wallet: $${format(wallet)}\n` +
          `🏦 Bank: $${format(bank)}\n` +
          `💰 Total: $${format(wallet + bank)}\n\n` +
          `📌 Commands:\n` +
          `bank deposit <amount>\n` +
          `bank withdraw <amount>`
        );
      }

      const action = args[0].toLowerCase();
      const amountText = args[1];

      if (!["deposit", "withdraw"].includes(action)) {
        return message.reply(
          "❌ Invalid action.\n\nUse:\nbank deposit <amount>\nbank withdraw <amount>"
        );
      }

      if (!amountText || !/^\d+$/.test(amountText)) {
        return message.reply("❌ Enter a valid whole-number amount.");
      }

      const amount = BigInt(amountText);

      if (amount <= 0n) {
        return message.reply("❌ Amount must be greater than zero.");
      }

      if (action === "deposit") {
        if (wallet < amount) {
          return message.reply(
            `❌ Not enough money in your wallet.\n` +
            `💵 Wallet: $${format(wallet)}`
          );
        }

        const newWallet = wallet - amount;
        const newBank = bank + amount;

        await usersData.set(userID, {
          money: newWallet.toString(),
          bank: newBank.toString()
        });

        return message.reply(
          `✅ 𝐃𝐄𝐏𝐎𝐒𝐈𝐓 𝐒𝐔𝐂𝐂𝐄𝐒𝐒𝐅𝐔𝐋\n\n` +
          `💵 Deposited: $${format(amount)}\n` +
          `💵 Wallet: $${format(newWallet)}\n` +
          `🏦 Bank: $${format(newBank)}`
        );
      }

      if (bank < amount) {
        return message.reply(
          `❌ Not enough money in your bank.\n` +
          `🏦 Bank: $${format(bank)}`
        );
      }

      const newBank = bank - amount;
      const newWallet = wallet + amount;

      await usersData.set(userID, {
        money: newWallet.toString(),
        bank: newBank.toString()
      });

      return message.reply(
        `✅ 𝐖𝐈𝐓𝐇𝐃𝐑𝐀𝐖𝐀𝐋 𝐒𝐔𝐂𝐂𝐄𝐒𝐒𝐅𝐔𝐋\n\n` +
        `💵 Withdrawn: $${format(amount)}\n` +
        `💵 Wallet: $${format(newWallet)}\n` +
        `🏦 Bank: $${format(newBank)}`
      );

    } catch (error) {
      console.error("Bank command error:", error);
      return message.reply("❌ An error occurred while processing your bank transaction.");
    }
  }
};
        
