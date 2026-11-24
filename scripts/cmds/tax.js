module.exports = {
  config: {
    name: "tax",
    version: "1.8",
    author: "FENG (fixed)",
    countDown: 5,
    role: 0,
    description: "Check tax fee",
    category: "economy",
    guide: "{pn} <amount>"
  },
  onStart: async function ({ message, args }) {
    // ===== MONEY FORMATTER - BigInt - UP TO Cg - NO RETURN 0 =====
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
          if (!suffix) return BigInt(numPart.split(".")[0]); // plain 999999999999999999
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
    const parseAmount = (input) => {
      if (!input) return 0n;
      return toBigInt(input);
    };
    // =======================================

    let amountInput = args[0];
    if (!amountInput) return message.reply("💸 Usage: tax <amount>\nEx: tax 1b / tax 10000 / tax 999999999999999999 / tax 1tg\nShows 10% tax fee");
    let amount = parseAmount(amountInput);
    if (amount <= 0n) return message.reply("❌ Invalid amount - ex: tax 1b / tax 500k / tax 1tg");

    // 10% tax - BigInt safe (no float)
    const tax = amount * 10n / 100n;
    const afterTax = amount - tax;
    const needToHave = amount * 100n / 90n; // amount / 0.9
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
