
module.exports = {
  config: {
    name: "top",
    aliases: ["leaderboard", "lb", "rich"],
    version: "2.0",
    author: "FENGSAMA",
    countDown: 10,
    role: 0,
    description: "Top 10 richest users (wallet + bank)",
    category: "economy",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ message, event, usersData }) {
    try {
      const SUFFIXES = [
        "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc",
        "No", "De", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd",
        "Spd", "Od", "Nd", "Vg", "Uv", "Dv", "Tv", "Qav",
        "Qiv", "Sxv", "Spv", "Ocv", "Nov", "Tg", "Uag",
        "Dag", "Trg", "Qag", "Qig", "Sxg", "Spg", "Ocg",
        "Nog", "Deg", "Udg", "Ddg", "Tdg", "Qadg", "Qidg",
        "Sxdg", "Spdg", "Odg", "Ndg", "VgG", "Uvg", "Dvg",
        "Tvg", "Qavg", "Qivg", "Sxvg", "Spvg", "Ovg",
        "Nvg", "TgG", "Uatg", "Datg", "Trtg", "Qatg",
        "Qitg", "Sxtg", "Sptg", "Octg", "Notg", "Detg",
        "Udtg", "Ddtg", "Tdtg", "Qadtg", "Qidtg", "Sxdtg",
        "Spdtg", "Odtg", "Ndtg", "Vtg", "Uvtg", "Dvtg",
        "Tvtg", "Qavtg", "Qivtg", "Sxvtg", "Spvtg",
        "Ocvtg", "Novtg", "Ttg", "Uaog", "Daog", "Trog",
        "Qaog", "Qiog", "Sxog", "Spog", "Ocog", "Noog",
        "Deog", "Udog", "Ddog", "Tdog", "Qadog", "Qidog",
        "Sxdog", "Spdog", "Odog", "Ndog", "Cg"
      ];

      const INFINITY = BigInt("999" + "0".repeat(300));

      function toBigInt(value) {
        if (value == null) return 0n;

        try {
          let s = String(value)
            .trim()
            .replace(/,/g, "")
            .replace(/_/g, "")
            .replace(/\$/g, "");

          if (!s || s === "-") return 0n;

          if (s === "Infinity" || s === "∞") {
            return INFINITY;
          }

          if (/^-?\d+(?:\.\d+)?e[+-]?\d+$/i.test(s)) {
            const [mantissa, exponent] = s.toLowerCase().split("e");
            const exp = Number(exponent);

            if (!Number.isSafeInteger(exp) || Math.abs(exp) > 10000) {
              return exp > 0 ? INFINITY : 0n;
            }

            const negative = mantissa.startsWith("-");
            const clean = mantissa.replace("-", "");
            const [whole, decimal = ""] = clean.split(".");
            const digits = whole + decimal;
            let result = BigInt(digits);
            const power = exp - decimal.length;

            if (power < 0) {
              result /= 10n ** BigInt(-power);
            } else {
              result *= 10n ** BigInt(power);
            }

            return negative ? -result : result;
          }

          const match = s.match(/^(-?\d+(?:\.\d+)?)([a-zA-Z]+)?$/);

          if (match) {
            const number = match[1];
            const suffix = (match[2] || "").toLowerCase();

            if (!suffix) {
              const [whole] = number.split(".");
              return BigInt(whole);
            }

            const index = SUFFIXES.findIndex(
              item => item.toLowerCase() === suffix
            );

            if (index > 0) {
              const negative = number.startsWith("-");
              const clean = number.replace("-", "");
              const [whole, decimal = ""] = clean.split(".");
              const base = BigInt(whole + decimal);
              const power = index * 3 - decimal.length;

              let result = power < 0
                ? base / (10n ** BigInt(-power))
                : base * (10n ** BigInt(power));

              return negative ? -result : result;
            }
          }

          return 0n;
        } catch {
          return 0n;
        }
      }

      function format(value) {
        let num = toBigInt(value);

        if (num >= INFINITY) return "∞";
        if (num <= 0n) return "$0";

        const digits = num.toString().length;
        let tier = Math.floor((digits - 1) / 3);

        if (tier >= SUFFIXES.length) {
          tier = SUFFIXES.length - 1;
        }

        if (tier === 0) {
          return "$" + num.toLocaleString("en-US");
        }

        const divisor = 10n ** BigInt(tier * 3);
        const whole = num / divisor;
        const remainder = num % divisor;

        const decimals = (remainder * 100n / divisor)
          .toString()
          .padStart(2, "0");

        if (whole < 10n) {
          return `$${whole}.${decimals}${SUFFIXES[tier]}`;
        }

        if (whole < 100n) {
          return `$${whole}.${decimals[0]}${SUFFIXES[tier]}`;
        }

        return `$${whole}${SUFFIXES[tier]}`;
      }

      // Get all wallet records
      const all = await usersData.getAll();

      if (!Array.isArray(all) || all.length === 0) {
        return message.reply("💰 No registered users found.");
      }

      // Get bank records using your actual bank database
      const bankData = global.db?.bankData;

      if (!bankData || typeof bankData.get !== "function") {
        return message.reply(
          "❌ Bank database is unavailable. Check global.db.bankData."
        );
      }

      const entries = await Promise.all(
        all.map(async user => {
          const id = user.userID;

          if (!id) return null;

          const wallet = toBigInt(user.money);
          let bank = 0n;

          try {
            const bankRecord = await bankData.get(id);
            bank = toBigInt(bankRecord?.bankBalance);
          } catch (error) {
            console.error(`[TOP] Bank lookup failed for ${id}:`, error);
          }

          const safeWallet = wallet > 0n ? wallet : 0n;
          const safeBank = bank > 0n ? bank : 0n;

          return {
            id: String(id),
            wallet: safeWallet,
            bank: safeBank,
            total: safeWallet + safeBank
          };
        })
      );

      // Rank by total wealth
      const leaderboard = entries
        .filter(Boolean)
        .filter(user => user.total > 0n)
        .sort((a, b) => {
          if (a.total > b.total) return -1;
          if (a.total < b.total) return 1;
          return 0;
        });

      if (leaderboard.length === 0) {
        return message.reply(
          "💰 No one has money yet. Type daily to start earning!"
        );
      }

      const top10 = leaderboard.slice(0, 10);

      const medals = [
        "👑", "💎", "🔥", "⭐", "✨",
        "💰", "🪙", "🎖️", "🏅", "🎯"
      ];

      let output =
        `👑 𝐅𝐄𝐍𝐆𝐒𝐀𝐌𝐀 𝐓𝐎𝐏 𝟏𝟎 👑\n` +
        `🏆 RICHEST PLAYERS\n` +
        `━━━━━━━━━━━━━━━━━━\n\n`;

      for (let i = 0; i < top10.length; i++) {
        const player = top10[i];

        let name;

        try {
          name = await usersData.getName(player.id);
        } catch {
          name = null;
        }

        if (!name) {
          name = `ID:${player.id.slice(0, 6)}`;
        }

        output +=
          `${medals[i]} ${name}\n` +
          `💰 Total: ${format(player.total)}\n` +
          `━━━━━━━━━━━━━━━━━━\n`;
      }

      // Display sender's personal rank
      const myIndex = leaderboard.findIndex(
        player => player.id === String(event.senderID)
      );

      if (myIndex !== -1) {
        const me = leaderboard[myIndex];

        output +=
          `📍 YOUR RANK: #${myIndex + 1}\n` +
          `💵 Wallet: ${format(me.wallet)}\n` +
          `🏦 Bank: ${format(me.bank)}\n` +
          `💰 Total: ${format(me.total)}`;
      } else {
        output += "📍 YOUR RANK: Unranked — $0";
      }

      return message.reply(output);

    } catch (error) {
      console.error("[TOP] Leaderboard error:", error);

      return message.reply(
        "❌ Failed to load leaderboard. Check the bot console for details."
      );
    }
  }
};
        
