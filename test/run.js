import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { DEFAULT_CONFIG, resolveOrder } from '../src/config.js';
import { getPromptText } from '../src/prompt.js';
import { apply, name, inject } from '../index.js';

console.log('🧪 开始运行 dsh-thought-fold v1.0.1 自动化测试...');

assert.equal(name, 'dsh-thought-fold');
assert.deepEqual(inject, ['systemPrompt', 'settings']);
console.log('✓ 插件元数据检验通过');

assert.equal(DEFAULT_CONFIG.enabled, true);
assert.equal(DEFAULT_CONFIG.autoFold, true);
assert.equal(DEFAULT_CONFIG.showLiveHud, true);
assert.equal(DEFAULT_CONFIG.injectPrompt, true);
assert.equal(DEFAULT_CONFIG.promptStyle, 'standard');
assert.equal(DEFAULT_CONFIG.foldStyle, 'codex');
assert.equal(DEFAULT_CONFIG.hideRawThinkTag, false);
assert.equal(DEFAULT_CONFIG.promptPosition, 'after-persona');
console.log('✓ 安全默认配置检验通过');

assert.equal(resolveOrder('after-persona'), 12);
assert.equal(resolveOrder('before-tools'), 960);
assert.equal(resolveOrder('after-tools'), 9960);
assert.equal(resolveOrder('unknown'), 12);
console.log('✓ 注入权重映射检验通过');

assert.equal(getPromptText({ enabled: false }), '');
assert.equal(getPromptText({ enabled: true, injectPrompt: false }), '');
const standardText = getPromptText({ enabled: true, injectPrompt: true, promptStyle: 'standard' });
assert.match(standardText, /Codex 风格执行进度与总结规范/);
assert.match(standardText, /最终总结/);
assert.match(standardText, /不要展示私密内部推理链/);
assert.doesNotMatch(standardText, /使用.*<thought>/);
assert.match(getPromptText({ enabled: true, injectPrompt: true, promptStyle: 'concise' }), /Codex 紧凑进度规范/);
assert.match(getPromptText({ enabled: true, injectPrompt: true, promptStyle: 'deep' }), /Codex 详细进度与验证规范/);
console.log('✓ 三种进度提示词和最终总结规范检验通过');

let sectionMounted = null;
let sectionDisposed = false;
const registeredServices = {};
const registeredCommands = {};
let watchCallback = null;
let childPlugin = null;
const mockCtx = {
  settings: {
    register() {
      return {
        get: () => ({ ...DEFAULT_CONFIG }),
        update: async () => {},
        watch: (fn) => { watchCallback = fn; return () => {}; }
      };
    }
  },
  systemPrompt: {
    section(def) {
      sectionMounted = def;
      return () => { sectionDisposed = true; };
    }
  },
  logger: { warn() {} },
  provide(key, value) { registeredServices[key] = value; },
  plugin(value) { childPlugin = value; },
  inject(deps, fn) {
    if (deps.includes('commands')) {
      fn({ commands: { register(cmd) { registeredCommands[cmd.name] = cmd; } } });
    }
  },
  effect(fn) { return fn(); },
  emit() {}
};

apply(mockCtx);
assert.ok(sectionMounted);
assert.equal(sectionMounted.name, 'dsh-thought-fold:guidance');
assert.equal(sectionMounted.order, 12);
assert.match(sectionMounted.text({}), /Codex/);
assert.ok(registeredServices.thoughtFoldService);
assert.ok(registeredCommands.fold);
assert.ok(childPlugin);

watchCallback({ ...DEFAULT_CONFIG, promptPosition: 'before-tools' }, DEFAULT_CONFIG);
assert.equal(sectionDisposed, true);
assert.equal(sectionMounted.order, 960);
console.log('✓ Host 插件生命周期、服务、Web 子插件与命令装配检验通过');

const clientSource = fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8');
const configSource = fs.readFileSync(new URL('../src/config.js', import.meta.url), 'utf8');
assert.doesNotMatch(clientSource, /new\s+MutationObserver\s*\(/, 'Client 不得创建全局 MutationObserver');
assert.doesNotMatch(clientSource, /\.innerHTML\s*=/, 'Client 不得重写聊天 DOM innerHTML');
assert.doesNotMatch(clientSource, /querySelectorAll\s*\(\s*['"]\[data-chat-turn/, 'Client 不得轮询全部聊天轮次');
assert.doesNotMatch(clientSource, /document\.body/, 'Client 不得监听或改写 document.body');
assert.doesNotMatch(configSource, /await\s+import\s*\(/, 'Host 配置不得使用顶层动态 import');
assert.match(configSource, /^import z from '@deepseek-ai\/schemastery';/);
console.log('✓ 白屏回归守卫通过：无 MutationObserver、无 innerHTML 重写、无聊天轮询、无顶层动态 import');

let clientDefinition;
const mountedStyles = [];
const documentStub = {
  head: { appendChild(node) { mountedStyles.push(node); } },
  createElement(tag) { return { tag, id: '', textContent: '' }; },
  getElementById(id) { return mountedStyles.find((node) => node.id === id) || null; }
};
vm.runInNewContext(clientSource, {
  window: { __ModuleLoader__: { load(definition) { clientDefinition = definition; } } },
  document: documentStub,
  fetch: async () => ({ ok: true, json: async () => ({ config: DEFAULT_CONFIG, promptPreview: '' }) }),
  console,
  setTimeout,
  clearTimeout
});
assert.equal(clientDefinition.id, 'dsh-thought-fold');
const fakeReact = {
  createElement: (...args) => ({ args }),
  useCallback: (fn) => fn,
  useEffect() {},
  useState(initial) { return [initial, () => {}]; }
};
const clientPlugin = clientDefinition.factory((id) => {
  assert.equal(id, 'react');
  return fakeReact;
});
let settingsRegistration = null;
const clientCtx = {
  slots: {
    inject(name, callback) {
      assert.equal(name, 'settings.section');
      callback();
    },
    register(definition, component) {
      settingsRegistration = { definition, component };
      return () => {};
    }
  }
};
clientPlugin.apply(clientCtx);
clientPlugin.apply(clientCtx);
assert.equal(mountedStyles.length, 1, '重复 apply 不得重复注入样式');
assert.equal(settingsRegistration.definition.id, 'thought-fold');
assert.equal(typeof settingsRegistration.component, 'function');
console.log('✓ Client 沙箱加载和幂等 apply 检验通过');

console.log('🎉 所有测试全部顺利通过 (7/7 passing)！');
