'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');

const {
  log,
  sleep,
  ask
} = require('../utils/theme');

// =========================
// PUPPETEER
// =========================
let puppeteer;

try {
  puppeteer = require('puppeteer-extra');
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  puppeteer.use(StealthPlugin());
} catch (e) {
  log.error('Thieu puppeteer! Chay: npm install puppeteer-extra puppeteer-extra-plugin-stealth');
  process.exit(1);
}

// =========================
// DUONG DAN FILE
// =========================
const NAME_FILE = path.join(__dirname, '..', 'name.txt');
const TOKEN_FILE = path.join(__dirname, '..', 'token.txt');
const GEN_DATA_FILE = path.join(__dirname, '..', 'gen.txt');

// =========================
// CONFIG
// =========================
const TEMPMAIL_BASE = 'https://api.tempmail.lol';

// Profile Chrome that (da dang nhap) - chay song song voi Chrome dang mo
const USER_DATA_DIR = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
const PROFILE_DIR = 'Profile 10'; 
const CLONED_DIR = path.join(os.homedir(), '.discord-gen-clone-profile'); // Thu muc clone de chay song song

// =========================
// HELPERS
// =========================
function randomString(len, chars) {
  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var result = '';
  for (var i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function loadLines(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, 'utf-8')
      .split(/\r?\n/)
      .map(function(l) { return l.trim(); })
      .filter(function(l) { return l.length > 0; });
  } catch (e) {
    return [];
  }
}

async function humanDelay(min, max) {
  if (min === undefined) min = 2;
  if (max === undefined) max = 5;
  var ms = randomInt(min * 1000, max * 1000);
  await sleep(ms);
}

// =========================
// PASSWORD
// =========================
function generatePassword() {
  var words = ['Nxght', 'V0id', 'Cyb3r', 'G1itch', 'Sy5tem', '0perat0r', 'Kenz', 'Dark', 'N3on'];
  return randomChoice(words) + '!' + randomInt(1000, 9999);
}

// =========================
// USERNAME
// =========================
function generateUsername(names) {
  var baseName;
  if (names && names.length > 0) {
    baseName = randomChoice(names);
  } else {
    var defaultNames = [
      'kenzshopgen', 'kenzcustomer', 'AliucordCustomer', 'ilovekenz',
      'iloveAliucord', 'kenzgen', 'kenz', 'aliucord', 'etipuf',
      'whynot', 'root', 'user', 'windows',
    ];
    baseName = randomChoice(defaultNames);
  }
  var suffixNumbers = randomString(randomInt(3, 5), '0123456789');
  var styles = [
    baseName + '_' + suffixNumbers,
    'xX_' + baseName + '_' + suffixNumbers + '_Xx',
    baseName + '.' + suffixNumbers,
    baseName + suffixNumbers,
  ];
  return randomChoice(styles);
}

// =========================
// DOB
// =========================
function generateDOB() {
  var year = randomInt(1985, 2004);
  var month = randomInt(1, 12);
  var day = randomInt(1, 28);
  return {
    year: year,
    month: month,
    day: day,
    full: year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0')
  };
}

// =========================
// USER AGENTS
// =========================
var USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
];

function getRandomUA() {
  return randomChoice(USER_AGENTS);
}

// =========================
// PING
// =========================
function beep() {
  process.stdout.write('\x07');
}

// =========================
// REACT SET VALUE
// =========================
async function reactSetValue(page, selector, value) {
  try {
    await page.evaluate(function(sel, val) {
      var el = document.querySelector(sel);
      if (el) {
        var nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        ).set;
        nativeSetter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, selector, value);
    return true;
  } catch (e) {
    return false;
  }
}

// =========================
// TOKEN EXTRACTION
// =========================
async function extractToken(page) {
  var token = await page.evaluate(function() {
    try {
      var t = localStorage.getItem('token');
      if (t) {
        var clean = t.replace(/"/g, '').trim();
        if (clean.split('.').length === 3) return clean;
      }
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        var val = localStorage.getItem(key);
        if (val && val.length > 50) {
          var clean2 = val.replace(/"/g, '').trim();
          if (clean2.split('.').length === 3) return clean2;
        }
      }
    } catch(e) {}
    return null;
  });

  if (token) {
    log.success('[+] Token (localStorage): ' + token.substring(0, 25) + '...');
    return token;
  }

  try {
    var wpToken = await page.evaluate(function() {
      try {
        var t;
        var wp = window.webpackChunkdiscord_app;
        if (wp) {
          wp.push([[''], {}, function(e) {
            for (var c in e.c) {
              var m = e.c[c]?.exports?.default;
              if (m && m.getToken) t = m.getToken();
            }
          }]);
        }
        return t || null;
      } catch(e) {}
      return null;
    });

    if (wpToken && wpToken.length > 50) {
      log.success('[+] Token (webpack): ' + wpToken.substring(0, 25) + '...');
      return wpToken.replace(/"/g, '').trim();
    }
  } catch(e) {}

  return null;
}

// =========================
// CHECK TOKEN VERIFIED
// =========================
async function checkTokenVerified(token) {
  try {
    return new Promise(function(resolve) {
      var req = https.get('https://discord.com/api/v9/users/@me', {
        headers: { 'Authorization': token },
        timeout: 10000,
      }, function(res) {
        var data = '';
        res.on('data', function(chunk) { data += chunk; });
        res.on('end', function() {
          try {
            var json = JSON.parse(data);
            resolve({ verified: json.verified === true, data: json });
          } catch (e) {
            resolve({ verified: false, data: null });
          }
        });
      });
      req.on('error', function() {
        resolve({ verified: false, data: null });
      });
      req.setTimeout(10000, function() {
        req.destroy();
        resolve({ verified: false, data: null });
      });
    });
  } catch (e) {
    return { verified: false, data: null };
  }
}

// =========================
// ANTI DETECTION
// =========================
async function applyAntiDetection(page) {
  await page.evaluateOnNewDocument(function() {
    Object.defineProperty(navigator, 'webdriver', { get: function() { return undefined; } });
    Object.defineProperty(navigator, 'plugins', { get: function() { return [1, 2, 3, 4, 5]; } });
    Object.defineProperty(navigator, 'languages', { get: function() { return ['en-US', 'en']; } });
    window.chrome = { runtime: {}, loadTimes: function() {}, csi: function() {}, app: {} };
    var originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = function(parameters) {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: Notification.permission });
      }
      return originalQuery(parameters);
    };
  });
}

// =========================
// FINGERPRINT
// =========================
async function applyRandomFingerprint(page) {
  await page.evaluateOnNewDocument(function() {
    var originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type) {
      var result = originalToDataURL.apply(this, arguments);
      if (Math.random() < 0.3) {
        return result.replace(/[a-f0-9]{1,2}/g, function(m) {
          if (Math.random() < 0.05) {
            var val = parseInt(m, 16);
            return Math.max(0, Math.min(255, val + (Math.random() < 0.5 ? 1 : -1))).toString(16).padStart(2, '0');
          }
          return m;
        });
      }
      return result;
    };
  });
}

// =========================
// HTTP HELPER
// =========================
function httpRequest(options, postData) {
  if (postData === undefined) postData = null;
  return new Promise(function(resolve, reject) {
    var opts = {
      hostname: options.hostname,
      port: options.port || 443,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: options.timeout || 15000,
      rejectUnauthorized: false,
    };

    if (options.headers) {
      for (var k in options.headers) {
        if (options.headers.hasOwnProperty(k)) {
          opts.headers[k] = options.headers[k];
        }
      }
    }

    var req = https.request(opts, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    req.on('error', function(err) { reject(err); });
    req.setTimeout(options.timeout || 15000, function() {
      req.destroy();
      reject(new Error('Timeout'));
    });
    if (postData) req.write(postData);
    req.end();
  });
}



// =========================
// TEMPMAIL.LOL API
// =========================
function tempmailRequest(method, path, body) {
  return new Promise(function(resolve) {
    var options = {
      hostname: 'api.tempmail.lol',
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          var json = JSON.parse(data);
          resolve({ success: true, data: json, status: res.statusCode });
        } catch (e) {
          resolve({ success: true, data: data, status: res.statusCode });
        }
      });
    });

    req.on('error', function(e) {
      resolve({ success: false, error: e.message });
    });
    req.setTimeout(15000, function() {
      req.destroy();
      resolve({ success: false, error: 'timeout' });
    });
    if (body) req.write(body);
    req.end();
  });
}

async function createTempInbox() {
  var result = await tempmailRequest('GET', '/generate');
  if (result.success && result.data && result.data.address && result.data.token) {
    return { success: true, address: result.data.address, token: result.data.token };
  }
  return { success: false, error: 'Failed to create inbox' };
}

async function checkTempInbox(token) {
  var result = await tempmailRequest('GET', '/auth/' + token);
  if (result.success && result.data) {
    return { success: true, emails: result.data.emails || [], expired: result.data.expired === true };
  }
  return { success: false, error: result.error, emails: [], expired: false };
}

function extractDiscordVerifyLink(emailData) {
  if (!emailData) return null;
  
  var body = (emailData.body || '') + ' ' + (emailData.html || '');
  var cleaned = body.replace(/&amp;/g, '&').replace(/=\r\n/g, '').replace(/=\n/g, '');
  
  var patterns = [
    /https?:\/\/click\.discord\.com\/ls\/click\?[^\s"'<>\])]+/g,
    /https?:\/\/discord\.com\/verify\?[^\s"'<>\])]+/g,
    /https?:\/\/discord\.com\/register\?[^\s"'<>\])]+/g,
  ];
  
  for (var i = 0; i < patterns.length; i++) {
    var match = cleaned.match(patterns[i]);
    if (match) return match[0].trim();
  }
  
  return null;
}

// =========================
// OPEN REGISTER TAB
// =========================
async function openRegisterTab(browser, email, username, password, dob) {
  var pages = await browser.pages();
  var firstPage = pages[0];

  await firstPage.evaluate(function() {
    window.open('https://discord.com/register', '_blank');
  });

  await humanDelay(2, 4);

  var allPages = await browser.pages();
  var regPage = allPages[allPages.length - 1];

  if (!regPage || regPage === firstPage) {
    log.error('[-] Khong the tao tab register!');
    return null;
  }

  await applyAntiDetection(regPage);
  await applyRandomFingerprint(regPage);

  var ua = getRandomUA();
  await regPage.setUserAgent(ua);
  
  var widths = [1280, 1366, 1440, 1536, 1600, 1920];
  var heights = [720, 768, 800, 864, 900, 1080];
  await regPage.setViewport({ 
    width: randomChoice(widths), 
    height: randomChoice(heights) 
  });

  try {
    var client = await regPage.target().createCDPSession();
    await client.send('Network.clearBrowserCookies').catch(function() {});
    await client.send('Network.clearBrowserCache').catch(function() {});
  } catch (e) {}

  regPage.on('pageerror', function() {});
  regPage.on('console', function() {});

  log.info('[~] Dang cho Discord register load...');

  try {
    await regPage.waitForSelector('input[name="email"]', { timeout: 20000 });
  } catch (e) {
    try {
      await regPage.goto('https://discord.com/register', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await humanDelay(2, 4);
    } catch (e2) {
      log.warn('[!] Loi load register: ' + e2.message);
    }
  }

  try {
    await regPage.bringToFront();
  } catch (e) {}

  var scrollAmount = randomInt(50, 150);
  await regPage.evaluate(function(y) {
    window.scrollBy(0, y);
  }, scrollAmount);

  // EMAIL
  log.info('[~] Dang dien email...');
  await reactSetValue(regPage, 'input[name="email"]', email);
  log.success('[+] Email OK');
  await humanDelay(2, 3);

  // USERNAME
  log.info('[~] Dang dien username...');
  await reactSetValue(regPage, 'input[name="username"]', username);
  try {
    await reactSetValue(regPage, 'input[name="global_name"]', username);
  } catch (e) {}
  log.success('[+] Username OK');
  await humanDelay(2, 3);

  // PASSWORD
  log.info('[~] Dang dien password...');
  await reactSetValue(regPage, 'input[name="password"]', password);
  log.success('[+] Password OK');
  await humanDelay(2, 3);

  // DOB
  log.info('[~] Dang chon ngay sinh...');
  await regPage.evaluate(function(d) {
    var setSelect = function(sel, val) {
      var el = document.querySelector(sel);
      if (el) {
        var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
        nativeSetter.call(el, String(val));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };
    setSelect('select[aria-label*="Month"]', d.month);
    setSelect('select[aria-label*="Day"]', d.day);
    setSelect('select[aria-label*="Year"]', d.year);
  }, dob);
  log.info('[+] DOB: ' + dob.day + '/' + dob.month + '/' + dob.year);

  try { await regPage.focus('input[name="password"]'); } catch (e) {}

  log.info('');
  log.info('='.repeat(55));
  log.info('  🔷 TAB REGISTER READY');
  log.info('  👉 GIAI CAPTCHA + NHAN "Continue"');
  log.info('='.repeat(55));
  log.info('  📧 ' + email);
  log.info('  👤 ' + username);
  log.info('  🔑 ' + password);
  log.info('  📅 ' + dob.day + '/' + dob.month + '/' + dob.year);
  log.info('='.repeat(55));
  log.info('');

  try {
    await regPage.bringToFront();
  } catch (e) {}

  return regPage;
}

// =========================
// OPEN VERIFY LINK
// =========================
async function openVerificationLink(browser, verifyUrl) {
  log.info('[~] Dang mo link xac thuc...');
  try {
    var pages = await browser.pages();
    var firstPage = pages[0];
    await firstPage.evaluate(function(url) {
      window.open(url, '_blank');
    }, verifyUrl);
    log.success('[+] Da mo link xac thuc!');
    await humanDelay(4, 6);
    return true;
  } catch (e) {
    log.warn('[-] Loi mo link: ' + e.message);
    log.info('  📋 Link: ' + verifyUrl);
    return false;
  }
}

// =========================
// GENERATE 1 ACCOUNT
// =========================
async function generateOneAccount(browser, rl, index, total, names) {
  log.info('▶ Tai khoan ' + index + '/' + total);
  log.info('');

  // === Buoc 1: Tao TempMail inbox qua API ===
  log.info('[~] Dang tao TempMail inbox qua API...');
  var inboxResult = await createTempInbox();
  if (!inboxResult.success) {
    log.error('[-] KHONG THE TAO TEMPMAIL INBOX: ' + inboxResult.error);
    return null;
  }
  var tempEmail = inboxResult.address;
  var tempToken = inboxResult.token;
  log.success('[+] TempMail: ' + tempEmail);

  var password = generatePassword();
  var username = generateUsername(names);
  var dob = generateDOB();

  // === Buoc 2: Mo tab Discord Register ===
  var regPage = await openRegisterTab(browser, tempEmail, username, password, dob);
  if (!regPage) {
    log.error('[-] KHONG THE MO TAB REGISTER');
    return null;
  }

  // === Buoc 4: Cho nguoi dung giai CAPTCHA ===
  log.info('');
  log.warn('⚠  NHAP CAPTCHA THU CONG & NHAN "Continue"');
  log.info('  (Toi da 120 giay cho...)');
  log.info('');

  var registered = false;
  var currentUrl = regPage.url();
  
  try {
    await regPage.waitForFunction(function(oldUrl) {
      return window.location.href !== oldUrl;
    }, { timeout: 120000 }, currentUrl);
    registered = true;
    log.success('[+] Da hoan tat dang ky! Trang da chuyen huong.');
  } catch (e) {
    log.warn('[!] Het thoi gian cho. Kiem tra trang hien tai...');
  }

  if (registered) {
    await humanDelay(3, 5);
    var finalUrl = regPage.url();
    log.info('[~] URL hien tai: ' + finalUrl);

    if (finalUrl.includes('/app') || finalUrl.includes('/channels')) {
      log.success('[+] Da vao Discord thanh cong!');
    } else if (finalUrl.includes('verify')) {
      log.info('[~] Dang o trang verify, can xac thuc email...');
    }
  }

  // === Buoc 4b: Doi email verify tu TempMail API (tu dong polling) ===
  log.info('');
  log.info('[~] Dang doi email xac thuc tu TempMail API...');
  var verifyLink = await pollTempMailForVerifyLink(tempToken, rl);

  // === Buoc 6: Mo link verify ===
  if (verifyLink) {
    log.info('');
    await openVerificationLink(browser, verifyLink);
    await humanDelay(10, 15);
    
    try {
      var allPages = await browser.pages();
      for (var i = 0; i < allPages.length; i++) {
        var url = allPages[i].url();
        if (url.includes('discord.com/verify') || url.includes('click.discord.com')) {
          await allPages[i].close().catch(function() {});
          log.info('[~] Da dong tab verify');
          break;
        }
      }
    } catch (e) {}
  } else {
    log.warn('[-] Bo qua buoc xac thuc email.');
  }

  // === Buoc 7: Trich xuat token ===
  log.info('');
  log.info('[~] Dang trich xuat token...');
    
  var finalToken = null;

  await humanDelay(3, 5);

  var allPages2 = await browser.pages();
  for (var i = 0; i < allPages2.length; i++) {
    try {
      var pUrl = allPages2[i].url();
      if (pUrl.includes('discord.com')) {
        log.info('[~] Kiem tra token o tab: ' + pUrl.substring(0, 60) + '...');
        var t = await extractToken(allPages2[i]);
        if (t) {
          finalToken = t;
          break;
        }
      }
    } catch (e) {}
  }

  if (!finalToken) {
    log.info('[~] Chua tim thay token, cho them 5 giay...');
    await humanDelay(4, 6);
    
    for (var j = 0; j < allPages2.length; j++) {
      try {
        var pUrl2 = allPages2[j].url();
        if (pUrl2.includes('discord.com')) {
          var t2 = await extractToken(allPages2[j]);
          if (t2) {
            finalToken = t2;
            break;
          }
        }
      } catch (e) {}
    }
  }

  // === Buoc 8: Kiem tra token voi Discord API ===
  var verified = false;
  var userData = null;

  if (finalToken) {
    log.info('[~] Kiem tra token voi Discord API...');
    var checkResult = await checkTokenVerified(finalToken);
    verified = checkResult.verified;
    userData = checkResult.data;

    if (verified) {
      log.success('[+] TOKEN HOP LE & DA XAC THUC EMAIL!');
    } else {
      log.warn('[!] Token tim thay nhung chua xac thuc email.');
    }

    if (userData) {
      log.info('  👤 ID: ' + userData.id);
      log.info('  👤 Username: ' + userData.username);
      log.info('  📧 Email: ' + (userData.email || 'N/A'));
    }
  } else {
    log.error('[-] KHONG TRICH XUAT DUOC TOKEN.');
    
    var manualToken = await ask(rl, '  👉 Nhap token thu cong (Enter de bo qua): ');
    if (manualToken && manualToken.trim().length > 50) {
      finalToken = manualToken.trim();
      var checkResult2 = await checkTokenVerified(finalToken);
      verified = checkResult2.verified;
      userData = checkResult2.data;
    }
  }

  // === Buoc 9: Luu thong tin ===
  if (finalToken) {
    var timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    var logLine = 'TempEmail: ' + tempEmail + ' | Token: ' + finalToken + ' | Username: ' + username + ' | Password: ' + password + ' | Verified: ' + verified + ' | Created: ' + timestamp;

    try {
      fs.appendFileSync(TOKEN_FILE, finalToken + '\n', 'utf-8');
      log.success('[+] Token da duoc luu vao ' + TOKEN_FILE);
    } catch (e) {
      log.error('[-] Loi ghi token file: ' + e.message);
    }

    try {
      fs.appendFileSync(GEN_DATA_FILE, logLine + '\n', 'utf-8');
      log.success('[+] Thong tin tai khoan da duoc luu vao ' + GEN_DATA_FILE);
    } catch (e) {
      log.error('[-] Loi ghi gen data: ' + e.message);
    }

    log.info('');
    log.info('='.repeat(60));
    log.info('  ✅ THONG TIN TAI KHOAN THANH CONG');
    log.info('='.repeat(60));
    log.info('  📧 TempEmail:  ' + tempEmail);
    log.info('  👤 Username:   ' + username);
    log.info('  🔑 Password:   ' + password);
    log.info('  🎫 Token:      ' + finalToken.substring(0, 30) + '...');
    log.info('  ✅ Verified:   ' + verified);
    log.info('='.repeat(60));
    log.info('');

    return { tempEmail: tempEmail, username: username, password: password, token: finalToken, verified: verified, userData: userData };
  }

  log.error('[-] KHONG CO TOKEN - TAI KHOAN THAT BAI');
  return null;
}

// =========================
// RUN COMMAND
// =========================
async function run(rl) {
  log.info('');
  log.info('╔' + '='.repeat(58) + '╗');
  log.info('║        🔷 DISCORD ACCOUNT GENERATOR v3.0        ║');
  log.info('║        TempMail API + Token Extract             ║');
  log.info('╚' + '='.repeat(58) + '╝');
  log.info('');

  if (!puppeteer) {
    log.error('[-] Thieu puppeteer! Chay: npm install puppeteer-extra puppeteer-extra-plugin-stealth');
    return;
  }

  var names = loadLines(NAME_FILE);
  if (names.length > 0) {
    log.info('[+] Da load ' + names.length + ' names tu ' + NAME_FILE);
  } else {
    log.info('[~] Khong co name.txt, dung default names');
  }

  var countStr = await ask(rl, '  🔢 So luong tai khoan can tao (mac dinh 1): ');
  var count = parseInt(countStr) || 1;
  log.info('[~] Se tao ' + count + ' tai khoan');
  log.info('');

  log.info('[~] Dang khoi dong browser voi profile that (da dang nhap)...');
  log.info('  User data dir: ' + USER_DATA_DIR);
  log.info('  Profile: ' + PROFILE_DIR);
  log.info('  Clone dir: ' + CLONED_DIR);

  // Clone profile de chay song song voi Chrome dang mo
  try {
    const fse = require('fs-extra');
    log.info('[~] Dang clone profile (co the mat vai giay)...');
    await fse.copy(
      path.join(USER_DATA_DIR, PROFILE_DIR),
      path.join(CLONED_DIR, PROFILE_DIR),
      {
        overwrite: true,
        filter: (src) => {
          const name = path.basename(src);
          return !['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'].includes(name);
        }
      }
    );
    // Copy Local State de Chrome nhan dien profile
    await fse.copy(
      path.join(USER_DATA_DIR, 'Local State'),
      path.join(CLONED_DIR, 'Local State'),
      { overwrite: true }
    ).catch(() => {});
    log.success('[+] Clone profile thanh cong!');
  } catch (e) {
    log.warn('[!] Loi clone profile: ' + e.message);
    log.warn('[!] Vui long chay: npm install fs-extra');
    process.exit(1);
  }

  var browser = await puppeteer.launch({
    headless: false,
    userDataDir: CLONED_DIR,
    args: [
      `--profile-directory=${PROFILE_DIR}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process,Translate',
      '--disable-notifications',
      '--disable-save-password-bubble',
      '--disable-sync',
      '--lang=vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.',
    ],
    defaultViewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });

  log.success('[+] Browser da duoc khoi dong!');
  log.info('[~] Profile se duoc luu lai cho lan sau');
  log.info('');

  var results = [];
  for (var i = 1; i <= count; i++) {
    log.info('');
    log.info('-'.repeat(60));
    
    var result = await generateOneAccount(browser, rl, i, count, names);
    if (result) {
      results.push(result);
    } else {
      log.error('[-] Tai khoan ' + i + '/' + count + ' THAT BAI');
    }

    if (i < count) {
      log.info('');
      log.info('[~] Cho 5-10 giay truoc khi tao tai khoan tiep theo...');
      await humanDelay(5, 10);
    }
  }

  log.info('');
  log.info('='.repeat(60));
  log.info('  📊 TONG KET');
  log.info('='.repeat(60));
 log.info('  ✅ Thanh cong: ' + results.length + '/' + count);
  log.info('  ❌ That bai:   ' + (count - results.length) + '/' + count);

  if (results.length > 0) {
    var verifiedCount = 0;
    for (var j = 0; j < results.length; j++) {
      if (results[j].verified) verifiedCount++;
    }
    log.info('  📧 Da verify:  ' + verifiedCount + '/' + results.length);

    log.info('');
    log.info('  📁 Du lieu duoc luu tai:');
    log.info('     - Token:    ' + TOKEN_FILE);
    log.info('     - Chi tiet: ' + GEN_DATA_FILE);
  }
  log.info('='.repeat(60));
  log.info('');

  // Giu browser mo cho nguoi dung kiem tra
  var keepOpen = await ask(rl, '  🟢 Giu browser mo? (y/N): ');

  if (keepOpen.toLowerCase() !== 'y') {
    try {
      await browser.close();
    } catch (e) {}
    log.info('[~] Da dong browser');
  } else {
    log.info('[~] Browser van mo. Dong bang tay khi xong.');
  }

  beep();
}

// =========================
// EXPORTS
// =========================
module.exports = { run: run };