module.exports = {
  config: {
    name: "bank",
    aliases: ["banking"],
    version: "2.5",
    author: "FENG (fixed)",
    countDown: 3,
    role: 0,
    description: "Bank system - deposit, withdraw, check",
    category: "economy",
    guide: { en: "{pn} - check balance\n{pn} deposit <amount/all>\n{pn} withdraw <amount/all>" }
  },

  onStart: async function ({ message, args, event, usersData }) {
    try {
      const { bankData } = global.db;
      const userID = event.senderID;

      // ===== MONEY FORMATTER - 1B 1T 1Qa =====
      const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "De", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Od", "Nd", "Vg", "Uv", "Dv", "Tv", "Qav", "Qiv", "SxV", "SpV", "OcV", "NoV", "Tg"];
      const SUFFIX_MAP = { k: 3, m: 6, b: 9, t: 12, qa: 15, qi: 18, sx: 21, sp: 24, oc: 27, no: 30, de: 33, ud: 36, dd: 39, td: 42, qad: 45, qid: 48, sxd: 51, spd: 54, od: 57, nd: 60, vg: 63 };

      const cleanMoney = (val) => {
        if (val == null) return 0;
        let str = String(val).replace(/[^0-9.-]/g, "");
        if (str.length > 18 || str.includes("929292929")) return 0;
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

      // Parse "1b", "1.5t", "500k", "1000" -> number
      const parseAmount = (input, max) => {
        if (!input) return NaN;
        let s = String(input).toLowerCase().trim();
        if (s === "all") return max;
        let match = s.match(/^([\d.]+)\s*([a-z]+)?$/);
        if (!match) return NaN;
        let num = parseFloat(match[1]);
        let suf = match[2] || "";
        if (suf) {
          if (SUFFIX_MAP[suf] === undefined) return NaN;
          num = num * Math.pow(10, SUFFIX_MAP[suf]);
        }
        return Math.floor(num);
      };
      // =======================================

      const userData = (await usersData.get(userID)) || {};
      const wallet = cleanMoney(userData.money);
      let bankBalance = 0;
      try { bankBalance = cleanMoney((await bankData.get(userID))?.bankBalance); } catch {}

      const command = args[0]?.toLowerCase();

      // Show balance
      if (!command || command === "balance" || command === "bal" || command === "check") {
        const total = wallet + bankBalance;
        return message.reply(
          `🏦 BANK\n` +
          `──────────────\n` +
          `💵 Wallet: ${format(wallet)}\n` +
          `🏦 Bank: ${format(bankBalance)}\n` +
          `💰 Total: ${format(total)}`
        );
      }

      // Deposit
      if (command === "deposit" || command === "dep") {
        let input = args[1]?.toLowerCase();
        if (!input) return message.reply("❌ Usage: bank deposit 1000 / 1b / all");
        let amount = parseAmount(input, wallet);
        if (isNaN(amount) || amount <= 0) return message.reply("❌ Enter valid amount. Ex: bank deposit 1b / 500k / all");
        if (amount > wallet) return message.reply(`❌ Not enough wallet. You have ${format(wallet)}`);
        await usersData.set(userID, { money: wallet - amount });
        await bankData.set(userID, { bankBalance: bankBalance + amount });
        return message.reply(`✅ Deposited ${format(amount)} to bank.\n🏦 New bank: ${format(bankBalance + amount)}`);
      }

      // Withdraw
      if (command === "withdraw" || command === "wd" || command === "with") {
        let input = args[1]?.toLowerCase();
        if (!input) return message.reply("❌ Usage: bank withdraw 1000 / 1b / all");
        let amount = parseAmount(input, bankBalance);
        if (isNaN(amount) || amount <= 0) return message.reply("❌ Enter valid amount. Ex: bank withdraw 1b / 500k / all");
        if (amount > bankBalance) return message.reply(`❌ Not enough bank. Bank: ${format(bankBalance)}`);
        await usersData.set(userID, { money: wallet + amount });
        await bankData.set(userID, { bankBalance: bankBalance - amount });
        return message.reply(`✅ Withdrew ${format(amount)} from bank.\n💵 New wallet: ${format(wallet + amount)}`);
      }

      return message.reply("🏦 Guide:\nbank\nbank deposit <amount/all> - ex: 1b, 500k\nbank withdraw <amount/all> - ex: 1t, 2qa");
    } catch (e) {
      console.error(e);
      return message.reply("❌ Bank error. Try again.");
    }
  }
};
