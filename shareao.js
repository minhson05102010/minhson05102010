var axios = require("axios");
var readline = require("readline-sync");
var moment = require("moment-timezone");

var number = 1;
var count = 0;
var failed = 0;
var chalk = require('chalkercli');
//console.log(chalk.bold.hex("#FF0000")(`[ VN ] → TOOL SHARE ẢO V1.1 được viết bởi Nguyễn Đinh Tiến Dũng`));
console.log('[ VN ] → TOOL SHARE ẢO V1.1 được viết bởi Nguyễn Đinh Tiến Dũng')
console.log('[ EN ] → TOOL VIRTUAL SHARE V1.1 code by Nguyen Đinh Tien Dung')
var rainbow = chalk.rainbow(`
                      ==========================================
                    *                                            *
             ██████╗░██╗░░░██╗███╗░░██╗░██████╗░██╗░░██╗░█████╗░███╗░░██╗
             ██╔══██╗██║░░░██║████╗░██║██╔════╝░██║░██╔╝██╔══██╗████╗░██║
             ██║░░██║██║░░░██║██╔██╗██║██║░░██╗░█████═╝░██║░░██║██╔██╗██║
             ██║░░██║██║░░░██║██║╚████║██║░░╚██╗██╔═██╗░██║░░██║██║╚████║
             ██████╔╝╚██████╔╝██║░╚███║╚██████╔╝██║░╚██╗╚█████╔╝██║░╚███║
             ╚═════╝░░╚═════╝░╚═╝░░╚══╝░╚═════╝░╚═╝░░╚═╝░╚════╝░╚═╝░░╚══╝
                    *                                            *
                    *               - INFO ADMIN -               *
                    *   → TOOL SHARE ẢO FACEBOOK                 *
                    *   → Loại Tool: NodeJS                      *
                    *   → Phiên bản: V1.1                        *
                    *   → Tên: Nguyễn Đinh Tiến Dũng - Dũngkon   *
                    *   → FB: Nguyễn Đinh Tiến Dũng              *
                    *   → SĐT/Zalo: 0367281079                   *
                    *   → Email: dungnguyen200214@gmail.com      *
                    *   → Github: dungkon2002                    *
                    *   → Ghi Chú: Tool lỗi liên hệ admin        *
                    *                                            *
                      ==========================================\n`).stop();
rainbow.render();
var frame = rainbow.frame();
console.log(frame);
console.log('==============================================================');
var token = require('./token.json');//file token, càng nhiều token chạy càng nhanh
console.log('[ POST ID ]  → Bạn vui lòng nhập id bài viết: ');
var id = readline.question(); //mở 2 dòng này nếu muốn nhập url bài viết
console.log('[ TIME DELAY ]  → Bạn vui lòng nhập time delay (mili giây, Lưu ý để time càng thấp càng nhanh die token): ');
var timedelay = readline.question();
if (isNaN(timedelay) || timedelay == 0) {
console.log(`[ Error Time ] → Time delay không được nhỏ hơn 1 mili giây (Để càng nhỏ càng nhanh nhưng sẽ nhanh die token)`);//báo lỗi số lượng
   process.exit(0)
}
console.log('[ Number Share ] → Bạn vui lòng nhập số lượng chia sẻ: ');
var quantity = readline.question();
if (isNaN(quantity) || quantity == 0) {
console.log(`[ Error Number ] → Số lượng bạn chọn không hợp lệ`);//báo lỗi số lượng
   process.exit(0)
}
   var list_privacy = ['SELF', 'EVERYONE'];//ALL_FRIENDS, CUSTOM, FRIENDS_OF_FRIENDS
   console.log('[ CHOOSE PRIVACY ] → Bạn vui lòng chọn quyền riêng tư ( nhập số ): \n1. Không công khai\n2. Công khai');
   var select = readline.question();
   var index = parseInt(select) - 1;
if (isNaN(index) || index < 0 || index >= list_privacy.length) {
   console.log('[ FAILED PRIVACY ] → Số thứ tự bạn chọn không hợp lệ');//báo lỗi lựa chọn
   //process.exit(0)
}
   var confirm = list_privacy[index];
   console.log('==============================================================');
   console.log(`[ CONFIRM PRIVACY ] → Bạn đã chọn chế độ ${(value = confirm), value == 'SELF' ? 'không công khai' : value == 'EVERYONE' ? 'công khai': ''} bài viết`);

var headers = {
  authority: 'graph.facebook.com',
  //'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1.1 Mobile/15E148 Safari/604.1', dễ checkpoint nên ẩn :))
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  'accept-language': 'en-US,en;q=0.9',
  'sec-ch-ua': '"Google Chrome";v="107", "Chromium";v="107", "Not=A?Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': "Windows",
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1'
}

console.log(`[ TOKEN ] → Hệ thống tìm thấy ${token.length} token`);
console.log(`[ DELAY ] → Tự động chuyển đổi delay theo số lượng token`);
console.log('==============================================================');
var shareDetails = setInterval(Dungkon, timedelay);
async function Dungkon() {
  try {
  var randomtoken = token[Math.floor(Math.random() * token.length)];
  var time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss");
  var results = await axios.post(
  `https://graph.facebook.com/me/feed?link=https://m.facebook.com/${id}&published=0&access_token=${randomtoken}`,
  //{
   // privacy: { value: confirm },
   // no_story: true,
  //},
    {
      headers: headers
    }); 
         count++;
       //console.log(count)
         var rainbow = chalk.rainbow(`[ ${number++} ] → ${results.data.id} || TIME: ${time} || DŨNGKON || [ SUCCESS ]`).stop();
rainbow.render();
var frame = rainbow.frame();
console.log(frame);
         //console.log(`[ ${number++} ] → ${results.data.id} || TIME: ${time} || [ SUCCESS ]`)
        if (count + failed >= quantity) {
          console.log(`[ SUCCESS ] → Đã hoàn thành ${quantity} chia sẻ bạn yêu cầu || ${time} || SUCCESS: ${count} || ERROR: ${failed}`);
          clearInterval(shareDetails);
          }
      } catch(error) {
          failed++;
        //console.log(error)
    console.log('==============================================================');
          console.log(`[ X ] → TOKEN: ${randomtoken} || ${error.response.data.error.message} || TIME: ${time} || [ ERROR ]`);
    console.log('==============================================================');
      }
    }
setTimeout(() => {
clearInterval(shareDetails);
}, quantity * timedelay/token.length);