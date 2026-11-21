module.exports = {
  config: {
    name: "lottery",
    version: "1.3",
    author: "FENG (fixed)",
    countDown: 60,
    role: 0,
    description: "Buy a lottery ticket for $2,000 - 1% jackpot chance",
    category: "economy",
    guide: { en: "{pn} - $2,000 per ticket" }
  },

  onStart: async function ({ message, usersData, event }) {
    try {
      const uid = event.senderID;

      // ===== MONEY FORMATTER - 1B 1T 1Qa =====
      const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "De", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Od", "Nd", "Vg", "Uv", "Dv", "Tv", "Qav", "Qiv", "SxV", "SpV", "OcV", "NoV", "Tg"];
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
      // =======================================

      const userData = (await usersData.get(uid)) || {};
      const bal = cleanMoney(userData.money);
      const cost = 2000;
      if (bal < cost) return message.reply(`❌ Lottery costs ${format(cost)}, you have ${format(bal)}`);

      const r = Math.random();
      let reward = 0;
      let msg = `🎟️ LOTTERY — ${format(cost)}\n──────────────\n`;

      // RTP 72.5% - good house edge
      if (r < 0.01) {
        reward = 50000;
        msg += `🎉 JACKPOT!!!\n💰 Won ${format(reward)}!!!`;
      } else if (r < 0.1) {
        reward = 5000;
        msg += `✨ Big win!\n💰 Won ${format(reward)}`;
      } else if (r < 0.3) {
        reward = 2500;
        msg += `😊 Small win\n💰 Won ${format(reward)}`;
      } else {
        msg += `💨 You lost...\n❌ Lost ${format(cost)}`;
      }

      const newBal = bal - cost + reward;
      await usersData.set(uid, { money: newBal });
      return message.reply(msg + `\n💵 Balance: ${format(newBal)}`);
    } catch (e) {
      console.error("[LOTTERY] Error:", e);
      return message.reply("❌ Lottery failed. Try again.");
    }
  }
};
