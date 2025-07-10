var readline = require("readline-sync");
var chalk = require('chalkercli');

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
                    *   → Website bán tài khoản: salemeta.net                                   *
                    *   → SĐT/Zalo: 0367281079                                                  *
                    *   → Email: dungnguyen200214@gmail.com                                     * 
                    *   → Github: dungkon2002                                                   *
                    *   → Ghi Chú: Tool lỗi liên hệ admin                                       *
                    *   → Lưu Ý: tool này time delay cao do web tds để thời gian countdown cao  *
                    *                                                                           *
                      =========================================================================\n`).stop();
rainbow.render();
var frame = rainbow.frame();
console.log(frame);

(async () => {
  
    try {
        
            console.log('==============================================================');
            console.log('[ MENU ] → Vui lòng lựa chọn job bạn cần sử dụng ( nhập số ): \n1. CHẠY JOB FOLLOW (mỗi job được +900xu)\n2. CHẠY JOB LIKE (mỗi job được +300xu)\n3. CHẠY JOB LIKE SIÊU RẺ (mỗi job được +150xu)\n4. CHẠY JOB COMMENT (mỗi job được +800xu)');
            var select = readline.question();
            switch (select) {
                case '1':
                    follow();
                    break;
                case '2':
                    like();
                    break;
                case '3':
                    likesieure();
                    break;
                case '4':
                    comment();
                    break;
            }
    } catch (error) {
        console.error("Đã có lỗi xảy ra khi truy xuất dữ liệu:", error);
        process.exit(0)
    }
})();

function follow() {
    console.clear();
    var follow = require('./follow.js');
}
function like() {
    console.clear();
    var like = require('./like.js');
}
function likesieure() {
    console.clear();
    var likesieure = require('./likesieure.js');
}
function comment() {
    console.clear();
    var comment = require('./comment.js');
}
