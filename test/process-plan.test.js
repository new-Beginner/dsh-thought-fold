import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Load the production source verbatim: no export rewrite, runtime or DOM required.
const source = readFileSync(new URL('../src/process-plan.js', import.meta.url), 'utf8');
const planSpecialProcess = vm.runInNewContext(
  `${source}\nplanSpecialProcess;`,
  Object.create(null),
  { filename: 'src/process-plan.js', timeout: 1000 },
);
const LABEL = '思考与工具调用';
const INTERRUPTED_LABEL = '已中断的思考与工具调用';
const leaf = (key, seq, patch = {}) => ({
  key, kind: 'assistant-step', seq, settled: true, running: false,
  stepClosed: true, stepEndSeq: seq + 1, hasText: false, interrupted: false,
  ...patch,
});
const boundary = (key, kind, seq) => leaf(key, seq, { kind });
const open = (patch = {}) => ({ closed: false, endSeq: undefined, answerKey: undefined, ...patch });
const closed = (patch = {}) => ({ closed: true, endSeq: 100, answerKey: undefined, ...patch });
const segment = (right, keys, interrupted = false) => ({
  boundary: right, keys, interrupted, label: interrupted ? INTERRUPTED_LABEL : LABEL,
});
// Cross-realm results are plain data but have VM prototypes. Normalize only outputs.
const plan = (items, options) => structuredClone(planSpecialProcess(items, options));
const keys = result => result.segments.flatMap(part => part.keys);

test('a lone reasoning disclosure is not wrapped, but reasoning plus tools forms a process', () => {
  assert.deepEqual(plan([leaf('think', 1, { onlyReasoning: true, interrupted: true })], closed()).segments, []);
  assert.deepEqual(keys(plan([leaf('think', 1, { onlyReasoning: true }), leaf('tool', 2, { kind: 'tool-call' })], closed())), ['think', 'tool']);
  const partial = plan([
    leaf('work', 1), leaf('answer', 3, { hasText: true, interrupted: true }),
    leaf('trailing-think', 5, { onlyReasoning: true, interrupted: true })
  ], closed());
  assert.deepEqual(keys(partial), ['work']);
});

test('VM loads the actual pure planner function', () => {
  assert.equal(typeof planSpecialProcess, 'function');
});

test('ordinary rounds return null, including running tails and a normal closed answer', () => {
  assert.equal(plan([], open()), null);
  assert.equal(plan([boundary('user', 'user', 0), leaf('work', 1)], open()), null);
  assert.equal(plan([leaf('working', 1, { running: true, settled: false })], open()), null);
  assert.equal(plan([
    boundary('user', 'user', 0), leaf('work', 1), leaf('answer', 3, { hasText: true }),
  ], closed({ answerKey: 'answer' })), null);
});

test('an initial user/steering message is not an insertion without preceding process', () => {
  assert.equal(plan([
    boundary('system', 'system-prompt', 0), boundary('user', 'user', 1),
    boundary('steer', 'steering', 2), leaf('work', 3),
  ], open()), null);
});

for (const kind of ['user', 'steering']) {
  test(`${kind} splits settled prior work but never folds an open tail`, () => {
    const result = plan([
      leaf('step', 1), leaf('tool', 2, { kind: 'tool-call' }),
      boundary('insert', kind, 5), leaf('tail', 6),
    ], open());
    assert.deepEqual(result, {
      segments: [segment('insert', ['step', 'tool'])], hasInsertion: true, interrupted: false,
    });
  });
}

test('multiple insertions create ordered segments; leading, consecutive and trailing boundaries create no empty segments', () => {
  const result = plan([
    boundary('start', 'user', 0), leaf('first', 1),
    boundary('s1', 'steering', 3), boundary('s2', 'steering', 4), leaf('second', 5),
    boundary('u1', 'user', 8), boundary('u2', 'user', 9), leaf('tail', 10),
    boundary('s3', 'steering', 12), boundary('s4', 'steering', 13),
  ], open());
  assert.deepEqual(result, {
    segments: [segment('s1', ['first']), segment('u1', ['second']), segment('s3', ['tail'])],
    hasInsertion: true, interrupted: false,
  });
  assert.deepEqual(plan([], closed()), { segments: [], hasInsertion: false, interrupted: false });
});

test('unknown leaf sequences fail open for the entire candidate, without dropping later valid segments', async t => {
  for (const seq of [undefined, null, NaN, Infinity, -Infinity, '2']) {
    await t.test(`seq=${String(seq)}`, () => {
      for (const options of [open(), closed()]) {
        const result = plan([
          leaf('valid-neighbor', 1), leaf('unknown', seq), boundary('s1', 'steering', 5),
          leaf('later', 6), boundary('s2', 'steering', 9),
        ], options);
        assert.deepEqual(result.segments, [segment('s2', ['later'])]);
      }
    });
  }
});

test('unknown insertion sequence prevents open-prefix folding', async t => {
  for (const seq of [undefined, null, NaN, Infinity, '5']) {
    await t.test(`boundary seq=${String(seq)}`, () => {
      assert.deepEqual(plan([leaf('work', 1), boundary('s', 'steering', seq)], open()).segments, []);
    });
  }
});

test('unknown open insertion seq must not borrow turn endSeq to fold work', async t => {
  for (const seq of [undefined, null]) {
    await t.test(`boundary seq=${String(seq)}, finite endSeq`, () => {
      assert.deepEqual(plan([
        leaf('work', 1), boundary('steer', 'steering', seq),
      ], open({ endSeq: 100 })).segments, [], 'unknown steering sequence must fail open');
    });
  }
});

test('closed prefixes require a finite explicit insertion boundary and strictly earlier leaves', async t => {
  const cases = [
    ['missing boundary seq', undefined, 1],
    ['null boundary seq', null, 1],
    ['NaN boundary seq', NaN, 1],
    ['infinite boundary seq', Infinity, 1],
    ['string boundary seq', '5', 1],
    ['leaf equals insertion seq', 5, 5],
    ['leaf follows insertion seq', 5, 6],
  ];
  for (const [name, seq, workSeq] of cases) {
    await t.test(name, () => {
      for (const kind of ['user', 'steering']) {
        assert.deepEqual(plan([
          leaf('work', workSeq), boundary('insert', kind, seq),
        ], closed()).segments, [], `unsafe ${kind} boundary must fail open after closing too`);
      }
    });
  }
  assert.deepEqual(plan([
    leaf('work', 4), boundary('insert', 'steering', 5),
  ], closed()).segments, [segment('insert', ['work'])]);
});

test('closed rounds with unknown turn end fail open', async t => {
  for (const endSeq of [undefined, null, NaN, Infinity, -Infinity, '100']) {
    await t.test(`endSeq=${String(endSeq)}`, () => {
      assert.deepEqual(plan([leaf('work', 1)], closed({ endSeq })).segments, []);
    });
  }
});

test('open-prefix folding requires every leaf settled and its step closed, with a known timely step end', async t => {
  const cases = [
    ['unsettled', { settled: false }],
    ['still running', { running: true, settled: false, stepClosed: false }],
    ['step not closed', { stepClosed: false }],
    ['step closure unknown', { stepClosed: undefined }],
    ['missing step end', { stepEndSeq: undefined }],
    ['null step end', { stepEndSeq: null }],
    ['nonfinite step end', { stepEndSeq: NaN }],
    ['infinite step end', { stepEndSeq: Infinity }],
    ['string step end', { stepEndSeq: '4' }],
    ['step ends after steering', { stepEndSeq: 6 }],
    ['leaf equals boundary', { seq: 5 }],
    ['leaf follows boundary', { seq: 6 }],
  ];
  for (const [name, patch] of cases) {
    await t.test(name, () => {
      const result = plan([
        leaf('good', 1), leaf('blocked', 2, patch), boundary('steer', 'steering', 5),
      ], open());
      assert.deepEqual(result.segments, []);
      assert.equal(result.hasInsertion, true);
    });
  }
  assert.deepEqual(plan([
    leaf('before', 1, { stepEndSeq: 4 }), leaf('equal', 2, { stepEndSeq: 5 }),
    boundary('steer', 'steering', 5),
  ], open()).segments, [segment('steer', ['before', 'equal'])]);
});

test('even an entirely settled open tail stays unfolded despite a supplied endSeq', () => {
  const result = plan([
    leaf('prefix', 1), boundary('steer', 'steering', 4),
    leaf('tail-thought', 5), leaf('tail-text', 7, { hasText: true }),
  ], open({ endSeq: 100, answerKey: 'tail-text' }));
  assert.deepEqual(result.segments, [segment('steer', ['prefix'])]);
});

test('closing retains both explicit answer and last settled partial text, not earlier text', () => {
  const result = plan([
    leaf('old-text', 1, { hasText: true }), boundary('steer', 'steering', 4),
    leaf('answer', 5, { hasText: true }), leaf('between', 7, { kind: 'tool-call' }),
    leaf('partial', 9, { hasText: true }), leaf('after', 11),
  ], closed({ answerKey: 'answer' }));
  assert.deepEqual(result.segments, [
    segment('steer', ['old-text']), segment('partial', ['between']), segment('turn-end', ['after']),
  ]);
  assert.ok(!keys(result).includes('answer'));
  assert.ok(!keys(result).includes('partial'));
});

test('closed without answer folds process and retains the last settled body', () => {
  assert.deepEqual(plan([leaf('thought', 1), leaf('tool', 3, { kind: 'tool-call' })], closed()), {
    segments: [segment('turn-end', ['thought', 'tool'])], hasInsertion: false, interrupted: false,
  });
  assert.deepEqual(plan([
    leaf('thought', 1), leaf('partial', 3, { hasText: true }),
  ], closed()).segments, [segment('partial', ['thought'])]);
  assert.deepEqual(plan([leaf('body-only', 1, { hasText: true })], closed()).segments, []);
});

test('unsettled text does not displace the last settled partial body', () => {
  const result = plan([
    leaf('thought', 1), leaf('partial', 3, { hasText: true }),
    leaf('unfinished', 5, { hasText: true, settled: false, running: true }),
  ], closed());
  assert.deepEqual(result.segments, [segment('partial', ['thought'])]);
});

for (const kind of ['turn-error', 'turn-max-tokens']) {
  test(`${kind} stays visible and labels closed process as interrupted`, () => {
    const result = plan([
      leaf('thought', 1), boundary('notice', kind, 3), leaf('tool', 4, { kind: 'tool-call' }),
      leaf('answer', 6, { hasText: true }), boundary('tail', 'turn-tail', 8),
    ], closed({ answerKey: 'answer' }));
    assert.deepEqual(result, {
      segments: [segment('notice', ['thought'], true), segment('answer', ['tool'], true)],
      hasInsertion: false, interrupted: true,
    });
    assert.ok(!keys(result).includes('notice'));
    assert.ok(!keys(result).includes('tail'));
  });
}

test('leaf interrupted flag activates special closed planning even with an answer', () => {
  assert.deepEqual(plan([
    leaf('cancelled', 1, { interrupted: true }), leaf('answer', 3, { hasText: true }),
  ], closed({ answerKey: 'answer' })), {
    segments: [segment('answer', ['cancelled'], true)], hasInsertion: false, interrupted: true,
  });
});

test('open errors/max-token notices awaiting retry do not prematurely collect process', () => {
  for (const kind of ['turn-error', 'turn-max-tokens']) {
    assert.equal(plan([leaf('attempt', 1), boundary('notice', kind, 3)], open()), null);
    const result = plan([
      leaf('prefix', 1), boundary('steer', 'steering', 4),
      leaf('attempt', 5), boundary('notice', kind, 8), leaf('retry', 9),
    ], open({ endSeq: 100 }));
    assert.deepEqual(result, {
      segments: [segment('steer', ['prefix'])], hasInsertion: true, interrupted: true,
    });
  }
  assert.equal(plan([leaf('cancelled', 1, { interrupted: true })], open()), null);
});

test('closed fold candidates must end strictly before endSeq and contain no running leaf', () => {
  for (const patch of [{ seq: 100 }, { seq: 101 }, { running: true }]) {
    assert.deepEqual(plan([leaf('good', 1), leaf('unsafe', 3, patch)], closed()).segments, []);
  }
  assert.deepEqual(plan([leaf('last', 99)], closed()).segments, [segment('turn-end', ['last'])]);
});

test('independent markers never enter segment keys; existing turn-process wrappers do not split leaves', () => {
  const result = plan([
    boundary('system', 'system-prompt', 0), leaf('a', 1),
    boundary('wrapper', 'turn-process', 2), leaf('b', 3, { kind: 'tool-call' }),
    boundary('steer', 'steering', 5), leaf('c', 6), boundary('tail', 'turn-tail', 8),
  ], closed());
  assert.deepEqual(result.segments, [segment('steer', ['a', 'b']), segment('tail', ['c'])]);
  assert.deepEqual(keys(result), ['a', 'b', 'c']);
});

test('history prepend extends membership without changing existing right-boundary identity', () => {
  const items = [leaf('a', 10), boundary('s1', 'steering', 20), leaf('b', 30), boundary('s2', 'user', 40)];
  for (const options of [open(), closed()]) {
    const before = plan(items, options);
    const after = plan([leaf('older', 5), ...items], options);
    assert.deepEqual(before.segments, [segment('s1', ['a']), segment('s2', ['b'])]);
    assert.deepEqual(after.segments, [segment('s1', ['older', 'a']), segment('s2', ['b'])]);
    assert.deepEqual(after.segments.map(s => s.boundary), before.segments.map(s => s.boundary));
    const withOlderSegment = plan([leaf('historic', 1), boundary('historic-s', 'steering', 4), ...items], options);
    assert.deepEqual(withOlderSegment.segments.slice(1), before.segments);
  }
  const before = plan([leaf('tail', 10)], closed());
  const after = plan([leaf('older', 5), leaf('tail', 10)], closed());
  assert.equal(before.segments[0].boundary, 'turn-end');
  assert.deepEqual(after.segments, [segment('turn-end', ['older', 'tail'])]);
});

test('planner is deterministic, leaves frozen input untouched, and returns fresh owned output', () => {
  const items = Object.freeze([
    Object.freeze(leaf('work', 1)), Object.freeze(boundary('steer', 'steering', 4)),
    Object.freeze(leaf('tail', 6)),
  ]);
  const options = Object.freeze(open());
  const snapshot = structuredClone({ items, options });
  const expected = { segments: [segment('steer', ['work'])], hasInsertion: true, interrupted: false };
  for (let i = 0; i < 20; i++) assert.deepEqual(plan(items, options), expected);
  const raw = planSpecialProcess(items, options);
  raw.segments[0].keys.push('external-change');
  raw.segments[0].label = 'external-change';
  raw.segments.push({ boundary: 'fake', keys: [] });
  assert.deepEqual(plan(items, options), expected);
  assert.deepEqual({ items, options }, snapshot);
});
