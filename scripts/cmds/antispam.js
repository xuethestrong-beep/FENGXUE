module.exports = {
  config: {
    name: "antispam",
    version: "4.0",
    author: "Feng",
    role: 0,
    category: "box"
  },

  onStart: async function () {},

  onChat: async function ({ event, api, threadsData, usersData }) {
    const prefix = global.GoatBot?.config?.prefix || "!";
    if (!event.body?.startsWith(prefix) && !event.body?.startsWith("/")) return;

    const tid = event.threadID;
    const sid = event.senderID;
    if (global.GoatBot?.config?.adminBot?.includes(sid)) return;

    let data = await threadsData.get(tid);
    if (!data.mutedUsers) data.mutedUsers = [];
    if (data.mutedUsers.includes(sid)) return;

    if (!global.cmdSpam) global.cmdSpam = {};
    if (!global.cmdSpam[tid]) global.cmdSpam[tid] = {};
    if (!global.cmdSpam[tid][sid]) global.cmdSpam[tid][sid] = [];

    let now = Date.now();
    let list = global.cmdSpam[tid][sid].filter(t => now - t < 30000);
    list.push(now);
    global.cmdSpam[tid][sid] = list;

    if (list.length >= 5) {
      data.mutedUsers.push(sid);
      await threadsData.set(tid, data);

      let name = sid;
      try { name = await usersData.getName(sid); } catch {}

      api.sendMessage(`🔇 ${name} muted 10m - spam`, tid);

      setTimeout(async () => {
        let nd = await threadsData.get(tid);
        nd.mutedUsers = nd.mutedUsers.filter(id => id !== sid);
        await threadsData.set(tid, nd);
        delete global.cmdSpam[tid][sid];
        api.sendMessage(`🔊 ${name} unmuted`, tid);
      }, 600000);

      global.cmdSpam[tid][sid] = [];
    }
  }
};
