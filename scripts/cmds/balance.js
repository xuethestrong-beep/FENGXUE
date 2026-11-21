module.exports = {
  config: {
    name: "balance",
    aliases: ["bal", "money"],
    version: "3.3",
    author: "FENG (fixed)",
    countDown: 2,
    role: 0,
    description: "Check wallet, bank and total balance",
    category: "economy",
    guide: {
      en: "{pn} - check your balance\n{pn} @user - check someone else's balance"
    }
  },

  onStart: async function ({ message, usersData, event }) {
    try {
      const { bankData } = global.db;

      // ===== MONEY FORMATTER - 1B 1T 1Qa =====
      const SUFFIXES = [
        "", "K", "M", "B", "T",
        "Qa", "Qi", "Sx", "Sp", "Oc", "No", "De",
        "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Od", "Nd", "Vg",
        "Uv", "Dv", "Tv", "Qav", "Qiv", "SxV", "SpV", "OcV", "NoV", "Tg"
      ];

      const cleanMoney = (val) => {
        if (val == null) return 0;
        let str = String(val).replace(/[^0-9.-]/g, "");
        if (str.length > 18 || str.includes("929292929")) return 0; // fixes corrupted 929292
        let num = Number(str);
        if (!isFinite(num) || isNaN(num) || num < 0) return 0;
        return Math.floor(num);
      };

      const format = (n) => {
        let num = cleanMoney(n);
        if (num === 0) return "$0";
        let tier = Math.floor(Math.log10(num) / 3);
        if (tier >= SUFFIXES.length) tier = SUFFIXES.length - 1;
        if (tier < 0) tier = 0;
        let suffix = SUFFIXES[tier];
        let scaled = num / Math.pow(10, tier * 3);
        if (scaled < 10) return `$${scaled.toFixed(2)}${suffix}`;
        if (scaled < 100) return `$${scaled.toFixed(1)}${suffix}`;
        return `$${Math.floor(scaled)}${suffix}`;
      };
      // =======================================

      const getUser = async (uid, mentionName) => {
        const userData = (await usersData.get(uid)) || {};
        const wallet = cleanMoney(userData.money);
        let bank = 0;
        try {
          const bankInfo = await bankData.get(uid);
          bank = cleanMoney(bankInfo?.bankBalance);
        } catch {}
        const total = wallet + bank;

        let taxLabel = "";
        let taxNote = "✅ No tax - keep grinding!";
        if (total >= 1000000) {
          taxLabel = " 💀 8% Tax";
          taxNote = "⚠️ Rich tax: 8% on next income";
        } else if (total >= 500000) {
          taxLabel = " ⚠️ 5% Tax";
          taxNote = "⚠️ Rich tax: 5% on next income";
        } else if (total >= 100000) {
          taxLabel = " 2% Tax";
          taxNote = "⚠️ Tax bracket: 2%";
        }

        if (mentionName) {
          const cleanName = String(mentionName).replace(/^@/, "");
          return `👤 ${cleanName}${taxLabel}\n💰 ${format(total)} total\n↳ 💵 ${format(wallet)} wallet • 🏦 ${format(bank)} bank`;
        }

        return (
          `💳 Your Balance${taxLabel}\n` +
          `──────────────\n` +
          `💰 ${format(total)} total\n\n` +
          `💵 Wallet: ${format(wallet)}\n` +
          `🏦 Bank: ${format(bank)}\n\n` +
          `${taxNote}`
        );
      };

      const mentions = event.mentions || {};
      const mentionIDs = Object.keys(mentions);
      if (mentionIDs.length > 0) {
        let msg = "";
        for (const uid of mentionIDs) {
          msg += (await getUser(uid, mentions[uid])) + "\n\n";
        }
        return message.reply(msg.trim());
      }
      return message.reply(await getUser(event.senderID, null));
    } catch (err) {
      console.error("[BALANCE] Error:", err);
      return message.reply("❌ Failed to get balance. Try again.");
    }
  }
};
