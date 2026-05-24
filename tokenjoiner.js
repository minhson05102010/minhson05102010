// chucnang/tokenjoiner.js
// Token Joiner - Automated login via Chrome + Join server invite link

'use strict';

const fs = require('fs');
const path = require('path');

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
  log.error(
    'Thieu puppeteer! Chay: npm install puppeteer-extra puppeteer-extra-plugin-stealth'
  );
  process.exit(1);
}

// =========================
// FILE PATH
// =========================
const TOKEN_FILE = path.join(__dirname, '..', 'token.txt');

// =========================
// HELPERS
// =========================
function loadLines(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, 'utf-8')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
  } catch {
    return [];
  }
}

function beep() {
  process.stdout.write('\x07');
}

// Login with token function
async function loginWithToken(page, token) {
  log.info('[~] Đang đăng nhập bằng token...');
  
  try {
    // Set localStorage with token
    await page.evaluateOnNewDocument((token) => {
      localStorage.setItem('token', `"${token}"`);
    }, token);
    
    // Navigate to Discord
    await page.goto('https://discord.com/app', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    
    // Wait for navigation to complete
    await sleep(3000);
    
    log.success('[+] Đăng nhập thành công!');
  } catch (error) {
    log.error(`[-] Lỗi đăng nhập: ${error.message}`);
    throw error;
  }
}

async function safeCreatePage(browserInstance, launchOptions) {
  let browser = browserInstance || await puppeteer.launch(launchOptions);

  // Check if browser is connected (using process() instead of isConnected())
  if (!browser.process() || browser.process().killed) {
    log.info('[~] Khởi chạy lại Chrome do kết nối bị gián đoạn...');
    try {
      await browser.close();
    } catch (e) {}
    browser = await puppeteer.launch(launchOptions);
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    return { browser, page };
  } catch (error) {
    log.warn(`[!] Không thể mở tab mới: ${error.message}. Đang thử khởi động lại Chrome...`);
    try {
      await browser.close();
    } catch (e) {
      log.warn(`[!] Không thể đóng trình duyệt: ${e.message}`);
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    return { browser, page };
  }
}

async function run(rl) {
  let browser = null;

  try {
    console.clear();
    log.info('=== DISCORD TOKEN JOINER (BROWSER) ===');
    log.info('  + Mo tab Google Chrome bang puppeteer-extra');
    log.info('  + Tu dong dang nhap bang token tu file token.txt');
    log.info('  + Vao link server duoc chi dinh');
    log.info('  + Cho nguoi dung giai captcha / tra loi cau hoi');
    log.info('');

    const tokens = loadLines(TOKEN_FILE);
    if (tokens.length === 0) {
      log.error('[-] Khong tim thay token nao trong file token.txt!');
      await sleep(2000);
      return;
    }
    log.success(`[+] Da load ${tokens.length} token tu token.txt`);

    let inviteLink = '';
    while (!inviteLink) {
      const input = await ask(rl, '👉 Nhap link server Discord (Invite Link) > ');
      inviteLink = input.trim();
      if (!inviteLink) {
        log.warn('[!] Link server khong duoc de trong!');
      }
    }

    if (!inviteLink.startsWith('http://') && !inviteLink.startsWith('https://')) {
      inviteLink = 'https://' + inviteLink;
    }

    log.info('');
    log.info('[~] Dang mo Chrome...');

    const launchOptions = {
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        '--disable-component-update',
        '--disable-background-networking'
      ],
    };

    log.success('[+] Chrome ready!');
    log.info('');

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const displayToken = token.length > 25 ? token.substring(0, 25) + '...' : token;
      log.info('─'.repeat(55));
      log.info(`▶ Token ${i + 1}/${tokens.length} | ${displayToken}`);

      let page = null;
      try {
        const { browser: currentBrowser, page: newPage } = await safeCreatePage(browser, launchOptions);
        browser = currentBrowser;
        page = newPage;

        try {
          const client = await page.target().createCDPSession();
          await client.send('Network.clearBrowserCookies').catch(() => {});
          await client.send('Network.clearBrowserCache').catch(() => {});
        } catch {}

        await loginWithToken(page, token);

        log.info(`[~] Dang vao link server: ${inviteLink}`);
        await page.goto(inviteLink, {
          waitUntil: 'domcontentloaded',
          timeout: 45000,
        }).catch(() => {});

        log.info('');
        log.info('═'.repeat(55));
        log.info('  🔷 TOKEN JOINER READY');
        log.info('  👉 HAY GIAI CAPTCHA / TRA LOI CAU HOI DE VAO SERVER');
        log.info('  👉 SAU KHI XONG, GO "next" DE TIẾP TỤC TOKEN TIẾP THEO');
        log.info('═'.repeat(55));
        log.info('');

        beep();

        let confirm = '';
        while (confirm.toLowerCase() !== 'next') {
          const res = await ask(rl, '👉 Go "next" de tiep tuc > ');
          confirm = res.trim();
        }

        log.success(`[✓] Da xong token ${i + 1}!`);
      } catch (err) {
        log.error(`[-] Loi xu ly token ${i + 1}: ${err.message}`);
      } finally {
        if (page) {
          try {
            await page.close();
          } catch {}
        }
      }
    }

    log.info('─'.repeat(55));
    log.success('[✓] Da hoan thanh tat ca cac token!');

  } catch (e) {
    log.error(`[-] Loi: ${e.message}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}

module.exports = { run };