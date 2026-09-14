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
    // Optional host useSearchableHidden model (chat.js:1484): apply hidden in a
    // layout effect, but reveal instead when the subtree still owns focus.
    function SearchableRow({ hidden, reveal, children, ...props }) {
      const ref = React.useRef(null);
      React.useLayoutEffect(() => {
        const element = ref.current;
        if (hidden && element.contains(element.ownerDocument.activeElement)) {
          window.fixtureFocusReveals = (window.fixtureFocusReveals || 0) + 1;
          reveal();
          return;
        }
        if (hidden) element.setAttribute('hidden', 'until-found');
        else element.removeAttribute('hidden');
      }, [hidden, reveal]);
      React.useEffect(() => {
        const element = ref.current;
        element.addEventListener('beforematch', reveal);
        return () => element.removeEventListener('beforematch', reveal);
      }, [reveal]);
      return h('div', { ...props, ref }, children);
    }
    function NativeThink({ turn }) {
      const [open, setOpen] = React.useState(false);
      return h('div', { 'data-variant': 'think' },
        h('button', { type: 'button', 'data-native-think': turn, 'aria-expanded': open,
          onClick: () => setOpen(value => !value) }, '原生思考控件'),
        h('div', { 'data-native-think-content': turn, hidden: !open }, '最终回答中的原生思考内容'));
    }
    function render() {
      const nodes = new Map();
      const rows = [];
      for (const item of state.turns) {
        const turn = item.turn;
        const base = turn * 100;
        const native = state.native;
        const expanded = !!state.expanded[turn];
        // Item API: steeringCount (default 0), steeringKind ('steering'|'user'),
        // queuedSteering (outside chat flow), interrupted, noAnswer, running,
        // prefixSettled (default true), partialAnswer, trailingReasoning,
        // error (true|string), maxTokens, segmentHeights (0-based), searchableHidden
        // (opt-in host focus/beforematch reveal plus focusable process content),
        // inlineReasoning (answer-local data-turn-process-inline native think UI).
        // Keep the original process/tool/answer keys for the existing regressions.
        const steeringCount = item.steeringCount ?? 0;
        const answerSeq = base + steeringCount * 10 + 10;
        const answerStep = steeringCount * 2 + 3;
        const turnLocation = { turn, status: item.running ? 'running' : 'closed',
          ...(item.running ? {} : { end: { seq: answerSeq + 4 } }) };
        const location = { kind: 'turn', turn: turnLocation };
        const hasFinalAnswer = !item.noAnswer && !item.partialAnswer && !item.interrupted;
        const spec = { turn, controlAnchorSeq: base, processStartSeq: base,
          answerAnchorSeq: hasFinalAnswer ? answerSeq : null, answerStep: hasFinalAnswer ? answerStep : null,
          inlineReasoning: !!item.inlineReasoning };
        const stepLocation = (step, seq, closed) => ({ kind: 'step', turn: turnLocation,
          step: { step, status: closed ? 'closed' : 'running', ...(closed ? { end: { seq } } : {}) } });
        const add = (kind, suffix, seq, data, content, props = {}, nodeLocation = location) => {
          const key = `${turn}-${suffix}`;
          nodes.set(key, { key, kind, anchorSeq: seq, data, location: nodeLocation });
          const searchable = item.searchableHidden && props['data-turn-process-member'];
          rows.push(h(searchable ? SearchableRow : 'div', {
            key, 'data-chat-flow-key': key, 'data-chat-flow-kind': kind, 'data-chat-turn': turn, ...props,
            ...(searchable ? { reveal: () => {
              if (state.expanded[turn]) return;
              state.expanded = { ...state.expanded, [turn]: true };
              // Schedule the host state update outside the current flushSync commit.
              queueMicrotask(render);
            } } : {})
          }, content));
        };
        add('user', 'user', base - 1, {}, `用户问题 ${turn}`);
        add('turn-process', 'control', base, spec, native ? h('button', {
          type: 'button', 'data-turn-process': turn, 'aria-expanded': expanded, 'data-open': expanded || undefined,
          onClick: event => {
            window.fixtureNativeClicks = (window.fixtureNativeClicks || 0) + 1;
            // The real host does not forcibly focus a programmatically clicked top
            // button; preserve that behavior for the focus-reveal regression.
            if (!item.searchableHidden) event.currentTarget.focus();
            state.expanded = { ...state.expanded, [turn]: !expanded }; render();
          }
        }, `思考与工具调用 ${turn}`) : null, { hidden: !native ? 'until-found' : undefined, 'data-turn-process-hidden': !native || undefined });
        const memberProps = { 'data-turn-process-member': native || undefined, 'data-turn-process-hidden': native && !expanded || undefined, hidden: native && !expanded ? 'until-found' : undefined };
        for (let segment = 0; segment <= steeringCount; segment++) {
          const seq = base + segment * 10;
          const step = segment * 2 + 1;
          const closed = !item.running || (segment < steeringCount && item.prefixSettled !== false);
          const suffix = segment === 0 ? '' : `-${segment + 1}`;
          if (segment > 0) add(item.steeringKind ?? 'steering', `steering-${segment}`, seq - 1,
            { content: `插话 ${segment}`, source: { kind: 'user' } }, `插话 ${segment}`);
          add('assistant-step', `process${suffix}`, seq + 1,
            { turn, step, status: !closed ? 'running' : item.interrupted && segment === steeringCount ? 'interrupted' : 'settled',
              blocks: [{ kind: 'reasoning', text: `过程 ${turn}` }] },
            h('div', { style: { height: item.segmentHeights?.[segment] ?? item.height } }, `过程 ${turn} SEARCHABLE_PROCESS_${turn}`,
              item.searchableHidden ? h('button', { type: 'button', 'data-native-focus': `${turn}-${segment + 1}` }, '过程内可聚焦内容') : null),
            memberProps, stepLocation(step, seq + 3, closed));
          // A settled tool root has a kind; a running root deliberately does not.
          add('tool-call', `tool${suffix}`, seq + 2,
            { root: { callId: `${turn}-call${suffix}`, ...closed ? { kind: 'success', seq: seq + 3 } : {} } },
            '工具调用', memberProps, stepLocation(step, seq + 3, closed));
        }
        if (!item.noAnswer) add('assistant-step', 'answer', answerSeq,
          { turn, step: answerStep, status: item.running ? 'running' : item.interrupted ? 'interrupted' : 'settled',
            blocks: [...(item.inlineReasoning ? [{ kind: 'reasoning', text: '最终回答中的原生思考内容' }] : []),
              { kind: 'text', text: item.partialAnswer ? `部分回答 ${turn}` : `最终回答 ${turn}` }] },
          item.inlineReasoning ? h(React.Fragment, null,
            h(SearchableRow, { 'data-turn-process-inline': '', hidden: native && !expanded,
              reveal: () => {
                if (state.expanded[turn]) return;
                state.expanded = { ...state.expanded, [turn]: true };
                queueMicrotask(render);
              } }, h(NativeThink, { turn })),
            item.partialAnswer ? `部分回答 ${turn}` : `最终回答 ${turn}`)
            : item.partialAnswer ? `部分回答 ${turn}` : `最终回答 ${turn}`, { style: { height: 100 } },
          stepLocation(answerStep, answerSeq + 1, !item.running));
        if (item.trailingReasoning) add('assistant-step', 'trailing-reasoning', answerSeq + 1,
          { turn, step: answerStep + 1, status: 'interrupted', blocks: [{ kind: 'reasoning', text: '后续思考' }, { kind: 'text', text: '   ' }] },
          '后续思考', memberProps, stepLocation(answerStep + 1, answerSeq + 2, true));
        if (item.error) add('turn-error', 'error', answerSeq + 2, { turn, message: String(item.error) },
          typeof item.error === 'string' ? item.error : '执行失败');
        if (item.maxTokens) add('turn-max-tokens', 'max-tokens', answerSeq + 3, { turn }, '已达到输出长度上限');
        add('turn-tail', 'tail', answerSeq + 4, {}, item.running ? '运行中' : item.interrupted ? '已中断' : '完成');
        if (item.queuedSteering) {
          const key = `${turn}-queued-steering`;
          nodes.set(key, { key, kind: 'steering', anchorSeq: base + 5, data: { content: '排队插话' }, location });
        }
      }
      const getNode = nodes.get.bind(nodes);
      nodes.get = key => { window.fixtureReads = (window.fixtureReads || 0) + 1; return getNode(key); };
      snapshot = { nodes, timeline: {} };
      ReactDOM.flushSync(() => root.render(h('div', { 'data-conversation-scroll': '', key: state.session },
        h('div', { 'data-chat-flow': '' }, rows),
        h('div', { 'data-composer-seat': '', style: { height: state.composerHeight } },
          state.turns.filter(item => item.queuedSteering).map(item => h('div', {
            key: `${item.turn}-queued-steering`, 'data-chat-flow-key': `${item.turn}-queued-steering`,
            'data-chat-flow-kind': 'steering', 'data-chat-turn': item.turn
          }, '排队插话（尚未进入 flow）')),
          h('textarea', { 'aria-label': '消息输入框' }), h(Dock, { useChat, foldSessionId: state.session }))
      )));
      listeners.forEach(fn => fn());
    }
    window.fixture = {
      update(patch) { state = { ...state, ...patch }; render(); },
      dispose() { disposers.splice(0).forEach(fn => fn()); },
      unmount() { ReactDOM.flushSync(() => root.unmount()); },
      render,
      // Host metadata update with no chat DOM mutation.
      closeMetadata(turn) {
        const control = snapshot.nodes.get(`${turn}-control`);
        control.location.turn.status = 'closed';
        control.location.turn.end = { seq: snapshot.nodes.get(`${turn}-tail`).anchorSeq };
        for (const node of snapshot.nodes.values()) {
          if (node.location.turn.turn !== turn || node.location.kind !== 'step') continue;
          node.location.step.status = 'closed';
          node.location.step.end = { seq: node.anchorSeq + 1 };
          if (node.kind === 'assistant-step') node.data.status = 'settled';
          if (node.kind === 'tool-call') node.data.root.kind = 'success';
        }
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
  // 2.2.0 contract tests. All folding is driven by the real plugin in React/Edge;
  // the fixture only renders host nodes and implements the native whole-turn toggle.
  const row = key => page.locator(`[data-chat-flow-key="${key}"]`);
  const segment = (turn, number) => page.locator(`${compat}[aria-label*="第 ${turn} 轮"][aria-label*="第 ${number} 段"]`);
  const assertShown = async key => {
    assert.equal(await row(key).isVisible(), true, `${key} must remain visible`);
    assert.equal(await row(key).getAttribute('data-dsh-tf-hidden'), null, `${key} must not be plugin-hidden`);
    assert.ok(await row(key).evaluate(el => el.getBoundingClientRect().height > 0), `${key} must occupy layout space`);
  };
  const assertFolded = async key => {
    assert.equal(await row(key).evaluate(el => el.hasAttribute('data-dsh-tf-hidden')), true, `${key} must be folded`);
    assert.equal(await row(key).evaluate(el => el.getBoundingClientRect().height), 0, `${key} must leave no layout gap`);
  };
  const toggleSegment = async (turn, number) => {
    // Native click semantics without scrolling another segment into the viewport.
    await segment(turn, number).evaluate(el => el.click()); await settle();
  };
  await check('单次 steering 始终可见，前后两段独立折叠', async () => {
    await update({ session: 'segment-one', native: false, turns: [{ turn: 20, height: 180, steeringCount: 1 }] });
    assert.equal(await page.locator(compat).count(), 2);
    await assertShown('20-user'); await assertShown('20-steering-1'); await assertShown('20-answer');
    await assertFolded('20-process'); await assertFolded('20-tool');
    await assertFolded('20-process-2'); await assertFolded('20-tool-2');
    await toggleSegment(20, 1);
    await assertShown('20-process'); await assertShown('20-tool');
    await assertFolded('20-process-2');
    assert.equal(await segment(20, 2).getAttribute('aria-expanded'), 'false');
    await toggleSegment(20, 2); await toggleSegment(20, 1);
    await assertFolded('20-process'); await assertShown('20-process-2');
    await assertShown('20-steering-1');
  });
  await check('多次插话形成三段，每段选择相互独立', async () => {
    await update({ session: 'segment-many', turns: [{ turn: 21, height: 160, steeringCount: 2 }] });
    assert.equal(await page.locator(compat).count(), 3);
    for (let number = 1; number <= 3; number++) assert.equal(await segment(21, number).getAttribute('aria-expanded'), 'false');
    await toggleSegment(21, 2);
    await assertFolded('21-process'); await assertShown('21-process-2'); await assertFolded('21-process-3');
    await toggleSegment(21, 3); await toggleSegment(21, 2);
    await assertFolded('21-process-2'); await assertShown('21-process-3');
    for (const key of ['21-user', '21-steering-1', '21-steering-2', '21-answer', '21-tail']) await assertShown(key);
  });
  await check('flow 内 user 类型插话同样切段且不被折叠', async () => {
    await update({ session: 'segment-user', turns: [{ turn: 22, height: 160, steeringCount: 1, steeringKind: 'user' }] });
    assert.equal(await page.locator(compat).count(), 2);
    assert.equal(await row('22-steering-1').getAttribute('data-chat-flow-kind'), 'user');
    await assertShown('22-steering-1');
    await toggleSegment(22, 1); await toggleSegment(22, 2);
    await toggleSegment(22, 1); await toggleSegment(22, 2);
    await assertShown('22-steering-1');
  });
  await check('原生整轮开关在分段时挂起，展开段不受原生双重隐藏', async () => {
    await update({ session: 'segment-native', native: true, expanded: { 23: false }, turns: [{ turn: 23, height: 180, steeringCount: 1 }] });
    assert.equal(await page.locator('button[data-turn-process="23"]').getAttribute('aria-expanded'), 'false');
    assert.equal(await row('23-control').evaluate(el => el.hasAttribute('data-dsh-tf-native-suspended')), true);
    assert.equal(await page.locator(compat).count(), 2);
    await toggleSegment(23, 1);
    for (const key of ['23-process', '23-tool']) {
      await assertShown(key);
      assert.equal(await row(key).getAttribute('hidden'), 'until-found');
      assert.equal(await row(key).evaluate(el => getComputedStyle(el).contentVisibility), 'visible', 'reversible CSS must defeat native content-visibility while this segment is open');
    }
    await assertFolded('23-process-2'); await assertShown('23-steering-1');
    await page.evaluate(() => fixture.render()); await settle();
    await assertShown('23-process'); await assertFolded('23-process-2');
    assert.equal(await page.locator('button[data-turn-process="23"]').getAttribute('aria-expanded'), 'false');
  });
  await check('running 轮已结束前段可收起，仍运行尾段保持可见', async () => {
    await update({ session: 'segment-running', native: false, turns: [{ turn: 24, height: 180, steeringCount: 1, running: true, noAnswer: true, prefixSettled: true }] });
    assert.equal(await page.locator(compat).count(), 1);
    assert.equal(await segment(24, 1).getAttribute('aria-expanded'), 'false');
    await assertFolded('24-process'); await assertFolded('24-tool');
    await assertShown('24-steering-1'); await assertShown('24-process-2'); await assertShown('24-tool-2');
    await assertShown('24-tail');
    await toggleSegment(24, 1); await assertShown('24-process'); await assertShown('24-process-2');
  });
  await check('running 前段 step 和 tool 未 settled 时不提前收起', async () => {
    await update({ session: 'segment-unsettled', turns: [{ turn: 25, height: 100, steeringCount: 1, running: true, noAnswer: true, prefixSettled: false }] });
    assert.equal(await page.locator(compat).count(), 0);
    for (const key of ['25-process', '25-tool', '25-steering-1', '25-process-2', '25-tool-2']) await assertShown(key);
  });
  await check('排队插话不属于 chat flow，即使存在 store 中也不切段', async () => {
    await update({ session: 'segment-queued', turns: [{ turn: 26, height: 160, queuedSteering: true }] });
    assert.equal(await page.locator(compat).count(), 1);
    assert.equal(await page.locator('[data-chat-flow] [data-chat-flow-key="26-queued-steering"]').count(), 0);
    await assertShown('26-queued-steering'); await assertFolded('26-process'); await assertShown('26-answer');
    await page.locator(compat).evaluate(el => el.click()); await settle();
    await assertShown('26-process'); await assertShown('26-tool');
  });
  await check('closed 无回答中断仍折叠过程，保留用户和中断尾提示', async () => {
    await update({ session: 'interrupt-empty', turns: [{ turn: 27, height: 180, interrupted: true, noAnswer: true }] });
    assert.equal(await row('27-answer').count(), 0);
    assert.equal(await page.locator(compat).count(), 1);
    await assertFolded('27-process'); await assertFolded('27-tool');
    await assertShown('27-user'); await assertShown('27-tail');
    assert.equal(await row('27-tail').textContent(), '已中断');
    await page.locator(compat).evaluate(el => el.click()); await settle();
    await assertShown('27-process'); await assertShown('27-tool');
  });
  await check('中断没有 finalAnswer 锚点仍保留最后有文本的部分回答', async () => {
    await update({ session: 'interrupt-partial', turns: [{ turn: 28, height: 180, interrupted: true, partialAnswer: true, trailingReasoning: true }] });
    assert.equal(await page.locator(compat).count(), 1);
    await assertFolded('28-process'); await assertFolded('28-tool');
    await assertShown('28-answer'); await assertShown('28-tail');
    assert.equal(await row('28-answer').textContent(), '部分回答 28');
    // A later reasoning-only step (including whitespace text) is not the answer
    // and must remain a standalone visible think block, not a second group.
    await assertShown('28-trailing-reasoning');
    assert.equal(await page.locator(compat).count(), 1);
    await page.locator(compat).evaluate(el => el.click()); await settle();
    await assertShown('28-answer'); await assertShown('28-trailing-reasoning');
    assert.equal(await page.locator(compat).count(), 1);
    await page.locator(compat).evaluate(el => el.click()); await settle();
    await assertShown('28-answer'); await assertShown('28-trailing-reasoning');
    assert.equal(await page.locator(compat).count(), 1);
  });
  await check('错误及 max-tokens 提示在无回答中断折叠和展开后均可见', async () => {
    await update({ session: 'interrupt-notices', turns: [{ turn: 29, height: 180, interrupted: true, noAnswer: true, error: '连接断开', maxTokens: true }] });
    assert.equal(await page.locator(compat).count(), 1);
    await assertFolded('29-process');
    for (const key of ['29-error', '29-max-tokens', '29-tail']) await assertShown(key);
    assert.equal(await row('29-error').textContent(), '连接断开');
    await page.locator(compat).evaluate(el => el.click()); await settle();
    await page.locator(compat).evaluate(el => el.click()); await settle();
    for (const key of ['29-error', '29-max-tokens', '29-tail']) await assertShown(key);
  });
  await check('插话后中断：所有结束段可收起，插话和部分回答均保留', async () => {
    await update({ session: 'segment-interrupted', turns: [{ turn: 30, height: 180, steeringCount: 2, interrupted: true, partialAnswer: true, error: true }] });
    assert.equal(await page.locator(compat).count(), 3);
    for (const key of ['30-process', '30-process-2', '30-process-3']) await assertFolded(key);
    for (const key of ['30-user', '30-steering-1', '30-steering-2', '30-answer', '30-error', '30-tail']) await assertShown(key);
    await toggleSegment(30, 2);
    await assertShown('30-process-2'); await assertFolded('30-process-3');
  });
  await check('旧会话延迟加载插话和中断轮，分段按钮无遗漏或重复', async () => {
    await update({ session: 'segment-lazy', turns: [] });
    assert.equal(await page.locator(compat).count(), 0);
    await update({ turns: [{ turn: 31, height: 160, steeringCount: 1, interrupted: true, noAnswer: true }] });
    assert.equal(await page.locator(compat).count(), 2);
    await assertFolded('31-process'); await assertFolded('31-process-2'); await assertShown('31-steering-1');
    await update({ turns: [
      { turn: 31, height: 160, steeringCount: 1, interrupted: true, noAnswer: true },
      { turn: 32, height: 160, steeringCount: 2 }
    ] });
    assert.equal(await page.locator(compat).count(), 5);
    await assertFolded('32-process-3'); await assertShown('32-answer');
  });
  await check('分段手动展开在 React 重绘及尺寸变化后保持', async () => {
    await update({ session: 'segment-redraw', turns: [{ turn: 33, height: 200, steeringCount: 2 }] });
    await toggleSegment(33, 2);
    await page.evaluate(() => { fixture.render(); fixture.render(); }); await settle();
    await update({ composerHeight: 180 });
    assert.equal(await page.locator(compat).count(), 3);
    assert.equal(await segment(33, 1).getAttribute('aria-expanded'), 'false');
    assert.equal(await segment(33, 2).getAttribute('aria-expanded'), 'true');
    assert.equal(await segment(33, 3).getAttribute('aria-expanded'), 'false');
    await assertFolded('33-process'); await assertShown('33-process-2'); await assertFolded('33-process-3');
  });
  await check('分段浮动按钮只收起当前段，不改变同轮其他展开段', async () => {
    await update({ session: 'segment-floating', composerHeight: 130, turns: [{ turn: 34, height: 1200, steeringCount: 1 }] });
    await toggleSegment(34, 1); await toggleSegment(34, 2);
    await page.locator('[data-conversation-scroll]').evaluate(el => {
      const target = el.querySelector('[data-chat-flow-key="34-process-2"]');
      el.scrollTop += target.getBoundingClientRect().top - el.getBoundingClientRect().top + 120;
    }); await settle();
    assert.equal(await page.locator(proxy).count(), 1);
    assert.match(await page.locator(proxy).getAttribute('aria-label'), /第 34 轮.*第 2 段/);
    const floating = await page.locator(proxy).boundingBox();
    const composer = await page.locator('[data-composer-seat]').boundingBox();
    assert.ok(floating.y + floating.height <= composer.y - 5);
    await page.locator(proxy).click(); await settle();
    assert.equal(await segment(34, 1).getAttribute('aria-expanded'), 'true');
    assert.equal(await segment(34, 2).getAttribute('aria-expanded'), 'false');
    await assertShown('34-process'); await assertFolded('34-process-2'); await assertShown('34-steering-1');
  });
  await check('关闭总开关解除 native 挂起并恢复进入分段前的原生开合', async () => {
    await update({ session: 'segment-disable', native: true, expanded: { 35: false, 36: true }, turns: [
      { turn: 35, height: 160, steeringCount: 1 }, { turn: 36, height: 160, steeringCount: 1 }
    ] });
    assert.equal(await page.locator('[data-dsh-tf-native-suspended]').count(), 2);
    await toggleSegment(35, 1);
    await page.evaluate(() => fixture.settings('enabled')); await settle();
    assert.equal(await page.locator('[data-dsh-tf-compat], [data-dsh-tf-bottom], [data-dsh-tf-floating], [data-dsh-tf-hidden], [data-dsh-tf-native-suspended], [data-dsh-tf-native-reveal]').count(), 0);
    assert.equal(await page.locator('button[data-turn-process="35"]').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('button[data-turn-process="36"]').getAttribute('aria-expanded'), 'true');
    assert.equal(await row('35-process').getAttribute('hidden'), 'until-found');
    await assertShown('36-process'); await assertShown('35-steering-1'); await assertShown('36-steering-1');
    await page.evaluate(() => fixture.render()); await settle();
    assert.equal(await row('35-process').getAttribute('hidden'), 'until-found');
    await assertShown('36-process');
    await page.evaluate(() => fixture.settings('enabled')); await settle();
    assert.equal(await page.locator(compat).count(), 4);
    assert.equal(await page.locator('[data-dsh-tf-native-suspended]').count(), 2);
  });
  await check('分段 compact→normal→compact 保留 native 原始开合，任一模式停用均恢复', async () => {
    for (const disableAt of ['normal', 'compact']) {
      const nativeClicks = await page.evaluate(() => window.fixtureNativeClicks || 0);
      await update({ session: `native-lease-${disableAt}`, native: true, expanded: { 38: false, 39: true }, turns: [
        { turn: 38, height: 160, steeringCount: 1, searchableHidden: true }, { turn: 39, height: 160, steeringCount: 1, searchableHidden: true }
      ] });
      assert.equal(await page.locator('[data-dsh-tf-native-suspended]').count(), 2);
      assert.equal(await page.locator('button[data-turn-process="38"]').getAttribute('aria-expanded'), 'false');
      await toggleSegment(38, 1);
      // Same session/turn identities; do not reset expanded while native DOM is absent.
      await update({ native: false });
      assert.equal(await page.locator('button[data-turn-process]').count(), 0);
      assert.equal(await page.locator(compat).count(), 4);
      if (disableAt === 'compact') {
        await update({ native: true });
        assert.equal(await page.locator('[data-dsh-tf-native-suspended]').count(), 2);
        assert.equal(await page.locator('button[data-turn-process="38"]').getAttribute('aria-expanded'), 'false');
      }
      await page.evaluate(() => fixture.settings('enabled')); await settle();
      assert.equal(await page.locator('[data-dsh-tf-compat], [data-dsh-tf-bottom], [data-dsh-tf-floating], [data-dsh-tf-hidden], [data-dsh-tf-native-suspended], [data-dsh-tf-native-reveal]').count(), 0);
      if (disableAt === 'normal') await update({ native: true });
      assert.equal(await page.locator('button[data-turn-process="38"]').getAttribute('aria-expanded'), 'false', `original closed state survives disable in ${disableAt}`);
      assert.equal(await page.locator('button[data-turn-process="39"]').getAttribute('aria-expanded'), 'true', `original open state survives disable in ${disableAt}`);
      assert.equal(await row('38-process').getAttribute('hidden'), 'until-found');
      await assertShown('39-process'); await assertShown('38-steering-1'); await assertShown('39-steering-1');
      await page.evaluate(() => fixture.render()); await settle();
      assert.equal(await page.locator('button[data-turn-process="38"]').getAttribute('aria-expanded'), 'false');
      await assertShown('39-process');
      assert.equal(await page.evaluate(() => window.fixtureNativeClicks || 0), nativeClicks, 'mode changes and disable must make zero native clicks');
      await page.evaluate(() => fixture.settings('enabled')); await settle();
    }
  });
  await check('原生 useSearchableHidden focus reveal 可正常发生，分段及停用均不点击原生开关', async () => {
    await page.evaluate(() => fixture.settings('enabled')); await settle();
    // Positive control: with no plugin, focusing a member and closing its native
    // turn must really invoke the host-style layout-effect reveal, not a mock spy.
    await update({ session: 'native-focus-control', native: true, expanded: { 40: true }, turns: [
      { turn: 40, height: 160, steeringCount: 1, searchableHidden: true }
    ] });
    await page.locator('[data-native-focus="40-1"]').focus();
    const controlReveals = await page.evaluate(() => window.fixtureFocusReveals || 0);
    await update({ expanded: { 40: false } });
    assert.ok(await page.evaluate(() => window.fixtureFocusReveals || 0) > controlReveals, 'fixture must exercise focus-triggered reveal');
    assert.equal(await page.locator('button[data-turn-process="40"]').getAttribute('aria-expanded'), 'true');
    await assertShown('40-process');
    await update({ session: 'native-focus-restore', expanded: { 40: false, 41: true }, turns: [
      { turn: 40, height: 160, steeringCount: 1, searchableHidden: true },
      { turn: 41, height: 160, steeringCount: 1, searchableHidden: true }
    ] });
    const nativeClicks = await page.evaluate(() => window.fixtureNativeClicks || 0);
    await page.evaluate(() => fixture.settings('enabled')); await settle();
    assert.equal(await page.locator('[data-dsh-tf-native-suspended]').count(), 2);
    assert.equal(await page.locator('button[data-turn-process="40"]').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('button[data-turn-process="41"]').getAttribute('aria-expanded'), 'true');
    await toggleSegment(40, 1);
    await assertShown('40-process');
    assert.equal(await row('40-process').evaluate(el => getComputedStyle(el).contentVisibility), 'visible');
    assert.equal(await row('40-process').getAttribute('hidden'), 'until-found', 'native state is unchanged; CSS alone reveals the open segment');
    await page.locator('[data-native-focus="40-1"]').focus();
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-native-focus')), '40-1');
    const beforeUserReveal = await page.evaluate(() => window.fixtureFocusReveals || 0);
    // A focused subtree may legitimately make the host open its own native group
    // on the next layout effect. The plugin must not undo this user-owned change.
    await page.evaluate(() => fixture.render()); await settle();
    assert.ok(await page.evaluate(() => window.fixtureFocusReveals || 0) > beforeUserReveal);
    assert.equal(await page.locator('button[data-turn-process="40"]').getAttribute('aria-expanded'), 'true');
    await page.evaluate(() => fixture.settings('enabled')); await settle();
    assert.equal(await page.locator('[data-dsh-tf-compat], [data-dsh-tf-bottom], [data-dsh-tf-floating], [data-dsh-tf-hidden], [data-dsh-tf-native-suspended], [data-dsh-tf-native-reveal]').count(), 0);
    assert.equal(await page.locator('button[data-turn-process="40"]').getAttribute('aria-expanded'), 'true', 'preserve legitimate host focus reveal on disable');
    assert.equal(await page.locator('button[data-turn-process="41"]').getAttribute('aria-expanded'), 'true');
    await assertShown('40-process'); await assertShown('41-process'); await assertShown('40-steering-1');
    assert.equal(await page.evaluate(() => window.fixtureNativeClicks || 0), nativeClicks, 'segmentation and disable must make zero native clicks');
    await page.evaluate(() => fixture.render()); await settle();
    assert.equal(await page.locator('button[data-turn-process="40"]').getAttribute('aria-expanded'), 'true');
    await assertShown('40-process');
    await page.evaluate(() => fixture.settings('enabled')); await settle();
  });
  await check('原生关闭的分段轮仍可操作最终回答 inline 思考，停用恢复原生隐藏', async () => {
    const nativeClicks = await page.evaluate(() => window.fixtureNativeClicks || 0);
    await update({ session: 'native-inline-reasoning', native: true, expanded: { 42: false }, turns: [
      { turn: 42, height: 160, steeringCount: 1, inlineReasoning: true }
    ] });
    const inline = row('42-answer').locator('[data-turn-process-inline]');
    const think = inline.locator('[data-native-think="42"]');
    const content = inline.locator('[data-native-think-content="42"]');
    assert.equal(await page.locator(compat).count(), 2, 'inline think must not become another compat group');
    assert.equal(await page.locator('button[data-turn-process="42"]').getAttribute('aria-expanded'), 'false');
    assert.equal(await inline.getAttribute('data-turn-process-member'), null, 'inline wrapper is independent of process members');
    assert.equal(await inline.getAttribute('hidden'), 'until-found');
    assert.equal(await inline.evaluate(el => getComputedStyle(el).contentVisibility), 'visible');
    assert.ok(await inline.evaluate(el => el.getBoundingClientRect().height > 0));
    assert.equal(await think.isVisible(), true);
    await assertShown('42-answer'); await assertFolded('42-process'); await assertFolded('42-process-2');
    await think.click(); await settle();
    assert.equal(await think.getAttribute('aria-expanded'), 'true');
    assert.equal(await content.isVisible(), true);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-native-think')), '42');
    await think.click(); await settle();
    assert.equal(await think.getAttribute('aria-expanded'), 'false');
    assert.equal(await content.isVisible(), false);
    assert.equal(await page.locator(compat).count(), 2);
    assert.equal(await page.locator('button[data-turn-process="42"]').getAttribute('aria-expanded'), 'false');
    // Leave the subtree before restoration so a legitimate host focus reveal
    // cannot be mistaken for plugin mutation of the original native state.
    await page.locator('textarea').focus();
    await page.evaluate(() => fixture.settings('enabled')); await settle();
    assert.equal(await page.locator('[data-dsh-tf-compat], [data-dsh-tf-bottom], [data-dsh-tf-floating], [data-dsh-tf-hidden], [data-dsh-tf-native-suspended], [data-dsh-tf-native-reveal]').count(), 0);
    assert.equal(await page.locator('button[data-turn-process="42"]').getAttribute('aria-expanded'), 'false');
    assert.equal(await inline.getAttribute('hidden'), 'until-found');
    assert.equal(await inline.evaluate(el => getComputedStyle(el).contentVisibility), 'hidden');
    assert.equal(await inline.evaluate(el => el.getBoundingClientRect().height), 0);
    await assertShown('42-answer');
    await page.evaluate(() => fixture.render()); await settle();
    assert.equal(await inline.getAttribute('hidden'), 'until-found');
    assert.equal(await inline.evaluate(el => getComputedStyle(el).contentVisibility), 'hidden');
    assert.equal(await page.evaluate(() => window.fixtureNativeClicks || 0), nativeClicks, 'inline enhancement must not click the whole-turn control');
    await page.evaluate(() => fixture.settings('enabled')); await settle();
  });
  await check('dispose 分段原生组恢复先前关闭状态且重绘不再介入', async () => {
    await update({ session: 'segment-dispose', native: true, expanded: { 37: false }, turns: [{ turn: 37, height: 180, steeringCount: 1 }] });
    assert.equal(await page.locator('button[data-turn-process="37"]').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('[data-dsh-tf-native-suspended]').count(), 1);
    await page.evaluate(() => fixture.dispose()); await settle();
    assert.equal(await page.locator('[data-dsh-tf-compat], [data-dsh-tf-bottom], [data-dsh-tf-floating], [data-dsh-tf-hidden], [data-dsh-tf-native-suspended], [data-dsh-tf-native-reveal]').count(), 0);
    assert.equal(await page.locator('button[data-turn-process="37"]').getAttribute('aria-expanded'), 'false');
    assert.equal(await row('37-process').getAttribute('hidden'), 'until-found');
    await assertShown('37-steering-1'); await assertShown('37-answer');
    await page.evaluate(() => fixture.render()); await settle();
    assert.equal(await row('37-process').getAttribute('hidden'), 'until-found');
    assert.equal(await page.locator('[data-dsh-tf-native-suspended], [data-dsh-tf-compat]').count(), 0);
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
