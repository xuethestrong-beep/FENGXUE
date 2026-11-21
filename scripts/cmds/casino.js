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

      const parseAmount = (input, max) => {
        if (!input) return NaN;
        let s = String(input).toLowerCase().trim();
        if (s === "all") return max;
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

      const userData = (await usersData.get(uid)) || {};
      let money = cleanMoney(userData.money);
      const save = async (newMoney) => { await usersData.set(uid, { money: cleanMoney(newMoney) }); };

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
          `Ex: casino slots 1b / casino slots all`
        );
      }

      const betRaw = (args[1] || "").toLowerCase();
      const MAX_BET = 1000000000000; // 1T max - raised so 1B bets work
      const MIN_BET = 100;
      let bet = parseAmount(betRaw, money);
      if (!Number.isInteger(bet) || bet <= 0) return message.reply(`❌ Enter bet: casino ${game} <amount|all> - ex: 1b, 500k`);
      if (money < bet) return message.reply(`❌ You only have ${format(money)}`);
      if (bet < MIN_BET) return message.reply(`❌ Min bet ${format(MIN_BET)}`);
      if (bet > MAX_BET) return message.reply(`❌ Max bet ${format(MAX_BET)}`);

      if (game === "slots" || game === "slot") {
        const symbols = ["🍒", "🍋", "🍊", "💎", "7️⃣", "🔔", "🍀"];
        const r1 = symbols[Math.floor(Math.random() * symbols.length)];
        const r2 = symbols[Math.floor(Math.random() * symbols.length)];
        const r3 = symbols[Math.floor(Math.random() * symbols.length)];
        let win = 0;
        let msg = `🎰 [ ${r1} | ${r2} | ${r3} ]\n`;
        if (r1 === r2 && r2 === r3) {
          if (r1 === "💎" || r1 === "7️⃣") win = bet * 10;
          else if (r1 === "🍀") win = bet * 5;
          else win = bet * 3;
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
        let win = 0;
        let result = "";
        if (p > 21 && d > 21) { win = -bet; result = `🃏 You: ${p} Dealer: ${d} BOTH BUST!\n💸 Lost ${format(bet)}`; }
        else if (p === 21 && d !== 21) { win = Math.floor(bet * 1.5); result = `🃏 BLACKJACK! You: 21 Dealer: ${d}\n🎉 Won ${format(win)}`; }
        else if (p > 21) { win = -bet; result = `🃏 You: ${p} BUST! Dealer: ${d}\n💸 Lost ${format(bet)}`; }
        else if (d > 21) { win = bet; result = `🃏 You: ${p} Dealer: ${d} BUST!\n✅ Won ${format(win)}`; }
        else if (p > d) { win = bet; result = `🃏 You: ${p} Dealer: ${d}\n✅ Won ${format(win)}`; }
        else if (p === d) { win = 0; result = `🃏 You: ${p} Dealer: ${d}\n🤝 Push - no loss`; }
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
        let win = 0;
        let result = `🎡 Roulette: ${num} ${color}\n`;
        if (pick === color) { win = color === "green" ? bet * 14 : bet; result += `✅ Color hit! Won ${format(win)}`; }
        else if (!isNaN(Number(pick)) && Number(pick) === num) { win = bet * 35; result += `🎉 NUMBER JACKPOT! Won ${format(win)} (35x)`; }
        else { win = -bet; result += `💸 Lost - you picked ${pick}`; }
        const newMoney = money + win;
        await save(newMoney);
        return message.reply(result + `\n💵 Balance: ${format(newMoney)}`);
      }

      if (game === "dice") {
        const guess = Number(args[2]);
        if (!guess || guess < 1 || guess > 6) return message.reply(`❌ casino dice <bet> <1-6>\nEx: casino dice 500 3`);
        const roll = Math.floor(Math.random() * 6) + 1;
        let win = 0;
        let result = `🎲 Dice rolled: ${roll}\n`;
        if (roll === guess) { win = Math.floor(bet * 4.5); result += `🎉 Exact! Won ${format(win)} (4.5x)`; }
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
        let win = 0;
        let result = `🪙 Flip: ${flip}\n`;
        if (flip === normalizedPick) { win = Math.floor(bet * 0.9); result += `✅ Won ${format(win)}`; }
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
