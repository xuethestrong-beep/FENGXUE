module.exports = {
  config: {
    name: "transfer",
    aliases: ["pay", "send", "give"],
    version: "1.4",
    author: "FENG (fixed)",
    countDown: 3,
    role: 0,
    description: "Send money to another user (5% fee)",
    category: "economy",
    guide: { en: "{pn} @user <amount|all>\nReply + {pn} <amount>\n{pn} @user 100\n{pn} @user 1tg\n{pn} @user 999999999999999999" }
  },
  onStart: async function ({ args, message, event, usersData }) {
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

      // ===== TARGET - 1. Mention 2. Reply =====
      let targetID = null;
      let isReply = false;
      if (event.mentions && Object.keys(event.mentions).length > 0) {
        targetID = Object.keys(event.mentions)[0];
      } else if (event.messageReply?.senderID) {
        targetID = event.messageReply.senderID;
        isReply = true;
      }
      if (!targetID) return message.reply("👤 Usage:\ntransfer @user 100\nReply to someone + transfer 100\ntransfer @user all\ntransfer @user 1tg");
      if (targetID === event.senderID) return message.reply("❌ Can't transfer to yourself");

      // ===== AMOUNT - FIXED: now accepts suffix + plain 999... + all =====
      // If reply: args = ["999..."] or ["1tg"] - first arg is amount
      // If mention: args = ["@user", "999..."] - last arg is amount
      let amountRaw = null;
      if (isReply) {
        amountRaw = args[0];
      } else {
        for (let i = args.length - 1; i >= 0; i--) {
          let a = String(args[i]).replace(/[@,]/g, "");
          if (a === targetID) continue;
          if (a.toLowerCase() === "all" || /^\d+(\.\d+)?[a-zA-Z]*$/.test(a)) { amountRaw = a; break; }
        }
      }
      if (!amountRaw) return message.reply("❌ Enter amount\nEx: transfer @user 100 or reply + transfer 100\ntransfer @user 1tg");

      const sender = (await usersData.get(event.senderID)) || {};
      const target = (await usersData.get(targetID)) || {};
      const senderBal = toBigInt(sender.money) < 0n ? 0n : toBigInt(sender.money);
      const targetBal = toBigInt(target.money) < 0n ? 0n : toBigInt(target.money);

      let amount = 0n;
      if (String(amountRaw).toLowerCase() === "all") amount = senderBal;
      else amount = toBigInt(amountRaw);

      if (amount <= 0n) return message.reply("❌ Enter valid amount");
      if (amount < 10n) return message.reply("❌ Min $10");
      if (senderBal < amount) return message.reply(`❌ You only have ${format(senderBal)}`);

      const fee = amount * 5n / 100n; // 5% fee - BigInt safe
      const receive = amount - fee;

      await usersData.set(event.senderID, { money: (senderBal - amount).toString() });
      await usersData.set(targetID, { money: (targetBal + receive).toString() });

      const name = await usersData.getName(targetID).catch(() => "User");
      return message.reply(
        `💸 Transfer Success${isReply ? " (via reply)" : ""}\n──────────────\n` +
        `👤 To: ${name}\n` +
        `💵 Sent: ${format(amount)}\n` +
        (fee > 0n ? `💸 Fee (5%): ${format(fee)}\n📥 They got: ${format(receive)}\n` : ``) +
        `💰 Your bal: ${format(senderBal - amount)}`
      );
    } catch (e) {
      console.error("[TRANSFER] Error:", e);
      return message.reply("❌ Transfer failed.");
    }
  }
};
