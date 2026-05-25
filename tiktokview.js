'use strict';

process.stdout.setEncoding('utf8');
process.stdin.setEncoding('utf8');

if (process.platform === 'win32') {
  try {
    require('child_process').execSync('chcp 65001 > nul');
  } catch {}
}

const https = require('https');
const http  = require('http');
const crypto = require('crypto');
const { log, sleep, ask } = require('../utils/theme');

class Signature {
  constructor(params, data, cookies) {
    this.params  = params  || '';
    this.data    = data    || '';
    this.cookies = cookies || '';
  }

  hash(str) {
    return crypto.createHash('md5').update(str).digest('hex');
  }

  calcGorgon() {
    let gorgon = this.hash(this.params);
    gorgon += this.data    ? this.hash(this.data)    : '0'.repeat(32);
    gorgon += this.cookies ? this.hash(this.cookies) : '0'.repeat(32);
    gorgon += '0'.repeat(32);
    return gorgon;
  }

  getValue() {
    return this.encrypt(this.calcGorgon());
  }

  encrypt(data) {
    const unix = Math.floor(Date.now() / 1000);
    const len  = 0x14;

    const key = [
      0xDF, 0x77, 0xB9, 0x40, 0xB9, 0x9B, 0x84, 0x83,
      0xD1, 0xB9, 0xCB, 0xD1, 0xF7, 0xC2, 0xB9, 0x85,
      0xC3, 0xD0, 0xFB, 0xC3,
    ];

    const paramList = [];

    for (let i = 0; i < 12; i += 4) {
      const temp = data.slice(8 * i, 8 * (i + 1));
      for (let j = 0; j < 4; j++) {
        paramList.push(parseInt(temp.slice(j * 2, (j + 1) * 2), 16));
      }
    }

    paramList.push(0x0, 0x6, 0xB, 0x1C);

    paramList.push((unix & 0xFF000000) >>> 24);
    paramList.push((unix & 0x00FF0000) >>> 16);
    paramList.push((unix & 0x0000FF00) >>> 8);
    paramList.push((unix & 0x000000FF) >>> 0);

    const eorList = [];
    for (let i = 0; i < paramList.length; i++) {
      eorList.push(paramList[i] ^ key[i]);
    }

    for (let i = 0; i < len; i++) {
      const C = this.reverse(eorList[i]);
      const D = eorList[(i + 1) % len];
      const E = C ^ D;
      const F = this.rbit(E);
      eorList[i] = ((F ^ 0xFFFFFFFF) ^ len) & 0xFF;
    }

    let result = '';
    for (const p of eorList) {
      result += this.hexString(p);
    }

    return {
      'X-Gorgon':  '840280416000' + result,
      'X-Khronos': String(unix),
    };
  }

  rbit(num) {
    let tmp = num.toString(2).padStart(8, '0');
    return parseInt(tmp.split('').reverse().join(''), 2);
  }

  hexString(num) {
    return num.toString(16).padStart(2, '0');
  }

  reverse(num) {
    const tmp = this.hexString(num);
    return parseInt(tmp.slice(1) + tmp.slice(0, 1), 16);
  }
}

function extractVideoId(link) {
  return new Promise((resolve) => {

    const url = new URL(link.startsWith('http') ? link : 'https://' + link);
    const proto = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
    };

    const req = proto.request(options, (res) => {

      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location;

        const idMatch = redirectUrl.match(/\/video\/(\d+)/);
        if (idMatch) {
          resolve(idMatch[1]);
          return;
        }

        extractVideoId(redirectUrl).then(resolve);
        res.resume();
        return;
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
     
        const urlMatch = link.match(/\/video\/(\d+)/);
        if (urlMatch) { resolve(urlMatch[1]); return; }

      
        const htmlMatch = data.match(/"video":\{"id":"(\d+)"/);
        if (htmlMatch) { resolve(htmlMatch[1]); return; }

        const htmlMatch2 = data.match(/itemId":"(\d+)"/);
        if (htmlMatch2) { resolve(htmlMatch2[1]); return; }

        resolve(null);
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
    req.end();

  });
}

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

function randomInstallTime() {
  const start = new Date(2020, 0, 1).getTime() / 1000;
  const end   = new Date(2024, 11, 31, 23, 59, 59).getTime() / 1000;
  return Math.floor(start + Math.random() * (end - start));
}

function sendView(videoId, agent) {
  return new Promise((resolve) => {

    const sessionHex = randomHex(16);
    const sig = new Signature('', '', '').getValue();

    const bodyParams = new URLSearchParams({
      action_time: String(Math.floor(Date.now() / 1000)),
      aweme_type: '0',
      first_install_time: String(randomInstallTime()),
      item_id: videoId,
      play_delta: '1',
      tab_type: '4',
    });

    const bodyStr = bodyParams.toString();

    const commonParams = [
      'pass-region=1', 'pass-route=1',
      'language=ar',
      'version_code=17.4.0',
      'app_name=musical_ly',
      `vid=${randomHex(16)}`,
      'app_version=17.4.0',
      'carrier_region=VN',
      'channel=App%20Store',
      'mcc_mnc=45201',
      `device_id=${6900000000000000000n + BigInt(Math.floor(Math.random() * 99999999999999))}`,
      'tz_offset=25200',
      'account_region=VN',
      'sys_region=VN',
      'aid=1233',
      'residence=VN',
      'screen_width=1125',
      'uoo=1',
      `openudid=${randomHex(20)}`,
      'os_api=18',
      'os_version=14.2',
      'app_language=ar',
      'tz_name=Asia%2FHo_Chi_Minh',
      'current_region=VN',
      'device_platform=iphone',
      'build_number=174014',
      'device_type=iPhone14,6',
      `iid=${6950000000000000000n + BigInt(Math.floor(Math.random() * 99999999999999))}`,
      'idfa=00000000-0000-0000-0000-000000000000',
      'locale=ar',
      `cdid=${crypto.randomUUID()}`,
      'content_language=',
    ].join('&');

    const options = {
      hostname: 'api16-core-c-alisg.tiktokv.com',
      path: '/aweme/v1/aweme/stats/?ac=WIFI&op_region=VN',
      method: 'POST',
      agent: agent,
      headers: {
        'Host': 'api16-core-c-alisg.tiktokv.com',
        'Content-Length': String(Buffer.byteLength(bodyStr)),
        'Sdk-Version': '2',
        'Passport-Sdk-Version': '5.12.1',
        'X-Tt-Token': `01${sessionHex}0263ef2c096122cc1a97dec9cd12a6c75d81d3994668adfbb3ffca278855dd15c8056ad18161b26379bbf95d25d1f065abd5dd3a812f149ca11cf57e4b85ebac39d - 1.0.0`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'TikTok 37.0.4 rv:174014 (iPhone; iOS 14.2; ar_SA@calendar=gregorian) Cronet',
        'X-Ss-Stub': crypto.createHash('md5').update(bodyStr).digest('hex').toUpperCase(),
        'X-Tt-Store-Idc': 'alisg',
        'X-Tt-Store-Region': 'sa',
        'X-Ss-Dp': '1233',
        'X-Tt-Trace-Id': `00-${randomHex(16)}-${randomHex(8)}-01`,
        'Accept-Encoding': 'gzip, deflate',
        'X-Khronos': sig['X-Khronos'],
        'X-Gorgon': sig['X-Gorgon'],
        'X-Common-Params-V2': commonParams,
        'Cookie': `sessionid=${sessionHex}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ ok: true });
        } else {
          resolve({ ok: false });
        }
      });
    });

    req.on('error', () => resolve({ ok: false }));
    req.setTimeout(3000, () => { req.destroy(); resolve({ ok: false }); });
    req.write(bodyStr);
    req.end();

  });
}


async function run(rl) {

  try {

    console.clear();

    log.info('=== TIKTOK VIEW BOOSTER ===');
    log.info('buff view tiktok thoi\n');


    const linkInput = await ask(rl, 'Nhap link video TikTok > ');
    const link = linkInput.trim();

    if (!link) {
      log.error('Ban chua nhap link video!');
      return;
    }

    log.info('Dang lay Video ID...\n');

    let videoId = null;

   
    const urlMatch = link.match(/\/video\/(\d+)/);
    if (urlMatch) {
      videoId = urlMatch[1];
    } else {
      videoId = await extractVideoId(link);
    }

    if (!videoId) {
    
      const idInput = await ask(rl, 'Khong lay duoc ID tu link. Nhap Video ID truc tiep > ');
      videoId = idInput.trim();
      if (!videoId) {
        log.error('Khong co Video ID!');
        return;
      }
    }

    log.success(`Video ID: ${videoId}\n`);

 
    const workerInput = await ask(rl, 'So luong worker dong thoi (Enter = 50) > ');
    const WORKERS = Math.max(1, Math.min(500, parseInt(workerInput) || 50));

    console.log('');
    log.info(`Bat dau voi ${WORKERS} workers...`);
    log.info('Nhan Ctrl+C de dung.\n');

   
    const agent = new https.Agent({
      keepAlive: true,
      maxSockets: WORKERS,
      maxFreeSockets: 10,
      timeout: 5000,
    });

    let totalSuccess = 0;
    let totalFailed  = 0;
    let running = true;


    const stopHandler = () => {
      running = false;
      log.warn('\nDang dung...');
    };
    process.once('SIGINT', stopHandler);

    const startTime = Date.now();

    
    async function worker() {
      while (running) {
        const result = await sendView(videoId, agent);
        if (result.ok) {
          totalSuccess++;
       
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = (totalSuccess / (elapsed || 1)).toFixed(1);

          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(
            `  ✅ Views: ${totalSuccess} | ❌ Failed: ${totalFailed} | ⏱ ${elapsed}s | 🚀 ${rate} views/s`
          );
        } else {
          totalFailed++;
        }
      }
    }


    const workers = [];
    for (let i = 0; i < WORKERS; i++) {
      workers.push(worker());
    }

    
    await Promise.all(workers);

  
    process.removeListener('SIGINT', stopHandler);
    agent.destroy();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n');
    log.info('--- KET QUA ---');
    log.success(`Thanh cong: ${totalSuccess}`);
    log.error(`That bai: ${totalFailed}`);
    log.info(`Thoi gian: ${elapsed}s`);
    log.info(`Toc do: ${(totalSuccess / (elapsed || 1)).toFixed(1)} views/s`);

  } catch (e) {
    log.error(`Loi: ${e.message}`);
  }
}


module.exports = { run };
