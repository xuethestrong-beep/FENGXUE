module.exports = {
  config: {
    name: "addmoney",
    aliases: ["addbal", "givemoney"],
    version: "1.6",
    author: "FENG (fixed)",
    countDown: 3,
    role: 2,
    description: "Add money to user (admin only)",
    category: "economy",
    guide: { en: "{pn} @mention amount\n{pn} 10000\n{pn} @user 1b" }
  },

  onStart: async function ({ message, event, args, usersData }) {
    try {
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

      const parseAmount = (input) => {
        if (!input) return NaN;
        let s = String(input).toLowerCase().trim().replace(/[@,]/g, "");
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

      let targetID = null;
      if (event.mentions && Object.keys(event.mentions).length > 0) {
        targetID = Object.keys(event.mentions)[0];
      } else if (event.messageReply?.senderID) {
        targetID = event.messageReply.senderID;
      } else {
        targetID = event.senderID;
      }

      // Find amount arg - supports 1b, 1t, 1qa, 500k, 10000
      const numArg = args.find(a => {
        const clean = String(a).toLowerCase().replace(/[@,]/g, "");
        return /^[\d.]+[a-z]*$/.test(clean) && clean !== "" && !isNaN(parseAmount(clean));
      });

      const amount = numArg ? parseAmount(numArg) : NaN;
      if (!Number.isInteger(amount) || amount <= 0) {
        return message.reply("❌ Usage: addmoney @user 10000\naddmoney @user 1b / 1t / 1qa\nOr reply: addmoney 500k");
      }

      const userData = (await usersData.get(targetID)) || {};
      const oldMoney = cleanMoney(userData.money);
      const newMoney = oldMoney + amount;

      await usersData.set(targetID, { money: newMoney });

      const name = await usersData.getName(targetID).catch(() => targetID);
      console.log(`[ADDMONEY] Admin ${event.senderID} gave ${format(amount)} to ${targetID} (${name}) | ${oldMoney} -> ${newMoney}`);

      return message.reply(
        `✅ Added ${format(amount)} to ${name}\n` +
        `💰 Old: ${format(oldMoney)}\n` +
        `💰 New: ${format(newMoney)}`
      );
    } catch (e) {
      console.error("[ADDMONEY] Error:", e);
      return message.reply("❌ Error: " + e.message);
    }
  }
};
