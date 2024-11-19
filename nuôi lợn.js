const config = {
  name: "nuoilon",
  aliases: ["nl"],
  description: "Giả lập nuôi lợn và kiếm tiền",
  permissions: [2],
  credits: "LMS",
  extra: {
      basePigEarnings: 300, // Tiền bán lợn thông thường
      specialPigEarnings: 500, // Tiền bán lợn "Minbeo"
      growthTime: 60, // Thời gian lớn lên của lợn con (giây)
      startingPigs: 2 // Số lợn khởi đầu
  }
};

const langData = {
  "en_US": {
      "startGame": "You have started the pig farm with 2 pigs!",
      "buyPigSuccess": "You successfully bought {quantity} pigs!",
      "breedSuccess": "Your pigs have bred! A piglet will grow up in 1 minute.",
      "sellSuccess": "You sold {quantity} pigs for {earnings} XC!",
      "pigletGrown": "A piglet has grown up!",
      "invalidCommand": "Invalid command. Use `!nuoilon help` to see available commands."
  },
  "vi_VN": {
      "startGame": "Bạn đã bắt đầu trang trại lợn với 2 con lợn!",
      "buyPigSuccess": "Bạn đã mua thành công {quantity} con lợn!",
      "breedSuccess": "Lợn của bạn đã phối giống! Lợn con sẽ lớn sau 1 phút.",
      "sellSuccess": "Bạn đã bán {quantity} con lợn và nhận được {earnings} XC!",
      "pigletGrown": "Một con lợn con đã lớn!",
      "invalidCommand": "Lệnh không hợp lệ. Sử dụng `!nuoilon help` để xem các lệnh khả dụng."
  }
};

async function onCall({ message, args, Users, getLang, extra }) {
  const { basePigEarnings, specialPigEarnings, growthTime, startingPigs } = extra;

  try {
      const subCommand = args[0]?.toLowerCase();
      const userData = await Users.getData(message.senderID);

      if (!userData.pigs) {
          userData.pigs = {
              regular: startingPigs,
              special: 0,
              piglets: []
          };
      }

      const pigFarm = userData.pigs;

      switch (subCommand) {
          case "start":
              if (pigFarm.regular > 0 || pigFarm.special > 0) {
                  return message.reply("You already have a pig farm!");
              }
              pigFarm.regular = startingPigs;
              await Users.updateData(message.senderID, { pigs: pigFarm });
              return message.reply(getLang("startGame"));

          case "buy":
              const quantity = parseInt(args[1]);
              if (!quantity || quantity <= 0) {
                  return message.reply(getLang("invalidCommand"));
              }
              pigFarm.regular += quantity;
              await Users.updateData(message.senderID, { pigs: pigFarm });
              return message.reply(getLang("buyPigSuccess", { quantity }));

          case "breed":
              if (pigFarm.regular < 2) {
                  return message.reply("You need at least 2 regular pigs to breed.");
              }
              pigFarm.regular -= 2;
              pigFarm.piglets.push(Date.now() + growthTime * 1000);
              await Users.updateData(message.senderID, { pigs: pigFarm });
              return message.reply(getLang("breedSuccess"));

          case "sell":
              const sellType = args[1]?.toLowerCase();
              const sellQuantity = parseInt(args[2]);

              if (!sellType || !sellQuantity || sellQuantity <= 0) {
                  return message.reply(getLang("invalidCommand"));
              }

              if (sellType === "regular" && pigFarm.regular >= sellQuantity) {
                  const earnings = sellQuantity * basePigEarnings;
                  pigFarm.regular -= sellQuantity;
                  await Users.increaseMoney(message.senderID, earnings);
                  await Users.updateData(message.senderID, { pigs: pigFarm });
                  return message.reply(getLang("sellSuccess", { quantity: sellQuantity, earnings }));
              }

              if (sellType === "special" && pigFarm.special >= sellQuantity) {
                  const earnings = sellQuantity * specialPigEarnings;
                  pigFarm.special -= sellQuantity;
                  await Users.increaseMoney(message.senderID, earnings);
                  await Users.updateData(message.senderID, { pigs: pigFarm });
                  return message.reply(getLang("sellSuccess", { quantity: sellQuantity, earnings }));
              }

              return message.reply("Not enough pigs to sell.");

          case "status":
              const grownPiglets = pigFarm.piglets.filter(time => time <= Date.now());
              pigFarm.regular += grownPiglets.length;
              pigFarm.piglets = pigFarm.piglets.filter(time => time > Date.now());

              await Users.updateData(message.senderID, { pigs: pigFarm });

              return message.reply(
                  `Your farm status:\n- Regular Pigs: ${pigFarm.regular}\n- Special Pigs: ${pigFarm.special}\n- Piglets: ${pigFarm.piglets.length}`
              );

          default:
              return message.reply(getLang("invalidCommand"));
      }
  } catch (error) {
      console.error(error);
      return message.reply("An error occurred while managing your pig farm.");
  }
}

export default {
  config,
  langData,
  onCall
};
///!nuoilon start: Bắt đầu trang trại với 2 con lợn thường.
///!nuoilon buy <quantity>: Mua số lượng lợn thường chỉ định.
///!nuoilon breed: Sử dụng 2 lợn thường để phối giống, tạo ra lợn con.
///!nuoilon sell <regular/special> <quantity>: Bán lợn thường hoặc lợn "Minbeo".
///!nuoilon status: Kiểm tra số lợn hiện có, bao gồm lợn con chưa lớn.
///prefix cho sử dụng lệnh :33 cấm phá credit
