
const SUITS = [
  {name:'spade', symbol:'&spades;', color:'black'},
  {name:'heart', symbol:'&hearts;', color:'red'},
  {name:'diamond', symbol:'&diams;', color:'red'},
  {name:'club', symbol:'&clubs;', color:'black'}
];

function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function pick(arr){ return arr[randInt(0,arr.length-1)]; }

function makeCard(rank){
  const suit = pick(SUITS);
  return { rank: rank, suit: suit, value: rankValue(rank) };
}
function rankValue(rank){
  if(rank==='A') return 11;
  if(['10','J','Q','K'].includes(rank)) return 10;
  return parseInt(rank,10);
}
function cardHTML(card){
  const colorClass = card.suit.color === 'red' ? 'red' : '';
  return '<div class="card '+colorClass+'">'
    +'<div class="rank-top">'+card.rank+'</div>'
    +'<div class="suit-mid">'+card.suit.symbol+'</div>'
    +'<div class="rank-bottom">'+card.rank+'</div>'
    +'</div>';
}

// ---------- Storage availability check ----------
function isLocalStorageAvailable(){
  try{
    const testKey = '__bj_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  }catch(e){
    return false;
  }
}
const storageOK = isLocalStorageAvailable();
if(!storageOK){
  document.getElementById('storageWarning').classList.add('show');
}

// ---------- Persistence (localStorage) ----------
const STORAGE_KEY = 'bjTrainerState_v1';

function loadState(){
  if(!storageOK) return null;
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){
    return null;
  }
}

function buildStateObject(){
  return {
    statTotal: statTotal,
    statCorrect: statCorrect,
    reviewQueue: reviewQueue,
    questionCounter: questionCounter,
    rules: rules,
    categoryStats: categoryStats,
    cellStats: cellStats,
    currentStreak: currentStreak,
    bestStreak: bestStreak
  };
}

function saveState(){
  if(!storageOK) return;
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildStateObject()));
  }catch(e){
    // localStorage unavailable or full; ignore silently
  }
}

// ---------- Export / Import progress ----------
function exportProgress(){
  try{
    const data = JSON.stringify(buildStateObject(), null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = 'bj-trainer-progress-'+ts+'.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }catch(e){
    alert('エクスポートに失敗しました: '+e.message);
  }
}

function importProgress(file){
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const data = JSON.parse(e.target.result);
      if(typeof data.statTotal === 'number') statTotal = data.statTotal;
      if(typeof data.statCorrect === 'number') statCorrect = data.statCorrect;
      if(Array.isArray(data.reviewQueue)) reviewQueue = data.reviewQueue;
      if(typeof data.questionCounter === 'number') questionCounter = data.questionCounter;
      if(data.rules) Object.assign(rules, data.rules);
      if(data.categoryStats) Object.assign(categoryStats, data.categoryStats);
      if(data.cellStats) Object.assign(cellStats, data.cellStats);
      if(typeof data.currentStreak === 'number') currentStreak = data.currentStreak;
      if(typeof data.bestStreak === 'number') bestStreak = data.bestStreak;
      saveState();
      refreshToggleUI();
      updateSurrenderVisibility();
      updateMenuStats();
      alert('進捗を読み込みました。');
    }catch(err){
      alert('インポートに失敗しました。ファイル形式を確認してください: '+err.message);
    }
  };
  reader.readAsText(file);
}

// ---------- House rules state ----------
const rules = {
  soft17: 'S17',
  das: 'yes',
  surrender: 'no',
  doubleRestriction: 'any',
  decks: 6
};

const savedState = loadState();
if(savedState && savedState.rules){
  Object.assign(rules, savedState.rules);
}

function refreshToggleUI(){
  document.querySelectorAll('.toggle-group').forEach(group => {
    const ruleName = group.dataset.rule;
    group.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === rules[ruleName]);
    });
  });
  document.getElementById('deckSelect').value = String(rules.decks);
}

document.querySelectorAll('.toggle-group').forEach(group => {
  const ruleName = group.dataset.rule;
  group.querySelectorAll('.toggle-btn').forEach(btn => {
    if(btn.dataset.value === rules[ruleName]) btn.classList.add('active');
    btn.addEventListener('click', () => {
      group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      rules[ruleName] = btn.dataset.value;
      updateSurrenderVisibility();
      if(currentView === 'chart'){ renderChart(); }
      saveState();
    });
  });
});
document.getElementById('deckSelect').addEventListener('change', (e) => {
  rules.decks = parseInt(e.target.value,10);
  if(currentView === 'chart'){ renderChart(); }
  saveState();
});
refreshToggleUI();

const rulesToggle = document.getElementById('rulesToggle');
const rulesBody = document.getElementById('rulesBody');
const rulesArrow = document.getElementById('rulesArrow');
rulesToggle.addEventListener('click', () => {
  rulesBody.classList.toggle('open');
  rulesArrow.innerHTML = rulesBody.classList.contains('open') ? '&#x25B2;' : '&#x25BC;';
});

const surrenderBtn = document.getElementById('surrenderBtn');
function hasSurrender(){ return rules.surrender === 'yes'; }
function updateSurrenderVisibility(){
  surrenderBtn.style.display = hasSurrender() ? 'block' : 'none';
}
updateSurrenderVisibility();

function ruleSummaryText(){
  const s17label = rules.soft17 === 'S17' ? 'S17（ソフト17でスタンド）' : 'H17（ソフト17でもヒット）';
  const dasLabel = rules.das === 'yes' ? 'DASあり' : 'DASなし';
  const srLabel = rules.surrender === 'yes' ? 'サレンダーあり' : 'サレンダーなし';
  const drLabel = rules.doubleRestriction === '9-11' ? 'ダブルは9-11のみ' : 'ダブル制限なし';
  return '['+s17label+' / '+dasLabel+' / '+srLabel+' / '+drLabel+' / '+rules.decks+'デッキ]';
}

// ---------- Basic strategy engine (rule-aware) ----------
function dealerCode(card){
  if(card.rank === 'A') return 'A';
  if(['10','J','Q','K'].includes(card.rank)) return 10;
  return parseInt(card.rank,10);
}
function inRange(v, lo, hi){ return v >= lo && v <= hi; }
function isH17(){ return rules.soft17 === 'H17'; }
function hasDAS(){ return rules.das === 'yes'; }
function isDoubleAllowed(total){
  if(rules.doubleRestriction !== '9-11') return true;
  return total === 9 || total === 10 || total === 11;
}

function correctActionForHard(total, dealerV){
  if(total <= 8){
    return {action:'hit', rule:'合計8以下は、ディーラーの見せ札が2〜A（全範囲）のどれでも必ずヒットです。'};
  }
  if(total === 9){
    if(inRange(dealerV,3,6)) return {action:'double', rule:'合計9は、ディーラーの見せ札が3〜6のときは常にダブルダウンです（同じ根拠で合計9・ディーラー3〜6の全マスがダブルダウンになります）。'};
    return {action:'hit', rule:'合計9で、ディーラーの見せ札が2、または7〜Aのときはヒットです（3〜6以外の全マスが同じ根拠でヒット）。'};
  }
  if(total === 10){
    if(dealerV!=='A' && inRange(dealerV,2,9)) return {action:'double', rule:'合計10は、ディーラーの見せ札が2〜9のときは常にダブルダウンです（この範囲の全マスが同一根拠）。'};
    return {action:'hit', rule:'合計10で、ディーラーの見せ札が10またはAのときはヒットです。'};
  }
  if(total === 11){
    if(dealerV!=='A') return {action:'double', rule:'合計11は、ディーラーの見せ札がA以外（2〜10）なら常にダブルダウンです（同一根拠で全マスが該当）。'};
    if(isH17()) return {action:'double', rule:'合計11 vs ディーラーAは、H17ルールではダブルダウンが正解です（S17ではヒット）。H17ではディーラーがソフト17でもヒットしてバーストしやすくなるため、Aに対しても強気にダブルダウンします。'};
    return {action:'hit', rule:'合計11で、ディーラーの見せ札がAのときはヒットです（S17ルール）。同じ合計11・ディーラーAでもH17ルールに切り替えるとダブルダウンに変わります。'};
  }
  if(total === 12){
    if(dealerV!=='A' && inRange(dealerV,4,6)) return {action:'stand', rule:'合計12は、ディーラーの見せ札が4〜6のときはスタンドです（この範囲の全マスが同一根拠：ディーラーのバースト率が高いため様子見）。'};
    return {action:'hit', rule:'合計12で、ディーラーの見せ札が2〜3または7以上（4〜6以外）のときはヒットです。'};
  }
  if(inRange(total,13,16)){
    if(hasSurrender()){
      if(total === 16 && dealerV!=='A' && inRange(dealerV,9,10)){
        return {action:'surrender', rule:'合計16は、サレンダーが使えるルールでは、ディーラーの見せ札が9・10のときサレンダーが最適です（16 vs 9・10・Aは同一根拠でサレンダー対象、S17/H17を問いません）。'};
      }
      if(total === 16 && dealerV==='A'){
        return {action:'surrender', rule:'合計16は、サレンダーが使えるルールでは、ディーラーの見せ札がAのときサレンダーが最適です（16 vs 9・10・Aは同一根拠でサレンダー対象、S17/H17を問いません）。'};
      }
      if(total === 15 && dealerV!=='A' && dealerV===10){
        return {action:'surrender', rule:'合計15は、サレンダーが使えるルールでは、ディーラーの見せ札が10のときサレンダーが最適です（S17/H17を問いません）。'};
      }
      if(total === 15 && dealerV==='A' && isH17()){
        return {action:'surrender', rule:'合計15 vs ディーラーAは、H17かつサレンダーが使えるルールでは、サレンダーが最適です（S17では通常ヒット）。H17ではディーラーの強さが増すため、S17より広い範囲でサレンダー対象が拡大します。'};
      }
    }
    if(dealerV!=='A' && inRange(dealerV,2,6)) return {action:'stand', rule:'合計13〜16は、ディーラーの見せ札が2〜6のときは常にスタンドです（この範囲の全マスが同一根拠：ディーラーのバースト率が高いため）。'};
    return {action:'hit', rule:'合計13〜16で、ディーラーの見せ札が7以上（2〜6以外）のときはヒットです。'};
  }
  if(total === 17){
    if(hasSurrender() && dealerV==='A' && isH17()){
      return {action:'surrender', rule:'合計17 vs ディーラーAは、H17かつサレンダーが使えるルールでは、サレンダーが最適です（S17ではこのサレンダーは不要でスタンドが正解）。ハード17でサレンダーが正解になるのはこの組み合わせのみです。'};
    }
    return {action:'stand', rule:'合計17は、ディーラーの見せ札に関わらず（2〜Aの全範囲）常にスタンドです。ただしH17かつサレンダーが使えるルールで、ディーラーの見せ札がAのときはサレンダーが優先されます。'};
  }
  return {action:'stand', rule:'合計18以上は、ディーラーの見せ札に関わらず（2〜Aの全範囲）常にスタンドです。'};
}

function correctActionForSoft(total, dealerV){
  if(total === 13 || total === 14){
    if(dealerV!=='A' && inRange(dealerV,5,6) && isDoubleAllowed(total)){
      return {action:'double', rule:'ソフト13・14（A+2 / A+3）は、ディーラーの見せ札が5〜6のときダブルダウンです（この範囲の全マスが同一根拠）。それ以外はヒットです。'};
    }
    if(dealerV!=='A' && inRange(dealerV,5,6) && !isDoubleAllowed(total)){
      return {action:'hit', rule:'ソフト13・14（A+2 / A+3） vs 5〜6は、本来はダブルダウンが最適ですが、「ダブルダウンは合計9・10・11のみ」というルール制限があるため、ダブルできずヒットが次善手になります。'};
    }
    return {action:'hit', rule:'ソフト13・14（A+2 / A+3）で、ディーラーの見せ札が5〜6以外のときはヒットです。'};
  }
  if(total === 15 || total === 16){
    if(dealerV!=='A' && inRange(dealerV,4,6) && isDoubleAllowed(total)){
      return {action:'double', rule:'ソフト15・16（A+4 / A+5）は、ディーラーの見せ札が4〜6のときダブルダウンです（この範囲の全マスが同一根拠：ディーラーが弱いため強化）。それ以外はヒットです。'};
    }
    if(dealerV!=='A' && inRange(dealerV,4,6) && !isDoubleAllowed(total)){
      return {action:'hit', rule:'ソフト15・16（A+4 / A+5） vs 4〜6は、本来はダブルダウンが最適ですが、「ダブルダウンは合計9・10・11のみ」というルール制限があるため、ダブルできずヒットが次善手になります。'};
    }
    return {action:'hit', rule:'ソフト15・16（A+4 / A+5）で、ディーラーの見せ札が4〜6以外のときはヒットです。'};
  }
  if(total === 17){
    if(dealerV!=='A' && inRange(dealerV,3,6) && isDoubleAllowed(total)){
      return {action:'double', rule:'ソフト17（A+6）は、ディーラーの見せ札が3〜6のときダブルダウンです（この範囲の全マスが同一根拠）。それ以外はヒットです。'};
    }
    if(dealerV!=='A' && inRange(dealerV,3,6) && !isDoubleAllowed(total)){
      return {action:'hit', rule:'ソフト17（A+6） vs 3〜6は、本来はダブルダウンが最適ですが、「ダブルダウンは合計9・10・11のみ」というルール制限があるため、ダブルできずヒットが次善手になります。'};
    }
    return {action:'hit', rule:'ソフト17（A+6）で、ディーラーの見せ札が3〜6以外（2・7〜A）のときはヒットです。'};
  }
  if(total === 18){
    if(dealerV!=='A' && dealerV===2){
      if(isH17()){
        if(isDoubleAllowed(total)) return {action:'double', rule:'ソフト18（A+7） vs ディーラー2は、H17ルールではダブルダウンが正解です（S17ではスタンド）。H17ではディーラーがバーストしやすい2で、より強気に攻めます。'};
        return {action:'stand', rule:'ソフト18（A+7） vs ディーラー2は、H17ルールでは本来ダブルダウンが最適ですが、「ダブルダウンは合計9・10・11のみ」というルール制限があるため、ダブルできずスタンドが次善手になります。'};
      }
      return {action:'stand', rule:'ソフト18（A+7） vs ディーラー2は、S17ルールではスタンドです。同じ組み合わせでもH17ルールに変えるとダブルダウンに変わります。'};
    }
    if(dealerV!=='A' && inRange(dealerV,3,6)){
      if(isDoubleAllowed(total)) return {action:'double', rule:'ソフト18（A+7）は、ディーラーの見せ札が3〜6のときはダブルダウンです（この範囲の全マスが同一根拠：ディーラーが弱いため強化）。'};
      return {action:'stand', rule:'ソフト18（A+7） vs 3〜6は、本来はダブルダウンが最適ですが、「ダブルダウンは合計9・10・11のみ」というルール制限があるため、ダブルできずスタンドが次善手になります。'};
    }
    if(dealerV!=='A' && (dealerV===7 || dealerV===8)) return {action:'stand', rule:'ソフト18（A+7）は、ディーラーの見せ札が7・8のときはスタンドです。'};
    return {action:'hit', rule:'ソフト18（A+7）で、ディーラーの見せ札が9・10・Aのときはヒットです。'};
  }
  if(total === 19){
    if(dealerV!=='A' && dealerV===6 && isH17()){
      if(isDoubleAllowed(total)) return {action:'double', rule:'ソフト19（A+8） vs ディーラー6は、H17ルールではダブルダウンが正解です（S17ではスタンド）。H17によりディーラー6のバースト期待が上がるため強化されます。'};
      return {action:'stand', rule:'ソフト19（A+8） vs ディーラー6は、H17ルールでは本来ダブルダウンが最適ですが、「ダブルダウンは合計9・10・11のみ」というルール制限があるため、ダブルできずスタンドが次善手になります。'};
    }
    return {action:'stand', rule:'ソフト19（A+8）は、ディーラーの見せ札に関わらずスタンドです（H17かつディーラー6の場合のみダブルダウンに変わります）。'};
  }
  return {action:'stand', rule:'ソフト20以上（A+9以上）は、ディーラーの見せ札に関わらず（2〜Aの全範囲）常にスタンドです。'};
}

function correctActionForPair(rankVal, dealerV){
  if(rankVal === 'A'){
    return {action:'split', rule:'A・Aは、ディーラーの見せ札に関わらず（2〜Aの全範囲）常にスプリットです。'};
  }
  if(rankVal === 8){
    if(dealerV==='A' && hasSurrender() && isH17()){
      return {action:'surrender', rule:'8・8 vs ディーラーAは、H17かつサレンダーが使えるルールでは、サレンダーが最適です（それ以外の設定・ディーラー見せ札ではスプリット）。'};
    }
    return {action:'split', rule:'8・8は、ディーラーの見せ札に関わらず常にスプリットです。'};
  }
  if(rankVal === 10){
    return {action:'stand', rule:'10・10は、ディーラーの見せ札に関わらず絶対にスプリットしません（20はすでに強い手のためスタンド扱い）。'};
  }
  if(rankVal === 9){
    if(dealerV!=='A' && [7,10].includes(dealerV)) return {action:'stand', rule:'9・9（合計18）は、ディーラーの見せ札が7または10のときはスプリットせず、そのままスタンドします。すでに18という強い手なので、無理にヒットする必要はありません。'};
    if(dealerV==='A') return {action:'stand', rule:'9・9（合計18）は、ディーラーの見せ札がAのときはスプリットせず、そのままスタンドします。'};
    return {action:'split', rule:'9・9は、ディーラーの見せ札が7・10・A以外（2〜6、8）なら常にスプリットです（同一根拠で該当範囲の全マス）。'};
  }
  if(rankVal === 7){
    if(dealerV!=='A' && inRange(dealerV,2,7)) return {action:'split', rule:'7・7は、ディーラーの見せ札が2〜7のときは常にスプリットです（この範囲の全マスが同一根拠）。'};
    return {action:'hit', rule:'7・7で、ディーラーの見せ札が8以上・Aのときはスプリットしません（ヒット）。'};
  }
  if(rankVal === 6){
    const lo = hasDAS() ? 2 : 3;
    if(dealerV!=='A' && inRange(dealerV,lo,6)){
      return {action:'split', rule: hasDAS()
        ? '6・6は、DASありのルールでは、ディーラーの見せ札が2〜6のときスプリットです（DASによりスプリット後さらにダブルダウンできるため対象範囲が広がります）。'
        : '6・6は、DASなしのルールでは、ディーラーの見せ札が3〜6のときのみスプリットです（2は見送りでヒットに変わります）。'};
    }
    return {action:'hit', rule: hasDAS()
      ? '6・6は、DASありのルールでは、ディーラーの見せ札が7以上またはAのときはスプリットせずヒットです。'
      : '6・6は、DASなしのルールでは、ディーラーの見せ札が2、または7以上・Aのときはスプリットせずヒットです（2は6・6では見送り対象です）。'};
  }
  if(rankVal === 4){
    if(hasDAS() && dealerV!=='A' && (dealerV===5||dealerV===6)){
      return {action:'split', rule:'4・4は、DASありのルールで、ディーラーの見せ札が5〜6のときのみスプリットです（DASなしでは常にヒットに変わります）。'};
    }
    return {action:'hit', rule: hasDAS()
      ? '4・4で、ディーラーの見せ札が5〜6以外のときはスプリットせずヒットです。'
      : '4・4は、DASなしのルールでは常にスプリットせずヒットです。'};
  }
  if(rankVal === 2 || rankVal === 3){
    const lo = hasDAS() ? 2 : 4;
    if(dealerV!=='A' && inRange(dealerV,lo,7)){
      return {action:'split', rule: hasDAS()
        ? (rankVal===2?'2・2':'3・3')+'は、DASありのルールでは、ディーラーの見せ札が2〜7のときスプリットです（DASによりスプリット後さらにダブルダウンできるため対象範囲が広がります）。'
        : (rankVal===2?'2・2':'3・3')+'は、DASなしのルールでは、ディーラーの見せ札が4〜7のときのみスプリットです（2〜3は見送りでヒットに変わります）。'};
    }
    return {action:'hit', rule: hasDAS()
      ? (rankVal===2?'2・2':'3・3')+'は、DASありのルールでは、ディーラーの見せ札が8以上（8・9・10・A）のときはスプリットせずヒットです。'
      : (rankVal===2?'2・2':'3・3')+'は、DASなしのルールでは、ディーラーの見せ札が2〜3、または8以上（8・9・10・A）のときはスプリットせずヒットです（DASなしでは2〜3も見送り対象です）。'};
  }
  if(rankVal === 5){
    return correctActionForHard(10, dealerV);
  }
  return {action:'hit', rule:''};
}

// ---------- Adaptive question type weighting (category-level, kept for stats display) ----------
let categoryStats = { hard:{total:0,correct:0}, soft:{total:0,correct:0}, pair:{total:0,correct:0} };
if(savedState && savedState.categoryStats){
  Object.assign(categoryStats, savedState.categoryStats);
}

// ---------- Cell-level weak-point tracking ----------
// cellStats key format: "<category>|<totalOrRank>|<dealerV>" -> {total, correct}
let cellStats = {};
if(savedState && savedState.cellStats){
  Object.assign(cellStats, savedState.cellStats);
}

function cellKey(category, cellValue, dealerV){
  return category+'|'+cellValue+'|'+dealerV;
}

function recordCellResult(category, cellValue, dealerV, isCorrect){
  const key = cellKey(category, cellValue, dealerV);
  if(!cellStats[key]) cellStats[key] = {total:0, correct:0};
  cellStats[key].total++;
  if(isCorrect) cellStats[key].correct++;
}

function weightForCell(category, cellValue, dealerV){
  const key = cellKey(category, cellValue, dealerV);
  const s = cellStats[key];
  if(!s || s.total < 2) return 1;
  const errorRate = 1 - (s.correct / s.total);
  return 1 + errorRate * 4;
}

function weightForCategory(cat){
  const s = categoryStats[cat];
  if(!s || s.total < 3) return 1;
  const errorRate = 1 - (s.correct / s.total);
  return 1 + errorRate * 2;
}

function pickWeightedType(){
  const types = ['hard','soft','pair'];
  const weights = types.map(weightForCategory);
  const sum = weights.reduce((a,b)=>a+b,0);
  let r = Math.random() * sum;
  for(let i=0;i<types.length;i++){
    if(r < weights[i]) return types[i];
    r -= weights[i];
  }
  return types[types.length-1];
}

// Weighted pick among the candidate cell values for a given category (dealer card is drawn independently below)
function pickWeightedCellValue(category, candidates, dealerV){
  const weights = candidates.map(v => weightForCell(category, v, dealerV));
  const sum = weights.reduce((a,b)=>a+b,0);
  let r = Math.random() * sum;
  for(let i=0;i<candidates.length;i++){
    if(r < weights[i]) return candidates[i];
    r -= weights[i];
  }
  return candidates[candidates.length-1];
}

// ---------- Question generation ----------
const tenRanks = ['10','J','Q','K'];
function randomRankValue10(){ return pick(tenRanks); }

function genDealerCard(){
  const kind = randInt(1,13);
  if(kind === 1) return makeCard('A');
  if(kind >= 10) return makeCard(randomRankValue10());
  return makeCard(String(kind));
}

// Candidate cell values per category, used for weighted (weak-point) selection
const HARD_TOTAL_CANDIDATES = [8,9,10,11,12,13,14,15,16,17,18];
const SOFT_X_CANDIDATES = [2,3,4,5,6,7,8,9]; // soft total = 11+x
const PAIR_RANK_CANDIDATES = ['A',2,3,4,5,6,7,8,9,10];

function genQuestion(){
  const type = pickWeightedType();
  const dealer = genDealerCard();
  const dealerV = dealerCode(dealer);
  let player, category, total, meta, cellValue;

  if(type === 'pair'){
    const rv = pickWeightedCellValue('pair', PAIR_RANK_CANDIDATES, dealerV);
    let rankStr;
    if(rv==='A') rankStr='A';
    else if(rv===10) rankStr = randomRankValue10();
    else rankStr = String(rv);
    const c1 = makeCard(rankStr);
    const c2 = makeCard(rankStr);
    player = [c1,c2];
    category = 'pair';
    cellValue = rv;
    meta = correctActionForPair(rv, dealerV);
    total = (rv==='A'?'A':rankStr)+'・'+(rv==='A'?'A':rankStr);
  } else if(type === 'soft'){
    const x = pickWeightedCellValue('soft', SOFT_X_CANDIDATES, dealerV);
    const c1 = makeCard('A');
    let rankStr2 = (x===10)?randomRankValue10():String(x);
    const c2 = makeCard(rankStr2);
    player = [c1,c2];
    category = 'soft';
    const softTotal = 11 + x;
    cellValue = softTotal;
    meta = correctActionForSoft(softTotal, dealerV);
    total = 'ソフト '+softTotal;
  } else {
    const hardTotal = pickWeightedCellValue('hard', HARD_TOTAL_CANDIDATES, dealerV);
    // build two card values that sum to hardTotal (avoid pairs; hard totals only, no soft ace)
    let v1, v2;
    const minV = Math.max(2, hardTotal-10);
    const maxV = Math.min(10, hardTotal-2);
    do{
      v1 = randInt(minV, maxV);
      v2 = hardTotal - v1;
    } while(v1 === v2 || v2 < 2 || v2 > 10);
    const r1 = v1===10?randomRankValue10():String(v1);
    const r2 = v2===10?randomRankValue10():String(v2);
    const c1 = makeCard(r1);
    const c2 = makeCard(r2);
    player = [c1,c2];
    category = 'hard';
    cellValue = hardTotal;
    meta = correctActionForHard(hardTotal, dealerV);
    total = 'ハード '+hardTotal;
  }

  return {
    dealer: dealer,
    player: player,
    category: category,
    cellValue: cellValue,
    dealerV: dealerV,
    totalLabel: total,
    correct: meta.action,
    rule: meta.rule,
    rulesSnapshot: ruleSummaryText()
  };
}

// ---------- Spaced repetition (Ebbinghaus-inspired intervals) ----------
const INTERVALS = [1,2,4,8,16];
let reviewQueue = [];
let questionCounter = 0;
let currentItem = null;
let isReviewMode = false;

function peekDueReviewItem(){
  let best = null;
  reviewQueue.forEach(it => {
    if(it.dueAt <= questionCounter){
      if(!best || it.dueAt < best.dueAt) best = it;
    }
  });
  return best;
}

function peekAnyReviewItem(){
  if(reviewQueue.length === 0) return null;
  let best = reviewQueue[0];
  reviewQueue.forEach(it => { if(it.dueAt < best.dueAt) best = it; });
  return best;
}

function removeFromQueue(refItem){
  const idx = reviewQueue.indexOf(refItem);
  if(idx !== -1) reviewQueue.splice(idx,1);
}

function scheduleWrong(item){
  reviewQueue.push({ question:item.question, box:0, dueAt: questionCounter + INTERVALS[0] });
}
function scheduleCorrectReview(item){
  const nextBox = item.box + 1;
  if(nextBox < INTERVALS.length){
    reviewQueue.push({ question:item.question, box:nextBox, dueAt: questionCounter + INTERVALS[nextBox] });
  }
}

function nextQuestion(){
  questionCounter++;
  if(isReviewMode){
    const item = peekAnyReviewItem();
    if(!item){
      showReviewEmpty();
      return;
    }
    currentItem = { question: item.question, fromReview:true, box: item.box, refItem: item };
  } else {
    const due = peekDueReviewItem();
    if(due){
      currentItem = { question: due.question, fromReview:true, box: due.box, refItem: due };
    } else {
      currentItem = { question: genQuestion(), fromReview:false, box:0, refItem:null };
    }
  }
  renderQuestion();
  saveState();
}

// ---------- Rendering ----------
const dealerCardsEl = document.getElementById('dealerCards');
const playerCardsEl = document.getElementById('playerCards');
const playerTotalEl = document.getElementById('playerTotal');
const choiceButtons = document.querySelectorAll('button.choice');
const modalOverlay = document.getElementById('modalOverlay');
const modalResult = document.getElementById('modalResult');
const modalExplain = document.getElementById('modalExplain');
const nextBtn = document.getElementById('nextBtn');
const tableArea = document.getElementById('tableArea');
const reviewEmpty = document.getElementById('reviewEmpty');
const modeBadge = document.getElementById('modeBadge');

function showReviewEmpty(){
  tableArea.style.display = 'none';
  reviewEmpty.classList.add('show');
}
function hideReviewEmpty(){
  tableArea.style.display = 'flex';
  reviewEmpty.classList.remove('show');
}

function renderQuestion(){
  hideReviewEmpty();
  modalOverlay.classList.remove('show');
  choiceButtons.forEach(b => {
    b.disabled = false;
    b.classList.remove('flash-correct','flash-wrong','flash-answer');
  });

  const q = currentItem.question;
  dealerCardsEl.innerHTML = cardHTML(q.dealer);
  playerCardsEl.innerHTML = q.player.map(cardHTML).join('');
  playerTotalEl.textContent = '';

  updateSurrenderVisibility();
  updateStats();
}

function categoryRateText(cat){
  const s = categoryStats[cat];
  if(!s || s.total === 0) return '0%';
  return Math.round((s.correct/s.total)*100) + '%';
}

function updateStats(){
  document.getElementById('statTotal').textContent = statTotal;
  document.getElementById('statCorrect').textContent = statCorrect;
  const rate = statTotal===0 ? 0 : Math.round((statCorrect/statTotal)*100);
  document.getElementById('statRate').textContent = rate + '%';
  document.getElementById('statReview').textContent = reviewQueue.length;
  document.getElementById('statStreak').textContent = currentStreak;
  document.getElementById('statBestStreak').textContent = bestStreak;
  document.getElementById('statHardRate').textContent = categoryRateText('hard');
  document.getElementById('statSoftRate').textContent = categoryRateText('soft');
  document.getElementById('statPairRate').textContent = categoryRateText('pair');
  updateMenuStats();
}

function updateMenuStats(){
  document.getElementById('menuStatTotal').textContent = statTotal;
  const rate = statTotal===0 ? 0 : Math.round((statCorrect/statTotal)*100);
  document.getElementById('menuStatRate').textContent = rate + '%';
  document.getElementById('menuStatBestStreak').textContent = bestStreak;
  document.getElementById('btnReviewCount').textContent = reviewQueue.length;
}

let statTotal = (savedState && typeof savedState.statTotal === 'number') ? savedState.statTotal : 0;
let statCorrect = (savedState && typeof savedState.statCorrect === 'number') ? savedState.statCorrect : 0;
let currentStreak = (savedState && typeof savedState.currentStreak === 'number') ? savedState.currentStreak : 0;
let bestStreak = (savedState && typeof savedState.bestStreak === 'number') ? savedState.bestStreak : 0;
if(savedState && Array.isArray(savedState.reviewQueue)){
  reviewQueue = savedState.reviewQueue;
}
if(savedState && typeof savedState.questionCounter === 'number'){
  questionCounter = savedState.questionCounter;
}
const actionLabels = { hit:'ヒット', stand:'スタンド', double:'ダブルダウン', split:'スプリット', surrender:'サレンダー' };

choiceButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    const q = currentItem.question;
    statTotal++;
    choiceButtons.forEach(b => b.disabled = true);

    const cat = categoryStats[q.category];
    cat.total++;

    const isCorrect = action === q.correct;
    recordCellResult(q.category, q.cellValue, q.dealerV, isCorrect);
    if(isCorrect){
      statCorrect++;
      cat.correct++;
      currentStreak++;
      if(currentStreak > bestStreak) bestStreak = currentStreak;

      if(!isReviewMode && currentItem.fromReview){
        removeFromQueue(currentItem.refItem);
        scheduleCorrectReview(currentItem);
      }

      btn.classList.add('flash-correct');
      modalResult.className = 'modal-result correct';
      modalResult.textContent = '正解！ ' + actionLabels[q.correct] + ' です。';
      modalExplain.innerHTML = q.rule
        + '<span class="rule-context">出題時の設定: ' + q.rulesSnapshot
        + (isReviewMode ? '<br>復習タブでの結果は、ランダム出題側の復習スケジュールに影響しません。' : '')
        + '</span>';
    } else {
      currentStreak = 0;

      if(!isReviewMode){
        if(currentItem.fromReview){ removeFromQueue(currentItem.refItem); }
        scheduleWrong(currentItem);
      }

      btn.classList.add('flash-wrong');
      choiceButtons.forEach(b => {
        if(b.dataset.action === q.correct) b.classList.add('flash-answer');
      });
      modalResult.className = 'modal-result wrong';
      modalResult.textContent = '不正解。正解は ' + actionLabels[q.correct] + ' です。';
      modalExplain.innerHTML = q.rule
        + '<span class="rule-context">出題時の設定: ' + q.rulesSnapshot
        + (isReviewMode
            ? '<br>復習タブでの結果は、ランダム出題側の復習スケジュールに影響しません。'
            : '<br>この問題はエビングハウス忘却曲線を意識した間隔で再出題されます。')
        + '</span>';
    }
    updateStats();
    saveState();
    modalOverlay.classList.add('show');
  });
});

nextBtn.addEventListener('click', nextQuestion);

document.getElementById('resetStatsBtn').addEventListener('click', () => {
  if(confirm('保存された統計・復習履歴・ハウスルール設定をリセットしますか？')){
    if(storageOK) localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
});

// ---------- View navigation ----------
let currentView = 'menu';
function showView(view){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(view+'View').classList.add('active');
  currentView = view;
}

document.getElementById('btnGoPlay').addEventListener('click', () => {
  isReviewMode = false;
  modeBadge.textContent = 'ランダム出題';
  showView('play');
  nextQuestion();
});
document.getElementById('btnGoReview').addEventListener('click', () => {
  isReviewMode = true;
  modeBadge.textContent = '復習';
  showView('play');
  nextQuestion();
});
document.getElementById('btnGoChart').addEventListener('click', () => {
  showView('chart');
  renderChart();
});
document.getElementById('backFromPlay').addEventListener('click', () => {
  modalOverlay.classList.remove('show');
  showView('menu');
  updateMenuStats();
});
document.getElementById('backFromChart').addEventListener('click', () => {
  showView('menu');
});
document.getElementById('reviewEmptyBackBtn').addEventListener('click', () => {
  showView('menu');
  updateMenuStats();
});

// ---------- Chart rendering ----------
const actionClassMap = { hit:'act-hit', stand:'act-stand', double:'act-double', split:'act-split', surrender:'act-surrender' };
const actionShortMap = { hit:'H', stand:'S', double:'D', split:'P', surrender:'R' };
const dealerCols = [2,3,4,5,6,7,8,9,10,'A'];

function buildChartTable(title, rows, getMeta){
  let html = '<div class="chart-title">'+title+'</div><div class="chart-wrap"><table class="chart-table"><thead><tr><th>あなたの手</th>';
  dealerCols.forEach(c => { html += '<th>'+c+'</th>'; });
  html += '</tr></thead><tbody>';
  rows.forEach(row => {
    html += '<tr><th>'+row.label+'</th>';
    dealerCols.forEach(c => {
      const meta = getMeta(row.value, c);
      html += '<td class="'+actionClassMap[meta.action]+'">'+actionShortMap[meta.action]+'</td>';
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

function renderChart(){
  document.getElementById('chartRuleSummary').textContent = '現在の設定: ' + ruleSummaryText();

  const hardRows = [8,9,10,11,12,13,14,15,16,17,18].map(v => ({label: v===8?'8以下':(v===18?'18以上':String(v)), value:v}));
  const softRows = [13,14,15,16,17,18,19,20].map(v => ({label:'ソフト'+v+'(A+'+(v-11)+')', value:v}));
  const pairRows = ['A',2,3,4,5,6,7,8,9,10].map(v => ({label:(v==='A'?'A・A':v+'・'+v), value:v}));

  let html = '';
  html += buildChartTable('ハードハンド', hardRows, (total, col) => {
    const dv = col==='A' ? 'A' : col;
    return correctActionForHard(total, dv);
  });
  html += buildChartTable('ソフトハンド', softRows, (total, col) => {
    const dv = col==='A' ? 'A' : col;
    return correctActionForSoft(total, dv);
  });
  html += buildChartTable('ペア', pairRows, (rv, col) => {
    const dv = col==='A' ? 'A' : col;
    return correctActionForPair(rv, dv);
  });

  document.getElementById('chartContent').innerHTML = html;
}

refreshToggleUI();
updateSurrenderVisibility();
updateMenuStats();

// ---------- Export / Import wiring ----------
const exportBtn = document.getElementById('exportProgressBtn');
const importBtn = document.getElementById('importProgressBtn');
const importFileInput = document.getElementById('importFileInput');
if(exportBtn) exportBtn.addEventListener('click', exportProgress);
if(importBtn && importFileInput){
  importBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(file) importProgress(file);
    e.target.value = '';
  });
}

// ---------- Self-verification: check every basic-strategy cell for internal consistency ----------
// This does not compare against an external reference table; it verifies that the
// engine returns a well-formed action for every dealer up-card in every rule combination,
// catching accidental undefined/typo bugs early (e.g. missing branch -> undefined action).
function runSelfTest(){
  const soft17Opts = ['S17','H17'];
  const dasOpts = ['yes','no'];
  const surrenderOpts = ['yes','no'];
  const drOpts = ['any','9-11'];
  const dealerVals = [2,3,4,5,6,7,8,9,10,'A'];
  const validActions = ['hit','stand','double','split','surrender'];
  let errors = [];
  const savedRules = Object.assign({}, rules);

  soft17Opts.forEach(s17 => dasOpts.forEach(das => surrenderOpts.forEach(sur => drOpts.forEach(dr => {
    Object.assign(rules, {soft17:s17, das:das, surrender:sur, doubleRestriction:dr});

    [8,9,10,11,12,13,14,15,16,17,18].forEach(total => {
      dealerVals.forEach(dv => {
        const r = correctActionForHard(total, dv);
        if(!r || !validActions.includes(r.action) || !r.rule){
          errors.push('Hard '+total+' vs '+dv+' ['+s17+','+das+','+sur+','+dr+'] -> invalid result');
        }
      });
    });
    [13,14,15,16,17,18,19,20].forEach(total => {
      dealerVals.forEach(dv => {
        const r = correctActionForSoft(total, dv);
        if(!r || !validActions.includes(r.action) || !r.rule){
          errors.push('Soft '+total+' vs '+dv+' ['+s17+','+das+','+sur+','+dr+'] -> invalid result');
        }
      });
    });
    ['A',2,3,4,5,6,7,8,9,10].forEach(rv => {
      dealerVals.forEach(dv => {
        const r = correctActionForPair(rv, dv);
        if(!r || !validActions.includes(r.action) || !r.rule){
          errors.push('Pair '+rv+' vs '+dv+' ['+s17+','+das+','+sur+','+dr+'] -> invalid result');
        }
      });
    });
  }))));

  Object.assign(rules, savedRules);

  if(errors.length > 0){
    console.error('[BJ Trainer self-test] '+errors.length+' issue(s) found:', errors);
  } else {
    console.log('[BJ Trainer self-test] All strategy cells returned valid actions across all rule combinations.');
  }
  return errors;
}
runSelfTest();
