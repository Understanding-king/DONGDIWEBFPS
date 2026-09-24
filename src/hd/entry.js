import { createHdArena } from './hd-arena.js';

const $ = (id) => document.getElementById(id);
const start = $('start');
let arena, entered = false;
const labels = Object.fromEntries(['timer','kills','heading','ammo','reserve','reload-fill','reload-label','stance','speed','score','location-name','hitmarker','crosshair'].map((id) => [id, $(id)]));

function showError(error) {
  $('error').hidden = false;
  $('error').textContent = error instanceof Error ? error.message : String(error);
}

start.addEventListener('click', async () => {
  $('error').hidden = true;
  try { await arena?.start(); } catch (error) { showError(error); }
});
$('reset').addEventListener('click', () => { arena?.reset(); start.focus(); });
$('retry').addEventListener('click', () => location.reload());

try {
  arena = await createHdArena($('hd-canvas'), {
    onLoad(label, progress) {
      $('loading-label').textContent = label;
      $('loading-percent').textContent = `${Math.round(progress * 100)}%`;
      $('loading-fill').style.width = `${progress * 100}%`;
    },
    onPause(paused) {
      if (!paused) entered = true;
      $('menu').hidden = !paused;
      $('hud').hidden = paused;
      $('reset').hidden = !entered;
      start.innerHTML = `${entered ? '继续训练' : '进入战区'} <span>↗</span>`;
      if (paused) start.focus();
    },
    onState(state) {
      labels.timer.textContent = `${String(Math.floor(state.elapsed / 60)).padStart(2, '0')}:${String(Math.floor(state.elapsed % 60)).padStart(2, '0')}`;
      labels.kills.textContent = String(state.kills).padStart(2, '0');
      labels.heading.textContent = `${String(Math.round(state.heading)).padStart(3, '0')}°`;
      labels.ammo.textContent = String(state.ammo).padStart(2, '0');
      labels.reserve.textContent = state.reserve;
      labels['reload-fill'].style.width = `${state.reloadProgress * 100}%`;
      labels['reload-label'].textContent = state.reloading ? `装填中 ${Math.round(state.reloadProgress * 100)}%` : state.ammo === 0 ? state.reserve ? '弹匣空 · 按 R 换弹' : '弹药耗尽 · Esc 重新训练' : 'R 装填弹匣';
      labels.stance.textContent = !state.grounded ? '腾空' : state.crouch ? '蹲伏' : state.speed > 0.1 ? '移动' : '站立';
      labels.speed.innerHTML = `${state.speed.toFixed(1)} <small>m/s</small>`;
      labels.score.textContent = state.score;
      labels['location-name'].textContent = state.position.z > 9 ? '南部庭院' : state.position.z < -18 ? '北部街区' : Math.abs(state.position.x) > 11 ? '侧翼拱廊' : '中央交战区';
      labels.hitmarker.classList.toggle('active', state.hit);
      labels.crosshair.classList.toggle('reloading', state.reloading);
      labels.ammo.closest('.weapon').classList.toggle('empty', state.ammo === 0);
    }
  });
  start.disabled = false;
  start.innerHTML = '进入战区 <span>↗</span>';
  if (matchMedia('(pointer: coarse)').matches) {
    start.disabled = true;
    start.textContent = '请使用电脑键盘和鼠标';
  }
} catch (error) {
  console.error(error);
  $('loading-label').textContent = '战区加载失败';
  start.textContent = '资源暂时不可用';
  $('retry').hidden = false;
  showError(error);
}
window.addEventListener('pagehide', (event) => { if (!event.persisted) arena?.dispose(); });
