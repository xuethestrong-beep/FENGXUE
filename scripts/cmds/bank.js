module.exports = {
  config: {
    name: "bank",
    aliases: ["banking"],
    version: "2.5",
    author: "FENG (fixed)",
    countDown: 3,
    role: 0,
    description: "Bank system - deposit, withdraw, check",
    category: "economy",
    guide: { en: "{pn} - check balance\n{pn} deposit <amount/all>\n{pn} withdraw <amount/all>\n{pn} deposit 999999999999999999\n{pn} deposit 1tg" }
  },
  onStart: async function ({ message, args, event, usersData }) {
    try {
      const { bankData } = global.db;
      const userID = event.senderID;

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

      const userData = (await usersData.get(userID)) || {};
      const wallet = toBigInt(userData.money) < 0n ? 0n : toBigInt(userData.money);
      let bankBalance = 0n;
      try { bankBalance = toBigInt((await bankData.get(userID))?.bankBalance); if (bankBalance < 0n) bankBalance = 0n; } catch {}

      const command = args[0]?.toLowerCase();

      // Show balance
      if (!command || command === "balance" || command === "bal" || command === "check") {
        const total = wallet + bankBalance;
        return message.reply(
          `🏦 BANK\n` +
          `──────────────\n` +
          `💵 Wallet: ${format(wallet)}\n` +
          `🏦 Bank: ${format(bankBalance)}\n` +
          `💰 Total: ${format(total)}`
        );
      }

      // Deposit
      if (command === "deposit" || command === "dep") {
        let raw = args[1]?.toLowerCase();
        if (!raw) return message.reply("❌ Usage: bank deposit 1000 or bank deposit all\nbank deposit 999999999999999999\nbank deposit 1tg");
        let amount = raw === "all" ? wallet : toBigInt(raw);
        if (amount <= 0n) return message.reply("❌ Enter valid amount. Ex: bank deposit 1000 / bank deposit 1tg / bank deposit all");
        if (amount > wallet) return message.reply(`❌ Not enough wallet. You have ${format(wallet)}`);
        const newWallet = wallet - amount;
        const newBank = bankBalance + amount;
        await usersData.set(userID, { money: newWallet.toString() });
        await bankData.set(userID, { bankBalance: newBank.toString() });
        return message.reply(`✅ Deposited ${format(amount)} to bank.\n🏦 New bank: ${format(newBank)}\n💵 New wallet: ${format(newWallet)}`);
      }

      // Withdraw
      if (command === "withdraw" || command === "wd" || command === "with") {
        let raw = args[1]?.toLowerCase();
        if (!raw) return message.reply("❌ Usage: bank withdraw 1000 or bank withdraw all\nbank withdraw 999999999999999999\nbank withdraw 1tg");
        let amount = raw === "all" ? bankBalance : toBigInt(raw);
        if (amount <= 0n) return message.reply("❌ Enter valid amount. Ex: bank withdraw 1000 / bank withdraw 1tg / bank withdraw all");
        if (amount > bankBalance) return message.reply(`❌ Not enough bank. Bank: ${format(bankBalance)}`);
        const newWallet = wallet + amount;
        const newBank = bankBalance - amount;
        await usersData.set(userID, { money: newWallet.toString() });
        await bankData.set(userID, { bankBalance: newBank.toString() });
        return message.reply(`✅ Withdrew ${format(amount)} from bank.\n💵 New wallet: ${format(newWallet)}\n🏦 New bank: ${format(newBank)}`);
      }

      return message.reply("🏦 Guide:\nbank\nbank deposit <amount/all>\nbank withdraw <amount/all>\nbank deposit 1tg");
    } catch (e) {
      console.error(e);
      return message.reply("❌ Bank error. Try again.");
    }
  }
};
