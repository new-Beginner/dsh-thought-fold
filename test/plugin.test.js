import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CONFIG, SettingsSchema } from '../src/config.js';
import { apply, name, inject } from '../index.js';
import { apply as applyWeb } from '../src/web.js';

test('dsh-thought-fold: 基础元数据验证', () => {
  assert.equal(name, 'dsh-thought-fold');
  assert.deepEqual(inject, ['settings']);
});

test('dsh-thought-fold: 默认配置只包含运行与外观设置', () => {
  assert.deepEqual(DEFAULT_CONFIG, {
    enabled: true,
    showLiveHud: true,
    foldStyle: 'codex'
  });
  assert.ok(SettingsSchema);
});

test('dsh-thought-fold: 插件装载不注册系统提示段落', async () => {
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
    provide(key, value) { registeredServices[key] = value; },
    plugin(value) { childPlugin = value; },
    inject(deps, fn) {
      if (deps.includes('commands')) {
        fn({ commands: { register(cmd) { registeredCommands[cmd.name] = cmd; } } });
      }
    },
    logger: { warn() {} }
  };

  apply(mockCtx);

  assert.ok(registeredServices.thoughtFoldService);
  assert.ok(childPlugin);
  assert.ok(registeredCommands.fold);

  const status = await registeredCommands.fold.handler({ rawInput: 'status' });
  assert.match(status.text, /折叠按钮样式/);
  assert.doesNotMatch(status.text, /提示词|prompt/i);

  await registeredCommands.fold.handler({ rawInput: 'toggle' });
  assert.deepEqual(savedPatch, { enabled: false });
});

test('dsh-thought-fold: 设置不可写时 API 明确返回只读与 503', async () => {
  let route;
  applyWeb({
    thoughtFoldService: {
      getConfig: () => ({ ...DEFAULT_CONFIG }),
      settingsScope: undefined
    },
    connection: {
      fetch: {
        register(definition) { route = definition; }
      }
    }
  });

  const getResponse = await route.fetch(new Request('http://localhost/api/dsh-thought-fold'));
  const getPayload = await getResponse.json();
  assert.equal(getResponse.status, 200);
  assert.equal(getPayload.writable, false);

  const postResponse = await route.fetch(new Request('http://localhost/api/dsh-thought-fold', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'saveSettings', patch: { enabled: false } })
  }));
  const postPayload = await postResponse.json();
  assert.equal(postResponse.status, 503);
  assert.match(postPayload.error, /只读/);
});
