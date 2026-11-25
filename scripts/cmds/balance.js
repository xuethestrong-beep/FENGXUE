module.exports = {
  config: {
    name: "balance",
    aliases: ["bal", "money"],
    version: "3.4",
    author: "FENG (fixed)",
    countDown: 2,
    role: 0,
    description: "Check wallet, bank and total balance",
    category: "economy",
    guide: { en: "{pn} - check your balance\n{pn} @user - check someone else's balance\nReply: {pn} - check replied user's balance" }
  },
  onStart: async function ({ message, usersData, event }) {
    try {
      const { bankData } = global.db;
      const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "De", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Od", "Nd", "Vg", "Uv", "Dv", "Tv", "Qav", "Qiv", "Sxv", "Spv", "Ocv", "Nov", "Tg", "Uag", "Dag", "Trg", "Qag", "Qig", "Sxg", "Spg", "Ocg", "Nog", "Deg", "Udg", "Ddg", "Tdg", "Qadg", "Qidg", "Sxdg", "Spdg", "Odg", "Ndg", "VgG", "Uvg", "Dvg", "Tvg", "Qavg", "Qivg", "Sxvg", "Spvg", "Ovg", "Nvg", "TgG", "Uatg", "Datg", "Trtg", "Qatg", "Qitg", "Sxtg", "Sptg", "Octg", "Notg", "Detg", "Udtg", "Ddtg", "Tdtg", "Qadtg", "Qidtg", "Sxdtg", "Spdtg", "Odtg", "Ndtg", "Vtg", "Uvtg", "Dvtg", "Tvtg", "Qavtg", "Qivtg", "Sxvtg", "Spvtg", "Ocvtg", "Novtg", "Ttg", "Uaog", "Daog", "Trog", "Qaog", "Qiog", "Sxog", "Spog", "Ocog", "Noog", "Deog", "Udog", "Ddog", "Tdog", "Qadog", "Qidog", "Sxdog", "Spdog", "Odog", "Ndog", "Cg"];

      // ===== INFINITY = 999Cg =====
      const INFINITY = BigInt("999" + "0".repeat(300));

      // ===== WORKS WITH 999999999999999999 - NO LIMIT, NO RETURN 0 =====
      const toBigInt = (val) => {
        if (val == null) return 0n;
        try {
          let s = String(val).trim().replace(/,/g, "").replace(/_/g, "").replace(/\$/g, "").replace(/@/g, "");
          if (s === "" || s === "-") return 0n;
          if (s === "Infinity" || s === "∞") return INFINITY;
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
        if (num >= INFINITY) return "∞"; // ← FIX: owner infinity shows as ∞
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

      const getUser = async (uid, mentionName) => {
        const userData = (await usersData.get(uid)) || {};
        const wallet = toBigInt(userData.money);
        const walletSafe = wallet < 0n ? 0n : wallet;
        let bank = 0n;
        try {
          const bankInfo = await bankData.get(uid);
          bank = toBigInt(bankInfo?.bankBalance);
          if (bank < 0n) bank = 0n;
        } catch {}
        const total = walletSafe + bank;

        // If owner infinity, show special
        const isInfinity = walletSafe >= INFINITY || bank >= INFINITY;
        if (isInfinity) {
          if (mentionName) {
            const cleanName = String(mentionName).replace(/^@/, "");
            return `👤 ${cleanName} ♾️ OWNER\n💰 ∞ total\n↳ 💵 ∞ wallet • 🏦 ∞ bank`;
          }
          return (
            `💳 Your Balance ♾️ OWNER\n` +
            `──────────────\n` +
            `💰 ∞ total\n\n` +
            `💵 Wallet: ∞\n` +
            `🏦 Bank: ∞\n\n` +
            `♾️ Infinity Mode ON`
          );
        }

        let taxLabel = "";
        let taxNote = "✅ No tax - keep grinding!";
        if (total >= 1000000n) {
          taxLabel = " 💀 8% Tax";
          taxNote = "⚠️ Rich tax: 8% on next income";
        } else if (total >= 500000n) {
          taxLabel = " ⚠️ 5% Tax";
          taxNote = "⚠️ Rich tax: 5% on next income";
        } else if (total >= 100000n) {
          taxLabel = " 2% Tax";
          taxNote = "⚠️ Tax bracket: 2%";
        }
        if (mentionName) {
          const cleanName = String(mentionName).replace(/^@/, "");
          return `👤 ${cleanName}${taxLabel}\n💰 ${format(total)} total\n↳ 💵 ${format(walletSafe)} wallet • 🏦 ${format(bank)} bank`;
        }
        return (
          `💳 Your Balance${taxLabel}\n` +
          `──────────────\n` +
          `💰 ${format(total)} total\n\n` +
          `💵 Wallet: ${format(walletSafe)}\n` +
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
      if (event.messageReply?.senderID) {
        const replyID = event.messageReply.senderID;
        const name = await usersData.getName(replyID).catch(() => replyID);
        return message.reply(await getUser(replyID, name));
      }
      return message.reply(await getUser(event.senderID, null));
    } catch (err) {
      console.error("[BALANCE] Error:", err);
      return message.reply("❌ Failed to get balance. Try again.");
    }
  }
};
