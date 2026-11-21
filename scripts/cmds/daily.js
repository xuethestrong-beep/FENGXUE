module.exports = {
  config: {
    name: "daily",
    aliases: ["claim", "rewards"],
    version: "2.2",
    author: "FENG (fixed)",
    countDown: 3,
    role: 0,
    description: "Claim your daily reward with streak bonus",
    category: "economy",
    guide: { en: "{pn} - claim daily reward" }
  },

  onStart: async function ({ usersData, event, message }) {
    const uid = event.senderID;
    const now = Date.now();
    const ONE_DAY = 86400000; // 24 hours
    try {
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

      const fullData = (await usersData.get(uid)) || {};
      const userData = fullData.data || {};
      const money = cleanMoney(fullData.money);
      const lastDaily = Number(userData.lastDaily) || 0;
      const lastStreak = Number(userData.dailyStreak) || 0;

      // Check cooldown
      if (now - lastDaily < ONE_DAY) {
        const left = ONE_DAY - (now - lastDaily);
        const h = Math.floor(left / 3600000);
        const m = Math.floor((left % 3600000) / 60000);
        const s = Math.floor((left % 60000) / 1000);
        return message.reply(
          `⏰ Already Claimed Today!\n` +
          `──────────────\n` +
          `⏳ Reset in: ${h}h ${m}m ${s}s\n` +
          `🔥 Current Streak: ${lastStreak} days\n` +
          `💡 Come back tomorrow!`
        );
      }

      // Streak logic
      let streak = 1;
      if (lastDaily && now - lastDaily < ONE_DAY * 2) {
        streak = lastStreak + 1;
      }
      if (streak > 30) streak = 30; // cap at 30

      const base = 1500 + Math.floor(Math.random() * 1500); // 1500-3000
      const streakBonus = Math.min(streak * 100, 1500);
      const weeklyBonus = streak % 7 === 0 ? 2000 : 0;
      const reward = base + streakBonus + weeklyBonus;
      const newMoney = money + reward;

      await usersData.set(uid, {
        money: newMoney,
        data: { ...userData, lastDaily: now, dailyStreak: streak }
      });

      let msg = `💰 DAILY CLAIMED!\n` +
        `──────────────\n` +
        `🎁 Base: ${format(base)}\n`;
      if (streakBonus > 0) msg += `🔥 Streak x${streak}: +${format(streakBonus)}\n`;
      if (weeklyBonus > 0) msg += `🎉 7-Day Bonus: +${format(weeklyBonus)}\n`;
      msg += `──────────────\n` +
        `✅ Total: +${format(reward)}\n` +
        `💵 Balance: ${format(newMoney)}\n` +
        `📅 Streak: ${streak} day${streak > 1 ? "s" : ""}`;

      if (streak === 7 || streak === 14 || streak === 21 || streak === 30) {
        msg += `\n🏆 Milestone reached!`;
      }
      return message.reply(msg);
    } catch (err) {
      console.error("[DAILY] Error:", err);
      return message.reply("❌ Failed to claim daily. Try again later.");
    }
  }
};
