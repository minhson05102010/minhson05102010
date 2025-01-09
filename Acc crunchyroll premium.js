const config = {
  name: "acc anime",
  _name: {
    "vi_VN": "acc vip"
  },
  aliases: ["tài khoản", "acc"],
  description: "Gửi ngẫu nhiên một acc premium xem anime",
  usage: "Dùng lệnh để nhận ngẫu nhiên một acc",
  credits: "LMS"
};

const stories = [
  {
    title: "📧 Email: ramondasilvamoreira78@gmail.com ",
    content: `🔑 Password: pimpolio100 và 💳người kt:@GoddVoid.`
  },
  {
    title: "Email: ja040949@gmail.com",
    content: `🔑Password: Crunchyroll.2024 và 💳người kt:@GoddVoid`
  },
  {
    title: "Email: jibzeer@icloud.com",
    content: `🔑 Password: Jb302696! và người kt:💳@GoddVoid.`
  },
  {
    title: "📧 Email:pascalribier42@gmail.com",
    content: `🔑 Password: Pascal42? và người kt:💳@GoddVoid.`
  },
  {
    title: "📧 Email: duckpandagoose@gmail.com",
    content: `🔑 Password: Duck1234 và người kt:💳@GoddVoid.`
  },
  {
    title: "📧 Email: deeganbowdo@gmail.com",
    content: `🔑 Password: Burger0987!và người kt:💳@GoddVoid.`
  }
];

export default {
  config,
  onCall: async ({ message }) => {
    const randomStory = stories[Math.floor(Math.random() * stories.length)];
    const replyMessage = `🌸━━━━━━𝗬𝘂𝗿𝗶 𝘅𝗶𝗻 𝗴𝘂̛̉𝗶 𝗮𝗰𝗰 𝗮𝗻𝗶𝗺𝗲 𝗽𝗿𝗲𝗺𝗶𝘂𝗺📖━━━━━━🌸\n
    🌟 **🌸Acc crunchyroll premium nè🌸💵: ${randomStory.title}** 🌟\n\n${randomStory.content}`;

    return message.reply(replyMessage);
  }
};
