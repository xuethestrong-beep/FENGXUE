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
      const toBigInt = (val) => {
        if (val == null) return 0n;
        try {
          let s = String(val).trim().replace(/,/g, "").replace(/_/g, "").replace(/\$/g, "").replace(/@/g, "");
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
          let match = s.match(/^(\d+(?:\.\d+)?)([a-zA-Z]+)?$/);
          if (match) {
            let numPart = match[1];
            let suffix = match[2] ? match[2].toLowerCase() : "";
            if (!suffix) return BigInt(numPart.split(".")[0]);
            let idx = SUFFIXES.findIndex(x => x.toLowerCase() === suffix);
            if (idx > 0) {
              let [whole, dec = ""] = numPart.split(".");
              let base = BigInt(whole + dec);
              let pow = BigInt(idx * 3 - dec.length);
              if (pow < 0n) return base / (10n ** -pow);
              return base * (10n ** pow);
            }
            return 0n;
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

      const fullData = (await usersData.get(uid)) || {};
      const userData = fullData.data || {};
      const money = toBigInt(fullData.money) < 0n ? 0n : toBigInt(fullData.money);
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
          `💰 Balance: ${format(money)}\n` +
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
      const reward = BigInt(base + streakBonus + weeklyBonus);
      const newMoney = money + reward;

      await usersData.set(uid, { money: newMoney.toString(), data: { ...userData, lastDaily: now, dailyStreak: streak } });

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
