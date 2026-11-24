module.exports = {
  config: {
    name: "casino",
    aliases: ["csn", "gamble"],
    version: "1.3",
    author: "FENG (fixed)",
    countDown: 5,
    role: 0,
    description: "Full casino - slots, blackjack, roulette, dice, coinflip",
    category: "economy",
    guide: { en: "{pn} slots <bet|all>\n{pn} bj <bet|all>\n{pn} roulette <bet|all> <red/black/number>\n{pn} dice <bet|all> <1-6>\n{pn} coinflip <bet|all> <heads/tails>" }
  },
  onStart: async function ({ args, message, event, usersData }) {
    try {
      const uid = event.senderID;

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

      const userData = (await usersData.get(uid)) || {};
      let money = toBigInt(userData.money);
      if (money < 0n) money = 0n;
      const save = async (newMoney) => { await usersData.set(uid, { money: newMoney.toString() }); };

      const game = (args[0] || "").toLowerCase();
      if (!game) {
        return message.reply(
          `🎰 CASINO\n──────────────\n` +
          `💰 Balance: ${format(money)}\n\n` +
          `Games:\n` +
          `• casino slots <bet> - 3 matching symbols\n` +
          `• casino bj <bet> - blackjack vs dealer\n` +
          `• casino roulette <bet> <red/black/0-36>\n` +
          `• casino dice <bet> <1-6> - guess dice\n` +
          `• casino coinflip <bet> <heads/tails>\n\n` +
          `Ex: casino slots 1000\nEx: casino slots 1tg\nEx: casino slots 999999999999999999`
        );
      }

      const betRaw = (args[1] || "").toLowerCase();
      const MAX_BET = 10n ** 93n; // 1Tg - so big bets work, "all" bypasses if you want
      const MIN_BET = 100n;
      let bet = 0n;
      let isAll = false;
      if (betRaw === "all") { bet = money; isAll = true; }
      else bet = toBigInt(betRaw);
      if (bet <= 0n) return message.reply(`❌ Enter bet: casino ${game} <amount|all>\nEx: casino slots 1tg`);
      if (money < bet) return message.reply(`❌ You only have ${format(money)}`);
      if (bet < MIN_BET) return message.reply(`❌ Min bet ${format(MIN_BET)}`);
      if (!isAll && bet > MAX_BET) return message.reply(`❌ Max bet ${format(MAX_BET)} (use "all" to bet all)`);

      if (game === "slots" || game === "slot") {
        const symbols = ["🍒", "🍋", "🍊", "💎", "7️⃣", "🔔", "🍀"];
        const r1 = symbols[Math.floor(Math.random() * symbols.length)];
        const r2 = symbols[Math.floor(Math.random() * symbols.length)];
        const r3 = symbols[Math.floor(Math.random() * symbols.length)];
        let win = 0n;
        let msg = `🎰 [ ${r1} | ${r2} | ${r3} ]\n`;
        if (r1 === r2 && r2 === r3) {
          if (r1 === "💎" || r1 === "7️⃣") win = bet * 10n;
          else if (r1 === "🍀") win = bet * 5n;
          else win = bet * 3n;
          msg += `🎉 JACKPOT! Won ${format(win)}`;
        } else if (r1 === r2 || r2 === r3 || r1 === r3) {
          win = bet;
          msg += `✨ Small win! +${format(win)}`;
        } else {
          win = -bet;
          msg += `💸 Lost ${format(bet)}`;
        }
        const newMoney = money + win;
        await save(newMoney);
        return message.reply(msg + `\n💵 Balance: ${format(newMoney)}`);
      }

      if (game === "bj" || game === "blackjack" || game === "21") {
        const deck = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];
        const draw = () => deck[Math.floor(Math.random() * deck.length)];
        const p = draw() + draw();
        const d = draw() + draw();
        let win = 0n; let result = "";
        if (p > 21 && d > 21) { win = -bet; result = `🃏 You: ${p} Dealer: ${d} BOTH BUST!\n💸 Lost ${format(bet)}`; }
        else if (p === 21 && d !== 21) { win = bet * 3n / 2n; result = `🃏 BLACKJACK! You: 21 Dealer: ${d}\n🎉 Won ${format(win)}`; }
        else if (p > 21) { win = -bet; result = `🃏 You: ${p} BUST! Dealer: ${d}\n💸 Lost ${format(bet)}`; }
        else if (d > 21) { win = bet; result = `🃏 You: ${p} Dealer: ${d} BUST!\n✅ Won ${format(win)}`; }
        else if (p > d) { win = bet; result = `🃏 You: ${p} Dealer: ${d}\n✅ Won ${format(win)}`; }
        else if (p === d) { win = 0n; result = `🃏 You: ${p} Dealer: ${d}\n🤝 Push - no loss`; }
        else { win = -bet; result = `🃏 You: ${p} Dealer: ${d}\n💸 Lost ${format(bet)}`; }
        const newMoney = money + win;
        await save(newMoney);
        return message.reply(result + `\n💵 Balance: ${format(newMoney)}`);
      }

      if (game === "roulette" || game === "r") {
        const pick = (args[2] || "").toLowerCase();
        if (!pick) return message.reply(`❌ casino roulette <bet> <red/black/green/0-36>\nEx: casino roulette 500 red`);
        const num = Math.floor(Math.random() * 37);
        const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(num);
        const color = num === 0 ? "green" : isRed ? "red" : "black";
        let win = 0n; let result = `🎡 Roulette: ${num} ${color}\n`;
        if (pick === color) { win = color === "green" ? bet * 14n : bet; result += `✅ Color hit! Won ${format(win)}`; }
        else if (!isNaN(Number(pick)) && Number(pick) === num) { win = bet * 35n; result += `🎉 NUMBER JACKPOT! Won ${format(win)} (35x)`; }
        else { win = -bet; result += `💸 Lost - you picked ${pick}`; }
        const newMoney = money + win;
        await save(newMoney);
        return message.reply(result + `\n💵 Balance: ${format(newMoney)}`);
      }

      if (game === "dice") {
        const guess = Number(args[2]);
        if (!guess || guess < 1 || guess > 6) return message.reply(`❌ casino dice <bet> <1-6>\nEx: casino dice 500 3`);
        const roll = Math.floor(Math.random() * 6) + 1;
        let win = 0n; let result = `🎲 Dice rolled: ${roll}\n`;
        if (roll === guess) { win = bet * 9n / 2n; result += `🎉 Exact! Won ${format(win)} (4.5x)`; }
        else { win = -bet; result += `💸 Lost - you guessed ${guess}`; }
        const newMoney = money + win;
        await save(newMoney);
        return message.reply(result + `\n💵 Balance: ${format(newMoney)}`);
      }

      if (game === "coinflip" || game === "cf" || game === "flip") {
        const pick = (args[2] || "").toLowerCase();
        if (!["heads", "tails", "h", "t"].includes(pick)) return message.reply(`❌ casino coinflip <bet> <heads/tails>\nEx: casino coinflip 500 heads`);
        const flip = Math.random() < 0.5 ? "heads" : "tails";
        const normalizedPick = pick.startsWith("h") ? "heads" : "tails";
        let win = 0n; let result = `🪙 Flip: ${flip}\n`;
        if (flip === normalizedPick) { win = bet * 9n / 10n; result += `✅ Won ${format(win)}`; }
        else { win = -bet; result += `💸 Lost ${format(bet)}`; }
        const newMoney = money + win;
        await save(newMoney);
        return message.reply(result + `\n💵 Balance: ${format(newMoney)}`);
      }

      return message.reply(`❌ Unknown game ${game}\nUse: slots, bj, roulette, dice, coinflip`);
    } catch (e) {
      console.error("[CASINO] Error:", e.message);
      return message.reply("❌ Casino failed. Try again.");
    }
  }
};
