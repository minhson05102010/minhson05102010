import { createWriteStream } from "node:fs";
import { join } from "node:path";
import axios from "axios";

const config = {
  name: "info",
  description: "info mson bel",
  usage: "",
  cooldown: 3,
  permissions: [2],
};

let i = "『✒️』→𝗡𝗮𝗺𝗲: 𝑳𝒂̂𝒎 𝑴𝒊𝒏𝒉 𝑺𝒐̛𝒏⚔️\n『📋』→ 𝗔𝗴𝗲: 14+\n『👥』→ 𝙎𝙚𝙭: 𝑵𝒂𝒎\n『🎂』→ 𝗬𝗲𝗮𝗿 𝗢𝗳 𝗕𝗶𝗿𝘁𝗵: 05/10/2010\n『💫』→ 𝗛𝗲𝗶𝗴𝗵𝘁 / 𝗪𝗲𝗶𝗴𝗵𝗲𝗱: 1m63/45\n『💘』→𝗥𝗲𝗹𝗮𝘁𝗶𝗼𝗻𝘀𝗵𝗶𝗽𝘀: 𝑳𝒐̛̀ 𝑴𝒐̛̀ 𝑺𝒐̛̀🦖\n『🗺️』→𝗟𝗶𝘃𝗶𝗻𝗴 𝗶𝗻: 𝑯𝒂 𝑵𝒐𝒊⛪\n『🌐』→𝗖𝗼𝘂𝗻𝘁𝗿𝘆: 𝗩𝗶𝗲̣̂𝘁 𝗡𝗮𝗺 ";

async function downloadImage(url, path) {
  const response = await axios.get(url, { responseType: "stream" });
  return new Promise((resolve, reject) => {
    const writer = createWriteStream(path);
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function onCall({ message }) {
  const imagePath = join(__dirname, "temp.jpg");
  const imageUrl = "https://i.imgur.com/VqZJbPz.jpg";

  try {
    await downloadImage(imageUrl, imagePath);

    message.send({
      body: i,
      attachment: createReadStream(imagePath),
    });
  } catch (error) {
    console.error("Lỗi khi gửi tin nhắn:", error);
    message.send({ body: "Đã xảy ra lỗi khi tải ảnh." });
  }
}

export default {
  config,
  onCall,
};
