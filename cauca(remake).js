const config = {
  name: "cauca",
  aliases: ["cc"],
  description: "Giả lập câu cá với phần thưởng hấp dẫn",
  permissions: [0],
  credits: "Lms",
  extra: {
      fishData: [
          { name: "Golden Carp", rarity: "common", reward: 100, chance: 0.5 },
          { name: "Rainbow Fish", rarity: "rare", reward: 500, chance: 0.2 },
          { name: "King of the Ocean", rarity: "epic", reward: 2000, chance: 0.05 },
          { name: "Magic Koi", rarity: "legendary", reward: 5000, chance: 0.01 }
      ],
      imageURL: "https://i.imgur.com/fHZ4K2r.png"
  }
};

const langData = {
  "en_US": {
      "caughtFish": "You caught a {fishName}! You earned {reward} XC.",
      "askStore": "Do you want to store the {fishName} in your aquarium? (yes/no)",
      "storedFish": "You successfully stored the {fishName} in your aquarium.",
      "declinedStore": "You chose not to store the {fishName}.",
      "showAquarium": "Your aquarium contains:\n{fishList}",
      "noFish": "Your aquarium is empty!"
  },
  "vi_VN": {
      "caughtFish": "Bạn đã câu được {fishName}! Bạn nhận được {reward} XC.",
      "askStore": "Bạn có muốn cất {fishName} vào bể không? (có/không)",
      "storedFish": "Bạn đã cất {fishName} vào bể thành công.",
      "declinedStore": "Bạn đã chọn không cất {fishName} vào bể.",
      "showAquarium": "Bể cá của bạn chứa:\n{fishList}",
      "noFish": "Bể cá của bạn đang trống!"
  }
};

async function onCall({ message, args, Users, getLang, extra }) {
  const { fishData, imageURL } = extra;
  const userData = await Users.getData(message.senderID);

  if (!userData.aquarium) userData.aquarium = [];

  const subCommand = args[0]?.toLowerCase();

  switch (subCommand) {
      case "fish":
      case "cau":
          const random = Math.random();
          let caughtFish = null;

          for (const fish of fishData) {
              if (random < fish.chance) {
                  caughtFish = fish;
                  break;
              }
          }

          if (!caughtFish) caughtFish = fishData[0]; // Nếu không rơi vào cá hiếm, trả về cá thường

          await Users.increaseMoney(message.senderID, caughtFish.reward);
          message.reply(getLang("caughtFish", { fishName: caughtFish.name, reward: caughtFish.reward }), {
              attachment: imageURL
          });

          if (caughtFish.rarity !== "common") {
              const filterResponse = (response) =>
                  ["yes", "no", "có", "không"].includes(response.body?.toLowerCase());
              message.reply(getLang("askStore", { fishName: caughtFish.name }));

              const collected = await message.waitForReply(filterResponse, 15000); // Đợi người dùng trả lời trong 15 giây
              if (!collected) return message.reply("You didn't respond in time!");

              const response = collected.body.toLowerCase();
              if (["yes", "có"].includes(response)) {
                  userData.aquarium.push(caughtFish.name);
                  await Users.updateData(message.senderID, userData);
                  return message.reply(getLang("storedFish", { fishName: caughtFish.name }));
              } else {
                  return message.reply(getLang("declinedStore", { fishName: caughtFish.name }));
              }
          }
          break;

      case "aquarium":
      case "be":
          if (!userData.aquarium.length) {
              return message.reply(getLang("noFish"));
          }
          const fishCount = userData.aquarium.reduce((acc, fish) => {
              acc[fish] = (acc[fish] || 0) + 1;
              return acc;
          }, {});

          const fishList = Object.entries(fishCount)
              .map(([fish, count]) => `- ${fish}: ${count}`)
              .join("\n");

          return message.reply(getLang("showAquarium", { fishList }));

      default:
          return message.reply("Invalid command! Use `!cauca fish` to fish or `!cauca aquarium` to view your aquarium.");
  }
}

export default {
  config,
  langData,
  onCall
};
//!cauca fish
//Người dùng câu một con cá, nhận được số XC dựa trên độ hiếm của cá.
//Với cá hiếm, người dùng được hỏi có muốn lưu cá vào bể không.
//Xem bể cá:

//Lệnh: !cauca aquarium
//Hiển thị danh sách cá và số lượng trong bể của người dùng
