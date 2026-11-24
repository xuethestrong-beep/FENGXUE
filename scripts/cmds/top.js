module.exports = {
  config: {
    name: "top",
    aliases: ["leaderboard", "lb", "rich"],
    version: "1.7",
    author: "FENG (fixed)",
    countDown: 10,
    role: 0,
    description: "Top 15 richest users (wallet + bank)",
    category: "economy",
    guide: { en: "{pn}" }
  },
  onStart: async function ({ message, event, usersData }) {
    try {
      const SUFFIXES = [
        "", "K", "M", "B", "T",
        "Qa", "Qi", "Sx", "Sp", "Oc", "No", "De", "Ud", "Dd", "Td",
        "Qad", "Qid", "Sxd", "Spd", "Od", "Nd",
        "Vg", "Uv", "Dv", "Tv", "Qav", "Qiv", "Sxv", "Spv", "Ocv", "Nov",
        "Tg",
        "Uag", "Dag", "Trg", "Qag", "Qig", "Sxg", "Spg", "Ocg", "Nog", "Deg",
        "Udg", "Ddg", "Tdg", "Qadg", "Qidg", "Sxdg", "Spdg", "Odg", "Ndg",
        "VgG", "Uvg", "Dvg", "Tvg", "Qavg", "Qivg", "Sxvg", "Spvg", "Ovg", "Nvg",
        "TgG",
        "Uatg", "Datg", "Trtg", "Qatg", "Qitg", "Sxtg", "Sptg", "Octg", "Notg", "Detg",
        "Udtg", "Ddtg", "Tdtg", "Qadtg", "Qidtg", "Sxdtg", "Spdtg", "Odtg", "Ndtg",
        "Vtg", "Uvtg", "Dvtg", "Tvtg", "Qavtg", "Qivtg", "Sxvtg", "Spvtg", "Ocvtg", "Novtg",
        "Ttg",
        "Uaog", "Daog", "Trog", "Qaog", "Qiog", "Sxog", "Spog", "Ocog", "Noog", "Deog",
        "Udog", "Ddog", "Tdog", "Qadog", "Qidog", "Sxdog", "Spdog", "Odog", "Ndog",
        "Cg"
      ];
      // ===== WORKS WITH 999999999999999999 - NO LIMIT, NO RETURN 0 =====
      const toBigInt = (val) => {
        if (val == null) return 0n;
        try {
          let s = String(val).trim().replace(/,/g, "").replace(/_/g, "").replace(/\$/g, "");
          if (s === "" || s === "-") return 0n;
          if (s.includes("e") || s.includes("E")) {
            let [mant, exp] = s.toLowerCase().split("e");
            let expNum = parseInt(exp);
            let mantClean = mant.replace(".", "");
            let dotPos = mant.includes(".") ? mant.split(".")[1].length : 0;
            let big = BigInt(mantClean);
            let pow = BigInt(expNum - dotPos);
            if (pow < 0n) return big / (10n ** -pow);
            return big * (10n ** pow);
          }
          // if it has suffix like 999qa - strip suffix and multiply
          let match = s.match(/^(\d+(?:\.\d+)?)([a-zA-Z]+)?$/);
          if (match) {
            let numPart = match[1];
            let suffix = match[2] ? match[2].toLowerCase() : "";
            if (!suffix) return BigInt(numPart.split(".")[0]); // <-- plain 999999999999999999 works here
            let idx = SUFFIXES.findIndex(x => x.toLowerCase() === suffix);
            if (idx > 0) {
              let [whole, dec = ""] = numPart.split(".");
              let base = BigInt(whole + dec);
              let pow = BigInt(idx * 3 - dec.length);
              if (pow < 0n) return base / (10n ** -pow);
              return base * (10n ** pow);
            }
          }
          s = s.replace(/[^0-9-]/g, "");
          if (s === "" || s === "-") return 0n;
          return BigInt(s);
        } catch { return 0n; }
      };
      const format = (n) => {
        let num = toBigInt(n);
        if (num === 0n) return "$0";
        if (num < 0n) num = -num;
        let digits = num.toString().length;
        let tier = Math.floor((digits - 1) / 3);
        if (tier >= SUFFIXES.length) tier = SUFFIXES.length - 1;
        if (tier === 0) return `$${num.toString()}`;
        let suffix = SUFFIXES[tier];
        let divisor = 10n ** BigInt(tier * 3);
        let whole = num / divisor;
        let rem = num % divisor;
        let dec2 = (rem * 100n / divisor).toString().padStart(2, "0");
        let dec1 = dec2[0];
        if (whole < 10n) return `$${whole}.${dec2}${suffix}`;
        if (whole < 100n) return `$${whole}.${dec1}${suffix}`;
        return `$${whole}${suffix}`;
      };
      const all = await usersData.getAll();
      const { bankData } = global.db;
      const entries = await Promise.all(all.map(async (u) => {
        let bank = 0n;
        try { const b = await bankData.get(u.userID); bank = toBigInt(b?.bankBalance); } catch { bank = 0n; }
        const wallet = toBigInt(u.money);
        return { id: u.userID, wallet, bank, total: wallet + bank };
      }));
      const lb = entries.filter(e => e.total > 0n).sort((a, b) => (a.total > b.total ? -1 : a.total < b.total ? 1 : 0));
      if (lb.length === 0) return message.reply("🏆 No one has money yet. Type daily to start!");
      const top15 = lb.slice(0, 15);
      const medals = ["🥇", "🥈", "🥉"];
      let msg = `🏆 TOP 15 RICHEST\n──────────────\n`;
      for (let i = 0; i < top15.length; i++) {
        const name = await usersData.getName(top15[i].id).catch(() => `ID:${top15[i].id.slice(0, 6)}`);
        const rank = medals[i] || `${i + 1}.`;
        msg += `${rank} ${name} — ${format(top15[i].total)}\n`;
      }
      const myIndex = lb.findIndex(e => e.id === event.senderID);
      if (myIndex !== -1) msg += `──────────────\n📍 You: #${myIndex + 1} — ${format(lb[myIndex].total)} (W:${format(lb[myIndex].wallet)} B:${format(lb[myIndex].bank)})`;
      else msg += `──────────────\n📍 You: Unranked — $0`;
      return message.reply(msg);
    } catch (e) { console.error("[TOP] Error:", e); return message.reply("❌ Failed to load leaderboard."); }
  }
};
