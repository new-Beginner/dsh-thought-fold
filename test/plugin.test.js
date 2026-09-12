import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CONFIG, resolveOrder, SettingsSchema } from '../src/config.js';
import { getPromptText } from '../src/prompt.js';
import { apply, name, inject } from '../index.js';

test('dsh-thought-fold: 基础元数据验证', () => {
  assert.equal(name, 'dsh-thought-fold');
  assert.deepEqual(inject, ['systemPrompt', 'settings']);
});

test('dsh-thought-fold: 默认配置完整性测试', () => {
  assert.equal(DEFAULT_CONFIG.enabled, true);
  assert.equal(DEFAULT_CONFIG.autoFold, true);
  assert.equal(DEFAULT_CONFIG.showLiveHud, true);
  assert.equal(DEFAULT_CONFIG.injectPrompt, true);
  assert.equal(DEFAULT_CONFIG.promptStyle, 'standard');
  assert.equal(DEFAULT_CONFIG.foldStyle, 'codex');
  assert.equal(DEFAULT_CONFIG.hideRawThinkTag, false);
  assert.equal(DEFAULT_CONFIG.promptPosition, 'after-persona');
});

test('dsh-thought-fold: 提示词位置权重映射测试', () => {
  assert.equal(resolveOrder('after-persona'), 12);
  assert.equal(resolveOrder('before-tools'), 960);
  assert.equal(resolveOrder('after-tools'), 9960);
  assert.equal(resolveOrder('unknown'), 12);
});

test('dsh-thought-fold: 提示词生成逻辑测试', () => {
  // 1. 禁用插件时为空
  assert.equal(getPromptText({ enabled: false }), '');

  // 2. 禁用提示词注入时为空
  assert.equal(getPromptText({ enabled: true, injectPrompt: false }), '');

  // 3. 标准模式 (standard)
  const standardText = getPromptText({ enabled: true, injectPrompt: true, promptStyle: 'standard' });
  assert.match(standardText, /Codex 风格执行进度与总结规范/);
  assert.match(standardText, /最终总结/);

  // 4. 紧凑模式 (concise)
  const conciseText = getPromptText({ enabled: true, injectPrompt: true, promptStyle: 'concise' });
  assert.match(conciseText, /Codex 紧凑进度规范/);

  // 5. 深度推理模式 (deep)
  const deepText = getPromptText({ enabled: true, injectPrompt: true, promptStyle: 'deep' });
  assert.match(deepText, /Codex 详细进度与验证规范/);
});

test('dsh-thought-fold: 插件 apply 装载测试 (Mock Context)', () => {
  let sectionMounted = null;
  const registeredServices = {};
  const registeredCommands = {};

  const mockCtx = {
    settings: {
      register(key, schema, opts) {
        return {
          get: () => ({ ...DEFAULT_CONFIG }),
          update: async () => {},
          watch: (fn) => {}
        };
      }
    },
    systemPrompt: {
      section(def) {
        sectionMounted = def;
        return () => { sectionMounted = null; };
      }
    },
    provide(key, val) {
      registeredServices[key] = val;
    },
    plugin(pluginDef) {},
    inject(deps, fn) {
      if (deps.includes('commands')) {
        fn({
          commands: {
            register(cmd) {
              registeredCommands[cmd.name] = cmd;
            }
          }
        });
      }
    },
    effect(fn) { fn(); },
    emit(event) {}
  };

  apply(mockCtx);

  // 验证提示词段落已挂载
  assert.ok(sectionMounted);
  assert.equal(sectionMounted.name, 'dsh-thought-fold:guidance');
  assert.equal(sectionMounted.order, 12);
  const renderedText = sectionMounted.text({});
  assert.match(renderedText, /Codex/);

  // 验证对外服务已注册
  assert.ok(registeredServices.thoughtFoldService);
  assert.equal(typeof registeredServices.thoughtFoldService.getConfig, 'function');

  // 验证指令已注册
  assert.ok(registeredCommands.fold);
  assert.equal(registeredCommands.fold.name, 'fold');
});
