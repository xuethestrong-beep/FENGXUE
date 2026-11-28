
const SUFFIXES = [
  "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "De",
  "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Od", "Nd",
  "Vg", "Uv", "Dv", "Tv", "Qav", "Qiv", "Sxv", "Spv", "Ocv", "Nov",
  "Tg", "Uag", "Dag", "Trg", "Qag", "Qig", "Sxg", "Spg", "Ocg", "Nog",
  "Deg", "Udg", "Ddg", "Tdg", "Qadg", "Qidg", "Sxdg", "Spdg", "Odg",
  "Ndg", "VgG", "Uvg", "Dvg", "Tvg", "Qavg", "Qivg", "Sxvg", "Spvg",
  "Ovg", "Nvg", "TgG", "Uatg", "Datg", "Trtg", "Qatg", "Qitg",
  "Sxtg", "Sptg", "Octg", "Notg", "Detg", "Udtg", "Ddtg", "Tdtg",
  "Qadtg", "Qidtg", "Sxdtg", "Spdtg", "Odtg", "Ndtg", "Vtg",
  "Uvtg", "Dvtg", "Tvtg", "Qavtg", "Qivtg", "Sxvtg", "Spvtg",
  "Ocvtg", "Novtg", "Ttg", "Uaog", "Daog", "Trog", "Qaog", "Qiog",
  "Sxog", "Spog", "Ocog", "Noog", "Deog", "Udog", "Ddog", "Tdog",
  "Qadog", "Qidog", "Sxdog", "Spdog", "Odog", "Ndog", "Cg"
];

function parseMoney(value) {
  if (value == null) return null;

  let s = String(value)
    .trim()
    .replace(/,/g, "")
    .replace(/_/g, "")
    .replace(/\$/g, "")
    .replace(/@/g, "");

  if (!s) return null;

  // Scientific notation
  if (/^\d+(?:\.\d+)?e[+-]?\d+$/i.test(s)) {
    const [mantissa, exponent] = s.toLowerCase().split("e");
    const exp = Number(exponent);

    if (!Number.isSafeInteger(exp) || exp < 0 || exp > 10000) return null;

    const [whole, decimal = ""] = mantissa.split(".");
    const digits = BigInt(whole + decimal);
    const power = exp - decimal.length;

    if (power < 0) {
      return digits / (10n ** BigInt(-power));
    }

    return digits * (10n ** BigInt(power));
  }

  const match = s.match(/^(\d+(?:\.\d+)?)([a-zA-Z]*)$/);
  if (!match) return null;

  const number = match[1];
  const suffix = match[2].toLowerCase();

  const index = SUFFIXES.findIndex(
    item => item.toLowerCase() === suffix
  );

  if (index === -1) return null;

  const [whole, decimal = ""] = number.split(".");
  const digits = BigInt(whole + decimal);
  const power = index * 3 - decimal.length;

  if (power < 0) {
    return digits / (10n ** BigInt(-power));
  }

  return digits * (10n ** BigInt(power));
}

function formatMoney(value) {
  let amount = BigInt(value);
  const negative = amount < 0n;

  if (negative) amount = -amount;
  if (amount === 0n) return "$0";

  const digits = amount.toString().length;
  let tier = Math.floor((digits - 1) / 3);
  tier = Math.min(tier, SUFFIXES.length - 1);

  if (tier === 0) {
    return `${negative ? "-" : ""}$${amount}`;
  }

  const divisor = 10n ** BigInt(tier * 3);
  const whole = amount / divisor;
  const decimal = ((amount % divisor) * 100n / divisor)
    .toString()
    .padStart(2, "0");

  return `${negative ? "-" : ""}$${whole}.${decimal}${SUFFIXES[tier]}`;
}

module.exports = {
  config: {
    name: "addmoney",
    aliases: ["addbal", "givemoney"],
    version: "2.0",
    author: "FENG",
    countDown: 3,
    role: 2,
    description: "Add money to a user's wallet",
    category: "economy",
    guide: {
      en:
        "{pn} @mention amount\n" +
        "{pn} 10000\n" +
        "{pn} @mention 1m\n" +
        "Reply to a user: {pn} 50000"
    }
  },

  onStart: async function ({ message, event, args, usersData }) {
    try {
      // Find target: mention > reply > self
      let targetID;
      let method = "self";

      if (event.mentions && Object.keys(event.mentions).length) {
        targetID = Object.keys(event.mentions)[0];
        method = "mention";
      } else if (event.messageReply?.senderID) {
        targetID = event.messageReply.senderID;
        method = "reply";
      } else {
        targetID = event.senderID;
      }

      // Get amount
      let amount = null;

      if (method === "reply" || method === "self") {
        amount = parseMoney(args[0]);
      } else {
        for (let i = args.length - 1; i >= 0; i--) {
          const parsed = parseMoney(args[i]);
          if (parsed !== null) {
            amount = parsed;
            break;
          }
        }
      }

      if (amount === null || amount <= 0n) {
        return message.reply(
          "❌ INVALID AMOUNT\n\n" +
          "Examples:\n" +
          "• addmoney @user 10000\n" +
          "• addmoney @user 1m\n" +
          "• addmoney 50000\n" +
          "• Reply to a user: addmoney 50000"
        );
      }

      const userData = (await usersData.get(targetID)) || {};
      const oldMoney = parseMoney(userData.money) ?? 0n;
      const newMoney = oldMoney + amount;

      await usersData.set(targetID, {
        money: newMoney.toString()
      });

      let name = targetID;
      try {
        name = await usersData.getName(targetID);
      } catch {}

      return message.reply(
        `💰 FENG MONEY SYSTEM\n\n` +
        `✅ Successfully added money!\n\n` +
        `👤 Recipient: ${name}\n` +
        `📌 Method: ${method.toUpperCase()}\n` +
        `➕ Added: ${formatMoney(amount)}\n` +
        `💵 Previous balance: ${formatMoney(oldMoney)}\n` +
        `💎 New balance: ${formatMoney(newMoney)}`
      );

    } catch (error) {
      console.error("[FENG ADDMONEY]", error);
      return message.reply(
        "❌ Failed to add money.\nError: " + error.message
      );
    }
  }
};
  
