import { analyzeMediaWithGlm, analyzeTextWithDeepSeek, chatWithDeepSeek, synthesizeEventForRetrieval, transcribeAudioWithGlm } from './ai-client.js';
import {
  ArrowRight,
  ArrowUp,
  BrainCircuit,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  createIcons,
  FileSearch,
  Home,
  LibraryBig,
  MessageCircle,
  Mic,
  NotebookPen,
  Orbit,
  PenLine,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Sparkles,
  UserRound,
  WandSparkles
} from 'lucide';

const RECORDS_KEY = 'ji-records-v1';
const SETTINGS_KEY = 'ji-settings-v1';
const CHAT_KEY = 'ji-chat-v2';
const NOTES_KEY = 'ji-notes-v1';

const DEFAULT_CATEGORIES = ['学术竞赛','体育竞赛','综合竞赛','学术活动','探索类活动','研学活动','领导力活动','研究和探究','艺术活动','实习','随手记'];
const SEED_RECORDS = [
  { id:'sim-2026', title:'模拟联合国：第一次独立主持危机委员会', category:'领导力活动', date:'2026-05-18', description:'准备了两周的议题材料，第一次担任危机委员会主席。开场时两位代表因为程序问题争论起来，我先暂停流程，让每个人把事实说完，再把争议拆成三个具体动作。最后大家在规定时间内完成了决议。', aiDescription:'记录者在模拟联合国危机委员会中担任主席，负责会前研究、议程设计和现场主持。开场后，两位代表因程序问题发生争论；记录者暂停流程，让双方分别说明事实，再将争议拆分为三个具体动作。讨论随后恢复，参会代表在规定时间内完成了决议。', files:['MUN_Crisis_Committee.pdf'], photos:['https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&w=900&q=80'], createdAt:'2026-05-20T10:00:00.000Z', needsDate:false },
  { id:'robotics-2026', title:'机器人社：把一台总是跑偏的车调回赛道', category:'研究和探究', date:'2026-04-29', description:'区域赛前一周，循迹车每次过弯都会偏离。我们把问题拆成传感器、代码和机械结构三组，轮流验证假设。我负责记录每次参数变化，最后发现是一个被忽略的光照变量。', aiDescription:'机器人区域赛前一周，团队发现循迹车每次过弯都会偏离赛道。团队将原因拆分为传感器、代码和机械结构三组假设并逐项验证；记录者负责保存每次参数变化。实验最终定位到此前被忽略的环境光照变量，团队据此调整车辆设置。', files:['Regional_Robotics_Report.docx'], photos:['https://images.unsplash.com/photo-1563770660941-10a5c3e0a7f4?auto=format&fit=crop&w=900&q=80'], createdAt:'2026-05-01T10:00:00.000Z', needsDate:false },
  { id:'coast-2026', title:'海岸线调研：第一次把数据讲给社区听', category:'探索类活动', date:'2026-03-22', description:'参加海岸线微塑料调研，连续三天在潮间带取样。回到社区分享时，发现大家更关心的是“这些数据和我有什么关系”，于是临时调整了讲法。', aiDescription:'你参加了海岸线微塑料调研，在潮间带完成连续三天的取样与记录。面向社区分享数据时，你注意到听众真正关心的是研究和日常生活的连接，临时改变表达顺序，用身边可见的场景解释抽象指标。这次调整让你看到，严谨的研究也需要从对方的视角重新组织。', files:['Coastline_Sampling_Notes.pdf'], photos:['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80'], createdAt:'2026-03-24T10:00:00.000Z', needsDate:false },
  { id:'theatre-2025', title:'校园戏剧节：在最后一周接住一场演出', category:'艺术活动', date:'2025-12-06', description:'负责舞台监督。演出前一周主灯故障，原方案无法使用。我和灯光老师重新设计走位，在一次次排练里让演员习惯新的节奏，最终演出没有被看出变化。', aiDescription:'记录者在校园戏剧节中担任舞台监督。演出前一周主灯发生故障，原有舞台调度方案无法继续使用；记录者与灯光老师重新设计演员走位，并通过后续排练让演员适应新的节奏。演出最终按计划完成，现场观众没有察觉方案曾被临时调整。', files:['Theatre_Festival_Poster.png'], photos:['https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=80'], createdAt:'2025-12-08T10:00:00.000Z', needsDate:false }
];

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) { return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]; });
}
function dateLabel(date) {
  if (!date) return '待补充时间';
  var bits = date.split('-');
  return bits.length === 3 ? bits[0] + ' / ' + bits[1] + ' / ' + bits[2] : date;
}
export function getRecords() {
  try {
    var saved = JSON.parse(localStorage.getItem(RECORDS_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (e) {}
  localStorage.setItem(RECORDS_KEY, JSON.stringify(SEED_RECORDS));
  return SEED_RECORDS.slice();
}
function saveRecords(records) { localStorage.setItem(RECORDS_KEY, JSON.stringify(records)); }
function getNotes() {
  try {
    var saved = JSON.parse(localStorage.getItem(NOTES_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (e) {}
  return [];
}
function saveNotes(notes) { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }
function localDateKey(value) {
  var date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}
function noteDate(note) { return note.date || localDateKey(note.createdAt); }
function getSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { categories:[], deepseek:'', glm:'' }; } catch (e) { return { categories:[], deepseek:'', glm:'' }; }
}
function saveSettings(settings) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
function allCategories() { return DEFAULT_CATEGORIES.concat(getSettings().categories || []).filter(function (item, index, arr) { return arr.indexOf(item) === index; }); }
function getCurrentPage() { return document.body.dataset.page || 'home'; }
var mediaDbPromise;
function openMediaDb() {
  if (mediaDbPromise) return mediaDbPromise;
  mediaDbPromise = new Promise(function (resolve, reject) {
    var request = indexedDB.open('ji-media-v1', 1);
    request.onupgradeneeded = function () { if (!request.result.objectStoreNames.contains('uploads')) request.result.createObjectStore('uploads', { keyPath:'id' }); };
    request.onsuccess = function () { resolve(request.result); };
    request.onerror = function () { reject(request.error); };
  });
  return mediaDbPromise;
}
async function storeMedia(file) {
  var db = await openMediaDb(); var item = { id:'media-' + Date.now() + '-' + Math.random().toString(36).slice(2,8), name:file.name, type:file.type, size:file.size, blob:file };
  await new Promise(function (resolve, reject) { var tx = db.transaction('uploads', 'readwrite'); tx.objectStore('uploads').put(item); tx.oncomplete = resolve; tx.onerror = function () { reject(tx.error); }; });
  return { id:item.id, name:item.name, type:item.type, size:item.size };
}
async function getStoredMedia(id) {
  var db = await openMediaDb();
  return new Promise(function (resolve, reject) { var req = db.transaction('uploads', 'readonly').objectStore('uploads').get(id); req.onsuccess = function () { resolve(req.result); }; req.onerror = function () { reject(req.error); }; });
}
async function getMediaUrl(id) {
  var item = await getStoredMedia(id);
  return item && item.blob ? URL.createObjectURL(item.blob) : '';
}
async function deleteMedia(id) {
  if (!id) return; var db = await openMediaDb();
  await new Promise(function (resolve, reject) { var tx = db.transaction('uploads', 'readwrite'); tx.objectStore('uploads').delete(id); tx.oncomplete = resolve; tx.onerror = function () { reject(tx.error); }; });
}
function showToast(message) {
  var toast = document.getElementById('toast'); if (!toast) return;
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2300);
}

function getCompanionDays(records) {
  var timestamps = records.map(function (record) {
    return Date.parse(record.createdAt || record.date || '');
  }).filter(Number.isFinite);
  if (!timestamps.length) return 1;
  var firstDay = new Date(Math.min.apply(Math, timestamps));
  firstDay.setHours(0, 0, 0, 0);
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((today - firstDay) / 86400000) + 1);
}

function navMarkup(active) {
  var items = [
    ['home','home','首页','/index.html'], ['record','pen-line','开始记录','/record.html'], ['library','library-big','我的记录','/library.html'], ['chat','message-circle','AI 对话','/chat.html'], ['calendar','calendar-days','日历','/calendar.html'], ['notes','notebook-pen','我的随手记','/notes.html'], ['atlas','orbit','事件星球','/atlas.html']
  ];
  var days = getCompanionDays(getRecords());
  var html = '<a class="brand" href="/index.html" aria-label="迹首页"><span class="brand-mark" aria-hidden="true"></span><span class="brand-name">迹</span><span class="brand-caption">MEMORY ATLAS</span></a><nav class="sidebar-nav" aria-label="主要导航">';
  items.forEach(function (item) { html += '<a class="nav-item ' + (active === item[0] ? 'active' : '') + '" href="' + item[3] + '" title="' + item[2] + '" aria-label="' + item[2] + '"><span class="nav-icon"><i data-lucide="' + item[1] + '"></i></span><span>' + item[2] + '</span></a>'; });
  html += '<a class="nav-item ' + (active === 'settings' ? 'active' : '') + '" href="/settings.html" title="设置" aria-label="设置"><span class="nav-icon"><i data-lucide="settings-2"></i></span><span>设置</span></a></nav>';
  html += '<div class="sidebar-companion"><span class="companion-badge"><i data-lucide="sparkles"></i></span><strong>已陪伴 ' + days + ' 天</strong><span>你的经历正在慢慢连接</span><div class="companion-dots" aria-hidden="true"><i class="complete"></i><i></i><i></i><i></i><i></i><i></i></div></div>';
  html += '<div class="sidebar-foot"><a class="user-mini" href="#" id="sidebar-login"><div class="avatar">LM</div><div><strong>林墨</strong><span>个人空间</span></div><i data-lucide="arrow-right" aria-hidden="true"></i></a></div>';
  return html;
}
function topbarMarkup(active) {
  var labels = { home:'首页', record:'开始记录', chat:'与 AI 对话', atlas:'事件星球', library:'我的记录', notes:'我的随手记', calendar:'日历视图', detail:'记录详情', settings:'设置' };
  return '<div class="breadcrumb"><strong>' + (labels[active] || '') + '</strong></div><div class="top-actions"><a class="icon-button top-search" href="/library.html" title="搜索记录" aria-label="搜索记录"><i data-lucide="search"></i></a><a class="top-record" href="/record.html"><i data-lucide="plus"></i><span>开始记录</span></a><button class="icon-button" id="top-login" title="个人空间" aria-label="个人空间"><i data-lucide="user-round"></i></button></div>';
}
function initShell() {
  var page = getCurrentPage();
  var sidebar = document.getElementById('sidebar'); var topbar = document.getElementById('topbar');
  if (sidebar) { sidebar.innerHTML = navMarkup(page); var login = document.getElementById('sidebar-login'); if (login) login.addEventListener('click', function (e) { e.preventDefault(); openLogin(); }); }
  if (topbar) { topbar.innerHTML = topbarMarkup(page); var loginBtn = document.getElementById('top-login'); if (loginBtn) loginBtn.addEventListener('click', openLogin); }
}
function openLogin() {
  var wrap = document.getElementById('global-modals'); if (!wrap) return;
  wrap.innerHTML = '<div class="overlay open" id="login-overlay"><div class="modal"><div class="modal-head"><h2>登录你的空间</h2><button class="close-button" id="close-login">×</button></div><p>登录后可以在不同设备继续积累自己的经历叙事。MVP 阶段先用本地身份模拟。</p><div class="field"><label class="api-label" for="login-email">邮箱</label><input id="login-email" type="text" placeholder="you@school.edu" /></div><div class="field"><label class="api-label" for="login-name">昵称</label><input id="login-name" type="text" placeholder="你的名字" /></div><button class="btn btn-primary" id="login-submit">进入我的空间</button></div></div>';
  document.getElementById('close-login').addEventListener('click', function () { wrap.innerHTML = ''; });
  document.getElementById('login-submit').addEventListener('click', function () { wrap.innerHTML = ''; showToast('已进入林墨的经历空间'); });
}

function categoryClass(category) {
  if (category === '艺术活动' || category === '体育竞赛') return 'orange';
  if (category === '探索类活动' || category === '研学活动') return 'blue';
  if (category === '学术竞赛' || category === '综合竞赛') return 'yellow';
  return '';
}
function recordCard(record) {
  var firstPhoto = record.photos && record.photos[0]; var cover = typeof firstPhoto === 'string' ? firstPhoto : '';
  var image = cover ? '<div class="record-media" style="background-image:url(\'' + esc(cover) + '\')"></div>' : '';
  return '<a class="record-card" href="/detail.html?id=' + encodeURIComponent(record.id) + '">' + image + '<div class="record-card-top"><span class="tag ' + categoryClass(record.category) + '">' + esc(record.category || '待分类') + '</span><span class="small-link">打开 ↗</span></div><h3>' + esc(record.title || '未命名经历') + '</h3><p>' + esc(record.aiDescription || record.description || '这段经历还没有描述。') + '</p><div class="record-meta"><span>◷ ' + dateLabel(record.date) + '</span><span>▱ ' + ((record.files || []).length + (record.photos || []).length) + ' 个附件</span></div></a>';
}

function initHome() {
  var records = getRecords();
  var notes = getNotes();
  document.querySelector('[data-stat="total"]').textContent = records.length;
  document.querySelector('[data-stat="days"]').textContent = getCompanionDays(records);
  document.getElementById('recent-records').innerHTML = records.slice().sort(function (a,b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); }).slice(0,4).map(recordCard).join('');
  renderHomeCalendar(records, notes);
  var noteForm = document.getElementById('home-note-form');
  var noteInput = document.getElementById('home-note-input');
  noteForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var content = noteInput.value.trim();
    if (!content) { showToast('先写下一点想法再保存'); noteInput.focus(); return; }
    var createdAt = new Date();
    var nextNotes = getNotes();
    nextNotes.unshift({ id:'note-' + Date.now(), content:content, date:localDateKey(createdAt), createdAt:createdAt.toISOString() });
    saveNotes(nextNotes);
    noteInput.value = '';
    renderHomeCalendar(getRecords(), nextNotes);
    showToast('随手记已保存');
  });
  setupNoteVoice(document.getElementById('home-note-voice'), document.getElementById('home-note-voice-status'), noteInput);
}

function setupNoteVoice(button, status, target) {
  var recorder; var chunks = []; var stream; var startedAt; var clock;
  button.addEventListener('click', async function () {
    if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { showToast('当前浏览器不支持录音'); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      chunks = []; startedAt = Date.now(); recorder = new MediaRecorder(stream);
      recorder.ondataavailable = function (event) { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async function () {
        clearInterval(clock); stream.getTracks().forEach(function (track) { track.stop(); }); button.classList.remove('recording'); button.setAttribute('aria-label', '语音转文字');
        var settings = getSettings();
        if (!settings.glm) { status.textContent = '请先在设置中填写 GLM Key'; showToast('录音已完成，配置 GLM Key 后可转成文字'); return; }
        try {
          status.textContent = '正在转成文字…';
          var blob = new Blob(chunks, { type:recorder.mimeType || 'audio/webm' });
          var transcript = await transcribeAudioWithGlm(settings.glm, await audioBlobToWav(blob), 'quick-note.wav');
          target.value = [target.value.trim(), transcript].filter(Boolean).join('\n');
          status.textContent = '已加入文本框'; target.focus();
        } catch (error) { status.textContent = '转写失败'; showToast('语音转写失败：' + error.message); }
      };
      recorder.start(1000); button.classList.add('recording'); button.setAttribute('aria-label', '停止录音'); status.textContent = '正在录音 · 00:00';
      clock = setInterval(function () { var seconds = Math.floor((Date.now() - startedAt) / 1000); status.textContent = '正在录音 · ' + String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0'); }, 1000);
    } catch (error) { status.textContent = '无法使用麦克风'; showToast('请检查浏览器的麦克风权限'); }
  });
}

function renderHomeCalendar(records, notes) {
  var root = document.getElementById('home-calendar');
  if (!root) return;
  var today = new Date();
  var year = today.getFullYear();
  var month = today.getMonth();
  var monthKey = year + '-' + String(month + 1).padStart(2, '0');
  var counts = records.reduce(function (result, record) {
    if ((record.date || '').indexOf(monthKey) === 0) result[record.date] = (result[record.date] || 0) + 1;
    return result;
  }, {});
  (notes || []).forEach(function (note) { var date = noteDate(note); if (date.indexOf(monthKey) === 0) counts[date] = (counts[date] || 0) + 1; });
  var firstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  var dayCount = new Date(year, month + 1, 0).getDate();
  var cells = Array.from({ length:firstOffset }, function () { return '<span class="calendar-day muted" aria-hidden="true"></span>'; });
  for (var day = 1; day <= dayCount; day += 1) {
    var dateKey = monthKey + '-' + String(day).padStart(2, '0');
    var className = 'calendar-day' + (day === today.getDate() ? ' today' : '') + (counts[dateKey] ? ' has-records' : '');
    var dots = counts[dateKey] ? '<i aria-label="' + counts[dateKey] + ' 条记录"></i>' : '';
    cells.push('<a class="' + className + '" href="/calendar.html?date=' + dateKey + '"' + (day === today.getDate() ? ' aria-current="date"' : '') + '><b>' + day + '</b>' + dots + '</a>');
  }
  root.innerHTML = '<div class="calendar-month"><strong>' + year + '年' + (month + 1) + '月</strong><span>本月 ' + Object.values(counts).reduce(function (sum, count) { return sum + count; }, 0) + ' 条记录</span></div><div class="calendar-week"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div><div class="calendar-grid">' + cells.join('') + '</div>';
}

function fillCategories(select) { select.innerHTML = '<option value="">请先选择</option>' + allCategories().map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join(''); }
function fileList(input, target) {
  target.innerHTML = Array.from(input.files || []).map(function (file) { return '<div class="file-chip"><span>' + esc(file.name) + '</span><span>' + Math.max(1, Math.round(file.size / 1024)) + ' KB</span></div>'; }).join('');
}
function initRecord() {
  var category = document.getElementById('event-category'); fillCategories(category);
  var documentInput = document.getElementById('document-input'); var photoInput = document.getElementById('photo-input');
  documentInput.addEventListener('change', function () { fileList(documentInput, document.getElementById('document-list')); });
  photoInput.addEventListener('change', function () { fileList(photoInput, document.getElementById('photo-list')); });
  document.getElementById('add-category').addEventListener('click', function () { var name = window.prompt('创建一个新的活动分类'); if (name && name.trim()) { var settings = getSettings(); settings.categories = (settings.categories || []).concat(name.trim()).filter(function (v,i,a) { return a.indexOf(v) === i; }); saveSettings(settings); fillCategories(category); category.value = name.trim(); showToast('已添加自定义分类'); } });
  var voiceButton = document.getElementById('voice-button'); var voiceStatus = document.getElementById('voice-status'); var recorder; var voiceChunks = []; var voiceLimitTimer; var voiceClock;
  voiceButton.addEventListener('click', async function () {
    if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { showToast('当前浏览器不支持录音'); return; }
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio:true }); voiceChunks = []; recorder = new MediaRecorder(stream); var startedAt = Date.now();
      recorder.ondataavailable = function (event) { if (event.data.size) voiceChunks.push(event.data); };
      recorder.onstop = async function () { clearTimeout(voiceLimitTimer); clearInterval(voiceClock); stream.getTracks().forEach(function (track) { track.stop(); }); voiceButton.textContent = '●'; var settings = getSettings(); if (!settings.glm) { voiceStatus.textContent = '录音已完成 · 请先在设置中填入 GLM Key 以识别'; return; } try { voiceStatus.textContent = '正在转换录音…'; var blob = new Blob(voiceChunks, { type:recorder.mimeType || 'audio/webm' }); var wavBlob = await audioBlobToWav(blob); voiceStatus.textContent = '正在识别录音…'; var transcript = await transcribeAudioWithGlm(settings.glm, wavBlob); var descriptionBox = document.getElementById('event-description'); descriptionBox.value = [descriptionBox.value, transcript].filter(Boolean).join('\n'); voiceStatus.textContent = '识别完成 · 最长可录 10 分钟'; } catch (error) { voiceStatus.textContent = '识别失败：' + error.message; } };
      recorder.start(1000); voiceButton.textContent = '■'; voiceStatus.textContent = '正在录音 · 00:00 / 10:00'; voiceClock = setInterval(function () { var seconds = Math.floor((Date.now() - startedAt) / 1000); var min = String(Math.floor(seconds / 60)).padStart(2,'0'); var sec = String(seconds % 60).padStart(2,'0'); voiceStatus.textContent = '正在录音 · ' + min + ':' + sec + ' / 10:00'; }, 1000); voiceLimitTimer = setTimeout(function () { if (recorder.state === 'recording') recorder.stop(); }, 600000);
    } catch (error) { voiceButton.textContent = '●'; voiceStatus.textContent = '无法使用麦克风，请检查浏览器权限'; }
  });
  document.getElementById('record-form').addEventListener('submit', function (e) { e.preventDefault(); submitRecord(); });
}
async function audioBlobToWav(blob) {
  var AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('当前浏览器无法转换录音格式');
  var audioContext = new AudioContextClass();
  try {
    var sourceBuffer = await blob.arrayBuffer(); var decoded = await audioContext.decodeAudioData(sourceBuffer.slice(0)); var targetRate = 16000; var sourceRate = decoded.sampleRate; var outputLength = Math.max(1, Math.floor(decoded.length * targetRate / sourceRate)); var samples = new Float32Array(outputLength); var channels = [];
    for (var channelIndex = 0; channelIndex < decoded.numberOfChannels; channelIndex += 1) channels.push(decoded.getChannelData(channelIndex));
    for (var i = 0; i < outputLength; i += 1) { var sourcePosition = i * sourceRate / targetRate; var left = Math.floor(sourcePosition); var right = Math.min(left + 1, decoded.length - 1); var mix = 0; for (var c = 0; c < channels.length; c += 1) mix += channels[c][left] + (channels[c][right] - channels[c][left]) * (sourcePosition - left); samples[i] = mix / channels.length; }
    var wavBuffer = new ArrayBuffer(44 + samples.length * 2); var view = new DataView(wavBuffer); writeWavString(view, 0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); writeWavString(view, 8, 'WAVE'); writeWavString(view, 12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, targetRate, true); view.setUint32(28, targetRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeWavString(view, 36, 'data'); view.setUint32(40, samples.length * 2, true);
    for (var sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) { var sample = Math.max(-1, Math.min(1, samples[sampleIndex])); view.setInt16(44 + sampleIndex * 2, sample < 0 ? sample * 32768 : sample * 32767, true); }
    return new Blob([wavBuffer], { type:'audio/wav' });
  } finally { await audioContext.close(); }
}
function writeWavString(view, offset, value) { for (var i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i)); }
function fileToDataUrl(file) { return new Promise(function (resolve, reject) { var reader = new FileReader(); reader.onload = function () { resolve(reader.result); }; reader.onerror = function () { reject(reader.error); }; reader.readAsDataURL(file); }); }
function parseModelJson(raw) { var value = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim(); return JSON.parse(value); }
function localRetrievalSummary(description, photoInsights) {
  var source = String(description || '').trim();
  var cleaned = source.replace(/这几天去逛/g, '近日参观').replace(/这个事情吧[，,]?/g, '').replace(/这个车的话/g, '该车辆').replace(/然后/g, '随后').replace(/我们/g, '参与团队').replace(/我去跟([^，。]+)聊了一下/g, '记录者与$1进行了交流').replace(/如果我长大了有钱了我估计会买/g, '记录者表示未来经济条件允许时可能购买').replace(/我感觉我是非常喜欢/g, '记录者非常喜欢').replace(/我/g, '记录者').replace(/(^|[，。！？\s])嗯+[，。！？\s]*/g, '$1').replace(/呃/g, '').replace(/啊([，。])/g, '$1').replace(/\s+/g, ' ').trim();
  if (cleaned && !/[。！？]$/.test(cleaned)) cleaned += '。';
  var visual = (photoInsights || []).filter(Boolean).join('；');
  if (!cleaned && visual) cleaned = '照片资料显示：' + visual + '。';
  else if (cleaned && visual) cleaned += '照片资料补充：' + visual + '。';
  if (!cleaned) cleaned = '该事件目前仅保存了附件资料，尚未形成可确认的文字事实摘要。';
  return cleaned.slice(0, 500);
}
function inferCategoryFromText(description) { if (/比赛|竞赛|获奖|赛题/.test(description)) return '综合竞赛'; if (/研究|实验|论文|调研/.test(description)) return '研究和探究'; if (/社团|主席|负责人|组织|主持/.test(description)) return '领导力活动'; if (/展览|车展|参观|体验/.test(description)) return '探索类活动'; if (/绘画|音乐|戏剧|艺术/.test(description)) return '艺术活动'; return '随手记'; }
async function generateEventSynthesis(input) {
  var settings = getSettings(); var analyses = []; var photoInsights = [];
  if (input.description && settings.deepseek) {
    try { var textResult = await analyzeTextWithDeepSeek(settings.deepseek, '独立分析以下原始事件记录。提取可确认的时间、地点、人物、对象、行动、结果、感受、意向和不确定信息；不要评价学生。只输出 JSON。\n' + input.description); analyses.push({ type:'text', result:parseModelJson(textResult) }); } catch (error) { analyses.push({ type:'text', result:input.description, warning:'文字独立分析失败：' + error.message }); }
  } else if (input.description) analyses.push({ type:'text', result:input.description });
  if (settings.glm) {
    for (var photoIndex = 0; photoIndex < input.photos.length; photoIndex += 1) {
      try { var dataUrl = await fileToDataUrl(input.photos[photoIndex]); var photoResult = await analyzeMediaWithGlm(settings.glm, { prompt:'只描述这张活动照片中可见的事实：场景、人物、物品、文字和动作。不要推断身份、品牌或事件结果；不确定内容要明确说明。', dataUrl:dataUrl }); photoInsights.push(photoResult); analyses.push({ type:'photo', name:input.photos[photoIndex].name, result:photoResult }); } catch (error) { analyses.push({ type:'photo', name:input.photos[photoIndex].name, warning:'照片分析失败：' + error.message }); }
    }
  }
  input.documents.forEach(function (document) { analyses.push({ type:'document', name:document.name, note:'文件已保存，当前摘要仅使用文件名作为检索线索' }); });
  var fallbackDescription = localRetrievalSummary(input.description, photoInsights); var fallback = { title:input.title || fallbackDescription.replace(/[。！？].*$/, '').slice(0, 28) || '一段新的经历', category:input.category || inferCategoryFromText(input.description), date:input.date || '', aiDescription:fallbackDescription, keywords:[], uncertainties:input.date ? [] : ['活动时间未确认'] };
  if (!settings.deepseek) return fallback;
  try {
    var raw = await synthesizeEventForRetrieval(settings.deepseek, { title:input.title, category:input.category, date:input.date, description:input.description, categories:allCategories() }, analyses); var parsed = parseModelJson(raw); var allowedCategories = allCategories(); return { title:String(parsed.title || fallback.title).trim(), category:allowedCategories.indexOf(parsed.category) >= 0 ? parsed.category : fallback.category, date:/^\d{4}-\d{2}-\d{2}$/.test(parsed.date || '') ? parsed.date : fallback.date, aiDescription:String(parsed.aiDescription || fallback.aiDescription).trim(), keywords:Array.isArray(parsed.keywords) ? parsed.keywords.slice(0,12) : [], uncertainties:Array.isArray(parsed.uncertainties) ? parsed.uncertainties : fallback.uncertainties };
  } catch (error) { showToast('AI 摘要生成失败，已保存事实型本地摘要'); return fallback; }
}
function submitRecord() {
  var title = document.getElementById('event-title').value.trim(); var category = document.getElementById('event-category').value; var date = document.getElementById('event-date').value; var description = document.getElementById('event-description').value.trim(); var docs = Array.from(document.getElementById('document-input').files || []); var photos = Array.from(document.getElementById('photo-input').files || []);
  if (!description && !docs.length && !photos.length) { showToast('请至少添加一份文件、一张照片或一段文字描述'); document.getElementById('event-description').focus(); return; }
  document.getElementById('form-content').style.display = 'none'; document.getElementById('analysis-progress').classList.add('show');
  var progress = Array.from(document.querySelectorAll('.progress-step')); progress.forEach(function (step) { step.className = 'progress-step'; });
  var current = 0;
  function advance() { if (current > 0) { progress[current - 1].classList.remove('running'); progress[current - 1].classList.add('done'); progress[current - 1].querySelector('.step-status').textContent = '✓'; } if (current < progress.length) { progress[current].classList.add('running'); current += 1; setTimeout(advance, 670); } else { finish(); } }
  async function finish() { var lastStep = progress[progress.length - 1]; lastStep.classList.remove('done'); lastStep.classList.add('running'); lastStep.querySelector('.step-status').textContent = '…'; try { var synthesis = await generateEventSynthesis({ title:title, category:category, date:date, description:description, documents:docs, photos:photos }); var storedDocs = await Promise.all(docs.map(storeMedia)); var storedPhotos = await Promise.all(photos.map(storeMedia)); var record = { id:'r-' + Date.now(), title:synthesis.title, category:synthesis.category, date:synthesis.date, description:description || '已上传资料，等待补充文字描述。', aiDescription:synthesis.aiDescription, keywords:synthesis.keywords, uncertainties:synthesis.uncertainties, files:storedDocs, photos:storedPhotos, createdAt:new Date().toISOString(), needsDate:!synthesis.date }; var records = getRecords(); records.unshift(record); saveRecords(records); lastStep.classList.remove('running'); lastStep.classList.add('done'); lastStep.querySelector('.step-status').textContent = '✓'; document.getElementById('success-note').textContent = synthesis.date ? '标题、分类与事实摘要已经生成。' : '需要补充活动时间：我们暂时没有从资料中识别到明确日期。'; document.getElementById('success-panel').classList.add('show'); document.getElementById('view-created').href = '/detail.html?id=' + encodeURIComponent(record.id); } catch (error) { lastStep.classList.remove('running'); document.getElementById('success-note').textContent = '记录创建失败：' + error.message; document.getElementById('success-panel').classList.add('show'); } }
  advance();
}

function initLibrary() {
  var grid = document.getElementById('library-grid'); var search = document.getElementById('library-search'); var filterWrap = document.getElementById('category-filters'); var active = new Set();
  var cats = allCategories(); filterWrap.innerHTML = '<button class="filter-chip active" data-filter="all">全部</button>' + cats.map(function (c) { return '<button class="filter-chip" data-filter="' + esc(c) + '">' + esc(c) + '</button>'; }).join('');
  function render() { var query = search.value.trim().toLowerCase(); var records = getRecords().filter(function (r) { var text = [r.title,r.description,r.aiDescription,r.category].join(' ').toLowerCase(); var matchesQuery = !query || text.indexOf(query) >= 0; var matchesFilter = !active.size || active.has(r.category); return matchesQuery && matchesFilter; }); document.getElementById('library-count').textContent = records.length; document.getElementById('active-filter-note').textContent = active.size ? '已筛选 ' + Array.from(active).join('、') : ''; grid.innerHTML = records.length ? records.map(recordCard).join('') : '<div class="empty-state"><h3>还没有匹配的经历</h3><p>换个关键词或取消筛选，看看是否能找到它。</p><a class="btn btn-secondary" href="/record.html">记录一段新经历</a></div>'; }
  filterWrap.addEventListener('click', function (e) { var button = e.target.closest('[data-filter]'); if (!button) return; var filter = button.dataset.filter; if (filter === 'all') { active.clear(); } else if (active.has(filter)) { active.delete(filter); } else { active.add(filter); } Array.from(filterWrap.children).forEach(function (b) { b.classList.toggle('active', b.dataset.filter === 'all' ? !active.size : active.has(b.dataset.filter)); }); render(); });
  search.addEventListener('input', render); render();
}

function initNotes() {
  var notes = getNotes().slice().sort(function (a, b) { return new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0); });
  document.getElementById('notes-count').textContent = notes.length;
  var list = document.getElementById('notes-list');
  if (!notes.length) {
    list.innerHTML = '<div class="notes-empty"><i data-lucide="notebook-pen"></i><h2>还没有随手记</h2><p>你在首页留下的念头，会按时间出现在这里。</p></div>';
    return;
  }
  list.innerHTML = notes.map(function (note) {
    var created = new Date(note.createdAt || note.date || Date.now());
    var day = String(created.getMonth() + 1).padStart(2, '0') + '.' + String(created.getDate()).padStart(2, '0');
    var detail = created.getFullYear() + '年 · ' + ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][created.getDay()] + ' · ' + created.toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit', hour12:false });
    return '<article class="note-entry"><time datetime="' + esc(note.createdAt || note.date || '') + '"><strong>' + day + '</strong><span>' + detail + '</span></time><div class="note-entry-body">' + esc(note.content) + '</div></article>';
  }).join('');
}

function parseDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  var bits = value.split('-').map(Number); var date = new Date(bits[0], bits[1] - 1, bits[2]);
  return localDateKey(date) === value ? date : null;
}
function fullDateLabel(date) {
  return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日 · ' + ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][date.getDay()];
}
function initCalendar() {
  var queryDate = parseDateKey(new URLSearchParams(location.search).get('date'));
  var selected = queryDate || new Date(); selected.setHours(0, 0, 0, 0);
  var monthCursor = new Date(selected.getFullYear(), selected.getMonth(), 1);
  var records = getRecords(); var notes = getNotes();
  var monthLabel = document.getElementById('calendar-month-label'); var grid = document.getElementById('calendar-grid');
  function recordCounts() {
    var counts = {};
    records.forEach(function (record) { if (record.date) counts[record.date] = (counts[record.date] || 0) + 1; });
    notes.forEach(function (note) { var date = noteDate(note); if (date) counts[date] = (counts[date] || 0) + 1; });
    return counts;
  }
  function renderMonth() {
    var year = monthCursor.getFullYear(); var month = monthCursor.getMonth(); var counts = recordCounts();
    monthLabel.textContent = year + '年' + (month + 1) + '月';
    var offset = (new Date(year, month, 1).getDay() + 6) % 7;
    var firstCell = new Date(year, month, 1 - offset); var todayKey = localDateKey(new Date()); var selectedKey = localDateKey(selected); var cells = [];
    for (var index = 0; index < 42; index += 1) {
      var cellDate = new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + index); var key = localDateKey(cellDate);
      var classes = ['calendar-date'];
      if (cellDate.getMonth() !== month) classes.push('outside');
      if (key === todayKey) classes.push('today');
      if (key === selectedKey) classes.push('selected');
      if (counts[key]) classes.push('has-records');
      cells.push('<button class="' + classes.join(' ') + '" type="button" data-calendar-date="' + key + '" aria-label="' + fullDateLabel(cellDate) + (counts[key] ? '，有 ' + counts[key] + ' 条记录' : '') + '"' + (key === selectedKey ? ' aria-pressed="true"' : '') + '><span>' + cellDate.getDate() + '</span>' + (counts[key] ? '<i></i>' : '') + '</button>');
    }
    grid.innerHTML = cells.join('');
  }
  function renderAgenda() {
    var selectedKey = localDateKey(selected);
    var dayRecords = records.filter(function (record) { return record.date === selectedKey; }).sort(function (a, b) { return new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date); });
    var dayNotes = notes.filter(function (note) { return noteDate(note) === selectedKey; }).sort(function (a, b) { return new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date); });
    document.getElementById('agenda-date').textContent = fullDateLabel(selected);
    document.getElementById('agenda-count').textContent = dayRecords.length + ' 个事件';
    document.getElementById('agenda-events').innerHTML = dayRecords.length ? dayRecords.map(function (record) {
      var firstPhoto = record.photos && record.photos[0]; var cover = typeof firstPhoto === 'string' ? '<div class="agenda-event-cover" style="background-image:url(\'' + esc(firstPhoto) + '\')"></div>' : '';
      return '<a class="agenda-event" href="/detail.html?id=' + encodeURIComponent(record.id) + '"><span class="agenda-event-dot"></span><div class="agenda-event-copy"><div class="agenda-event-meta"><span>当天</span><span class="tag ' + categoryClass(record.category) + '">' + esc(record.category || '待分类') + '</span></div><h4>' + esc(record.title || '未命名经历') + '</h4><p>' + esc(record.aiDescription || record.description || '这段经历还没有描述。') + '</p><small>查看详情 <span aria-hidden="true">→</span></small></div>' + cover + '</a>';
    }).join('') : '<p class="agenda-empty">当日无记录事件</p>';
    document.getElementById('agenda-notes').innerHTML = dayNotes.length ? dayNotes.map(function (note) { var created = new Date(note.createdAt || note.date); return '<article class="agenda-note"><time>' + created.toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit', hour12:false }) + '</time><p>' + esc(note.content) + '</p></article>'; }).join('') : '<p class="agenda-empty">当日无随手记</p>';
    history.replaceState(null, '', '/calendar.html?date=' + selectedKey);
  }
  function render() { renderMonth(); renderAgenda(); }
  grid.addEventListener('click', function (event) { var button = event.target.closest('[data-calendar-date]'); if (!button) return; selected = parseDateKey(button.dataset.calendarDate); monthCursor = new Date(selected.getFullYear(), selected.getMonth(), 1); render(); });
  document.getElementById('calendar-prev').addEventListener('click', function () { monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1); renderMonth(); });
  document.getElementById('calendar-next').addEventListener('click', function () { monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1); renderMonth(); });
  document.getElementById('calendar-today').addEventListener('click', function () { selected = new Date(); selected.setHours(0, 0, 0, 0); monthCursor = new Date(selected.getFullYear(), selected.getMonth(), 1); render(); });
  render();
}

function getChatMessages() { try { var m = JSON.parse(sessionStorage.getItem(CHAT_KEY)); if (Array.isArray(m)) return m; } catch (e) {} return []; }
function saveChatMessages(messages) { sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages)); }
function lastChatContext(messages) { for (var i = messages.length - 1; i >= 0; i -= 1) if (messages[i].context) return messages[i].context; return { mode:'chat' }; }
function isGreeting(query) { return /^(你好|嗨|hello|hi|早上好|晚上好|在吗|哈喽)[！!。．,.，\s]*$/i.test(query.trim()); }
function wantsArchive(query) { return /找|推荐|筛选|匹配|回顾|经历库|活动记录|哪条|哪些经历|文书|简历|面试|改写|总结我的/.test(query); }
function hasTheme(query) { return /领导|团队|协作|冲突|研究|探索|坚持|突破|创造力|沟通|责任|压力|成长|独立|解决问题|组织/.test(query); }
function detectScenario(query) { if (/简历|bullet|resume/i.test(query)) return '简历'; if (/面试/.test(query)) return '面试'; if (/申请|文书|essay|个人陈述/i.test(query)) return '申请文书'; if (/入团|入党/.test(query)) return '入团入党材料'; return ''; }
function topicText(query) { var words = query.match(/领导力|团队协作|团队合作|解决冲突|研究能力|探索精神|突破舒适区|沟通能力|责任感|抗压|创造力|独立性/); return words ? words[0] : ''; }
function localArchiveMatches(query, context) {
  var records = getRecords(); var combined = [query, context.scenario || '', context.theme || ''].join(' ').toLowerCase(); var categoryHints = [];
  if (/领导|团队|协作|冲突|沟通|责任/.test(combined)) categoryHints = ['领导力活动','研究和探究'];
  else if (/研究|探索/.test(combined)) categoryHints = ['研究和探究','探索类活动'];
  else if (/艺术|创造/.test(combined)) categoryHints = ['艺术活动'];
  var matches = records.filter(function (record) { var text = [record.title,record.category,record.description,record.aiDescription,(record.keywords || []).join(' ')].join(' ').toLowerCase(); return (categoryHints.length && categoryHints.indexOf(record.category) >= 0) || text.indexOf(combined.trim()) >= 0; });
  if (!matches.length) matches = records.slice(0, Math.min(3, records.length));
  return matches.slice(0,3);
}
function makeLocalReply(query, messages) {
  var q = query.trim(); var lower = q.toLowerCase(); var context = lastChatContext(messages); var scenario = context.scenario || detectScenario(q); var theme = context.theme || topicText(q); var switchesToChat = /我想聊|先聊|另外|其实|焦虑|迷茫|今天|最近|谢谢|再见/.test(q) && !wantsArchive(q); var archiveIntent = wantsArchive(q) || (context.mode === 'retrieval' && !switchesToChat);
  if (isGreeting(q)) return { text:'你好！今天过得怎么样？我们可以聊学校、活动、最近的困惑，或者一起慢慢整理一段经历。你不用一开始就把需求说完整。', context:{ mode:'chat' } };
  if (/你能做什么|怎么用|你是谁|可以聊什么/.test(lower)) return { text:'我可以陪你进行普通对话，也可以在你准备文书、简历、面试或材料时，从经历库里找记录、阅读详情并帮你改写。你可以先告诉我发生了什么，我会通过几轮对话慢慢理解你想要的结果。', context:{ mode:'chat' } };
  if (/谢谢|感谢|再见|拜拜/.test(lower)) return { text:'不客气。你想到新的细节时，随时可以回来接着聊。', context:{ mode:'chat' } };
  if (/随手记|最近.*想法|之前.*想法|我写过什么/.test(q) && getNotes().length) {
    var recentNotes = getNotes().slice().sort(function (a, b) { return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date); }).slice(0, 3);
    return { text:'我会把你的随手记也放进理解范围。最近留下的内容包括：\n' + recentNotes.map(function (note) { return '“' + note.content.slice(0, 80) + (note.content.length > 80 ? '…' : '') + '”'; }).join('\n') + '\n你想先从哪一条继续聊？', context:{ mode:'chat' } };
  }
  if (/焦虑|迷茫|难过|压力|累|烦/.test(lower) && !archiveIntent) return { text:'听起来你最近有点辛苦。你愿意先说说，最让你卡住的是学业、活动安排，还是对下一步方向的不确定？', context:{ mode:'chat', support:true } };
  if (archiveIntent) {
    if (!scenario && !theme && /找|推荐|筛选|经历库|哪些/.test(q)) return { text:'可以。你想把这些经历用在什么场景？比如申请文书、简历、面试，或者只是想回顾自己这一阶段的变化？', context:{ mode:'retrieval', stage:'scenario' } };
    if (scenario && !theme && context.stage !== 'done') return { text:'明白了，是' + scenario + '。你更想突出哪一面？例如团队协作、领导力、解决冲突、研究能力，或者某个具体的成长变化？', context:{ mode:'retrieval', stage:'theme', scenario:scenario } };
    var matches = localArchiveMatches(q, { scenario:scenario, theme:theme }); var framing = scenario ? '为' + scenario + '准备' : '回顾自己的经历'; var focus = theme ? '，重点看“' + theme + '”' : '';
    return { text:'明白了，你是在' + framing + focus + '。我先找到 ' + matches.length + ' 条比较贴近的记录。你可以先点开看看，之后告诉我哪一条最像你想讲的故事，我再继续帮你改写或追问细节。', recs:matches.map(function (r) { return r.id; }), context:{ mode:'retrieval', stage:'done', scenario:scenario, theme:theme } };
  }
  return { text:'我听到了。你可以继续把事情说下去，不需要马上整理成“正确的问题”。如果你愿意，我也可以帮你把刚才的想法拆成：发生了什么、你做了什么、你现在真正想得到什么。', context:{ mode:'chat' } };
}
async function getChatReply(query, messages) {
  var settings = getSettings();
  if (settings.deepseek) {
    try {
      var raw = await chatWithDeepSeek(settings.deepseek, messages.filter(function (m) { return !m.typing; }).map(function (m) { return { role:m.role, content:m.text }; }), getRecords(), getNotes()); var parsed = JSON.parse(raw); var validIds = Array.isArray(parsed.recordIds) ? parsed.recordIds.filter(function (id) { return getRecords().some(function (r) { return r.id === id; }); }) : []; var previousContext = lastChatContext(messages); return { text:parsed.reply || '我还在理解你的意思，可以再多告诉我一点吗？', recs:validIds, context:{ mode:parsed.intent === 'retrieve' ? 'retrieval' : 'chat', stage:validIds.length ? 'done' : 'conversation', scenario:previousContext.scenario, theme:previousContext.theme } };
    } catch (error) { showToast('AI 暂时不可用，已切换为本地对话模式'); }
  }
  return makeLocalReply(query, messages);
}
function renderChat() {
  var box = document.getElementById('messages'); var messages = getChatMessages(); var workspace = document.getElementById('chat-workspace'); var active = messages.length > 0;
  workspace.classList.toggle('is-active', active); document.getElementById('clear-chat').hidden = !active;
  document.getElementById('chat-input').placeholder = active ? '输入消息…' : '和我聊聊，或告诉我你想找什么';
  box.innerHTML = messages.map(function (message) {
    var bubbleContent = message.typing ? '<span class="typing-dots"><i></i><i></i><i></i></span>' : esc(message.text);
    var cards = message.recs && message.recs.length ? '<div class="recommendations">' + message.recs.map(function (id) { var record = getRecords().find(function (item) { return item.id === id; }); var firstPhoto = record && record.photos && record.photos[0]; var cover = typeof firstPhoto === 'string' ? firstPhoto : 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=500&q=80'; return record ? '<a class="rec-card" href="/detail.html?id=' + encodeURIComponent(record.id) + '"><div class="rec-thumb" style="background-image:url(\'' + esc(cover) + '\')"></div><div><h4>' + esc(record.title) + '</h4><p>' + esc(record.category) + ' · ' + dateLabel(record.date) + '</p></div><span class="rec-arrow">↗</span></a>' : ''; }).join('') + '</div>' : '';
    var timestamp = message.createdAt ? new Date(message.createdAt).toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit', hour12:false }) : '';
    var avatar = message.role === 'assistant' ? '<div class="message-avatar" aria-label="AI 助手"><span class="brand-mark"></span></div>' : '';
    return '<div class="message ' + (message.role === 'user' ? 'user' : '') + '">' + avatar + '<div class="message-stack"><div class="message-bubble">' + bubbleContent + '</div>' + cards + (message.typing ? '' : '<time class="message-time">' + timestamp + '</time>') + '</div></div>';
  }).join('');
  box.scrollTop = box.scrollHeight;
}
function initChat() {
  var form = document.getElementById('chat-form'); var input = document.getElementById('chat-input'); var sendButton = form.querySelector('.send-btn');
  function resizeInput() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 116) + 'px'; input.style.overflowY = input.scrollHeight > 116 ? 'auto' : 'hidden'; }
  async function send() {
    var q = input.value.trim(); if (!q || sendButton.disabled) return; var now = new Date().toISOString(); var messages = getChatMessages();
    messages.push({ role:'user', text:q, createdAt:now }); messages.push({ role:'assistant', typing:true, createdAt:now }); saveChatMessages(messages); input.value = ''; resizeInput(); sendButton.disabled = true; renderChat();
    var answer = await getChatReply(q, messages.slice(0, -1)); await new Promise(function (resolve) { setTimeout(resolve, 350); });
    var finalMessages = getChatMessages().filter(function (message) { return !message.typing; }); finalMessages.push({ role:'assistant', text:answer.text, recs:answer.recs, context:answer.context, createdAt:new Date().toISOString() }); saveChatMessages(finalMessages); sendButton.disabled = false; renderChat(); input.focus();
  }
  form.addEventListener('submit', function (event) { event.preventDefault(); send(); });
  input.addEventListener('input', resizeInput);
  input.addEventListener('keydown', function (event) { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); form.requestSubmit(); } });
  document.getElementById('clear-chat').addEventListener('click', function () { sessionStorage.removeItem(CHAT_KEY); input.value = ''; resizeInput(); renderChat(); input.focus(); });
  renderChat(); resizeInput();
}

function initDetail() {
  var id = new URLSearchParams(location.search).get('id'); var record = getRecords().find(function (r) { return r.id === id; }) || getRecords()[0]; var main = document.getElementById('detail-main');
  if (!record) { main.innerHTML = '<div class="empty-state"><h3>还没有这条记录</h3><p>它可能已被删除，或者链接已经失效。</p><a class="btn btn-secondary" href="/library.html">返回经历库</a></div>'; return; }
  var photos = (record.photos || []).map(function (photo, index) { var isStored = typeof photo === 'object'; var style = isStored ? '' : ' style="background-image:url(\'' + esc(photo) + '\')"'; var mediaId = isStored ? ' data-media-id="' + esc(photo.id) + '"' : ''; return '<div class="media-tile"' + style + mediaId + '><button class="media-remove" type="button" data-remove-photo="' + index + '" title="删除照片">×</button><span class="media-caption">' + esc(isStored ? photo.name : '活动照片') + '</span></div>'; }).join('');
  var files = (record.files || []).map(function (file, index) { var name = typeof file === 'object' ? file.name : file; return '<div class="media-tile file"><span class="file-mark">DOC</span><div><strong>' + esc(name) + '</strong><span>已保存到此事件</span></div><button class="media-remove" type="button" data-remove-file="' + index + '" title="删除文件">×</button></div>'; }).join('');
  var categoryOptions = allCategories().map(function (category) { return '<option value="' + esc(category) + '" ' + (category === record.category ? 'selected' : '') + '>' + esc(category) + '</option>'; }).join('');
  function editButton(field, label) {
    return '<button class="detail-edit-button" type="button" data-edit-field="' + field + '" title="编辑' + label + '" aria-label="编辑' + label + '" aria-pressed="false"><i class="detail-edit-glyph" data-lucide="pen-line"></i><i class="detail-save-glyph" data-lucide="save"></i></button>';
  }
  main.innerHTML = [
    '<div class="detail-header"><div class="detail-header-copy"><div class="eyebrow">MEMORY DETAIL</div>',
    '<div class="detail-editable detail-title-editable" data-editable="title"><div class="detail-field-value" data-field-value><h1>' + esc(record.title) + '</h1></div><div class="detail-field-editor"><input class="detail-title-input" data-field-editor type="text" value="' + esc(record.title) + '" aria-label="事件标题" /></div>' + editButton('title', '事件标题') + '</div>',
    '<div class="record-meta detail-meta">',
    '<div class="detail-editable detail-meta-item" data-editable="date"><span class="detail-field-value" data-field-value>◷ ' + dateLabel(record.date) + '</span><div class="detail-field-editor"><input class="detail-inline-input" data-field-editor type="date" value="' + esc(record.date || '') + '" aria-label="活动时间" /></div>' + editButton('date', '活动时间') + '</div>',
    '<div class="detail-editable detail-meta-item" data-editable="category"><span class="detail-field-value tag ' + categoryClass(record.category) + '" data-field-value>' + esc(record.category || '待分类') + '</span><div class="detail-field-editor"><select class="detail-inline-input" data-field-editor aria-label="活动分类">' + categoryOptions + '</select></div>' + editButton('category', '活动分类') + '</div>',
    '</div></div><div class="detail-actions"><a class="btn btn-secondary" href="/library.html">← 返回经历库</a></div></div>',
    '<div class="detail-layout"><section class="detail-section"><div class="section-head compact"><h2>AI 事件描述</h2><button class="btn btn-secondary btn-compact" id="regenerate-ai" type="button">↻ 重新生成</button></div><div class="ai-callout"><div class="ai-label">RETRIEVAL SUMMARY · DEEPSEEK V4 PRO</div>' + esc(record.aiDescription || '暂无 AI 描述') + '</div></section>',
    '<section class="detail-section detail-editable detail-description-editable" data-editable="description"><div class="section-head compact"><h2>我的原始记录</h2>' + editButton('description', '原始记录') + '</div><div class="detail-copy detail-field-value" data-field-value>' + esc(record.description || '暂无文字描述') + '</div><div class="detail-field-editor"><textarea class="detail-description-input" data-field-editor aria-label="原始记录">' + esc(record.description || '') + '</textarea></div></section>',
    '<section class="detail-section"><div class="section-head compact"><h2>资料与照片</h2><div class="attachment-actions"><label class="btn btn-secondary btn-compact" for="detail-file-upload">↥ 文件</label><input class="file-input" id="detail-file-upload" type="file" multiple accept=".pdf,.doc,.docx" /><label class="btn btn-secondary btn-compact" for="detail-photo-upload">▧ 照片</label><input class="file-input" id="detail-photo-upload" type="file" multiple accept="image/*" /></div></div><div class="media-grid">' + (photos + files || '<div class="empty-state"><p>还没有上传资料</p></div>') + '</div></section></div>',
    '<footer class="detail-footer"><div class="detail-status-summary"><span>创建于 <strong>' + new Date(record.createdAt || Date.now()).toLocaleDateString('zh-CN') + '</strong></span><span>附件 <strong>' + ((record.files || []).length + (record.photos || []).length) + ' 个</strong></span><span>时间 <strong>' + (record.date ? '已识别' : '需要补充') + '</strong></span></div><button type="button" class="btn btn-danger" id="delete-record">删除记录</button></footer>'
  ].join('');
  main.querySelectorAll('[data-media-id]').forEach(async function (tile) { var url = await getMediaUrl(tile.dataset.mediaId); if (url) tile.style.backgroundImage = 'url("' + url + '")'; });
  document.getElementById('regenerate-ai').addEventListener('click', async function (e) { var button = e.currentTarget; button.disabled = true; button.textContent = '正在生成…'; try { var sourcePhotos = []; for (var photoIndex = 0; photoIndex < (record.photos || []).length; photoIndex += 1) { var photo = record.photos[photoIndex]; if (photo && typeof photo === 'object') { var storedPhoto = await getStoredMedia(photo.id); if (storedPhoto && storedPhoto.blob) sourcePhotos.push(new File([storedPhoto.blob], storedPhoto.name, { type:storedPhoto.type || storedPhoto.blob.type })); } } var sourceDocuments = (record.files || []).map(function (file) { return { name:typeof file === 'object' ? file.name : file }; }); var synthesis = await generateEventSynthesis({ title:record.title, category:record.category, date:record.date, description:record.description, documents:sourceDocuments, photos:sourcePhotos }); var records = getRecords(); var recordIndex = records.findIndex(function (item) { return item.id === record.id; }); records[recordIndex] = Object.assign({}, records[recordIndex], { aiDescription:synthesis.aiDescription, keywords:synthesis.keywords, uncertainties:synthesis.uncertainties }); saveRecords(records); showToast('已重新生成事实型事件摘要'); setTimeout(function () { location.reload(); }, 500); } catch (error) { button.disabled = false; button.textContent = '↻ 重新生成'; showToast('重新生成失败：' + error.message); } });
  function setEditing(container, button, editing) {
    var label = { title:'事件标题', category:'活动分类', date:'活动时间', description:'原始记录' }[button.dataset.editField];
    container.classList.toggle('is-editing', editing); button.classList.toggle('is-saving', editing); button.setAttribute('aria-pressed', String(editing)); button.setAttribute('aria-label', (editing ? '保存' : '编辑') + label); button.title = (editing ? '保存' : '编辑') + label;
  }
  function updateFieldValue(field, value, container) {
    var display = container.querySelector('[data-field-value]');
    if (field === 'title') display.querySelector('h1').textContent = value;
    if (field === 'date') display.textContent = '◷ ' + dateLabel(value);
    if (field === 'category') { display.textContent = value || '待分类'; display.className = 'detail-field-value tag ' + categoryClass(value); }
    if (field === 'description') display.textContent = value || '暂无文字描述';
  }
  main.addEventListener('click', function (event) {
    var button = event.target.closest('[data-edit-field]'); if (!button) return;
    var field = button.dataset.editField; var container = button.closest('[data-editable]'); var editor = container.querySelector('[data-field-editor]');
    if (!container.classList.contains('is-editing')) { editor.value = record[field] || ''; setEditing(container, button, true); editor.focus(); if (field === 'title') editor.select(); return; }
    var value = editor.value.trim(); if (field === 'title' && !value) value = '未命名经历';
    var records = getRecords(); var index = records.findIndex(function (item) { return item.id === record.id; }); if (index < 0) return;
    records[index] = Object.assign({}, records[index], { [field]:value }); if (field === 'date') records[index].needsDate = !value; saveRecords(records); record = records[index]; updateFieldValue(field, value, container); setEditing(container, button, false); showToast('已保存' + ({ title:'事件标题', category:'活动分类', date:'活动时间', description:'原始记录' }[field]));
  });
  document.getElementById('detail-file-upload').addEventListener('change', function (e) { updateAttachments(record.id, 'files', Array.from(e.target.files || [])); });
  document.getElementById('detail-photo-upload').addEventListener('change', function (e) { updateAttachments(record.id, 'photos', Array.from(e.target.files || [])); });
  main.addEventListener('click', function (e) { var photoButton = e.target.closest('[data-remove-photo]'); var fileButton = e.target.closest('[data-remove-file]'); if (photoButton) removeAttachment(record.id, 'photos', Number(photoButton.dataset.removePhoto)); if (fileButton) removeAttachment(record.id, 'files', Number(fileButton.dataset.removeFile)); });
  document.getElementById('delete-record').addEventListener('click', async function () { if (window.confirm('确定删除这条经历吗？删除后无法恢复。')) { var storedMedia = (record.files || []).concat(record.photos || []).filter(function (item) { return item && typeof item === 'object'; }); await Promise.all(storedMedia.map(function (item) { return deleteMedia(item.id); })); saveRecords(getRecords().filter(function (r) { return r.id !== record.id; })); location.href = '/library.html'; } });
}

async function updateAttachments(recordId, field, uploads) { if (!uploads.length) return; var stored = await Promise.all(uploads.map(storeMedia)); var records = getRecords(); var index = records.findIndex(function (r) { return r.id === recordId; }); records[index][field] = (records[index][field] || []).concat(stored); saveRecords(records); showToast('附件已加入记录'); setTimeout(function () { location.reload(); }, 350); }
async function removeAttachment(recordId, field, attachmentIndex) { var records = getRecords(); var index = records.findIndex(function (r) { return r.id === recordId; }); var removed = records[index][field][attachmentIndex]; if (removed && typeof removed === 'object') await deleteMedia(removed.id); records[index][field].splice(attachmentIndex, 1); saveRecords(records); showToast('附件已删除'); setTimeout(function () { location.reload(); }, 350); }

function initSettings() {
  var settings = getSettings(); document.getElementById('deepseek-key').value = settings.deepseek || ''; document.getElementById('glm-key').value = settings.glm || ''; updateCategoryList(); updateApiStatus();
  document.getElementById('settings-form').addEventListener('submit', function (e) { e.preventDefault(); saveSettings(Object.assign({}, getSettings(), { deepseek:document.getElementById('deepseek-key').value.trim(), glm:document.getElementById('glm-key').value.trim() })); updateApiStatus(); showToast('设置已保存到当前浏览器'); });
  document.getElementById('category-form').addEventListener('submit', function (e) { e.preventDefault(); var input = document.getElementById('custom-category'); var value = input.value.trim(); if (!value) return; var next = getSettings(); next.categories = (next.categories || []).concat(value).filter(function (v,i,a) { return a.indexOf(v) === i; }); saveSettings(next); input.value = ''; updateCategoryList(); showToast('自定义分类已添加'); });
}
function updateApiStatus() { var settings = getSettings(); var status = document.getElementById('api-status'); var text = status.querySelector('.api-status-text'); var ready = Boolean(settings.deepseek || settings.glm); status.classList.toggle('ready', ready); text.textContent = ready ? '已保存 Key，本地调用接口已准备就绪' : '尚未连接真实模型，当前使用本地演示分析'; }
function updateCategoryList() { var list = document.getElementById('custom-category-list'); if (list) list.innerHTML = (getSettings().categories || []).map(function (c) { return '<span class="custom-category">' + esc(c) + '</span>'; }).join('') || '<span class="help-text">还没有自定义分类</span>'; }

function init() {
  initShell();
  var page = getCurrentPage();
  if (page === 'home') initHome();
  if (page === 'record') initRecord();
  if (page === 'library') initLibrary();
  if (page === 'notes') initNotes();
  if (page === 'calendar') initCalendar();
  if (page === 'chat') initChat();
  if (page === 'detail') initDetail();
  if (page === 'settings') initSettings();
  createIcons({
    icons:{ ArrowRight, ArrowUp, BrainCircuit, CalendarDays, ChevronLeft, ChevronRight, Clock3, FileSearch, Home, LibraryBig, MessageCircle, Mic, NotebookPen, Orbit, PenLine, Plus, RotateCcw, Save, Search, Settings2, Sparkles, UserRound, WandSparkles },
    attrs:{ 'stroke-width':1.8 }
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
else init();
