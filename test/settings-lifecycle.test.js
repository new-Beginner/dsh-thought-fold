import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8');
const ROOT = 'data-dsh-thought-fold';
const config = (foldStyle = 'minimal') => ({ enabled: true, showLiveHud: true, foldStyle });
const settle = () => new Promise(resolve => setImmediate(resolve));
let assertionCount = 0;
function equal(actual, expected, message) {
  assertionCount++;
  assert.equal(actual, expected, message);
}
after(() => console.log(`settings lifecycle assertions: ${assertionCount}`));

function harness() {
  const attributes = new Map();
  const styles = [];
  const requests = [];
  const timers = new Map();
  const stateWrites = [];
  let nextTimer = 0;
  let definition;
  let rendering;
  const document = {
    documentElement: {
      setAttribute(name, value) { attributes.set(name, value); },
      removeAttribute(name) { attributes.delete(name); }
    },
    head: { appendChild(node) { styles.push(node); } },
    getElementById(id) { return styles.find(node => node.id === id) ?? null; },
    createElement(tag) {
      const node = {
        tag, id: '', textContent: '',
        remove() {
          const index = styles.indexOf(node);
          if (index !== -1) styles.splice(index, 1);
        }
      };
      return node;
    }
  };
  const React = {
    createElement(type, props, ...children) {
      return { type, props: { ...props, ...(children.length ? { children } : {}) } };
    },
    useState(initial) {
      const view = rendering;
      const index = view.cursor++;
      if (!(index in view.cells)) view.cells[index] = typeof initial === 'function' ? initial() : initial;
      return [view.cells[index], value => {
        stateWrites.push({ view, index });
        view.cells[index] = typeof value === 'function' ? value(view.cells[index]) : value;
      }];
    },
    useRef(initial) {
      const view = rendering;
      const index = view.cursor++;
      return view.cells[index] ??= { current: initial };
    },
    useCallback(callback) { rendering.cursor++; return callback; },
    useEffect(setup) { rendering.cursor++; rendering.effects.push(setup); }
  };
  vm.runInNewContext(source, {
    document, console, AbortController,
    window: {
      __ModuleLoader__: { load(value) { definition = value; } },
      setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
      clearTimeout(id) { timers.delete(id); }
    },
    // Deliberately do not reject on abort: late transport completion must still be ignored.
    fetch(url, options) {
      return new Promise((resolve, reject) => {
        requests.push({
          url, options, reject,
          respond(value = config()) { resolve({ ok: true, json: async () => ({ config: value }) }); }
        });
      });
    }
  }, { filename: 'client.js' });
  const plugin = definition.factory(name => {
    if (name !== 'react') throw new Error(`Unexpected module: ${name}`);
    return React;
  });

  function apply() {
    const registrations = new Map();
    const effects = [];
    const dispose = plugin.apply({
      effect(setup) { effects.push(setup()); },
      slots: {
        inject(name, setup) { setup(); },
        register(spec, component) {
          registrations.set(spec.name, component);
          return () => {};
        }
      }
    });
    return { dispose, effects, registrations };
  }
  function mount(owner) {
    const view = { cells: [], cursor: 0, effects: [], cleanups: [] };
    rendering = view;
    let tree = { type: owner.registrations.get('settings.section'), props: {} };
    while (typeof tree.type === 'function') tree = tree.type(tree.props);
    rendering = null;
    view.tree = tree;
    view.setup = () => { view.cleanups = view.effects.map(setup => setup()).filter(Boolean); };
    view.cleanup = () => {
      for (const cleanup of view.cleanups) cleanup();
      view.cleanups = [];
    };
    view.setup();
    view.update = patchValue => {
      const findToggle = node => {
        if (!node || typeof node !== 'object') return null;
        if (node.props?.label === '启用插件' && typeof node.props.onChange === 'function') return node;
        for (const child of node.props?.children ?? []) {
          const found = findToggle(child);
          if (found) return found;
        }
        return null;
      };
      const toggle = findToggle(view.tree);
      if (!toggle) throw new Error('Settings enable control not found');
      return toggle.props.onChange(patchValue);
    };
    return view;
  }
  return { apply, mount, requests, attributes, styles, timers, stateWrites };
}

for (const method of ['GET', 'POST']) {
  for (const termination of ['unmount', 'dispose', 'new-apply']) {
    test(`late ${method} cannot write after ${termination}`, async () => {
      const env = harness();
      const owner = env.apply();
      env.requests[0].respond();
      await settle();
      const view = env.mount(owner);
      let pending = env.requests.at(-1);
      let update;
      if (method === 'POST') {
        pending.respond();
        await settle();
        update = view.update(false);
        pending = env.requests.at(-1);
      }
      equal(pending.options.method, method, 'exercise the actual settings request');
      let replacement;
      if (termination === 'unmount') view.cleanup();
      else if (termination === 'dispose') owner.dispose();
      else {
        replacement = env.apply();
        env.requests.at(-1).respond(config('clean'));
        await settle();
      }
      equal(pending.options.signal.aborted, true, 'terminate settings transport');
      const writes = env.stateWrites.length;
      pending.respond(config('codex'));
      await settle();
      if (update) await update;
      const expected = termination === 'dispose' ? undefined : termination === 'new-apply' ? 'clean' : 'minimal';
      equal(env.attributes.get(ROOT), expected, 'late response cannot change runtime appearance');
      equal(env.stateWrites.length, writes, 'late response cannot set React state');
      equal(env.timers.size, 0, 'late POST cannot schedule toast');
      equal(env.styles.length, termination === 'dispose' ? 0 : 1, 'style ownership remains correct');
      view.cleanup();
      owner.dispose();
      if (replacement) {
        equal(env.attributes.get(ROOT), 'clean', 'old disposer does not clear replacement');
        replacement.dispose();
      }
      equal(env.styles.length, 0, 'final disposal removes style');
    });
  }
}

test('toast replacement, effect cleanup and owner disposal cancel timers and abort requests', async () => {
  const env = harness();
  const owner = env.apply();
  env.requests[0].respond();
  await settle();
  const view = env.mount(owner);
  const get = env.requests.at(-1);
  get.respond();
  await settle();
  const first = view.update(false);
  env.requests.at(-1).respond(config());
  await first;
  equal(env.timers.size, 1, 'successful save schedules one toast');
  const oldTimer = [...env.timers.values()][0];
  const second = view.update(true);
  equal(env.timers.size, 0, 'next save cancels previous toast');
  env.requests.at(-1).respond(config('clean'));
  await second;
  equal(env.timers.size, 1, 'replacement toast is the only timer');
  const currentTimer = [...env.timers.values()][0];
  view.cleanup();
  equal(env.timers.size, 0, 'effect cleanup cancels toast');
  equal(get.options.signal.aborted, true, 'effect cleanup aborts shared settings signal');
  const writes = env.stateWrites.length;
  oldTimer();
  currentTimer();
  equal(env.stateWrites.length, writes, 'even already queued timer callbacks cannot write after cleanup');
  view.setup();
  const nextGet = env.requests.at(-1);
  equal(nextGet.options.signal.aborted, false, 'new setup gets a fresh abort controller');
  nextGet.respond();
  await settle();
  const third = view.update(false);
  env.requests.at(-1).respond(config());
  await third;
  equal(env.timers.size, 1, 'replayed effect can save normally');
  owner.dispose();
  equal(env.timers.size, 0, 'owner dispose cleans timer before React unmount');
  equal(nextGet.options.signal.aborted, true, 'owner dispose aborts replayed lifecycle');
  view.cleanup();
});

test('StrictMode setup cleanup setup rejects the previous GET generation', async () => {
  const env = harness();
  const owner = env.apply();
  env.requests[0].respond();
  await settle();
  const view = env.mount(owner);
  const first = env.requests.at(-1);
  view.cleanup();
  view.setup();
  const second = env.requests.at(-1);
  equal(first.options.signal.aborted, true, 'first setup is aborted');
  equal(second.options.signal.aborted, false, 'second setup is live');
  second.respond(config('clean'));
  await settle();
  const writes = env.stateWrites.length;
  first.respond(config('codex'));
  await settle();
  equal(env.attributes.get(ROOT), 'clean', 'stale setup cannot override second setup');
  equal(env.stateWrites.length, writes, 'stale setup cannot set state or busy');
  owner.dispose();
  view.cleanup();
});

test('repeated apply aborts bootstrap and obsolete disposal preserves current state', async () => {
  const env = harness();
  const first = env.apply();
  const firstRequest = env.requests.at(-1);
  const second = env.apply();
  const secondRequest = env.requests.at(-1);
  equal(firstRequest.options.signal.aborted, true, 'replacement aborts old bootstrap');
  equal(env.styles.length, 1, 'only one stylesheet survives');
  secondRequest.respond(config('clean'));
  await settle();
  firstRequest.respond(config('codex'));
  await settle();
  first.dispose();
  first.effects.forEach(dispose => dispose());
  equal(env.attributes.get(ROOT), 'clean', 'late bootstrap and duplicate old cleanup cannot clear current config');
  equal(env.styles.length, 1, 'old effect cleanup preserves new style');
  second.dispose();
  equal(secondRequest.options.signal.aborted, true, 'current dispose aborts bootstrap');
  equal(env.attributes.has(ROOT), false, 'current cleanup clears root');
  equal(env.styles.length, 0, 'current cleanup removes stylesheet');
});

test('settings read failure clears appearance, and stale bootstrap cannot resurrect it', async () => {
  const env = harness();
  const owner = env.apply();
  const bootstrap = env.requests[0];
  const view = env.mount(owner);
  const get = env.requests.at(-1);
  get.respond(config('clean'));
  await settle();
  equal(env.attributes.get(ROOT), 'clean', 'settings response applies current appearance');
  view.cleanup();
  view.setup();
  env.requests.at(-1).reject(new Error('offline'));
  await settle();
  equal(env.attributes.has(ROOT), false, 'read failure clears previous runtime appearance');
  const writes = env.stateWrites.length;
  bootstrap.respond(config('codex'));
  await settle();
  equal(env.attributes.has(ROOT), false, 'older bootstrap cannot restore failed configuration');
  equal(env.stateWrites.length, writes, 'bootstrap does not touch settings state');
  owner.dispose();
  view.cleanup();
});
