'use strict';

/**
 * ============================================================
 * DARK GEN - DISCORD TOKEN GENERATOR
 * ============================================================
 *
 * Tính năng:
 *   - Tạo tài khoản Discord tự động
 *   - Dùng proxyium.com làm proxy ẩn danh
 *   - Dùng zemail.me nhận email + link verify
 *   - Auto verify email
 *   - Login lấy token
 *
 * YÊU CẦU:
 *   npm install puppeteer-extra puppeteer-extra-plugin-stealth puppeteer
 *
 * CHẠY:
 *   node index.js → Chọn chức năng → Nhập số lượng
 * ============================================================
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

puppeteer.use(StealthPlugin());

// ─── READLINE DUY NHẤT ────────────────────────────────────
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ✅ FIX: Dùng hàm ask riêng không bị conflict
function ask(query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer.trim());
    });
  });
}

// ─── FILE LƯU KẾT QUẢ ─────────────────────────────────────
const GEN_RESULT_FILE = path.join(__dirname, '..', 'gen.txt');

// ─── HELPERS ───────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomStr(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getTimestamp() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function log(type, msg) {
  const ts = getTimestamp();
  const prefix = `[${ts}]`;
  
  switch (type) {
    case 'info':
      console.log(`${prefix} [INFO] ${msg}`);
      break;
    case 'success':
      console.log(`${prefix} [SUCCESS] ${msg}`);
      break;
    case 'warn':
      console.log(`${prefix} [WARN] ${msg}`);
      break;
    case 'error':
      console.log(`${prefix} [ERROR] ${msg}`);
      break;
    case 'input':
      process.stdout.write(`${prefix} ${msg}`);
      break;
    default:
      console.log(`${prefix} ${msg}`);
  }
}

/**
 * Lưu kết quả vào file gen.txt
 */
function saveAccount(email, password, token, username) {
  const line = `Email: ${email} | Username: ${username} | Password: ${password} | Token: ${token}\n`;
  fs.appendFileSync(GEN_RESULT_FILE, line, 'utf-8');
  log('success', `Da luu acc vao ${GEN_RESULT_FILE}`);
}

/**
 * Tạo username theo format: Darkness_xxx hoặc Mson_xxx + số
 */
function generateUsername() {
  const prefixes = ['Darkness', 'Mson', 'Shadow', 'Night', 'Storm', 'Frost', 'Crystal', 'Phoenix'];
  const separators = ['_', '-', '.', ''];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const separator = separators[Math.floor(Math.random() * separators.length)];
  const suffix = String(Math.floor(Math.random() * 9999));
  return `${prefix}${separator}${suffix}`;
}

/**
 * Tạo password theo format: N1ght_xxx hoặc S0nz_xxx
 */
function generatePassword() {
  const base = Math.random() > 0.5 ? 'N1ght' : 'S0nz';
  const separator = ['_', '-', '!', '@', '#'][Math.floor(Math.random() * 5)];
  const suffix = randomStr(randomBetween(4, 8));
  return `${base}${separator}${suffix}`;
}

/**
 * Tạo FOB (ngày tháng năm sinh) - từ 2000 và trên 18 tuổi
 */
function generateBirthdate() {
  const year = randomBetween(1985, 2006); // 18-41 tuổi
  const month = randomBetween(1, 12);
  const day = randomBetween(1, 28);
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return {
    month: months[month - 1],
    day: String(day),
    year: String(year),
    monthIndex: month,
  };
}

/**
 * Build headers Discord
 */
function buildDiscordEmbed(page, fp) {
  return page.evaluate((fingerprint) => {
    const chromeVer = 146;
    const userAgent = navigator.userAgent;
    
    const superProps = {
      os: 'Windows',
      browser: 'Chrome',
      device: '',
      system_locale: 'en-US',
      has_client_mods: false,
      browser_user_agent: userAgent,
      browser_version: `${chromeVer}.0.0.0`,
      os_version: 10,
      referrer: '',
      referring_domain: '',
      referrer_current: '',
      referring_domain_current: '',
      release_channel: 'stable',
      client_build_number: 334384,
      client_event_source: null,
    };
    
    return {
      'x-fingerprint': fingerprint,
      'x-super-properties': Buffer.from(JSON.stringify(superProps)).toString('base64'),
      'x-discord-locale': 'en-US',
      'x-discord-timezone': 'America/Los_Angeles',
    };
  }, fp);
}

/**
 * Chọn dropdown Discord bằng keyboard
 */
async function selectDiscordDropdown(page, ariaLabel, value) {
  log('info', `Select ${ariaLabel}: ${value}`);

  try {
    // Click mở dropdown
    const opened = await page.evaluate((label) => {
      const btn = document.querySelector(`div[role="combobox"][aria-label="${label}"]`);
      if (!btn) return false;
      btn.click();
      return true;
    }, ariaLabel);

    if (!opened) {
      log('warn', `Khong tim thay dropdown ${ariaLabel}, thu click bang text`);
      // Thử click bằng text
      await page.evaluate((label) => {
        const allDivs = document.querySelectorAll('div[role="combobox"]');
        for (const div of allDivs) {
          if (div.textContent.includes(label)) {
            div.click();
            return;
          }
        }
      }, ariaLabel);
      await sleep(500);
    }

    await sleep(800);

    // Đợi listbox hiện
    await page.waitForSelector('[role="listbox"]', { timeout: 5000 }).catch(() => {
      log('warn', 'Listbox khong xuat hien');
    });
    await sleep(500);

    // Tìm option bằng keyboard navigation
    let found = false;
    let attempts = 0;
    const maxAttempts = 50;

    while (!found && attempts < maxAttempts) {
      const result = await page.evaluate((searchValue) => {
        const options = document.querySelectorAll('[role="option"]');
        for (const opt of options) {
          const text = opt.textContent.trim();
          if (text === searchValue || text.startsWith(searchValue)) {
            opt.click();
            return { found: true, text };
          }
        }
        return { found: false, count: options.length };
      }, value);

      if (result.found) {
        found = true;
        log('success', `Da chon ${ariaLabel}: ${result.text}`);
      } else {
        await page.keyboard.press('ArrowDown');
        await sleep(150);
        attempts++;
      }
    }

    if (!found) {
      log('warn', `Khong tim thay ${value} cho ${ariaLabel}`);
    }

    await sleep(500);
    return found;
  } catch (err) {
    log('error', `Loi select ${ariaLabel}: ${err.message}`);
    return false;
  }
}

/**
 * Lấy email từ zemail.me với retry
 */
async function getEmailFromZemail(page) {
  log('info', '[Zemail] Dang lay email...');
  
  try {
    await sleep(3000);
    
    // Refresh để chắc chắn
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await sleep(5000);

    const email = await page.evaluate(() => {
      // Tìm div chứa text @
      const elements = document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6');
      
      for (const el of elements) {
        const text = el.textContent.trim();
        // Email pattern: xxx@xxx.xxx
        if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(text)) {
          return text;
        }
      }
      
      // Tìm trong input
      const inputs = document.querySelectorAll('input[type="email"], input[placeholder*="email" i]');
      for (const inp of inputs) {
        const val = inp.value;
        if (val && val.includes('@')) return val;
      }
      
      return null;
    });

    if (email) {
      log('success', `Email: ${email}`);
      return email;
    }

    // Thử lần 2
    log('info', '[Zemail] Thu lai lan 2...');
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await sleep(5000);

    const email2 = await page.evaluate(() => {
      const body = document.body.innerText;
      const match = body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      return match ? match[0] : null;
    });

    if (email2) {
      log('success', `Email: ${email2}`);
      return email2;
    }

    log('warn', 'Khong lay duoc email tu zemail');
    return null;
  } catch (err) {
    log('error', `Loi lay email: ${err.message}`);
    return null;
  }
}

/**
 * Lấy link verify từ zemail.me
 */
async function getVerifyLinkFromZemail(page, maxWaitSeconds = 120) {
  log('info', `[Zemail] Dang cho email verify (toi da ${maxWaitSeconds}s)...`);

  for (let i = 0; i < maxWaitSeconds; i++) {
    // Refresh mỗi 15s
    if (i > 0 && i % 15 === 0) {
      log('info', `[Zemail] Da cho ${i}s, refresh...`);
      try {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        await sleep(3000);
      } catch { }
    }

    try {
      const link = await page.evaluate(() => {
        const body = document.body.innerText;
        
        // Pattern 1: Link verify Discord đầy đủ
        const match1 = body.match(/https:\/\/discord\.com\/verify[^\s"'<>)\]]*/);
        if (match1) return match1[0];

        // Pattern 2: Link /verify#token=...
        const match2 = body.match(/\/verify#token=[^\s"'<>)\]]*/);
        if (match2) return `https://discord.com${match2[0]}`;

        // Pattern 3: Link trong href
        const links = document.querySelectorAll('a[href*="discord.com/verify"], a[href*="/verify#token"]');
        for (const link of links) {
          if (link.href) return link.href;
        }

        // Pattern 4: Token verify
        const match3 = body.match(/token=([a-zA-Z0-9_\-.]{20,})/);
        if (match3) return `https://discord.com/verify#token=${match3[1]}`;

        // Pattern 5: eyJ... (base64 token)
        const match4 = body.match(/eyJ[a-zA-Z0-9_\-.]{20,}\.[a-zA-Z0-9_\-.]{10,}\.[a-zA-Z0-9_\-.]{10,}/);
        if (match4) return `https://discord.com/verify#token=${match4[0]}`;

        return null;
      });

      if (link) {
        log('success', `Link verify: ${link.substring(0, 80)}...`);
        return link;
      }
    } catch (err) {
      log('warn', `Loi tim link: ${err.message}`);
    }

    // Check progress mỗi 30s
    if (i % 30 === 0 && i > 0) {
      log('info', `[Zemail] Van dang cho... (${i}s)`);
    }

    await sleep(1000);
  }

  log('warn', `Khong tim thay link verify sau ${maxWaitSeconds}s`);
  return null;
}

/**
 * Mở proxyium và điều hướng đến Discord register
 */
async function openDiscordViaProxyium(browser) {
  log('info', '[Proxyium] Dang mo proxyium.com...');
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

  // Inject script chống phát hiện
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });

  // Vào proxyium
  await page.goto('https://proxyium.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  }).catch(() => {
    log('warn', '[Proxyium] Timeout load trang, thu lai...');
  });
  
  await sleep(3000);

  // Nhập URL Discord register
  const registerUrl = 'https://discord.com/register';
  
  try {
    // Tìm input
    const inputSelectors = [
      'input#unique-form-control',
      'input[name="url"]',
      'input[placeholder*="URL"]',
      'input[type="text"]',
      'textarea',
    ];

    let input = null;
    for (const sel of inputSelectors) {
      input = await page.$(sel);
      if (input) break;
    }

    if (input) {
      await input.click({ delay: randomBetween(50, 100) });
      await input.type(registerUrl, { delay: randomBetween(15, 30) });
      log('success', '[Proxyium] Da nhap URL');
    } else {
      // Fallback: set value bằng JS
      await page.evaluate((url) => {
        const inp = document.querySelector('input');
        if (inp) inp.value = url;
      }, registerUrl);
    }

    await sleep(500);

    // Click button Go/Send
    const btnSelectors = [
      'button#unique-btn-blue',
      'button[type="submit"]',
      'input[type="submit"]',
      'button',
    ];

    let btn = null;
    for (const sel of btnSelectors) {
      btn = await page.$(sel);
      if (btn) break;
    }

    if (btn) {
      await btn.click({ delay: randomBetween(100, 200) });
      log('success', '[Proxyium] Da click Go');
    } else {
      log('warn', '[Proxyium] Khong tim thay button');
    }

    // Đợi proxyium load Discord
    log('info', '[Proxyium] Dang cho proxyium hoan tat...');
    
    // Đợi URL thay đổi thành dạng IP:port/register
    let proxyUrl = page.url();
    let waitCount = 0;
    
    while (waitCount < 30) {
      await sleep(2000);
      proxyUrl = page.url();
      
      // Đã chuyển đến Discord register
      if (proxyUrl.includes('/register') && !proxyUrl.includes('proxyium.com')) {
        log('success', `[Proxyium] Da vao Discord register: ${proxyUrl.substring(0, 60)}...`);
        break;
      }
      
      // Đã vào Discord (có thể đã login)
      if (proxyUrl.includes('discord.com') && !proxyUrl.includes('login')) {
        log('success', `[Proxyium] Da vao Discord: ${proxyUrl.substring(0, 60)}...`);
        break;
      }
      
      waitCount++;
      
      if (waitCount % 5 === 0) {
        log('info', `[Proxyium] Dang cho... (${waitCount * 2}s)`);
      }
    }

    // Đợi trang register load hoàn chỉnh
    await sleep(3000);
    
    // Kiểm tra xem form register có load không
    const hasForm = await page.$('input[name="email"], input[name="username"]').catch(() => null);
    
    if (!hasForm) {
      log('warn', '[Proxyium] Form register chua load, doi them...');
      
      // Thử scroll
      await page.evaluate(() => {
        window.scrollBy({ top: 200, behavior: 'smooth' });
      });
      
      await sleep(5000);
    }

    return page;
    
  } catch (err) {
    log('error', `[Proxyium] Loi: ${err.message}`);
    throw err;
  }
}

/**
 * Nhập form đăng ký Discord
 */
async function fillRegistrationForm(page, email, username, password, birthdate) {
  log('info', 'Dang nhap thong tin...');

  try {
    // Đợi form load
    await page.waitForSelector('input[name="email"]', { timeout: 20000 }).catch(() => {
      log('warn', 'Khong tim thay input email, doi them...');
    });
    await sleep(2000);

    // Email
    const emailInput = await page.$('input[name="email"]');
    if (emailInput) {
      await emailInput.click({ delay: randomBetween(50, 100) });
      await emailInput.type(email, { delay: randomBetween(20, 40) });
      log('success', `Email: ${email}`);
    }
    await sleep(randomBetween(300, 500));

    // Username
    const usernameInput = await page.$('input[name="username"]');
    if (usernameInput) {
      await usernameInput.click({ delay: randomBetween(50, 100) });
      await usernameInput.type(username, { delay: randomBetween(20, 40) });
      log('success', `Username: ${username}`);
    }
    await sleep(randomBetween(300, 500));

    // Password
    const passwordInput = await page.$('input[name="password"]');
    if (passwordInput) {
      await passwordInput.click({ delay: randomBetween(50, 100) });
      await passwordInput.type(password, { delay: randomBetween(15, 30) });
      log('success', `Password: ${password.substring(0, 6)}***`);
    }
    await sleep(randomBetween(500, 800));

    // FOB - Ngày tháng năm sinh
    log('info', `FOB: ${birthdate.month} ${birthdate.day}, ${birthdate.year}`);
    
    await selectDiscordDropdown(page, 'Month', birthdate.month);
    await sleep(randomBetween(500, 800));
    
    await selectDiscordDropdown(page, 'Day', birthdate.day);
    await sleep(randomBetween(500, 800));
    
    await selectDiscordDropdown(page, 'Year', birthdate.year);
    await sleep(randomBetween(800, 1200));

    log('success', 'Da nhap xong thong tin!');
    return true;
  } catch (err) {
    log('error', `Loi nhap form: ${err.message}`);
    throw err;
  }
}

/**
 * Click nút Continue/Register
 */
async function clickRegisterButton(page) {
  log('info', 'Dang click nut dang ky...');

  try {
    // Tìm button type submit
    let btn = await page.$('button[type="submit"]');
    
    if (!btn) {
      // Tìm bằng text
      btn = await page.evaluateHandle(() => {
        const buttons = document.querySelectorAll('button');
        for (const b of buttons) {
          const text = b.textContent.trim().toLowerCase();
          if (text.includes('continue') || text.includes('tiep tuc') || 
              text.includes('dang ky') || text.includes('register') ||
              text.includes('next') || text.includes('tiep')) {
            return b;
          }
        }
        return null;
      });
      btn = btn.asElement();
    }

    if (btn) {
      await btn.click({ delay: randomBetween(100, 200) });
      log('success', 'Da click nut dang ky');
      await sleep(3000);
      return true;
    }

    log('warn', 'Khong tim thay nut dang ky');
    return false;
  } catch (err) {
    log('error', `Loi click: ${err.message}`);
    return false;
  }
}

/**
 * Chờ captcha và verify email
 */
async function waitForVerification(page) {
  log('info', 'Dang cho nguoi dung giai captcha + verify...');
  log('info', 'Vui long kiem tra trinh duyet va giai captcha (neu co)');

  const startTime = Date.now();
  const timeoutMs = 300000; // 5 phút

  while (Date.now() - startTime < timeoutMs) {
    const url = page.url();
    
    // Đã vào Discord chính
    if (url.includes('/channels/@me') || url.includes('/app') || url.includes('/login')) {
      log('success', 'Da vao Discord!');
      return true;
    }

    // Đã verify email thành công
    if (url.includes('verify') && url.includes('token=')) {
      log('success', 'Da verify email!');
      await sleep(3000);
      
      // Kiểm tra xem có vào được Discord không
      const currentUrl = page.url();
      if (currentUrl.includes('/channels/@me')) {
        return true;
      }
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    if (elapsed > 0 && elapsed % 60 === 0) {
      log('info', `Da cho ${Math.round(elapsed / 60)} phut...`);
    }

    await sleep(2000);
  }

  log('warn', 'Het thoi gian cho');
  return false;
}

/**
 * Đăng nhập và lấy token
 */
async function loginAndGetToken(browser, email, password) {
  log('info', 'Dang dang nhap de lay token...');

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  try {
    await page.goto('https://discord.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    }).catch(() => {});
    await sleep(3000);

    // Nhập email
    const emailInput = await page.$('input[name="email"]');
    if (emailInput) {
      await emailInput.click({ delay: randomBetween(50, 100) });
      await emailInput.type(email, { delay: randomBetween(20, 40) });
    }
    await sleep(randomBetween(300, 500));

    // Nhập password
    const passInput = await page.$('input[name="password"]');
    if (passInput) {
      await passInput.click({ delay: randomBetween(50, 100) });
      await passInput.type(password, { delay: randomBetween(15, 30) });
    }
    await sleep(randomBetween(500, 800));

    // Click login
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    });

    log('info', 'Dang cho dang nhap...');
    await sleep(5000);

    const loginUrl = page.url();
    log('info', `URL sau login: ${loginUrl.substring(0, 60)}...`);

    if (loginUrl.includes('/channels/@me') || loginUrl.includes('/app') || loginUrl.includes('discord.com/channels')) {
      log('success', 'Dang nhap thanh cong!');
      
      // Lấy token
      const token = await extractToken(page);
      
      if (token) {
        log('success', `Token: ${token.substring(0, 40)}...`);
      } else {
        log('warn', 'Khong tim thay token');
      }
      
      await page.close();
      return token;
    }

    log('warn', 'Dang nhap that bai');
    await page.close();
    return null;

  } catch (err) {
    log('error', `Loi login: ${err.message}`);
    await page.close();
    return null;
  }
}

/**
 * Trích xuất token từ page
 */
async function extractToken(page) {
  // Method 1: localStorage
  const token1 = await page.evaluate(() => {
    try {
      const t = localStorage.getItem('token');
      return t ? t.replace(/"/g, '') : null;
    } catch { return null; }
  });

  if (token1 && token1.includes('.')) return token1;

  // Method 2: Tìm trong tất cả storage keys
  const token2 = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = localStorage.getItem(key);
      if (val && val.length > 50 && val.includes('.')) {
        return val.replace(/"/g, '');
      }
    }
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const val = sessionStorage.getItem(key);
      if (val && val.length > 50 && val.includes('.')) {
        return val.replace(/"/g, '');
      }
    }
    return null;
  });

  if (token2 && token2.includes('.')) return token2;

  // Method 3: Fetch user info
  const token3 = await page.evaluate(async () => {
    try {
      const res = await fetch('https://discord.com/api/v9/users/@me', {
        credentials: 'include',
        headers: { 'accept': '*/*' },
      });
      if (res.ok) {
        // Lấy token từ cookie
        const cookies = document.cookie.split(';');
        for (const c of cookies) {
          if (c.includes('token')) return c.split('=')[1].trim();
        }
      }
      return null;
    } catch { return null; }
  });

  if (token3) return token3;

  // Method 4: CDP network intercept
  try {
    const cdp = await page.target().createCDPSession();
    await cdp.send('Network.enable');

    const token4 = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 15000);

      cdp.on('Network.responseReceived', async (params) => {
        if (params.response.url.includes('/api/v9/auth/login')) {
          try {
            const res = await cdp.send('Network.getResponseBody', {
              requestId: params.requestId,
            });
            const data = JSON.parse(res.body);
            if (data.token) {
              clearTimeout(timeout);
              resolve(data.token);
            }
          } catch { }
        }
        
        if (params.response.url.includes('/api/v9/users/@me')) {
          try {
            const res = await cdp.send('Network.getResponseBody', {
              requestId: params.requestId,
            });
            // Token trong response headers
            const headers = params.response.headers;
            if (headers['authorization']) {
              clearTimeout(timeout);
              resolve(headers['authorization']);
            }
          } catch { }
        }
      });

      // Trigger lại request
      page.evaluate(() => {
        fetch('https://discord.com/api/v9/users/@me', { credentials: 'include' });
      }).catch(() => {});
    });

    if (token4) return token4;
  } catch { }

  return null;
}

/**
 * Verify email
 */
async function verifyEmail(browser, verifyLink) {
  log('info', 'Dang verify email...');

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  try {
    await page.goto(verifyLink, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    }).catch(() => {});
    await sleep(5000);

    const url = page.url();
    log('info', `URL sau verify: ${url.substring(0, 60)}...`);

    // Nếu có button confirm
    const confirmSelectors = [
      'button:has-text("Confirm")',
      'button:has-text("Xac nhan")', 
      'button:has-text("Verify")',
      'button:has-text("Continue")',
      'button[type="submit"]',
    ];

    for (const sel of confirmSelectors) {
      const btn = await page.$(sel);
      if (btn) {
        await btn.click({ delay: randomBetween(100, 200) });
        log('success', 'Da click confirm');
        await sleep(3000);
        break;
      }
    }

    // Đã vào được Discord chưa
    const finalUrl = page.url();
    if (finalUrl.includes('/channels/@me')) {
      log('success', 'Email verified!');
      await page.close();
      return true;
    }

    await page.close();
    return url.includes('discord.com');
  } catch (err) {
    log('error', `Loi verify: ${err.message}`);
    await page.close();
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
//  MAIN RUN FUNCTION
// ═══════════════════════════════════════════════════════════
async function run(rl) {
  log('info', '=== DARK GEN - DISCORD TOKEN GENERATOR ===');
  console.log('');

  // ─── Nhập số lượng ────────────────────────────────────
  let count = 1;
  const countInput = await ask('So luong acc muon tao (mac dinh: 1) > ');
  
  if (countInput) {
    const num = parseInt(countInput, 10);
    if (!isNaN(num) && num > 0) {
      count = num;
    } else {
      log('warn', 'Gia tri khong hop le, dung mac dinh: 1');
    }
  }

  log('success', `Se tao ${count} tai khoan`);
  console.log('');

  const accounts = [];

  for (let i = 0; i < count; i++) {
    log('info', `═══════════════════════════════════════════`);
    log('info', `TAI KHOAN ${i + 1}/${count}`);
    log('info', `═══════════════════════════════════════════`);

    let browser = null;
    let page1 = null;
    let page2 = null;

    try {
      // ─── Tạo thông tin ────────────────────────────────
      const username = generateUsername();
      const password = generatePassword();
      const birthdate = generateBirthdate();
      
      log('info', `Username: ${username}`);
      log('info', `Password: ${password.substring(0, 8)}***`);
      log('info', `FOB: ${birthdate.month} ${birthdate.day}, ${birthdate.year}`);
      console.log('');

      // ─── Launch browser ──────────────────────────────
      log('info', 'Dang mo Brave...');
      browser = await puppeteer.launch({
        headless: false,
        executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-background-networking',
          '--disable-sync',
          '--window-size=1400,800',
        ],
      });
      log('success', 'Brave ready!');
      console.log('');

      // ─── TAB 1: Mở proxyium → Discord register ─────
      log('info', '--- TAB 1: Discord Register ---');
      page1 = await openDiscordViaProxyium(browser);
      await sleep(2000);
      console.log('');

      // ─── TAB 2: Mở zemail.me ────────────────────────
      log('info', '--- TAB 2: Zemail ---');
      page2 = await browser.newPage();
      await page2.setViewport({ width: 1366, height: 768 });
      
      // Inject anti-detection cho zemail
      await page2.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        
        // Canvas fingerprint random nhẹ
        const origGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (...args) {
          const ctx = origGetContext.apply(this, args);
          if (ctx && args[0] === '2d') {
            const origFillText = ctx.fillText;
            ctx.fillText = function (...ftArgs) {
              origFillText.apply(this, ftArgs);
              const r = Math.random() * 0.001;
              if (r > 0.0005) {
                ctx.fillStyle = `rgba(0, 0, 0, ${r})`;
                ctx.fillRect(0, 0, 1, 1);
              }
            };
          }
          return ctx;
        };
      });

      await page2.goto('https://zemail.me/mailbox', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      }).catch(() => {});
      await sleep(5000);
      log('success', 'Zemail ready!');
      console.log('');

      // ─── Lấy email ──────────────────────────────────
      const email = await getEmailFromZemail(page2);
      if (!email) {
        log('error', 'Khong lay duoc email, bo qua acc nay');
        continue;
      }
      console.log('');

      // ─── Nhập form ──────────────────────────────────
      await fillRegistrationForm(page1, email, username, password, birthdate);
      await sleep(1000);
      console.log('');

      // ─── Click đăng ký ──────────────────────────────
      await clickRegisterButton(page1);
      await sleep(3000);
      console.log('');

      // ─── Chờ captcha + verify ───────────────────────
      log('info', 'Vui long giai captcha (neu co) va cho verify...');
      log('info', 'Kiem tra tab Discord + tab Zemail');

      // Đợi link verify từ zemail
      const verifyLink = await getVerifyLinkFromZemail(page2, 180);

      if (verifyLink) {
        log('info', 'Da nhan duoc link verify!');
        
        // Verify email
        await verifyEmail(browser, verifyLink);
        await sleep(3000);
        
        // Đợi Discord chuyển hướng
        await waitForVerification(page1);
        await sleep(2000);
      } else {
        log('warn', 'Khong nhan duoc link verify');
        log('info', 'Thu dang nhap truc tiep...');
      }
      console.log('');

      // ─── Đăng nhập lấy token ────────────────────────
      log('info', '--- DANG NHAP LAY TOKEN ---');
      const token = await loginAndGetToken(browser, email, password);

      if (token) {
        log('success', `TOKEN: ${token.substring(0, 50)}...`);
        saveAccount(email, password, token, username);
        accounts.push({ email, username, password, token, success: true });
      } else {
        log('warn', 'Khong lay duoc token');
        saveAccount(email, password, 'NO_TOKEN', username);
        accounts.push({ email, username, password, token: null, success: false });
      }

      log('success', `=== HOAN THANH TAI KHOAN ${i + 1}! ===`);
      console.log('');

    } catch (err) {
      log('error', `Loi tai khoan ${i + 1}: ${err.message}`);
      log('error', `Stack: ${err.stack}`);
      
      // Lưu lại dù lỗi
      if (err.message && accounts.length > 0) {
        const lastAcc = accounts[accounts.length - 1];
        if (lastAcc) {
          fs.appendFileSync(GEN_RESULT_FILE, `# ERROR: ${err.message}\n`, 'utf-8');
        }
      }
    } finally {
      // Đóng browser sau mỗi acc
      if (browser) {
        try {
          // Đóng tất cả pages
          const pages = await browser.pages();
          for (const p of pages) {
            try { await p.close(); } catch { }
          }
          await browser.close();
          log('info', 'Da dong trinh duyet');
        } catch { }
      }
    }
  }

  // ─── Kết quả ──────────────────────────────────────────
  console.log('');
  log('info', '═══════════════════════════════════════════');
  log('success', `DA TAO XONG ${accounts.length} TAI KHOAN!`);
  log('success', `File: ${GEN_RESULT_FILE}`);
  log('info', '═══════════════════════════════════════════');

  if (accounts.length > 0) {
    console.log('');
    log('info', 'DANH SACH TAI KHOAN:');
    console.log('');
    
    for (let i = 0; i < accounts.length; i++) {
      const acc = accounts[i];
      console.log(`  [${i + 1}] Email: ${acc.email}`);
      console.log(`      Username: ${acc.username}`);
      console.log(`      Password: ${acc.password}`);
      console.log(`      Token: ${acc.token ? acc.token.substring(0, 50) + '...' : 'KHONG LAY DUOC'}`);
      console.log(`      Status: ${acc.success ? 'THANH CONG' : 'THAT BAI'}`);
      console.log('');
    }
  }

  return { accounts };
}

module.exports = { run };
