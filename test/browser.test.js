import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Keep test dependencies isolated: this project may use a shared node_modules junction.
const require = createRequire(new URL('../.test-tools/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const root = fileURLToPath(new URL('..', import.meta.url));
const browser = await chromium.launch({
  executablePath: process.env.DSH_TEST_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'warning' && message.text().includes('dsh-thought-fold')) errors.push(message.text()); });
let passed = 0;
const settle = async () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
const update = async patch => { await page.evaluate(patch => window.fixture.update(patch), patch); await settle(); };
const check = async (name, fn) => { await fn(); passed++; console.log(`✓ ${name}`); };
try {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; } body { margin: 0; font: 14px Arial; }
    [data-conversation-scroll] { position: relative; height: 740px; margin: 30px 60px; overflow: auto; border: 1px solid #ddd; overflow-anchor: none; }
    [data-chat-flow] { width: 760px; max-width: calc(100% - 60px); margin: auto; display: flex; flex-direction: column; padding-top: 16px; }
    [data-chat-flow] > :not([hidden]) { margin-top: 16px; }
    [data-chat-flow-kind] { flex: none; }
    [data-chat-flow-kind="user"] { min-height: 50px; background: #eef3ff; }
    [data-chat-flow-kind="assistant-step"] { background: #fafafa; }
    [data-chat-flow-kind="turn-tail"] { height: 24px; }
    [data-composer-seat] { position: sticky; bottom: 0; flex: none; margin: 12px 20px 0; background: white; border: 1px solid #bbb; border-radius: 14px; padding: 16px; z-index: 6; }
    textarea { width: 100%; height: 70px; resize: none; }
    [hidden="until-found"] { content-visibility: hidden; }
  </style></head><body><div id="app"></div></body></html>`);
  await page.addScriptTag({ path: require.resolve('react/umd/react.development.js'.replace('/umd/react.development.js', '/package.json')).replace(/package\.json$/, 'umd/react.development.js') });
  await page.addScriptTag({ path: require.resolve('react-dom/package.json').replace(/package\.json$/, 'umd/react-dom.development.js') });
  await page.evaluate(() => {
    window.__ModuleLoader__ = { load(definition) { window.pluginDefinition = definition; } };
    window.config = { enabled: true, showLiveHud: true, foldStyle: 'codex' };
    window.fetch = async (_url, request) => {
      if (request?.body) Object.assign(window.config, JSON.parse(request.body).patch);
      return { ok: true, json: async () => ({ config: window.config }) };
    };
  });
  await page.addScriptTag({ path: path.join(root, 'client.js') });
  await page.evaluate(() => {
    const h = React.createElement;
    const slots = new Map();
    const disposers = [];
    const plugin = pluginDefinition.factory(() => React);
    plugin.apply({
      effect(callback) { disposers.push(callback()); },
      slots: { inject(_name, callback) { callback(); }, register(definition, Component) { slots.set(definition.name, Component); return () => {}; } }
    });
    const Dock = slots.get('conversation.composer.dock');
    const Settings = slots.get('settings.section');
    let snapshot = { nodes: new Map(), timeline: {} };
    const listeners = new Set();
    const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
    const useChat = selector => React.useSyncExternalStore(subscribe, () => selector(snapshot));
    let state = { session: 'old-a', native: false, turns: [{ turn: 1, height: 1200 }, { turn: 2, height: 900 }, { turn: 3, height: 80 }], expanded: {}, composerHeight: 130, enabled: true };
    const root = ReactDOM.createRoot(document.getElementById('app'));
    function render() {
      const nodes = new Map();
      const rows = [];
      for (const item of state.turns) {
        const turn = item.turn;
        const base = turn * 100;
        const native = state.native;
        const expanded = !!state.expanded[turn];
        const location = { kind: 'turn', turn: { turn, status: item.running ? 'running' : 'closed' } };
        const spec = { turn, processStartSeq: base, answerAnchorSeq: base + 10, answerStep: 3 };
        const add = (kind, suffix, seq, data, content, props = {}) => {
          const key = `${turn}-${suffix}`;
          nodes.set(key, { key, kind, anchorSeq: seq, data, location });
          rows.push(h('div', { key, 'data-chat-flow-key': key, 'data-chat-flow-kind': kind, 'data-chat-turn': turn, ...props }, content));
        };
        add('user', 'user', base - 1, {}, `用户问题 ${turn}`);
        add('turn-process', 'control', base, spec, native ? h('button', {
          type: 'button', 'data-turn-process': turn, 'aria-expanded': expanded, 'data-open': expanded || undefined,
          onClick: event => { event.currentTarget.focus(); state.expanded = { ...state.expanded, [turn]: !expanded }; render(); }
        }, `思考与工具调用 ${turn}`) : null, { hidden: !native ? 'until-found' : undefined, 'data-turn-process-hidden': !native || undefined });
        const memberProps = { 'data-turn-process-member': native || undefined, 'data-turn-process-hidden': native && !expanded || undefined, hidden: native && !expanded ? 'until-found' : undefined };
        add('assistant-step', 'process', base + 1, { step: 1, status: 'done' }, h('div', { style: { height: item.height } }, `过程 ${turn} SEARCHABLE_PROCESS_${turn}`), memberProps);
        add('tool-call', 'tool', base + 2, {}, '工具调用', memberProps);
        add('assistant-step', 'answer', base + 10, { step: 3, status: item.running ? 'running' : 'done' }, `最终回答 ${turn}`, { style: { height: 100 } });
        add('turn-tail', 'tail', base + 11, {}, '完成');
      }
      const getNode = nodes.get.bind(nodes);
      nodes.get = key => { window.fixtureReads = (window.fixtureReads || 0) + 1; return getNode(key); };
      snapshot = { nodes, timeline: {} };
      ReactDOM.flushSync(() => root.render(h('div', { 'data-conversation-scroll': '', key: state.session },
        h('div', { 'data-chat-flow': '' }, rows),
        h('div', { 'data-composer-seat': '', style: { height: state.composerHeight } },
          h('textarea', { 'aria-label': '消息输入框' }), h(Dock, { useChat, foldSessionId: state.session }))
      )));
      listeners.forEach(fn => fn());
    }
    window.fixture = {
      update(patch) { state = { ...state, ...patch }; render(); },
      dispose() { disposers.forEach(fn => fn()); },
      unmount() { ReactDOM.flushSync(() => root.unmount()); },
      render,
      // Host metadata update with no chat DOM mutation.
      closeMetadata(turn) {
        snapshot.nodes.get(`${turn}-control`).location.turn.status = 'closed';
        snapshot.nodes.get(`${turn}-answer`).data.status = 'done';
        snapshot = { ...snapshot, timeline: {} };
        listeners.forEach(fn => fn());
      },
      async settings(patch) {
        // Mount the real settings component and exercise its normal input handler.
        const holder = document.createElement('div'); document.body.appendChild(holder);
        const settingsRoot = ReactDOM.createRoot(holder);
        ReactDOM.flushSync(() => settingsRoot.render(h(Settings)));
        await new Promise(resolve => setTimeout(resolve, 30));
        const input = holder.querySelector(`input[aria-label="${patch === 'hud' ? '增强运行状态样式' : '启用插件'}"]`);
        input.click();
        await new Promise(resolve => setTimeout(resolve, 30));
        ReactDOM.flushSync(() => settingsRoot.unmount()); holder.remove();
      }
    };
    render();
  });
  await settle();
  const compat = '[data-dsh-tf-compat]';
  const proxy = '[data-dsh-tf-floating]:not([hidden])';
  await check('旧会话默认折叠且保留用户消息、最终回答', async () => {
    assert.equal(await page.locator(compat).count(), 3);
    assert.equal(await page.locator('[data-dsh-tf-hidden]').count(), 6);
    assert.equal(await page.locator('[data-chat-flow-key="1-process"]').evaluate(el => el.getBoundingClientRect().height), 0);
    assert.equal(await page.locator('[data-chat-flow-key="1-answer"]').evaluate(el => el.getBoundingClientRect().height), 100);
    assert.equal(await page.locator('[data-chat-flow-key="1-user"]').isVisible(), true);
  });
  await check('长过程展开后唯一浮动按钮位于输入区上方', async () => {
    await page.locator(compat).first().click(); await settle();
    assert.equal(await page.locator(proxy).count(), 1);
    const button = await page.locator(proxy).boundingBox();
    const composer = await page.locator('[data-composer-seat]').boundingBox();
    assert.ok(button.y + button.height <= composer.y - 5);
    assert.equal(await page.locator(compat).first().getAttribute('aria-expanded'), 'true');
  });
  await check('输入框增高后浮动按钮同步上移，不覆盖输入区', async () => {
    const before = await page.locator(proxy).boundingBox();
    await update({ composerHeight: 240 });
    const after = await page.locator(proxy).boundingBox();
    assert.ok(after.y < before.y - 80);
    assert.equal(await page.locator(compat).first().getAttribute('aria-expanded'), 'true');
  });
  await check('重绘不重置展开选择；多组代理只收起当前组', async () => {
    await page.locator(compat).nth(1).evaluate(el => el.click()); await settle();
    assert.equal(await page.locator(compat).nth(0).getAttribute('aria-expanded'), 'true');
    await page.locator('[data-conversation-scroll]').evaluate(el => {
      const row = el.querySelector('[data-chat-flow-key="2-process"]');
      el.scrollTop += row.getBoundingClientRect().top - el.getBoundingClientRect().top + 120;
    }); await settle();
    assert.equal(await page.locator(proxy).count(), 1);
    assert.match(await page.locator(proxy).getAttribute('aria-label'), /第 2 轮/);
    await page.locator(proxy).click(); await settle();
    assert.equal(await page.locator(compat).nth(1).getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator(compat).nth(0).getAttribute('aria-expanded'), 'true');
  });
  await check('短过程底部可见时使用本组按钮，不出现浮动重复入口', async () => {
    await update({ session: 'short', turns: [{ turn: 5, height: 60 }], composerHeight: 130 });
    await page.locator(compat).click(); await settle();
    assert.equal(await page.locator(proxy).count(), 0);
    assert.equal(await page.locator('[data-dsh-tf-bottom]:not([hidden])').count(), 1);
    await page.locator('[data-dsh-tf-bottom]').click(); await settle();
    assert.equal(await page.locator(compat).getAttribute('aria-expanded'), 'false');
  });
  await check('会话切换与历史延迟补载默认折叠；旧按钮不残留', async () => {
    await update({ session: 'lazy', turns: [] });
    assert.equal(await page.locator(compat).count(), 0);
    await update({ turns: [{ turn: 7, height: 700 }] });
    assert.equal(await page.locator(compat).count(), 1);
    assert.equal(await page.locator(compat).getAttribute('aria-expanded'), 'false');
  });
  await check('运行中保持可见；仅时间线结束事件也能触发折叠', async () => {
    await update({ session: 'running', turns: [{ turn: 8, height: 700, running: true }] });
    assert.equal(await page.locator(compat).count(), 0);
    await page.evaluate(() => fixture.closeMetadata(8)); await settle();
    assert.equal(await page.locator(compat).count(), 1);
  });
  await check('原生组默认收起；重复重绘不重复按钮且手动展开有效', async () => {
    await update({ session: 'native', native: true, expanded: { 9: true }, turns: [{ turn: 9, height: 800 }] });
    assert.equal(await page.locator('button[data-turn-process]').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator(compat).count(), 0);
    await page.locator('button[data-turn-process]').click(); await settle();
    await page.evaluate(() => fixture.render()); await settle();
    assert.equal(await page.locator('button[data-turn-process]').getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('[data-dsh-tf-bottom]').count(), 1);
  });
  await check('原生浮动收起直接同步顶部状态', async () => {
    assert.equal(await page.locator(proxy).count(), 1);
    await page.locator(proxy).click(); await settle();
    assert.equal(await page.locator('button[data-turn-process]').getAttribute('aria-expanded'), 'false');
    await page.locator('button[data-turn-process]').click(); await settle();
  });
  await check('原生→兼容→原生保持两种方向的手动选择', async () => {
    await update({ native: false });
    assert.equal(await page.locator(compat).getAttribute('aria-expanded'), 'true');
    await page.locator(compat).evaluate(el => el.click()); await settle();
    await update({ native: true });
    assert.equal(await page.locator('button[data-turn-process]').getAttribute('aria-expanded'), 'false');
    await update({ native: false });
    await page.locator(compat).evaluate(el => el.click()); await settle();
    await update({ native: true });
    assert.equal(await page.locator('button[data-turn-process]').getAttribute('aria-expanded'), 'true');
  });
  await check('浏览器 beforematch 同步展开整个兼容组', async () => {
    await update({ session: 'find', native: false, turns: [{ turn: 10, height: 120 }] });
    await page.locator('[data-chat-flow-key="10-process"]').evaluate(el => el.dispatchEvent(new Event('beforematch', { bubbles: true })));
    await settle();
    assert.equal(await page.locator(compat).getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('[data-dsh-tf-hidden]').count(), 0);
  });
  await check('切换时自动收起不抢输入焦点，不跳动滚动位置', async () => {
    await page.locator(compat).click(); await settle();
    await page.locator('textarea').focus();
    const before = await page.locator('[data-conversation-scroll]').evaluate(el => el.scrollTop);
    await update({ native: true, expanded: { 10: true } });
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'TEXTAREA');
    assert.ok(Math.abs(await page.locator('[data-conversation-scroll]').evaluate(el => el.scrollTop) - before) <= 1);
    await update({ native: false });
  });
  await check('窄窗口及恢复宽度后按钮仍在视口内', async () => {
    await update({ session: 'mobile-width', turns: [{ turn: 10, height: 1000 }] });
    await page.locator(compat).click(); await settle();
    await page.setViewportSize({ width: 430, height: 800 }); await settle();
    const rect = await page.locator(proxy).boundingBox();
    assert.ok(rect && rect.x >= 0 && rect.x + rect.width <= 430);
    await page.setViewportSize({ width: 1100, height: 800 }); await settle();
  });
  await check('切换会话后旧浮动按钮回调不能影响新会话', async () => {
    await page.evaluate(() => { window.staleProxy = document.querySelector('[data-dsh-tf-floating]'); });
    await update({ session: 'stale-target', turns: [{ turn: 10, height: 1000 }] });
    await page.locator(compat).click(); await settle();
    await page.evaluate(() => window.staleProxy.click()); await settle();
    assert.equal(await page.locator(compat).getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator(proxy).count(), 1);
  });
  await check('只有单独思考块时不注入额外底部入口', async () => {
    await update({ session: 'only-think', turns: [] });
    await page.locator('[data-chat-flow]').evaluate(flow => {
      const think = document.createElement('div'); think.dataset.variant = 'think';
      const button = document.createElement('button'); button.textContent = '原生思考控件';
      think.appendChild(button); flow.appendChild(think);
    }); await settle();
    assert.equal(await page.locator('[data-dsh-tf-bottom], [data-dsh-tf-compat]').count(), 0);
    await update({ session: 'settings', turns: [{ turn: 10, height: 120 }] });
  });
  await check('外观关闭不影响折叠；总开关恢复内容并可重新启用', async () => {
    await page.evaluate(() => fixture.settings('hud')); await settle();
    assert.equal(await page.locator(compat).count(), 1);
    await page.evaluate(() => fixture.settings('enabled')); await settle();
    assert.equal(await page.locator('[data-dsh-tf-bottom]').count(), 0);
    assert.equal(await page.locator('[data-dsh-tf-hidden]').count(), 0);
    await page.evaluate(() => fixture.settings('enabled')); await settle();
    assert.equal(await page.locator(compat).count(), 1);
  });
  await check('空闲时不轮询聊天节点或形成观察器循环', async () => {
    await settle();
    const before = await page.evaluate(() => window.fixtureReads);
    await page.evaluate(async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => requestAnimationFrame(resolve)); });
    assert.equal(await page.evaluate(() => window.fixtureReads), before);
  });
  await check('停用移除按钮和隐藏属性，后续 DOM 更新不再产生副作用', async () => {
    await page.evaluate(() => fixture.dispose()); await settle();
    assert.equal(await page.locator('[data-dsh-tf-bottom], [data-dsh-tf-compat], [data-dsh-tf-floating], [data-dsh-tf-hidden]').count(), 0);
    await page.evaluate(() => fixture.render()); await settle();
    assert.equal(await page.locator('[data-dsh-tf-bottom], [data-dsh-tf-hidden]').count(), 0);
    await page.evaluate(() => fixture.unmount());
  });
  assert.deepEqual(errors, [], 'No page errors or enhancement fail-open warnings');
  console.log(`Browser regression: ${passed} passed; no page errors.`);
} catch (error) {
  fs.mkdirSync(path.join(root, '.test-output'), { recursive: true });
  await page.screenshot({ path: path.join(root, '.test-output/failure.png') });
  console.error('Browser errors:', errors);
  throw error;
} finally {
  await browser.close();
}
