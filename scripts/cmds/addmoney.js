module.exports = {
  config: {
    name: "addmoney",
    aliases: ["addbal", "givemoney"],
    version: "1.7",
    author: "FENG (fixed)",
    countDown: 3,
    role: 2,
    description: "Add money to user (admin only)",
    category: "economy",
    guide: { en: "{pn} @mention amount\n{pn} 10000\n{pn} @user 50000\nReply: {pn} 50000" }
  },
  onStart: async function ({ message, event, args, usersData }) {
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

      // ===== TARGET - PRIORITY: 1. Mention 2. Reply 3. Self =====
      let targetID = null;
      let isReply = false;
      if (event.mentions && Object.keys(event.mentions).length > 0) {
        targetID = Object.keys(event.mentions)[0];
      } else if (event.messageReply?.senderID) {
        targetID = event.messageReply.senderID;
        isReply = true;
      } else {
        targetID = event.senderID;
      }

      // ===== AMOUNT =====
      // If reply: args = ["999..."] or ["1tg"] - first arg IS amount
      // If mention: args = ["@user", "999..."] - last arg IS amount
      // If self: args = ["999..."] - first arg IS amount
      let amountStr = null;
      if (isReply) {
        amountStr = args[0]; // reply mode: first arg is amount
      } else {
        // find last arg that is money-like and NOT the targetID
        for (let i = args.length - 1; i >= 0; i--) {
          let a = String(args[i]).replace(/[@,]/g, "");
          if (a === targetID) continue; // skip mention ID
          if (/^\d+(\.\d+)?[a-zA-Z]*$/.test(a)) { amountStr = a; break; }
        }
      }

      const amount = toBigInt(amountStr);
      if (amount <= 0n) {
        return message.reply(
          "❌ Usage:\n" +
          "• addmoney @user 10000\n" +
          "• addmoney @user 999999999999999999\n" +
          "• addmoney @user 1tg\n" +
          "• Reply to someone: addmoney 50000"
        );
      }

      const userData = (await usersData.get(targetID)) || {};
      const oldMoney = toBigInt(userData.money);
      const newMoney = oldMoney + amount;
      await usersData.set(targetID, { money: newMoney.toString() });
      const name = await usersData.getName(targetID).catch(() => targetID);

      return message.reply(
        `✅ Added ${format(amount)} to ${name}${isReply ? " (via reply)" : ""}\n` +
        `💰 Old: ${format(oldMoney)}\n` +
        `💰 New: ${format(newMoney)}`
      );
    } catch (e) {
      console.error("[ADDMONEY] Error:", e);
      return message.reply("❌ Error: " + e.message);
    }
  }
};
