'use strict';

const readline = require('readline');
const chalk = require('chalk');
const figlet = require('figlet');

const { co, co2, log, sleep, ask, themeName } = require('./utils/theme');

// =========================
// FIX UTF-8 / ICON
// =========================
process.stdout.setEncoding('utf8');
process.stdin.setEncoding('utf8');

// =========================
// Banner mới
// =========================
const ASCII = `
▓█████▄  ▄▄▄       ██▀███   ██ ▄█▀ ███▄    █ ▓█████   ██████   ██████ 
▒██▀ ██▌▒████▄    ▓██ ▒ ██▒ ██▄█▒  ██ ▀█   █ ▓█   ▀ ▒██    ▒ ▒██    ▒ 
░██   █▌▒██  ▀█▄  ▓██ ░▄█ ▒▓███▄░ ▓██  ▀█ ██▒▒███   ░ ▓██▄   ░ ▓██▄   
░▓█▄   ▌░██▄▄▄▄██ ▒██▀▀█▄  ▓██ █▄ ▓██▒  ▐▌██▒▒▓█  ▄   ▒   ██▒  ▒   ██▒
░▒████▓  ▓█   ▓██▒░██▓ ▒██▒▒██▒ █▄▒██░   ▓██░░▒████▒▒██████▒▒▒██████▒▒
 ▒▒▓  ▒  ▒▒   ▓▒█░░ ▒▓ ░▒▓░▒ ▒▒ ▓▒░ ▒░   ▒ ▒ ░░ ▒░ ░▒ ▒▓▒ ▒ ░▒ ▒▓▒ ▒ ░
 ░ ▒  ▒   ▒   ▒▒ ░  ░▒ ░ ▒░░ ░▒ ▒░░ ░░   ░ ▒░ ░ ░  ░░ ░▒  ░ ░░ ░▒  ░ ░
 ░ ░  ░   ░   ▒     ░░   ░ ░ ░░ ░    ░   ░ ░    ░   ░  ░  ░  ░  ░  ░  
   ░          ░  ░   ░     ░  ░            ░    ░  ░      ░        ░  
 ░                                                                    
`;

// Danh sach cac chuc nang
const MENU = [
  { id: '1', label: 'DMS Spammer', file: './chucnang/DMS' },
  { id: '2', label: 'Channel Spammer', file: './chucnang/channelspammer' },
  { id: '3', label: 'Voice soundbroad', file: './chucnang/voicespammer' },
  { id: '4', label: 'token checker', file: './chucnang/tokenchecker' },
  { id: '5', label: 'status changer', file: './chucnang/status' },
  { id: '6', label: 'Mass reporter', file: './chucnang/massreport' },
  { id: '7', label: 'TikTok View Booster', file: './chucnang/tiktokview' },
  { id: '8', label: 'Token Tagging', file: './chucnang/tokentagging' },
  { id: '9', label: 'Token Taker', file: './chucnang/tokentaker' },
  { id: '10', label: 'Token Emoji', file: './chucnang/emojispammer' },
  { id: '11', label: 'Token Reply', file: './chucnang/tokenreply' },
  { id: '12', label: 'Token Generator', file: './chucnang/gen' },
  { id: '13', label: 'User Name Generator', file: './chucnang/namegenerator' },
  { id: '14', label: 'Token Joiner', file: './chucnang/tokenjoiner' },
  { id: '15', label: 'Report User', file: './chucnang/reportuser' },
  { id: '16', label: 'Token Online', file: './chucnang/tokenonliner' },
  { id: '17', label: 'Nitro Gen', file: './chucnang/nitrogen' },
  { id: '18', label: 'Orbs Farmer', file: './chucnang/orbs' },
];

function stripAnsi(str) {
    return str.replace(/\x1B\[[0-9;]*m/g, '');
}
 
// =========================
// Căn giữa (hỗ trợ ANSI)
// =========================
function center(text) {
    const width = process.stdout.columns || 80;
    return text
        .split('\n')
        .map(line => {
            const clean = stripAnsi(line);
            const padding = Math.max(0, Math.floor((width - clean.length) / 2));
            return ' '.repeat(padding) + line;
        })
        .join('\n');
}
 
// =========================
// Time
// =========================
function getTime() {
    return new Date().toLocaleTimeString('vi-VN', { hour12: false });
}
 
// =========================
// Render theo số cột tự động
// =========================
function renderColumns(items, numCols = 3) {
    // Chia items vào từng cột theo thứ tự dọc
    // col1: 0,1,2 / col2: 3,4,5 / col3: 6,7,8 ...
    const rowsPerCol = Math.ceil(items.length / numCols);
    const cols = [];
    for (let c = 0; c < numCols; c++) {
        cols.push(items.slice(c * rowsPerCol, (c + 1) * rowsPerCol));
    }
 
    const maxRows = Math.max(...cols.map(c => c.length));
 
    // Tính colWidth dựa trên label dài nhất
    const maxLabelLen = Math.max(...items.map(m => `[${m.id}]  ${m.label}`.length));
    const colWidth = maxLabelLen + 4; // padding giữa các cột
 
    const lines = [];
    for (let i = 0; i < maxRows; i++) {
        const parts = cols.map((col) => {
            const item = col[i];
            if (!item) return ' '.repeat(colWidth);
            const plain = `[${item.id}]  ${item.label}`;
            const colored = chalk.bold(co(plain));
            return colored + ' '.repeat(Math.max(0, colWidth - plain.length));
        });
        lines.push(parts.join(''));
    }
 
    return lines.join('\n');
}
 
// =========================
// Menu
// =========================
function showMenu() {
    console.clear();
 
    console.log(co2(center(ASCII)));
    console.log('');
    console.log(center(chalk.bold(co2(`DARKNESS | Theme: ${themeName}`))));
    console.log('');
 
    // Render 4 cột như ảnh, căn giữa toàn bộ block
    const mainItems = MENU.filter(m => m.id !== '0');
    const exitItem  = MENU.find(m => m.id === '0');
 
    const menuBlock = renderColumns(mainItems, 4);
    console.log(center(menuBlock));
    console.log('');
 
    // Separator + [0] Thoat ở giữa
    const sepWidth = 40;
    console.log(center(co2('─'.repeat(sepWidth))));
    if (exitItem) {
        console.log(center(chalk.bold(co(`[0]  ${exitItem.label}`))));
    }
    console.log('');
}
 
// =========================
// Main
// =========================
async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
    });
 
    rl.on('close', () => process.exit(0));
    process.on('SIGINT', () => { console.log('\n'); rl.close(); });
 
    while (true) {
        showMenu();
 
        // FIX: viết prompt ra stdout trực tiếp (có màu),
        // KHÔNG truyền ANSI string vào rl.question / ask
        const timeStr = getTime();
        const promptPlain = `[${timeStr}] Chon chuc nang (0-${MENU.filter(m=>m.id!=='0').length}) > `;
        process.stdout.write(center(chalk.bold(co(promptPlain))));
 
        const raw = await new Promise((resolve) => {
            const onLine = (line) => {
                rl.removeListener('line', onLine);
                resolve(line);
            };
            rl.once('line', onLine);
        });
 
        const choice = raw.trim();
        console.log('');
 
        // Exit
        if (choice === '0' || choice.toLowerCase() === 'exit') {
            console.clear();
            console.log(center(chalk.redBright('Tam biet!')));
            rl.close();
            process.exit(0);
        }
 
        // Tìm menu
        const selected = MENU.find(m => m.id === choice);
 
        if (!selected) {
            console.log(center(chalk.redBright(co('Lua chon khong hop le!'))));
            await sleep(1500);
            continue;
        }
 
        // Chạy feature
        try {
            const feature = require(selected.file);
            await feature.run(rl);
        } catch (err) {
            console.log(center(chalk.red(co(`Loi: ${err.message}`))));
            await sleep(2000);
        }
 
        console.log('');
 
        process.stdout.write(center(chalk.bold(co('Enter = Menu | exit = Thoat > '))));
        const back = await new Promise((resolve) => {
            const onLine = (line) => {
                rl.removeListener('line', onLine);
                resolve(line);
            };
            rl.once('line', onLine);
        });
 
        if (back.trim().toLowerCase() === 'exit') {
            console.clear();
            console.log(center(chalk.redBright('Tam biet!')));
            rl.close();
            process.exit(0);
        }
    }
}
 
process.on('uncaughtException', err => {
    console.log(center(chalk.red(`Uncaught: ${err.message}`)));
});
 
process.on('unhandledRejection', r => {
    console.log(center(chalk.red(`Promise: ${String(r)}`)));
});
 
main();
 