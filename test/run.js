import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { DEFAULT_CONFIG } from '../src/config.js';
import { apply, name, inject } from '../index.js';

console.log('🧪 开始运行 dsh-thought-fold 自动化测试...');

assert.equal(name, 'dsh-thought-fold');
assert.deepEqual(inject, ['settings']);
assert.deepEqual(DEFAULT_CONFIG, {
  enabled: true,
  showLiveHud: true,
  foldStyle: 'codex'
});
console.log('✓ 插件元数据与精简配置检验通过');

const registeredServices = {};
const registeredCommands = {};
let childPlugin = null;
let savedPatch = null;
const mockCtx = {
  settings: {
    register() {
      return {
        get: () => ({ ...DEFAULT_CONFIG }),
        update: async (patch) => { savedPatch = patch; }
      };
    }
  },
  logger: { warn() {} },
  provide(key, value) { registeredServices[key] = value; },
  plugin(value) { childPlugin = value; },
  inject(deps, fn) {
    if (deps.includes('commands')) {
      fn({ commands: { register(cmd) { registeredCommands[cmd.name] = cmd; } } });
    }
  }
};

apply(mockCtx);
assert.ok(registeredServices.thoughtFoldService);
assert.ok(registeredCommands.fold);
assert.ok(childPlugin);
assert.doesNotMatch((await registeredCommands.fold.handler({ rawInput: 'status' })).text, /提示词|prompt/i);
await registeredCommands.fold.handler({ rawInput: 'toggle' });
assert.deepEqual(savedPatch, { enabled: false });
console.log('✓ Host 服务、Web 子插件与命令装配检验通过');

const clientSource = fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8');
const configSource = fs.readFileSync(new URL('../src/config.js', import.meta.url), 'utf8');
const hostSource = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
const webSource = fs.readFileSync(new URL('../src/web.js', import.meta.url), 'utf8');
const packageSource = fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8');

assert.equal(fs.existsSync(new URL('../src/prompt.js', import.meta.url)), false, '提示词源码文件必须删除');
assert.doesNotMatch(configSource, /injectPrompt|promptStyle|promptPosition|hideRawThinkTag|autoFold/);
assert.doesNotMatch(hostSource, /systemPrompt|prompt\.js|resolveOrder/);
assert.doesNotMatch(webSource, /promptPreview|system-prompt/);
assert.doesNotMatch(packageSource, /dsh-system-prompt/);
assert.doesNotMatch(clientSource, /promptPreview|dsh-tf-preview|injectPrompt|promptStyle|promptPosition|autoFold/);
console.log('✓ 提示注入路径、配置项、预览区与依赖已全部移除');

assert.match(clientSource, /observer\.observe\(scope,/, '观察器必须限定在会话作用域');
assert.doesNotMatch(clientSource, /\.observe\(\s*(?:document|doc)\b/, '不得观察整页或根文档');
assert.doesNotMatch(clientSource, /setInterval\s*\(/, '不得轮询聊天内容');
assert.doesNotMatch(clientSource, /\.innerHTML\s*=/, 'Client 不得重写聊天 DOM innerHTML');
assert.doesNotMatch(clientSource, /querySelectorAll\s*\(\s*['"]\[data-chat-turn/, 'Client 不得轮询全部聊天轮次');
assert.doesNotMatch(clientSource, /document\.body/, 'Client 不得监听或改写 document.body');
assert.doesNotMatch(configSource, /await\s+import\s*\(/, 'Host 配置不得使用顶层动态 import');
assert.match(configSource, /^import z from '@deepseek-ai\/schemastery';/);
console.log('✓ 白屏回归守卫通过');

assert.match(clientSource, /label: \(\) => '思考折叠'/);
assert.match(clientSource, /h\('h1'.*'思考与折叠'/s);
assert.match(clientSource, /\.dsh-tf-title\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/);
assert.match(clientSource, /--dsw-alias-bg-layer-1, #fff/);
assert.match(clientSource, /\.dsh-tf-select option/);
assert.doesNotMatch(clientSource, /color-scheme\s*:/, '下拉框必须继承 DSH 当前主题，不能覆盖 color-scheme');
assert.doesNotMatch(clientSource, /syncRuntimeAppearance\(DEFAULT_CONFIG\)/, '读取配置前不得短暂启用默认样式');
assert.match(clientSource, /@media \(max-width: 480px\)/);
assert.match(clientSource, /prefers-reduced-motion/);
assert.match(clientSource, /data-dsh-thought-fold=\"minimal\"/);
assert.match(clientSource, /data-dsh-thought-fold=\"clean\"/);
console.log('✓ 标题截断、主题下拉框、响应式与三种外观样式检验通过');

let clientDefinition;
const mountedStyles = [];
const lifecycleDisposers = [];
const rootAttributes = new Map();
const documentStub = {
  head: { appendChild(node) { mountedStyles.push(node); } },
  documentElement: {
    setAttribute(name, value) { rootAttributes.set(name, value); },
    removeAttribute(name) { rootAttributes.delete(name); }
  },
  createElement(tag) {
    const node = {
      tag,
      id: '',
      textContent: '',
      remove() {
        const index = mountedStyles.indexOf(node);
        if (index >= 0) mountedStyles.splice(index, 1);
      }
    };
    return node;
  },
  getElementById(id) { return mountedStyles.find((node) => node.id === id) || null; }
};
vm.runInNewContext(clientSource, {
  window: {
    __ModuleLoader__: { load(definition) { clientDefinition = definition; } },
    setTimeout
  },
  document: documentStub,
  fetch: async () => ({ ok: true, json: async () => ({ config: DEFAULT_CONFIG }) }),
  console,
  AbortController,
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
  effect(callback) { lifecycleDisposers.push(callback()); },
  slots: {
    inject(name, callback) {
      assert.ok(['settings.section', 'conversation.composer.dock'].includes(name));
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
await new Promise((resolve) => setImmediate(resolve));
assert.equal(mountedStyles.length, 1, '重复 apply 不得重复注入样式');
assert.equal(rootAttributes.get('data-dsh-thought-fold'), 'codex');
assert.equal(settingsRegistration.definition.id, 'thought-fold');
assert.equal(settingsRegistration.definition.label(), '思考折叠');
assert.equal(typeof settingsRegistration.component, 'function');
assert.equal(lifecycleDisposers.length, 2);
lifecycleDisposers[0]();
assert.equal(mountedStyles.length, 1, '旧实例卸载不得移除新实例样式');
assert.equal(rootAttributes.get('data-dsh-thought-fold'), 'codex');
lifecycleDisposers[1]();
assert.equal(mountedStyles.length, 0, '当前实例卸载必须移除样式');
assert.equal(rootAttributes.has('data-dsh-thought-fold'), false, '当前实例卸载必须移除根属性');
console.log('✓ Client 沙箱加载、HMR 样式刷新、实例所有权与卸载清理检验通过');

async function inspectRuntimeState(config, shouldFail = false) {
  let definition;
  const attributes = new Map([['data-dsh-thought-fold', 'stale']]);
  const styles = [];
  const disposers = [];
  const runtimeDocument = {
    head: { appendChild(node) { styles.push(node); } },
    documentElement: {
      setAttribute(name, value) { attributes.set(name, value); },
      removeAttribute(name) { attributes.delete(name); }
    },
    createElement(tag) {
      const node = {
        tag,
        id: '',
        textContent: '',
        remove() {
          const index = styles.indexOf(node);
          if (index >= 0) styles.splice(index, 1);
        }
      };
      return node;
    },
    getElementById(id) { return styles.find((node) => node.id === id) || null; }
  };
  vm.runInNewContext(clientSource, {
    window: {
      __ModuleLoader__: { load(value) { definition = value; } },
      setTimeout
    },
    document: runtimeDocument,
    fetch: shouldFail
      ? async () => { throw new Error('offline'); }
      : async () => ({ ok: true, json: async () => ({ config }) }),
    console,
    AbortController,
    setTimeout,
    clearTimeout
  });
  const plugin = definition.factory(() => fakeReact);
  plugin.apply({
    effect(callback) { disposers.push(callback()); },
    slots: {
      inject(name, callback) { callback(); },
      register() { return () => {}; }
    }
  });
  await new Promise((resolve) => setImmediate(resolve));
  const value = attributes.get('data-dsh-thought-fold');
  disposers.forEach((dispose) => dispose());
  assert.equal(styles.length, 0, '运行时测试卸载后不得保留样式');
  assert.equal(attributes.has('data-dsh-thought-fold'), false, '运行时测试卸载后不得保留根属性');
  return value;
}

assert.equal(await inspectRuntimeState({ ...DEFAULT_CONFIG, foldStyle: 'codex' }), 'codex');
assert.equal(await inspectRuntimeState({ ...DEFAULT_CONFIG, foldStyle: 'minimal' }), 'minimal');
assert.equal(await inspectRuntimeState({ ...DEFAULT_CONFIG, foldStyle: 'clean' }), 'clean');
assert.equal(await inspectRuntimeState({ ...DEFAULT_CONFIG, foldStyle: 'unknown' }), 'codex');
assert.equal(await inspectRuntimeState({ ...DEFAULT_CONFIG, enabled: false }), undefined);
assert.equal(await inspectRuntimeState({ ...DEFAULT_CONFIG, showLiveHud: false }), undefined);
assert.equal(await inspectRuntimeState(DEFAULT_CONFIG, true), undefined);
console.log('✓ Client 启停、三种样式、非法值回退、离线与卸载分支均通过');

console.log('🎉 所有测试全部顺利通过 (8/8 passing)！');
