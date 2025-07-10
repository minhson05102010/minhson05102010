const express = require('express');
const share = require('./shareao.js');
const { spawn } = require('child_process');
const app = express();


app.set('port', (process.env.PORT || 8088));
app.get('/', function (req, res) {
  res.send('Tools Share Ảo By Dũngkon');

}).listen(app.get('port'), function () {
  console.log('[ PORT ] → Máy chủ đang chạy trên PORT', app.get('port'), '\n[ START ] → TOOL SHARE ẢO FACEBOOK BẮT ĐẦU CHẠY');
  console.log('==============================================================');
});