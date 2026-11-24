module.exports = {
  config: {
    name: "ownermoney",
    aliases: ["ownerbal", "inf", "infinity"],
    version: "1.0",
    author: "FENG",
    countDown: 3,
    role: 2, // owner/admin only
    description: "Owner infinity money",
    category: "economy",
    guide: { en: "{pn} - set your money to ∞\n{pn} on - enable infinity mode\n{pn} off - disable infinity mode" }
  },
  onStart: async function ({ message, event, args, usersData }) {
    try {
      // ===== PUT YOUR FB ID HERE =====
      const OWNER_IDS = [
        "61568686580853", // ← palitan mo ng FB ID mo
        // "1000xxxxxxx", // pwede ka mag add ng isa pang owner
      ];
      // Auto-detect owner from bot config if available
      try {
        const botOwners = global.GoatBot?.config?.ownerID || global.config?.ownerID || [];
        if (Array.isArray(botOwners)) OWNER_IDS.push(...botOwners.map(String));
        else if (botOwners) OWNER_IDS.push(String(botOwners));
      } catch {}

      const senderID = event.senderID;
      if (!OWNER_IDS.includes(String(senderID))) {
        return message.reply("❌ Owner only. You are not the owner.");
      }

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
          let s = String(val).trim().replace(/,/g, "").replace(/_/g, "").replace(/\$/g, "");
          if (s === "" || s === "-") return 0n;
          if (s === "Infinity" || s === "∞") return INFINITY;
          s = s.replace(/[^0-9-]/g, "");
          if (s === "" || s === "-") return 0n;
          return BigInt(s);
        } catch { return 0n; }
      };
      const format = (n) => {
        let num = toBigInt(n);
        if (num >= INFINITY) return "∞";
        if (num === 0n) return "$0";
        let digits = num.toString().length;
        let tier = Math.floor((digits - 1) / 3);
        if (tier >= SUFFIXES.length) tier = SUFFIXES.length - 1;
        if (tier === 0) return `$${num.toString()}`;
        let suffix = SUFFIXES[tier];
        let divisor = 10n ** BigInt(tier * 3);
        let whole = num / divisor;
        let rem = num % divisor;
        let dec2 = (rem * 100n / divisor).toString().padStart(2, "0");
        if (whole < 10n) return `$${whole}.${dec2}${suffix}`;
        if (whole < 100n) return `$${whole}.${dec2[0]}${suffix}`;
        return `$${whole}${suffix}`;
      };

      // ===== INFINITY = 999Cg = 999 followed by 303 zeros =====
      // This is the max our system supports, effectively infinite
      const INFINITY = BigInt("9".repeat(303)); // 999... (303 digits) = 999Cg

      const mode = (args[0] || "").toLowerCase();
      const userData = (await usersData.get(senderID)) || {};
      const userDataInner = userData.data || {};
      const current = toBigInt(userData.money);

      // Toggle infinity mode
      if (mode === "off") {
        await usersData.set(senderID, { money: "0", data: { ...userDataInner, infinityMoney: false } });
        return message.reply("❌ Infinity mode OFF.\n💰 Your money set to $0.");
      }
      if (mode === "on" || mode === "" || mode === "set" || mode === "claim") {
        await usersData.set(senderID, { money: INFINITY.toString(), data: { ...userDataInner, infinityMoney: true } });
        // Also fill bank to ∞
        try {
          const { bankData } = global.db;
          await bankData.set(senderID, { bankBalance: INFINITY.toString() });
        } catch {}
        return message.reply(
          `♾️ OWNER INFINITY MONEY ACTIVATED\n` +
          `──────────────\n` +
          `💵 Wallet: ∞\n` +
          `🏦 Bank: ∞\n` +
          `💰 Total: ∞\n` +
          `──────────────\n` +
          `✅ You now have infinite money.\n` +
          `💡 Type "ownermoney" anytime to refill to ∞\n` +
          `💡 Type "ownermoney off" to disable`
        );
      }

      // Check status
      if (mode === "check" || mode === "bal") {
        return message.reply(`♾️ Infinity: ${userDataInner.infinityMoney ? "ON" : "OFF"}\n💰 Balance: ${format(current)}`);
      }

      return message.reply("♾️ Usage:\nownermoney - refill to ∞\nownermoney on - enable ∞\nownermoney off - disable ∞");
    } catch (e) {
      console.error("[OWNER MONEY] Error:", e);
      return message.reply("❌ Error: " + e.message);
    }
  }
};
