var axios = require("axios");
var readline = require("readline-sync");
var moment = require("moment-timezone");
var chalk = require('chalkercli');

console.log('[ VN ] → TOOL CHẠY XU TDS V1 được viết bởi Nguyễn Đinh Tiến Dũng');

var rainbow = chalk.rainbow(`
                      ========================================================================
                    *                                                                           *
                            ██████╗░██╗░░░██╗███╗░░██╗░██████╗░██╗░░██╗░█████╗░███╗░░██╗
                            ██╔══██╗██║░░░██║████╗░██║██╔════╝░██║░██╔╝██╔══██╗████╗░██║
                            ██║░░██║██║░░░██║██╔██╗██║██║░░██╗░█████═╝░██║░░██║██╔██╗██║
                            ██║░░██║██║░░░██║██║╚████║██║░░╚██╗██╔═██╗░██║░░██║██║╚████║
                            ██████╔╝╚██████╔╝██║░╚███║╚██████╔╝██║░╚██╗╚█████╔╝██║░╚███║
                            ╚═════╝░░╚═════╝░╚═╝░░╚══╝░╚═════╝░╚═╝░░╚═╝░╚════╝░╚═╝░░╚══╝
                    *                                                                           *
                    *                           - INFO ADMIN - TOOL -                           *
                    *   → TOOL CHẠY XU TDS                                                      *
                    *   → Loại Tool: NodeJS                                                     *
                    *   → Phiên bản: V1                                                         *
                    *   → Tên: Nguyễn Đinh Tiến Dũng - Dũngkon                                  *
                    *   → FB: Nguyễn Đinh Tiến Dũng                                             *
                    *   → Website: dungkon.me                                                   *
                    *   → Website2: dungkon.id.vn                                               *
                    *   → Website bán tài khoản: taikhoanngon.shop & salemeta.net               *
                    *   → SĐT/Zalo: 0367281079                                                  *
                    *   → Email: dungnguyen200214@gmail.com                                     * 
                    *   → Github: dungkon2002                                                   *
                    *   → Ghi Chú: Tool lỗi liên hệ admin                                       *
                    *   → Lưu Ý: tool này time delay cao do web tds để thời gian countdown cao  *
                    *                                                                           *
                      =========================================================================\n`).stop();
rainbow.render();
console.log(rainbow.frame());
console.log('Nhập Token acc fb dạng EAAD6V7 ( acc fb đã cài cấu hình )');
var tokenfb = readline.question(); 
console.log('Nhập token acc tds');
var token = readline.question(); 
console.log('Nhập time delay (tính bằng mili giây, 1000 là 1s)');
var timedelay = readline.question();
   
(async () => {
    try {

        async function Dungkon() {

              console.log('===== Đang tiền hành tìm job like =====');
                var time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss");

                var results = await axios.post(
                    `https://traodoisub.com/api/?fields=like&access_token=${token}`,
                );

                for (let i = 0; i < results.data.length; i++) {
                    try {
                        var dung = results.data[i].id;
                        var rainbow = chalk.rainbow(`${results.data[i].id}`).stop();
                        rainbow.render();
                        var frame = rainbow.frame();
                        console.log(frame);

                        var data = await axios.post(
                            `https://graph.facebook.com/${results.data[i].id}/likes?method=POST&access_token=${tokenfb}`,
                        );

                        var rp = await axios.post(
                            `https://traodoisub.com/api/coin/?type=like&id=${results.data[i].id}&access_token=${token}`,
                        );

                        var rainbow = chalk.rainbow(`${rp.data.data.msg}\nTotal: ${rp.data.data.xu}`).stop();
                        rainbow.render();
                        var frame = rainbow.frame();
                        console.log(frame);
                    } catch (error) {
                        var rainbow = chalk.rainbow(`LỖI NHIỆM VỤ`).stop();
                        rainbow.render();
                        var frame = rainbow.frame();
                        console.log(frame);
                    }
            }
        }

        setInterval(Dungkon, timedelay);
    } catch (error) {
        console.error("Đã có lỗi xảy ra khi truy xuất dữ liệu:", error);
    }
})();
