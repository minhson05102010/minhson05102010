const express = require('express');
const main = require('./main.js');
const app = express();

app.set('port', (process.env.PORT || 8080));
app.get('/', function (req, res) {
  res.send('Tools Chạy Xu TDS By Dũngkon');

}).listen(app.get('port'), function () {
  console.log('==============================================================');
});