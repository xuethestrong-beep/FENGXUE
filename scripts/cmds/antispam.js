module.exports = {
  config: {
    name: "antispam",
    version: "4.1",
    author: "Feng (fixed)",
    role: 0,
    category: "box"
  },
  onStart: async function ({ message }) {
    return message.reply("🛡️ Antispam is always ON\n5 commands in 30s = 10m mute");
  },
  onChat: async function ({ event, api, threadsData, usersData }) {
    try {
      const tid = event.threadID;
      const sid = event.senderID;
      const botID = api.getCurrentUserID();
      if (String(sid) === String(botID)) return;
      if (global.GoatBot?.config?.adminBot?.includes(String(sid))) return;

      let data = await threadsData.get(tid) || {};
      if (!data.mutedUsers) data.mutedUsers = {};
      // data.mutedUsers = { userID: unmuteTime }

      const now = Date.now();

      // ===== CHECK IF STILL MUTED =====
      if (data.mutedUsers[sid]) {
        if (now < data.mutedUsers[sid]) {
          // Still muted - delete their message / block
          try { await api.unsendMessage(event.messageID); } catch {}
          return; // block - wag na ituloy
        } else {
          // Expired - auto unmute
          delete data.mutedUsers[sid];
          await threadsData.set(tid, data);
        }
      }

      // ===== COUNT SPAM - ALL MESSAGES, not just commands =====
      if (!global.cmdSpam) global.cmdSpam = {};
      if (!global.cmdSpam[tid]) global.cmdSpam[tid] = {};
      if (!global.cmdSpam[tid][sid]) global.cmdSpam[tid][sid] = [];

      let list = global.cmdSpam[tid][sid].filter(t => now - t < 30000);
      list.push(now);
      global.cmdSpam[tid][sid] = list;

      // ===== 5 msgs in 30s = MUTE 10m =====
      if (list.length >= 5) {
        const unmuteAt = now + 10 * 60 * 1000;
        data.mutedUsers[sid] = unmuteAt;
        await threadsData.set(tid, data);
        global.cmdSpam[tid][sid] = [];

        let name = sid;
        try { name = await usersData.getName(sid); } catch {}
        api.sendMessage(`🔇 ${name} muted for 10m - spamming`, tid);

        // Auto unmute message after 10m
        setTimeout(async () => {
          try {
            let nd = await threadsData.get(tid) || {};
            if (nd.mutedUsers?.[sid] && Date.now() >= nd.mutedUsers[sid]) {
              delete nd.mutedUsers[sid];
              await threadsData.set(tid, nd);
              api.sendMessage(`🔊 ${name} unmuted`, tid);
            }
          } catch {}
        }, 10 * 60 * 1000);
      }
    } catch {}
  }
};
