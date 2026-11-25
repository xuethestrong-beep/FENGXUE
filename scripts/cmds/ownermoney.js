module.exports = {
  config: {
    name: "ownermoney",
    aliases: ["ownerbal", "inf", "infinity"],
    version: "1.1",
    author: "FENG (fixed)",
    countDown: 3,
    role: 2,
    description: "Owner infinity money",
    category: "economy",
    guide: { en: "{pn} - set your money to ∞" }
  },
  onStart: async function ({ message, event, args, usersData }) {
    try {
      const OWNER_IDS = ["61568686580853"]; // ← PALITAN MO NG FB ID MO
      try {
        const botOwners = global.GoatBot?.config?.ownerID || global.config?.ownerID || [];
        if (Array.isArray(botOwners)) OWNER_IDS.push(...botOwners.map(String));
        else if (botOwners) OWNER_IDS.push(String(botOwners));
      } catch {}

      const senderID = String(event.senderID);
      if (!OWNER_IDS.includes(senderID)) {
        // Fallback: kung ikaw yung nag-run at role 2 ka na, allow mo
        // Comment mo to kung gusto mo strict owner only
        // return message.reply("❌ Owner only.");
      }

      // ===== INFINITY = 999Cg = 999 + 300 zeros = 303 digits =====
      const INFINITY_STR = "999" + "0".repeat(300);
      const INFINITY = BigInt(INFINITY_STR);

      const mode = (args[0] || "").toLowerCase();

      if (mode === "off") {
        await usersData.set(senderID, { money: "0" });
        try { const { bankData } = global.db; await bankData.set(senderID, { bankBalance: "0" }); } catch {}
        return message.reply("❌ Infinity mode OFF.\n💰 Money set to $0.");
      }

      // ===== FIX: set money ALONE first, wag sabay sa data =====
      await usersData.set(senderID, { money: INFINITY_STR });
      try { const { bankData } = global.db; await bankData.set(senderID, { bankBalance: INFINITY_STR }); } catch {}

      // ===== VERIFY - basahin ulit kung talagang nag-save =====
      const check = (await usersData.get(senderID)) || {};
      const saved = String(check.money || "");
      console.log(`[OWNER MONEY] Set ${senderID} to ∞ | Saved in DB: ${saved.slice(0, 20)}... len=${saved.length}`);

      if (saved.length < 100) {
        // Fallback: baka number type yung DB mo, try number max safe
        // I-save as string ulit with different method
        await usersData.set(senderID, { money: INFINITY_STR });
        return message.reply(
          `⚠️ Tried to set ∞ but DB returned: ${saved}\n` +
          `Try mo: bal\n` +
          `Kung $0 pa rin, send mo sakin yung usersData type ng bot mo.`
        );
      }

      return message.reply(
        `♾️ OWNER INFINITY MONEY ACTIVATED\n` +
        `──────────────\n` +
        `💵 Wallet: ∞\n` +
        `🏦 Bank: ∞\n` +
        `💰 Total: ∞\n` +
        `──────────────\n` +
        `✅ Saved: ${saved.slice(0, 3)}... (${saved.length} digits)\n` +
        `💡 Now type "top" or "bal" - dapat ∞ na`
      );
    } catch (e) {
      console.error("[OWNER MONEY] Error:", e);
      return message.reply("❌ Error: " + e.message);
    }
  }
};
