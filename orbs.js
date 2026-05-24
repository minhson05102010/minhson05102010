'use strict';

const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const { log, sleep, ask } = require('../utils/theme');

const ORBS_RESULT_FILE = path.join(__dirname, '..', 'orbs_result.txt');

const CLIENT_PROPS = {
  os: 'Windows',
  browser: 'Discord Client',
  release_channel: 'stable',
  client_version: '1.0.9215',
  os_version: '10.0.19045',
  os_arch: 'x64',
  app_arch: 'x64',
  system_locale: 'en-US',
  has_client_mods: false,
  client_launch_id: crypto.randomUUID(),
  browser_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9215 Chrome/138.0.7204.251 Electron/37.6.0 Safari/537.36',
  browser_version: '37.6.0',
  os_sdk_version: '19045',
  client_build_number: 471091,
  native_build_number: 72186,
  client_event_source: null,
  launch_signature: crypto.randomUUID(),
  client_heartbeat_session_id: crypto.randomUUID(),
  client_app_state: 'focused',
};
const USER_AGENT = CLIENT_PROPS.browser_user_agent;
const X_SUPER   = Buffer.from(JSON.stringify(CLIENT_PROPS)).toString('base64');

var T = {
  WATCH_VIDEO:           'WATCH_VIDEO',
  WATCH_VIDEO_ON_MOBILE: 'WATCH_VIDEO_ON_MOBILE',
  PLAY_ON_DESKTOP:       'PLAY_ON_DESKTOP',
  STREAM_ON_DESKTOP:     'STREAM_ON_DESKTOP',
  PLAY_ACTIVITY:         'PLAY_ACTIVITY',
};

function rInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function beep()     { try { process.stdout.write('\x07'); } catch(e){} }

function parseQuestId(s) {
  s = (s||'').trim();
  if (/^\d+$/.test(s)) return s;
  var m = s.match(/quests\/(\d+)/i);
  return m ? m[1] : null;
}

function loadLines(fp) {
  try {
    if (!fs.existsSync(fp)) return [];
    return fs.readFileSync(fp,'utf-8').split(/\r?\n/).map(function(l){return l.trim();}).filter(function(l){return l.length>20;});
  } catch(e){ return []; }
}

function saveLog(line) {
  try { fs.appendFileSync(ORBS_RESULT_FILE, line+'\n','utf-8'); } catch(e){}
}

function api(method, endpoint, token, body) {
  return new Promise(function(resolve) {
    var bs = body !== undefined ? JSON.stringify(body) : null;
    var hdrs = {
      'Authorization':      token,
      'User-Agent':         USER_AGENT,
      'Content-Type':       'application/json',
      'Accept':             '*/*',
      'Accept-Language':    'en-US,en;q=0.9',
      'Origin':             'https://discord.com',
      'Referer':            'https://discord.com/channels/@me',
      'X-Super-Properties': X_SUPER,
      'X-Discord-Locale':   'en-US',
      'X-Discord-Timezone': 'Asia/Saigon',
      'X-Debug-Options':    'bugReporterEnabled',
      'sec-ch-ua':          '"Not)A;Brand";v="8", "Chromium";v="138"',
      'sec-ch-ua-mobile':   '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest':     'empty',
      'sec-fetch-mode':     'cors',
      'sec-fetch-site':     'same-origin',
    };
    if (bs) hdrs['Content-Length'] = Buffer.byteLength(bs);

    var req = https.request({
      hostname: 'discord.com', port: 443,
      path: '/api/v9' + endpoint,
      method: method, headers: hdrs,
      timeout: 30000, rejectUnauthorized: false,
    }, function(res) {
      var d = '';
      res.on('data', function(c){ d+=c; });
      res.on('end', function() {
        var parsed;
        try { parsed = JSON.parse(d); } catch(e){ parsed = d; }
        resolve({ ok: res.statusCode>=200&&res.statusCode<300, status: res.statusCode, data: parsed });
      });
    });
    req.on('error', function(e){ resolve({ok:false,status:0,data:{message:e.message}}); });
    req.setTimeout(30000, function(){ req.destroy(); resolve({ok:false,status:0,data:{message:'Timeout'}}); });
    if (bs) req.write(bs);
    req.end();
  });
}

function getTasks(quest) {
  try {
    var tc = quest.config.task_config_v2 || quest.config.task_config;
    return (tc && tc.tasks) ? tc.tasks : null;
  } catch(e){ return null; }
}

function getTaskConfig(quest) {
  try { return quest.config.task_config_v2 || quest.config.task_config || null; } catch(e){ return null; }
}

function detectType(quest) {
  var tasks = getTasks(quest);
  if (!tasks) return null;

  var order = [T.WATCH_VIDEO, T.PLAY_ON_DESKTOP, T.STREAM_ON_DESKTOP, T.PLAY_ACTIVITY, T.WATCH_VIDEO_ON_MOBILE];
  for (var i=0; i<order.length; i++) {
    if (tasks[order[i]] != null) return order[i];
  }

  var keys = Object.keys(tasks);
  if (keys.length > 0) return keys[0];
  return null;
}

function getTarget(quest) {
  var t = detectType(quest);
  if (!t) return 900;
  try {
    var tasks = getTasks(quest);
    return (tasks && tasks[t] && tasks[t].target) || 900;
  } catch(e){ return 900; }
}

function getProgress(quest) {
  var t = detectType(quest);
  if (!t) return 0;
  try { return (quest.user_status.progress[t] && quest.user_status.progress[t].value) || 0; } catch(e){ return 0; }
}

function getAppId(quest) {
  try {
    var tc = getTaskConfig(quest);
 
    if (tc && tc.developer_application_id) return tc.developer_application_id;
   
    if (quest.config.application && quest.config.application.id) return quest.config.application.id;
    
    var tasks = getTasks(quest);
    if (tasks) {
      var t = detectType(quest);
      if (t && tasks[t] && tasks[t].external_ids && tasks[t].external_ids.length > 0) {
        return tasks[t].external_ids[0];
      }
    }
    return null;
  } catch(e){ return null; }
}

function getReward(quest) {
  try {
    var rewards = quest.config.rewards_config.rewards;
    if (!rewards || !rewards.length) return 'Unknown';
    var r = rewards[0];
    if (r.orb_quantity) return r.orb_quantity + ' Orbs';
    if (r.messages && r.messages.name) return r.messages.name;
    return 'Unknown';
  } catch(e){ return 'Unknown'; }
}

function getName(quest) {
  try { return (quest.config.messages.quest_name||'').trim() || quest.id; } catch(e){ return quest.id; }
}

function isExpired(quest) {
  try { return Date.now() > new Date(quest.config.expires_at).getTime(); } catch(e){ return false; }
}
function isEnrolled(quest)  { try { return !!quest.user_status.enrolled_at; }  catch(e){ return false; } }
function isCompleted(quest) { try { return !!quest.user_status.completed_at; } catch(e){ return false; } }
function isClaimed(quest)   { try { return !!quest.user_status.claimed_at; }   catch(e){ return false; } }

function debugQuest(quest) {
  log.info('  [DEBUG] Quest raw keys: ' + Object.keys(quest||{}).join(', '));
  try {
    log.info('  [DEBUG] config keys: ' + Object.keys(quest.config||{}).join(', '));
    var tc = quest.config.task_config_v2 || quest.config.task_config;
    log.info('  [DEBUG] task_config(v2): ' + JSON.stringify(tc||null).substring(0,300));
    log.info('  [DEBUG] rewards_config: ' + JSON.stringify(quest.config.rewards_config||null).substring(0,200));
    log.info('  [DEBUG] application: ' + JSON.stringify(quest.config.application||null).substring(0,200));
    log.info('  [DEBUG] user_status: ' + JSON.stringify(quest.user_status||null).substring(0,200));
    // In tung task de xem structure
    if (tc && tc.tasks) {
      Object.keys(tc.tasks).forEach(function(k){
        log.info('  [DEBUG] task['+k+']: ' + JSON.stringify(tc.tasks[k]).substring(0,200));
      });
    }
  } catch(e){ log.warn('  [DEBUG] Loi: '+e.message); }
}

async function farmVideo(quest, token) {
  var qid    = quest.id;
  var target = getTarget(quest);
  var done   = getProgress(quest);

  var enrolledAt;
  try {
    enrolledAt = new Date(quest.user_status.enrolled_at).getTime();
    if (isNaN(enrolledAt)) enrolledAt = Date.now();
  } catch(e){ enrolledAt = Date.now(); }

  log.info('  🎬 Video | Target: ' + target + 's | Da xem: ' + done + 's');

  var finished = false;


  while (done < target) {
    var maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + 10;
    var diff = maxAllowed - done;

    if (diff >= 7) {
      var next = Math.min(target, done + 7 + Math.random());
      var res  = await api('POST', '/quests/'+qid+'/video-progress', token, { timestamp: next });

      if (res.status === 429) {
        var wait = ((res.data && res.data.retry_after) || 5);
        log.warn('   Rate limit, doi '+wait+'s...');
        await sleep(wait * 1000);
        continue;
      }
      if (!res.ok) {
        log.warn('   video-progress loi status '+res.status+': '+JSON.stringify(res.data).substring(0,100));
        break;
      }

      done = Math.min(target, done + 7);
      if (res.data && res.data.completed_at) { finished = true; break; }
      log.info('  🎬 '+Math.round(done)+'/'+target+'s ('+Math.round(done/target*100)+'%)');
    }

    if (done >= target) break;
    await sleep(1000);
  }

  if (!finished) {
    var final = await api('POST', '/quests/'+qid+'/video-progress', token, { timestamp: target });
    log.info('   Gui timestamp cuoi '+target+'s: status '+final.status);
  }

  log.success(' Video hoan thanh!');
  return true;
}

async function farmGame(quest, token) {
  var qid   = quest.id;
  var appId = getAppId(quest);
  var target = getTarget(quest); 
  if (!appId) {
    log.error('   Khong tim duoc application_id! Quest nay co the khong ho tro auto farm game.');
    var _tc = getTaskConfig(quest); log.info('  [DEBUG] task_config(v2): ' + JSON.stringify(_tc).substring(0,300));
    return false;
  }

  var totalMin = Math.ceil(target / 60);
  log.info(' Game | AppID: '+appId+' | Can: ~'+totalMin+' phut | Heartbeat moi 60s');

  var completed = false;
  var maxHB = totalMin + 5; 

  for (var h = 0; h < maxHB; h++) {
    var res = await api('POST', '/quests/'+qid+'/heartbeat', token, {
      application_id: appId,
      terminal: false,
    });

    if (res.status === 429) {
      var wait = ((res.data && res.data.retry_after) || 60);
      log.warn('   Rate limit, doi '+wait+'s...');
      await sleep(wait * 1000);
      h--;
      continue;
    }
    if (!res.ok) {
      log.warn('   Heartbeat loi status '+res.status+': '+JSON.stringify(res.data).substring(0,100));
      if (res.status === 400 || res.status === 404) break;
    }

    
    if (res.data && res.data.completed_at) {
      completed = true;
      log.success('   Game quest hoan thanh!');
      break;
    }

   
    if (res.data && res.data.user_id) quest.user_status = res.data;
  
    var curVal = 0;
    try {
      var _t2 = detectType(quest);
      curVal = (res.data && res.data.progress && res.data.progress[_t2] && res.data.progress[_t2].value) || 0;
    } catch(e){}
    log.info('  🎮 HB '+(h+1)+'/'+maxHB+' | '+(curVal?Math.round(curVal/60)+'min':'OK'));

    if (h < maxHB-1) {
      log.info('Doi 60s...');
      await sleep(60000);
    }
  }


  await api('POST', '/quests/'+qid+'/heartbeat', token, {
    application_id: appId,
    terminal: true,
  });
  log.info('  Da gui terminal heartbeat');
  return completed;
}

async function processQuest(quest, token, mode, debug) {
  var name   = getName(quest);
  var type   = detectType(quest);
  var reward = getReward(quest);

  log.info('');
  log.info('  📋 '+name);
  log.info('  🎯 ID: '+quest.id+' | Loai: '+(type||'?')+' | Phan thuong: '+reward);

  if (debug) debugQuest(quest);

  if (isClaimed(quest))   { log.success('   Da nhan phan thuong, bo qua.'); return 'claimed'; }
  if (isExpired(quest))   { log.warn('   Da het han.'); return 'expired'; }
  if (isCompleted(quest)) {
    log.success('  ✅ Da hoan thanh — vao Discord de claim!');
    log.info('  🔗 https://discord.com/quests/'+quest.id);
    return 'completed_unclaimed';
  }

  
  var isVid  = type===T.WATCH_VIDEO || type===T.WATCH_VIDEO_ON_MOBILE;
  var isGame = type===T.PLAY_ON_DESKTOP || type===T.STREAM_ON_DESKTOP;

  if (mode==='1' && !isVid)  { log.warn('  ⚠ Khong phai quest video, bo qua.'); return 'wrong_type'; }
  if (mode==='2' && !isGame) { log.warn('  ⚠ Khong phai quest game, bo qua.'); return 'wrong_type'; }
  if (!isVid && !isGame)     { log.warn('  ⚠ Loai ['+type+'] chua ho tro.'); return 'unsupported'; }

 
  if (!isEnrolled(quest)) {
    log.info('  [~] Chua enroll, dang tham gia...');
    var er = await api('POST', '/quests/'+quest.id+'/enroll', token, {
      location: 11, is_targeted: false, metadata_raw: null,
    });
    if (!er.ok) {
      log.error('  ❌ Enroll that bai: '+er.status+' | '+JSON.stringify(er.data).substring(0,100));
      return 'enroll_failed';
    }
    
    quest.user_status = er.data;
    log.success('  ✅ Enroll thanh cong!');
    await sleep(2000);
  }

  // Farm
  if (isVid)  await farmVideo(quest, token);
  if (isGame) await farmGame(quest, token);

  log.info('');
  log.info('  ─'.repeat(28));
  log.info('  ✅ XONG: '+name);
  log.info('  💡 Vao Discord > Quests de nhan phan thuong thu cong');
  log.info('  🔗 https://discord.com/quests/'+quest.id);
  log.info('  ─'.repeat(28));
  return 'done';
}


async function run(rl) {
  log.info('');
  log.info('╔'+'='.repeat(58)+'╗');
  log.info('║       Darkness Tool         ║');
  log.info('╚'+'='.repeat(58)+'╝');
  log.info('');
  log.info('  Dang 1: Xem video  🎬  (WATCH_VIDEO)');
  log.info('  Dang 2: Choi game  🎮  (PLAY_ON_DESKTOP)');
  log.info('');

  var mode = (await ask(rl,'   Chon dang (1/2): ')).trim();
  if (mode!=='1'&&mode!=='2'){ log.error('Chon 1 hoac 2!'); return; }
  log.success('[+] Mode: '+(mode==='1'?' Xem video':' Choi game'));
  log.info('');

  
  var dbgInput = (await ask(rl,'   Bat debug de xem raw data? (y/N): ')).trim().toLowerCase();
  var debug = dbgInput === 'y';

 
  log.info('');
  log.info('[~] Nhap quest ID/link hoac Enter de lay tat ca quest pending:');
  var qi = (await ask(rl,'  🔗 Quest (Enter = tat ca): ')).trim();
  var questId = qi ? parseQuestId(qi) : null;
  if (qi && !questId){ log.error('Link/ID khong hop le!'); return; }
  log.info('');

  
  log.info('[~] Chon token:  1=Nhap tay  2=token.txt');
  var tm = (await ask(rl,'   (1/2): ')).trim();
  var tokens = [];
  if (tm==='2'){
    tokens = loadLines(path.join(__dirname,'..','token.txt'));
    if (!tokens.length){ log.error('token.txt trong!'); return; }
    log.success('[+] '+tokens.length+' token');
  } else {
    var tk = (await ask(rl,'   Token: ')).trim();
    if (tk.length<20){ log.error('Token qua ngan!'); return; }
    tokens = [tk];
  }
  log.info('');

  var summary = [];

  for (var ti=0; ti<tokens.length; ti++) {
    var token = tokens[ti];
    log.info('═'.repeat(60));
    log.info('  Token ['+(ti+1)+'/'+tokens.length+']: '+token.substring(0,25)+'...');


    var me = await api('GET','/users/@me',token);
    if (!me.ok || !me.data || !me.data.id){
      log.error('  ❌ Token khong hop le! Status: '+me.status);
      if (debug) log.info('  [DEBUG] Response: '+JSON.stringify(me.data).substring(0,200));
      summary.push({ user:'INVALID', result:'invalid_token' });
      continue;
    }
    var user = me.data;
    log.success('   '+user.username+' ('+user.id+')');


    var balR = await api('GET','/users/@me/virtual-currency/balance',token);
    var balBefore = (balR.ok && balR.data) ? balR.data.balance : null;
    if (balBefore!==null) log.info('   Orbs hien tai: '+balBefore);

   
    var quests = [];

    if (questId) {
      
      var allR = await api('GET','/quests/@me',token);
      if (debug) log.info('  [DEBUG] /quests/@me status: '+allR.status+' | keys: '+Object.keys(allR.data||{}).join(', '));

      if (allR.ok && allR.data && allR.data.quests) {
        var found = null;
        for (var q of allR.data.quests) {
          if (q.id === questId) { found = q; break; }
        }
        // Neu khong co trong @me, thu endpoint don le
        if (!found) {
          var qr = await api('GET','/quests/'+questId,token);
          if (debug) log.info('  [DEBUG] /quests/'+questId+' status: '+qr.status);
          if (qr.ok && qr.data && qr.data.id) found = qr.data;
        }
        if (found) {
          quests = [found];
          log.success('  ✅ Tim thay: '+getName(found));
          if (debug) debugQuest(found);
        } else {
          log.error('  ❌ Khong tim thay quest '+questId);
          summary.push({ user:user.username, result:'quest_not_found' });
          continue;
        }
      } else {
        log.error('  ❌ Khong lay duoc quest list: '+allR.status);
        if (debug) log.info('  [DEBUG] '+JSON.stringify(allR.data).substring(0,300));
        summary.push({ user:user.username, result:'api_error' });
        continue;
      }
    } else {
      
      var allR2 = await api('GET','/quests/@me',token);
      if (!allR2.ok || !allR2.data || !allR2.data.quests){
        log.error('  ❌ Loi lay quest list: '+allR2.status);
        if (debug) log.info('  [DEBUG] '+JSON.stringify(allR2.data).substring(0,300));
        summary.push({ user:user.username, result:'api_error' });
        continue;
      }

      var all = allR2.data.quests;
      log.info('  📋 Tong cong '+all.length+' quest');

      if (debug && all.length > 0) {
        log.info('  [DEBUG] Quest mau dau tien:');
        debugQuest(all[0]);
      }

      
      quests = all.filter(function(q){
        if (isClaimed(q) || isExpired(q)) return false;
        var t = detectType(q);
        if (mode==='1') return t===T.WATCH_VIDEO || t===T.WATCH_VIDEO_ON_MOBILE;
        if (mode==='2') return t===T.PLAY_ON_DESKTOP || t===T.STREAM_ON_DESKTOP;
        return false;
      });

      if (!quests.length){
        var modeLabel = mode==='1'?'video':'game';
        log.warn('  ⚠ Khong co quest ['+modeLabel+'] pending!');
        log.info('  📋 Danh sach tat ca quest:');
        all.forEach(function(q){
          var t   = detectType(q);
          var st  = isClaimed(q)?'Claimed':(isCompleted(q)?'Done':(isExpired(q)?'Expired':'Pending'));
          log.info('     ['+( t||'?')+'] '+getName(q)+' | '+st+' | '+getReward(q));
        });
        summary.push({ user:user.username, result:'no_matching_quests' });
        continue;
      }
      log.success('  ✅ '+quests.length+' quest phu hop');
    }

  
    var results = [];
    for (var qi2=0; qi2<quests.length; qi2++) {
      var result = await processQuest(quests[qi2], token, mode, debug);
      results.push({ name: getName(quests[qi2]), reward: getReward(quests[qi2]), result: result });
      saveLog('['+new Date().toISOString()+'] '+user.username+' | '+getName(quests[qi2])+' | '+result);
      if (qi2 < quests.length-1) await sleep(3000);
    }

    
    var balR2 = await api('GET','/users/@me/virtual-currency/balance',token);
    var balAfter = (balR2.ok && balR2.data) ? balR2.data.balance : null;
    var gained = (balBefore!==null && balAfter!==null) ? balAfter - balBefore : null;

    if (balAfter!==null){
      log.info('');
      log.info('   Truoc: '+(balBefore||'?')+' | Sau: '+balAfter+(gained&&gained>0?' | +'+gained+' Orbs!':''));
    }

    summary.push({ user:user.username, orbsBefore:balBefore, orbsAfter:balAfter, gained:gained, quests:results });

    if (ti < tokens.length-1){ log.info(''); log.info('[~] Doi 5s...'); await sleep(5000); }
  }

  
  log.info('');
  log.info('╔'+'='.repeat(58)+'╗');
  log.info('║                  📊 TONG KET                     ║');
  log.info('╚'+'='.repeat(58)+'╝');
  summary.forEach(function(s){
    log.info('  👤 '+(s.user||'?'));
    if (s.orbsAfter!=null) log.info('     🔮 '+(s.orbsBefore||'?')+' → '+s.orbsAfter+(s.gained>0?' (+'+s.gained+')':''));
    if (s.quests) s.quests.forEach(function(q){
      var icon = q.result==='done'?'✅':(q.result==='claimed'||q.result==='completed_unclaimed'?'🎁':'⚠');
      log.info('     '+icon+' '+q.name+' | '+q.reward+' | '+q.result);
    });
    else log.info('     ❌ '+(s.result||''));
    log.info('');
  });
  log.info('  📁 Log: '+ORBS_RESULT_FILE);
  log.info('  💡 Claim thu cong tren Discord > Quests');
  log.info('═'.repeat(60));
  log.info('');
  beep();
}

module.exports = { run: run };
