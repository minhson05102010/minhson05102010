'use strict';
// ============================
// FIX UTF-8
// ============================
process.stdout.setEncoding('utf8');
process.stdin.setEncoding('utf8');
if (process.platform === 'win32') {
  try { require('child_process').execSync('chcp 65001 > nul'); } catch {}
}
const fs   = require('fs');
const path = require('path');
const { log, sleep, ask } = require('../utils/theme');
// ============================
// PUPPETEER
// ============================
let puppeteer;
try {
  puppeteer = require('puppeteer-extra');
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  puppeteer.use(StealthPlugin());
} catch {
  log.error('Thieu puppeteer! Chay: npm install puppeteer-extra puppeteer-extra-plugin-stealth');
  process.exit(1);
}
// ============================
// FILE PATHS
// ============================
const ROOT_DIR      = path.join(__dirname, '..');
const TOKEN_FILE    = path.join(ROOT_DIR, 'token.txt');
const AVT_DIR       = path.join(ROOT_DIR, 'avt');
const USERNAME_FILE = path.join(ROOT_DIR, 'username.txt');
const BIO_FILE      = path.join(ROOT_DIR, 'bio.txt');
const GENDER_FILE   = path.join(ROOT_DIR, 'gioitinh.txt');
// ============================
// HELPERS
// ============================
function loadLines(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, 'utf-8')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('#'));
  } catch { return []; }
}
function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function beep() { process.stdout.write('\x07'); }
// Lấy avatar file hợp lệ
function loadAvatarFiles() {
  const exts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
  try {
    if (!fs.existsSync(AVT_DIR)) return [];
    return fs.readdirSync(AVT_DIR)
      .filter(f => exts.has(path.extname(f).toLowerCase()))
      .map(f => path.join(AVT_DIR, f));
  } catch { return []; }
}
// Extract token từ 1 dòng (hỗ trợ nhiều định dạng)
function isValidToken(s) {
  if (!s || s.length < 50) return false;
  const parts = s.split('.');
  if (parts.length !== 3) return false;
  return parts.every(p => /^[A-Za-z0-9_-]+$/.test(p) && p.length > 0);
}
function extractToken(line) {
  line = line.trim();
  if (!line) return null;
  if (isValidToken(line)) return line;
  for (const d of [':', '|', '\t', ' ']) {
    if (line.includes(d)) {
      const parts = line.split(d);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i].trim();
        if (isValidToken(p)) return p;
      }
    }
  }
  return null;
}
function loadTokens() {
  const seen = new Set();
  return loadLines(TOKEN_FILE)
    .map(extractToken)
    .filter(t => t && !seen.has(t) && seen.add(t));
}
// ============================
// ĐĂNG NHẬP BẰNG TOKEN
// ============================
async function loginWithToken(page, token) {
  // Inject token vào localStorage trước khi load trang
  await page.evaluateOnNewDocument((tok) => {
    localStorage.setItem('token', `"${tok}"`);
  }, token);
  await page.goto('https://discord.com/channels/@me', {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  });
  // Chờ Discord load xong (sidebar hiện ra)
  await sleep(4000);
  // Kiểm tra xem đã đăng nhập chưa
  const url = page.url();
  if (url.includes('/login') || url.includes('/register')) {
    // Thử inject lại qua JS runtime
    await page.evaluate((tok) => {
      try {
        const webpackModules = window.webpackChunkdiscord_app;
        if (!webpackModules) return;
        webpackModules.push([[''], {}, (e) => {
          for (const c in e.c) {
            const m = e.c[c]?.exports?.default;
            if (m?.setToken) { m.setToken(tok); return; }
            if (m?.loginToken) { m.loginToken(tok); return; }
          }
        }]);
      } catch {}
      localStorage.setItem('token', `"${tok}"`);
    }, token);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);
  }
  return page.url();
}
// ============================
// MỞ SETTINGS - PROFILES
// ============================
async function openProfileSettings(page) {
  // Nhấn nút User Settings (gear icon)
  try {
    // Tìm nút settings ở góc dưới trái
    await page.evaluate(() => {
      // Thử click vào gear icon
      const btns = document.querySelectorAll('[aria-label="User Settings"]');
      if (btns.length > 0) { btns[0].click(); return true; }
      // Thử tìm bằng class
      const gears = document.querySelectorAll('[class*="panels"] button, [class*="toolbar"] button');
      for (const btn of gears) {
        if (btn.querySelector('svg') || btn.getAttribute('aria-label')) {
          btn.click(); return true;
        }
      }
      return false;
    });
  } catch {}
  await sleep(1500);
  // Nếu chưa mở được, dùng URL trực tiếp
  const currentUrl = page.url();
  if (!currentUrl.includes('/settings')) {
    // Navigate thẳng đến settings
    await page.evaluate(() => {
      try {
        // Dispatch custom event để mở settings
        const settingsBtn = document.querySelector('[class*="panels"] [class*="button"]');
        if (settingsBtn) settingsBtn.click();
      } catch {}
    });
    await sleep(1000);
  }
  // Thử click Profile tab
  try {
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('[class*="item-"]'));
      const profileLink = links.find(el =>
        el.textContent.toLowerCase().includes('profiles') ||
        el.textContent.toLowerCase().includes('profile')
      );
      if (profileLink) profileLink.click();
    });
  } catch {}
}
// ============================
// SET GIÁ TRỊ CHO INPUT (React-aware)
// ============================
async function reactSetValue(page, selector, value) {
  try {
    await page.evaluate((sel, val) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      )?.set;
      if (setter) {
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }, selector, value);
    return true;
  } catch { return false; }
}
// Set giá trị cho textarea (bio)
async function reactSetTextarea(page, selector, value) {
  try {
    await page.evaluate((sel, val) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      )?.set;
      if (setter) {
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }, selector, value);
    return true;
  } catch { return false; }
}
// ============================
// TỰ ĐỘNG THAY ĐỔI THÔNG TIN
// ============================
async function autoHumanize(page, tokenIdx, totalTokens, cfg) {
  const { names, bios, genders, avatarFiles } = cfg;
  const display = `[Token ${tokenIdx}/${totalTokens}]`;
  log.info(`${display} Mo cai dat Discord...`);
  // Mở Settings → Profiles qua URL
  try {
    await page.goto('https://discord.com/settings/profile-customization', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await sleep(3000);
  } catch (e) {
    log.warn(`${display} Khong the mo settings: ${e.message}`);
  }
  // Kiểm tra đã vào settings chưa
  const settingsUrl = page.url();
  if (!settingsUrl.includes('/settings')) {
    log.warn(`${display} Chua vao settings duoc, trang hien tai: ${settingsUrl}`);
    return false;
  }
  log.info(`${display} Da vao Settings Profile.`);
  // == ĐỔI AVATAR ==
  if (avatarFiles.length > 0) {
    try {
      const avatarPath = randChoice(avatarFiles);
      log.info(`${display} Dang upload avatar: ${path.basename(avatarPath)}`);
      // Tìm input file upload
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.uploadFile(avatarPath);
        await sleep(2000);
        // Nhấn Apply/Save nếu có modal crop
        try {
          await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const applyBtn = btns.find(b =>
              b.textContent.toLowerCase().includes('apply') ||
              b.textContent.toLowerCase().includes('save') ||
              b.textContent.toLowerCase().includes('xac nhan')
            );
            if (applyBtn) applyBtn.click();
          });
          await sleep(1500);
        } catch {}
        log.success(`${display} Avatar: ${path.basename(avatarPath)}`);
      } else {
        // Thử tìm nút "Change Avatar" và click
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, [class*="avatarUpload"]'));
          const changeBtn = btns.find(b =>
            b.textContent.toLowerCase().includes('change avatar') ||
            b.textContent.toLowerCase().includes('avatar') ||
            b.className.includes('avatar')
          );
          if (changeBtn) changeBtn.click();
        });
        await sleep(1000);
        const fileInput2 = await page.$('input[type="file"]');
        if (fileInput2) {
          await fileInput2.uploadFile(avatarPath);
          await sleep(2000);
          log.success(`${display} Avatar uploaded.`);
        } else {
          log.warn(`${display} Khong tim thay file input de upload avatar.`);
        }
      }
    } catch (e) {
      log.warn(`${display} Loi upload avatar: ${e.message}`);
    }
    await sleep(randInt(1000, 2000));
  }
  // == ĐỔI TÊN HIỂN THỊ ==
  if (names.length > 0) {
    const newName = randChoice(names);
    try {
      // Tìm trường Display Name / Global Name
      const filled = await page.evaluate((name) => {
        const selectors = [
          'input[aria-label*="Display Name" i]',
          'input[aria-label*="Global Name" i]',
          'input[placeholder*="Display Name" i]',
          'input[placeholder*="Global Name" i]',
          'input[name="global_name"]',
          'input[name="displayName"]',
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            const setter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype, 'value'
            )?.set;
            if (setter) setter.call(el, name);
            else el.value = name;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      }, newName);
      if (filled) {
        log.success(`${display} Ten hien thi: ${newName}`);
      } else {
        log.warn(`${display} Khong tim thay o nhap ten hien thi.`);
      }
    } catch (e) {
      log.warn(`${display} Loi doi ten: ${e.message}`);
    }
    await sleep(randInt(800, 1500));
  }
  // == ĐỔI PRONOUNS (Giới tính) ==
  if (genders.length > 0) {
    const newGender = randChoice(genders);
    try {
      const filled = await page.evaluate((gender) => {
        const selectors = [
          'input[aria-label*="Pronouns" i]',
          'input[placeholder*="Pronouns" i]',
          'input[name="pronouns"]',
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            const setter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype, 'value'
            )?.set;
            if (setter) setter.call(el, gender);
            else el.value = gender;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      }, newGender);
      if (filled) {
        log.success(`${display} Pronouns: ${newGender}`);
      } else {
        log.warn(`${display} Khong tim thay o nhap pronouns.`);
      }
    } catch (e) {
      log.warn(`${display} Loi doi pronouns: ${e.message}`);
    }
    await sleep(randInt(800, 1500));
  }
  // == ĐỔI BIO ==
  if (bios.length > 0) {
    const newBio = randChoice(bios);
    try {
      const filled = await page.evaluate((bio) => {
        const selectors = [
          'textarea[aria-label*="bio" i]',
          'textarea[placeholder*="bio" i]',
          'textarea[name="bio"]',
          '[class*="bioInput"] textarea',
          '[class*="bio"] textarea',
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            const setter = Object.getOwnPropertyDescriptor(
              window.HTMLTextAreaElement.prototype, 'value'
            )?.set;
            if (setter) setter.call(el, bio);
            else el.value = bio;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      }, newBio);
      if (filled) {
        log.success(`${display} Bio: ${newBio.slice(0, 40)}${newBio.length > 40 ? '...' : ''}`);
      } else {
        log.warn(`${display} Khong tim thay o nhap bio.`);
      }
    } catch (e) {
      log.warn(`${display} Loi doi bio: ${e.message}`);
    }
    await sleep(randInt(800, 1500));
  }
  // == NHẤN SAVE ==
  try {
    const saved = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const saveBtn = btns.find(b =>
        b.textContent.toLowerCase().trim() === 'save changes' ||
        b.textContent.toLowerCase().trim() === 'save' ||
        b.textContent.toLowerCase().includes('save changes')
      );
      if (saveBtn && !saveBtn.disabled) {
        saveBtn.click();
        return true;
      }
      return false;
    });
    if (saved) {
      log.success(`${display} Da nhan Save Changes!`);
      await sleep(2000);
    } else {
      log.warn(`${display} Khong tim thay nut Save (co the chua co thay doi nao).`);
    }
  } catch (e) {
    log.warn(`${display} Loi khi nhan save: ${e.message}`);
  }
  return true;
}
// ============================
// XỬ LÝ 1 TOKEN
// ============================
async function processToken(browser, rl, token, tokenIdx, totalTokens, cfg) {
  const display = `[Token ${tokenIdx}/${totalTokens}]`;
  const shortToken = token.slice(0, 15) + '...';
  let page = null;
  try {
    log.info(`${'─'.repeat(60)}`);
    log.info(`${display} Token: ${shortToken}`);
    // Mở tab mới
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    // Tắt dialog xác nhận (save password, etc.)
    page.on('dialog', async (dialog) => {
      try { await dialog.dismiss(); } catch {}
    });
    // Đăng nhập
    log.info(`${display} Dang dang nhap bang token...`);
    const finalUrl = await loginWithToken(page, token);
    log.info(`${display} URL sau dang nhap: ${finalUrl.slice(0, 60)}`);
    if (finalUrl.includes('/login') || finalUrl.includes('/register')) {
      log.warn(`${display} Dang nhap that bai - token co the da het han!`);
      beep();
      // Vẫn để browser mở để user kiểm tra
      log.warn(`${display} Token co the het han. Kiem tra va go "xong" de tiep tuc.`);
    } else {
      log.success(`${display} Dang nhap thanh cong!`);
      await sleep(2000);
      // Tự động thay đổi thông tin
      await autoHumanize(page, tokenIdx, totalTokens, cfg);
    }
    // Đưa tab lên foreground cho user kiểm tra
    try { await page.bringToFront(); } catch {}
    // Thông báo
    beep();
    console.log('');
    log.info(`${'═'.repeat(60)}`);
    log.info(`  ${display} KIEM TRA TREN TRINH DUYET`);
    log.info(`  > Neu co captcha → giai captcha`);
    log.info(`  > Neu can luu mat khau → luu thu cong`);
    log.info(`  > Kiem tra lai tat ca thong tin da duoc doi`);
    log.info(`  > Sau khi xong, go "xong" de tiep tuc token tiep theo`);
    log.info(`${'═'.repeat(60)}`);
    console.log('');
    // Chờ user xác nhận
    let confirm = '';
    while (confirm.toLowerCase() !== 'xong') {
      confirm = await ask(rl, `${display} Go "xong" de dong tab va tiep tuc > `);
      if (confirm.toLowerCase() !== 'xong') {
        log.warn('Go "xong" de tiep tuc...');
      }
    }
    log.success(`${display} Hoan thanh!`);
  } catch (e) {
    log.error(`${display} Loi: ${e.message}`);
  } finally {
    if (page) {
      try { await page.close(); } catch {}
    }
  }
}
// ============================
// RUN
// ============================
async function run(rl) {
  let browser = null;
  try {
    console.clear();
    log.info('=== DISCORD ACCOUNT HUMANIZER (Browser Mode) ===');
    log.info('  + Mo tab Chrome tu dong dang nhap bang token');
    log.info('  + Tu dong doi Avatar / Ten / Bio / Pronouns');
    log.info('  + Cho nguoi dung giai captcha neu can');
    log.info('  + Go "xong" de sang token tiep theo');
    log.info('');
    // Load dữ liệu
    const tokens    = loadTokens();
    const names     = loadLines(USERNAME_FILE);
    const bios      = loadLines(BIO_FILE);
    const genders   = loadLines(GENDER_FILE);
    const avtFiles  = loadAvatarFiles();
    if (tokens.length === 0) {
      log.error('Khong tim thay token nao trong token.txt!');
      return;
    }
    log.info(`Token    : ${tokens.length}  (token.txt)`);
    log.info(`Ten      : ${names.length}    (username.txt)`);
    log.info(`Bio      : ${bios.length}     (bio.txt)`);
    log.info(`Pronouns : ${genders.length}  (gioitinh.txt)`);
    log.info(`Avatar   : ${avtFiles.length} (avt/)`);
    log.info('');
    if (names.length === 0 && bios.length === 0 && genders.length === 0 && avtFiles.length === 0) {
      log.warn('Canh bao: Khong co du lieu nao de thay doi! Kiem tra lai cac file.');
    }
    const startInput = await ask(rl, 'Nhan Enter de bat dau > ');
    void startInput;
    // Khởi động Chrome
    log.info('Dang mo Chrome...');
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions-except',
        '--disable-popup-blocking',
        '--password-store=basic',   // Hiện dialog lưu mật khẩu
        '--flag-switches-begin',
        '--flag-switches-end',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    });
    log.success('Chrome da mo!');
    log.info('');
    const cfg = { names, bios, genders, avatarFiles: avtFiles };
    // Xử lý từng token tuần tự
    for (let i = 0; i < tokens.length; i++) {
      await processToken(browser, rl, tokens[i], i + 1, tokens.length, cfg);
      // Delay nhỏ giữa các token
      if (i < tokens.length - 1) {
        await sleep(1500);
      }
    }
    log.info('─'.repeat(60));
    log.success(`Da hoan thanh tat ca ${tokens.length} token!`);
  } catch (e) {
    log.error(`Loi: ${e.message}`);
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}
module.exports = { run };
