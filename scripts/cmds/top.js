module.exports = {
  config: {
    name: "top",
    aliases: ["leaderboard", "lb", "rich"],
    version: "1.3",
    author: "FENG (fixed)",
    countDown: 10,
    role: 0,
    description: "Top 15 richest users (wallet + bank)",
    category: "economy",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ message, event, usersData }) {
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

      const all = await usersData.getAll();
      const { bankData } = global.db;

      const entries = await Promise.all(all.map(async (u) => {
        let bank = 0;
        try {
          const b = await bankData.get(u.userID);
          bank = cleanMoney(b?.bankBalance);
        } catch { bank = 0; }
        const wallet = cleanMoney(u.money);
        return { id: u.userID, wallet, bank, total: wallet + bank };
      }));

      const lb = entries
        .filter(e => e.total > 0)
        .sort((a, b) => b.total - a.total);

      if (lb.length === 0) return message.reply("🏆 No one has money yet. Type daily to start!");

      const top15 = lb.slice(0, 15);
      const medals = ["🥇", "🥈", "🥉"];
      let msg = `🏆 TOP 15 RICHEST\n──────────────\n`;
      for (let i = 0; i < top15.length; i++) {
        const name = await usersData.getName(top15[i].id).catch(() => `ID:${top15[i].id.slice(0,6)}`);
        const rank = medals[i] || `${i + 1}.`;
        msg += `${rank} ${name} — ${format(top15[i].total)}\n`;
      }

      const myIndex = lb.findIndex(e => e.id === event.senderID);
      if (myIndex !== -1) {
        msg += `──────────────\n📍 You: #${myIndex + 1} — ${format(lb[myIndex].total)} (W:${format(lb[myIndex].wallet)} B:${format(lb[myIndex].bank)})`;
      } else {
        msg += `──────────────\n📍 You: Unranked — $0`;
      }
      return message.reply(msg);
    } catch (e) {
      console.error("[TOP] Error:", e);
      return message.reply("❌ Failed to load leaderboard.");
    }
  }
};
