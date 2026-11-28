
module.exports = {
  config: {
    name: "casino",
    aliases: ["slots", "slot"],
    version: "2.0.0",
    author: "FENGSAMA",
    countDown: 5,
    role: 0,
    description: "Play casino games and win coins",
    category: "economy",
    guide: {
      en:
        "{pn} slots <bet>\n" +
        "{pn} bj <bet>\n" +
        "{pn} roulette <red/black/odd/even/0-36> <bet>\n" +
        "{pn} dice <bet>\n" +
        "{pn} coinflip <heads/tails> <bet>"
    }
  },

  onStart: async function ({ message, event, args, usersData }) {
    try {
      const userID = event.senderID;
      const userData = await usersData.get(userID);

      if (!userData) {
        return message.reply("❌ Account data not found.");
      }

      const wallet = BigInt(String(userData.money ?? 0));
      const format = n => n.toLocaleString("en-US");

      const help = () => message.reply(
        `🎰 FENGSAMA CASINO\n\n` +
        `🎰 SLOTS\ncasino slots 100\n\n` +
        `🃏 BLACKJACK\ncasino bj 100\n\n` +
        `🎡 ROULETTE\ncasino roulette red 100\n` +
        `casino roulette black 100\n` +
        `casino roulette odd 100\n` +
        `casino roulette even 100\n` +
        `casino roulette 17 100\n\n` +
        `🎲 DICE\ncasino dice 100\n\n` +
        `🪙 COINFLIP\ncasino coinflip heads 100\n` +
        `casino coinflip tails 100\n\n` +
        `💵 Wallet: $${format(wallet)}`
      );

      if (!args[0]) return help();

      const game = args[0].toLowerCase();

      let betText;
      let choice;

      if (["slots", "slot", "bj", "blackjack", "dice"].includes(game)) {
        betText = args[1];
      } else {
        choice = String(args[1] || "").toLowerCase();
        betText = args[2];
      }

      if (!betText || !/^\d+$/.test(betText)) {
        return message.reply("❌ Enter a valid bet amount.\nExample: casino slots 100");
      }

      const bet = BigInt(betText);

      if (bet <= 0n) {
        return message.reply("❌ Your bet must be greater than zero.");
      }

      if (bet > wallet) {
        return message.reply(
          `❌ Insufficient wallet balance.\n💵 Wallet: $${format(wallet)}`
        );
      }

      let payout = 0n;
      let title = "";
      let details = "";

      // SLOTS
      if (["slots", "slot"].includes(game)) {
        const symbols = ["🍒", "🍋", "🍇", "⭐", "💎", "7️⃣"];
        const spin = Array.from(
          { length: 3 },
          () => symbols[Math.floor(Math.random() * symbols.length)]
        );

        let multiplier = 0;

        if (spin[0] === spin[1] && spin[1] === spin[2]) {
          multiplier = spin[0] === "7️⃣" ? 10 :
            spin[0] === "💎" ? 7 : 5;
        } else if (
          spin[0] === spin[1] ||
          spin[1] === spin[2] ||
          spin[0] === spin[2]
        ) {
          multiplier = 1.5;
        }

        payout = multiplier === 1.5
          ? (bet * 3n) / 2n
          : bet * BigInt(multiplier);

        title = "🎰 SLOT MACHINE";
        details =
          `╔══════════════╗\n` +
          `║ ${spin.join("  ")} ║\n` +
          `╚══════════════╝\n\n` +
          (multiplier > 0
            ? `🎉 Winning combination! ${multiplier}x payout`
            : "💀 No match! You lost.");
      }

      // BLACKJACK - automatic dealer round
      else if (["bj", "blackjack"].includes(game)) {
        const deck = [];

        for (const suit of ["♠", "♥", "♦", "♣"]) {
          for (const rank of [
            "A", "2", "3", "4", "5", "6", "7",
            "8", "9", "10", "J", "Q", "K"
          ]) {
            deck.push({ rank, suit });
          }
        }

        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        const draw = () => deck.pop();

        const value = card => {
          if (["J", "Q", "K"].includes(card.rank)) return 10;
          if (card.rank === "A") return 11;
          return Number(card.rank);
        };

        const score = hand => {
          let total = hand.reduce((sum, card) => sum + value(card), 0);
          let aces = hand.filter(card => card.rank === "A").length;

          while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
          }

          return total;
        };

        const show = hand =>
          hand.map(card => `${card.rank}${card.suit}`).join(" ");

        const player = [draw(), draw()];
        const dealer = [draw(), draw()];

        let playerScore = score(player);
        let dealerScore = score(dealer);

        while (playerScore < 21 && dealerScore < 17) {
          dealer.push(draw());
          dealerScore = score(dealer);
        }

        const playerBJ = player.length === 2 && playerScore === 21;
        const dealerBJ = dealer.length === 2 && dealerScore === 21;

        if (playerBJ && !dealerBJ) {
          payout = (bet * 5n) / 2n;
          details = "🎉 BLACKJACK! You win 2.5x!";
        } else if (playerScore > 21) {
          payout = 0n;
          details = "💀 Bust! You went over 21.";
        } else if (dealerScore > 21 || playerScore > dealerScore) {
          payout = bet * 2n;
          details = "🎉 You beat the dealer!";
        } else if (playerScore === dealerScore) {
          payout = bet;
          details = "🤝 Push! Your bet is returned.";
        } else {
          payout = 0n;
          details = "💀 Dealer wins!";
        }

        title = "🃏 BLACKJACK";
        details =
          `Your cards: ${show(player)}\n` +
          `Your score: ${playerScore}\n\n` +
          `Dealer cards: ${show(dealer)}\n` +
          `Dealer score: ${dealerScore}\n\n` +
          details;
      }

      // ROULETTE
      else if (game === "roulette") {
        const number = Math.floor(Math.random() * 37);
        const redNumbers = [
          1, 3, 5, 7, 9, 12, 14, 16, 18,
          19, 21, 23, 25, 27, 30, 32, 34, 36
        ];

        const color = number === 0
          ? "green"
          : redNumbers.includes(number) ? "red" : "black";

        const valid = ["red", "black", "odd", "even"];

        if (!valid.includes(choice) && !/^(0|[1-9]|[12]\d|3[0-6])$/.test(choice)) {
          return message.reply(
            "❌ Choose red, black, odd, even, or a number from 0 to 36."
          );
        }

        let multiplier = 0;

        if (choice === color) multiplier = 2;
        else if (choice === "odd" && number !== 0 && number % 2 === 1) multiplier = 2;
        else if (choice === "even" && number !== 0 && number % 2 === 0) multiplier = 2;
        else if (/^\d+$/.test(choice) && Number(choice) === number) multiplier = 36;

        payout = bet * BigInt(multiplier);

        title = "🎡 ROULETTE";
        details =
          `Ball landed on: ${number} (${color.toUpperCase()})\n` +
          `Your choice: ${choice}\n\n` +
          (multiplier > 0
            ? `🎉 You won ${multiplier}x!`
            : "💀 Better luck next time!");
      }

      // DICE
      else if (game === "dice") {
        const playerRoll = Math.floor(Math.random() * 6) + 1;
        const dealerRoll = Math.floor(Math.random() * 6) + 1;

        if (playerRoll > dealerRoll) {
          payout = bet * 2n;
          details = "🎉 Your dice beat the casino!";
        } else if (playerRoll === dealerRoll) {
          payout = bet;
          details = "🤝 It's a tie! Your bet is returned.";
        } else {
          payout = 0n;
          details = "💀 The casino won!";
        }

        title = "🎲 DICE DUEL";
        details =
          `👤 Your roll: ${playerRoll}\n` +
          `🏦 Casino roll: ${dealerRoll}\n\n` +
          details;
      }

      // COINFLIP
      else if (game === "coinflip") {
        if (!["heads", "tails"].includes(choice)) {
          return message.reply("❌ Choose heads or tails.");
        }

        const result = Math.random() < 0.5 ? "heads" : "tails";
        const won = result === choice;

        payout = won ? bet * 2n : 0n;

        title = "🪙 COINFLIP";
        details =
          `Your choice: ${choice}\n` +
          `Coin landed: ${result}\n\n` +
          (won ? "🎉 You won!" : "💀 You lost!");
      }

      else {
        return help();
      }

      // Update wallet: subtract bet, then add gross payout
      const newWallet = wallet - bet + payout;

      await usersData.set(userID, {
        money: newWallet.toString()
      });

      const net = payout - bet;
      const netText = net >= 0n
        ? `+$${format(net)}`
        : `-$${format(-net)}`;

      return message.reply(
        `${title}\n\n` +
        `${details}\n\n` +
        `🎲 Bet: $${format(bet)}\n` +
        `💰 Net result: ${netText}\n` +
        `💵 Wallet: $${format(newWallet)}`
      );

    } catch (error) {
      console.error("Casino error:", error);
      return message.reply("❌ Casino error. Please try again.");
    }
  }
};
    
