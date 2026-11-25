module.exports = {
  config: {
    name: "gc",
    aliases: ["group", "groupinfo", "gcinfo", "checkgc"],
    version: "1.0",
    author: "FENG",
    countDown: 5,
    role: 0,
    description: "Check if group is approved + group info",
    category: "box",
    guide: {
      en: "{pn} - Check this GC info + approved status\n{pn} list - List all approved / pending GCs (Owner only)\n{pn} approve - Approve this GC (Owner only)\n{pn} unapprove - Unapprove this GC (Owner only)"
    }
  },

  onStart: async function ({ message, event, args, threadsData, api }) {
    const tid = event.threadID;
    const botAdmins = global.GoatBot?.config?.adminBot || [];
    const isOwner = botAdmins.some(id => String(id) === String(event.senderID));

    // ===== GC LIST - OWNER ONLY =====
    if (args[0]?.toLowerCase() === "list") {
      if (!isOwner) return message.reply("❌ Owner only.");
      try {
        const all = await threadsData.getAll();
        const approved = all.filter(t => t.data?.approved === true);
        const pending = all.filter(t => t.data?.approved !== true);

        let msg = `📋 GROUP LIST\n──────────────\n`;
        msg += `✅ Approved: ${approved.length}\n`;
        msg += `⏳ Pending: ${pending.length}\n`;
        msg += `📦 Total: ${all.length}\n──────────────\n\n`;

        if (approved.length > 0) {
          msg += `✅ APPROVED:\n`;
          for (const g of approved.slice(0, 20)) {
            msg += `• ${g.threadName || "Unknown"} - ${g.threadID}\n`;
          }
          msg += `\n`;
        }
        if (pending.length > 0) {
          msg += `⏳ PENDING:\n`;
          for (const g of pending.slice(0, 20)) {
            msg += `• ${g.threadName || "Unknown"} - ${g.threadID}\n`;
          }
        }
        return message.reply(msg);
      } catch (e) {
        return message.reply("❌ Failed to load group list.");
      }
    }

    // ===== APPROVE / UNAPPROVE - OWNER ONLY =====
    if (args[0]?.toLowerCase() === "approve") {
      if (!isOwner) return message.reply("❌ Owner only.");
      const data = await threadsData.get(tid) || {};
      if (!data.data) data.data = {};
      data.data.approved = true;
      data.data.approvedBy = event.senderID;
      data.data.approvedAt = Date.now();
      await threadsData.set(tid, data);
      return message.reply("✅ This GC is now APPROVED\nBot will work here.");
    }

    if (args[0]?.toLowerCase() === "unapprove") {
      if (!isOwner) return message.reply("❌ Owner only.");
      const data = await threadsData.get(tid) || {};
      if (!data.data) data.data = {};
      data.data.approved = false;
      await threadsData.set(tid, data);
      return message.reply("❌ This GC is now UNAPPROVED\nBot will stop working here.");
    }

    // ===== DEFAULT: CHECK THIS GC =====
    try {
      const threadInfo = await api.getThreadInfo(tid);
      const threadData = await threadsData.get(tid) || {};
      const approved = threadData.data?.approved === true;

      const memberCount = threadInfo.participantIDs?.length || 0;
      const adminIDs = threadInfo.adminIDs?.map(a => a.id) || [];
      const isBotAdmin = adminIDs.includes(api.getCurrentUserID());

      let adminNames = [];
      for (const aid of adminIDs.slice(0, 5)) {
        try {
          const info = await api.getUserInfo(aid);
          adminNames.push(info[aid]?.name || aid);
        } catch { adminNames.push(aid); }
      }

      let msg = `🏠 GROUP INFO\n──────────────\n`;
      msg += `📛 Name: ${threadInfo.threadName || "Unnamed"}\n`;
      msg += `🆔 TID: ${tid}\n`;
      msg += `👥 Members: ${memberCount}\n`;
      msg += `👑 Admins: ${adminIDs.length}\n`;
      if (adminNames.length > 0) msg += `↳ ${adminNames.join(", ")}\n`;
      msg += `🤖 Bot Admin: ${isBotAdmin ? "Yes ✅" : "No ❌"}\n`;
      msg += `──────────────\n`;
      msg += approved
        ? `✅ STATUS: APPROVED\nBot is active in this group.`
        : `⏳ STATUS: NOT APPROVED\nAsk owner to approve: gc approve`;
      msg += `\n──────────────\n`;
      if (threadData.data?.approvedBy) {
        msg += `Approved by: ${threadData.data.approvedBy}\n`;
      }
      if (threadInfo.emoji) msg += `Emoji: ${threadInfo.emoji}\n`;
      if (threadInfo.color) msg += `Theme: ${threadInfo.color}\n`;

      return message.reply(msg);
    } catch (e) {
      console.error("[GC] Error:", e);
      return message.reply("❌ Failed to get group info.");
    }
  }
};
