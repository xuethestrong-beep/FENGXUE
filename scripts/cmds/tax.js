module.exports = {
  config: {
    name: "tax",
    version: "1.7",
    author: "FENG",
    countDown: 5,
    role: 0,
    description: "Check tax fee",
    category: "economy",
    guide: "{pn} <amount>"
  },

  onStart: async function ({ message, args }) {
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
      let s = String(input).toLowerCase().trim().replace(/[,]/g, "");
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

    let amountInput = args[0];
    if (!amountInput) return message.reply("💸 Usage: tax <amount>\nEx: tax 1b / tax 10000\nShows 10% tax fee");

    let amount = parseAmount(amountInput);
    if (isNaN(amount) || amount <= 0) return message.reply("❌ Invalid amount - ex: tax 1b / tax 500k");

    const taxRate = 0.10; // 10%
    const tax = Math.floor(amount * taxRate);
    const afterTax = amount - tax;
    const needToHave = Math.floor(amount / (1 - taxRate));
    const taxOnNeed = needToHave - amount;

    return message.reply(
      `💸 𝗧𝗔𝗫 𝗖𝗔𝗟𝗖𝗨𝗟𝗔𝗧𝗢𝗥 (10%)\n\n` +
      `If you send: ${format(amount)}\n` +
      `├ Tax (10%): ${format(tax)}\n` +
      `└ Receiver gets: ${format(afterTax)}\n\n` +
      `If you want receiver to get ${format(amount)}:\n` +
      `├ You need: ${format(needToHave)}\n` +
      `└ Tax: ${format(taxOnNeed)}`
    );
  }
};
