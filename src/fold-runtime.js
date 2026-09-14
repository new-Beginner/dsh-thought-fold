    // Conversation-scoped enhancement. Never wrap/move React-owned message rows.
    const FLOW = '[data-chat-flow]';
    const OWNED = 'data-dsh-tf-owned';
    const HIDDEN = 'data-dsh-tf-hidden';
    const INDEPENDENT = new Set(['system-prompt', 'user', 'steering', 'turn-process', 'turn-error', 'turn-max-tokens', 'turn-tail']);
    const runtimeListeners = new Set();
    const runtimeControllers = new Set();
    const scopeControllers = new WeakMap();
    let runtimeConfig = null;
    let floatingOwner = null;

    function makeFoldController(scope, marker, getNode, win = window) {
      if (typeof win.MutationObserver !== 'function' || typeof win.requestAnimationFrame !== 'function') return { dispose() {}, refresh() {} };
      scopeControllers.get(scope)?.dispose();
      const doc = scope.ownerDocument;
      let disposed = false;
      let frame = 0;
      let dirty = true;
      let groups = new Map();
      let flows = [];
      let target = null;
      let anchor = null;
      const choices = new Map();
      const hiddenRows = new Set();
      const previousHidden = new Map();
      const resizeTargets = new Set();
      const nativeLeases = new Map();
      const nativeReveals = new Set();
      let requestedNative = new Set();
      let requestedReveals = new Set();
      const proxy = makeButton('收起本段过程');
      proxy.dataset.dshTfFloating = '';
      proxy.hidden = true;
      marker.appendChild(proxy);

      function makeButton(label) {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'dsh-tf-fold-button';
        button.setAttribute(OWNED, '');
        button.textContent = label;
        return button;
      }
      function setText(element, value) {
        if (element.textContent !== value) element.textContent = value;
      }
      function setHidden(row, value) {
        if (value) {
          if (!hiddenRows.has(row)) previousHidden.set(row, { value: row.getAttribute('hidden'), nativeOwned: row.hasAttribute('data-turn-process-hidden') });
          if (!row.hasAttribute(HIDDEN)) row.setAttribute(HIDDEN, '');
          if (row.getAttribute('hidden') !== 'until-found') row.setAttribute('hidden', 'until-found');
          hiddenRows.add(row);
        } else {
          if (row.hasAttribute(HIDDEN)) row.removeAttribute(HIDDEN);
          // Native compact mode may have taken ownership since we hid this row.
          if (previousHidden.has(row) && !row.hasAttribute('data-turn-process-hidden') && row.getAttribute('hidden') === 'until-found') {
            const original = previousHidden.get(row);
            if (original.value === null || original.nativeOwned) row.removeAttribute('hidden');
            else row.setAttribute('hidden', original.value);
          }
          previousHidden.delete(row);
          hiddenRows.delete(row);
        }
      }
      function open(group) {
        return group.kind === 'native' ? group.top.getAttribute('aria-expanded') === 'true' : choices.get(group.id) === true;
      }
      function visible(element) {
        if (!element?.isConnected || element.getClientRects().length === 0) return false;
        if (element.closest('[' + HIDDEN + ']')) return false;
        const blocked = element.closest('[hidden]:not([hidden="until-found"]), [data-turn-process-hidden]');
        return !blocked || blocked.hasAttribute('data-dsh-tf-native-reveal');
      }
      function hideProxy() {
        proxy.hidden = true;
        target = null;
        if (floatingOwner === controller) floatingOwner = null;
      }
      function schedule(structural = false) {
        if (disposed) return;
        dirty = dirty || structural;
        if (!frame) frame = win.requestAnimationFrame(flush);
      }
      function forget(group) {
        group.bottom.remove();
        if (group.kind === 'compat') group.top.remove();
      }
      function focusTop(group) {
        const top = group.top;
        if (!top.isConnected) return;
        top.focus({ preventScroll: true });
        anchor = { top, offset: Math.max(8, top.getBoundingClientRect().top - scope.getBoundingClientRect().top) };
        // An off-screen header should land near the top, not at its old negative offset.
        anchor.offset = Math.min(anchor.offset, Math.max(8, scope.clientHeight / 3));
      }
      function collapse(group) {
        // Reject a proxy captured just before a React replacement/session transition.
        if (disposed || !scope.isConnected || !groups.has(group.id) || groups.get(group.id) !== group || !open(group)) return;
        if (!group.top.isConnected || !group.members.some(row => row.isConnected)) return;
        if (group.members.some((row, index) => row.getAttribute('data-chat-flow-key') !== group.memberKeys[index] || row.getAttribute('data-chat-turn') !== group.turn)) return;
        if (group.kind === 'native' && group.top.getAttribute('data-turn-process') !== group.turn) return;
        focusTop(group);
        if (group.kind === 'native') group.top.click();
        else choices.set(group.id, false);
        hideProxy();
        schedule(true);
      }
      proxy.addEventListener('click', () => { if (target) collapse(target); });

      function clickNativeQuietly(button) {
        const focused = doc.activeElement;
        const scrollTop = scope.scrollTop;
        const scrollLeft = scope.scrollLeft;
        button.click();
        if (focused?.isConnected && typeof focused.focus === 'function') focused.focus({ preventScroll: true });
        if (doc.activeElement === button && focused !== button) button.blur();
        scope.scrollTop = scrollTop;
        scope.scrollLeft = scrollLeft;
      }
      function releaseNative(button, lease) {
        const replaced = [...nativeLeases].some(([other, current]) => other !== button && current.row === lease.row && requestedNative.has(other));
        if (!replaced) lease.row?.removeAttribute('data-dsh-tf-native-suspended');
        nativeLeases.delete(button);
      }
      function suspendNative(button, members) {
        requestedNative.add(button);
        let lease = nativeLeases.get(button);
        if (!lease) {
          lease = { row: button.closest('[data-chat-flow-key]') };
          nativeLeases.set(button, lease);
        }
        // Pure presentation takeover: never click or mutate the native disclosure state.
        // This remains reversible even if React replaces the native button or commits late.
        for (const row of members) {
          requestedReveals.add(row);
          nativeReveals.add(row);
          if (!row.hasAttribute('data-dsh-tf-native-reveal')) row.setAttribute('data-dsh-tf-native-reveal', '');
        }
        lease.row?.setAttribute('data-dsh-tf-native-suspended', '');
        return true;
      }
      function groupLabel(group) {
        return `第 ${group.turn} 轮${group.segment ? `第 ${group.segment} 段` : ''}思考与工具调用`;
      }
      function descriptors(flow) {
        // One bounded read of the current conversation's direct flow rows per structural batch.
        const rows = Array.from(flow.children).filter(row => row.hasAttribute('data-chat-flow-key'));
        const byTurn = new Map();
        const meta = new Map();
        for (const row of rows) {
          const key = row.getAttribute('data-chat-flow-key');
          const node = getNode(key);
          const turn = row.getAttribute('data-chat-turn');
          meta.set(row, node);
          if (turn !== null && turn !== '') {
            if (!byTurn.has(turn)) byTurn.set(turn, []);
            byTurn.get(turn).push(row);
          }
        }
        const results = [];
        for (const [turn, turnRows] of byTurn) {
          const control = turnRows.find(row => row.getAttribute('data-chat-flow-kind') === 'turn-process');
          const top = control?.querySelector('button[data-turn-process]');
          const controlNode = control && meta.get(control);
          const spec = controlNode?.data;
          const id = `${turn}:${spec?.answerStep ?? 'native'}`;
          const items = turnRows.map(row => {
            const node = meta.get(row);
            const location = node?.location;
            const status = node?.data?.status;
            const root = node?.kind === 'tool-call' ? node.data?.root : null;
            const hasText = node?.kind === 'assistant-step' && node.data?.blocks?.some(block => block.kind === 'text' && typeof block.text === 'string' && block.text.trim() !== '');
            return {
              key: row.getAttribute('data-chat-flow-key'), kind: node?.kind ?? 'unknown', seq: node?.anchorSeq,
              hasText: !!hasText,
              onlyReasoning: node?.kind === 'assistant-step' && node.data?.blocks?.some(block => block.kind === 'reasoning') && node.data.blocks.every(block => block.kind === 'reasoning' || (block.kind === 'text' && typeof block.text === 'string' && block.text.trim() === '')),
              running: status === 'running' || (node?.kind === 'tool-call' && root != null && root.kind == null),
              settled: status === 'settled' || status === 'interrupted' || (node?.kind === 'tool-call' && root?.kind != null),
              interrupted: status === 'interrupted' || root?.error?.code === 'interrupted',
              stepClosed: location?.kind === 'step' && location.step?.status === 'closed',
              stepEndSeq: location?.kind === 'step' ? location.step?.end?.seq : undefined
            };
          });
          const turnLocation = controlNode?.location?.turn ?? turnRows.map(row => meta.get(row)?.location?.turn).find(Boolean);
          const answerRow = turnRows.find(row => {
            const node = meta.get(row);
            return node?.kind === 'assistant-step' && spec?.answerStep != null && node.data?.step === spec.answerStep;
          });
          const tail = items.find(item => item.kind === 'turn-tail');
          const special = planSpecialProcess(items, {
            closed: turnLocation?.status === 'closed',
            endSeq: turnLocation?.end?.seq ?? tail?.seq,
            answerKey: answerRow?.getAttribute('data-chat-flow-key')
          });
          if (special) {
            const nativeMembers = turnRows.filter(row => row.hasAttribute('data-turn-process-member'));
            const inlineReasoning = turnRows.filter(row => meta.get(row)?.kind === 'assistant-step').flatMap(row => Array.from(row.querySelectorAll('[data-turn-process-inline]')));
            const whole = groups.get(id);
            if (whole && !whole.segment) for (const segment of special.segments) {
              const segmentId = `${turn}:segment:${segment.boundary}`;
              if (!choices.has(segmentId)) choices.set(segmentId, open(whole));
            }
            if (top && !suspendNative(top, [...nativeMembers, ...inlineReasoning])) continue;
            special.segments.forEach((segment, index) => {
              const keys = new Set(segment.keys);
              const members = turnRows.filter(row => keys.has(row.getAttribute('data-chat-flow-key')));
              if (members.length) results.push({ id: `${turn}:segment:${segment.boundary}`, kind: 'compat', members, flow, turn, segment: index + 1, label: segment.label });
            });
            continue;
          }
          if (top) {
            const members = turnRows.filter(row => row.hasAttribute('data-turn-process-member'));
            if (members.length) results.push({ id, kind: 'native', top, members, flow, turn });
            continue;
          }
          // Fail open unless the host has positively identified a closed Turn and answer.
          // This works in normal mode and while older pages disable native compact controls.
          const location = controlNode?.location;
          if (!spec || location?.turn?.status !== 'closed' || !Number.isFinite(spec.answerAnchorSeq) || !Number.isFinite(spec.processStartSeq) || spec.answerStep == null) continue;
          const answer = turnRows.find(row => {
            const node = meta.get(row);
            return node?.kind === 'assistant-step' && node.data?.step === spec.answerStep;
          });
          if (!answer || meta.get(answer)?.data?.status === 'running') continue;
          const members = turnRows.filter(row => {
            const node = meta.get(row);
            return node && !INDEPENDENT.has(node.kind) && row !== answer && node.anchorSeq >= spec.processStartSeq && node.anchorSeq < spec.answerAnchorSeq;
          });
          if (members.length) results.push({ id, kind: 'compat', members, flow, turn });
        }
        return results;
      }
      function reconcile() {
        requestedNative = new Set();
        requestedReveals = new Set();
        flows = Array.from(scope.querySelectorAll(FLOW));
        const next = new Map();
        const wantedHidden = new Set();
        // A conversation displays one chat flow. Ignore nested preview transcripts.
        const flow = flows.find(node => node.closest('[data-conversation-scroll]') === scope);
        if (flow) for (const desc of descriptors(flow)) {
          let group = groups.get(desc.id);
          let created = false;
          if (group && (group.kind !== desc.kind || group.flow !== desc.flow || (group.kind === 'native' && group.top !== desc.top))) {
            // Preserve a user choice across a native/compatibility handover.
            choices.set(group.id, open(group));
            forget(group);
            group = null;
          }
          if (!group) {
            created = true;
            group = { ...desc, bottom: makeButton('收起本段过程') };
            if (desc.kind === 'compat') {
              group.top = makeButton('展开思考与工具调用');
              group.top.dataset.dshTfCompat = '';
              group.top.addEventListener('click', () => {
                if (!groups.has(group.id) || groups.get(group.id) !== group) return;
                if (open(group)) collapse(group);
                else { choices.set(group.id, true); schedule(true); }
              });
            }
            group.bottom.dataset.dshTfBottom = '';
            group.bottom.addEventListener('click', () => collapse(group));
          }
          Object.assign(group, desc);
          group.memberKeys = group.members.map(row => row.getAttribute('data-chat-flow-key'));
          next.set(group.id, group);
          if (group.kind === 'native' && created) {
            const desired = choices.get(group.id) === true;
            if (open(group) !== desired) {
              group.pendingOpen = { desired, attempts: 0 };
              clickNativeQuietly(group.top);
              schedule(true);
            }
          }
          if (group.kind === 'compat') {
            const first = group.members[0];
            if (group.top.nextSibling !== first) flow.insertBefore(group.top, first);
            const expanded = open(group);
            group.top.setAttribute('aria-expanded', String(expanded));
            group.top.setAttribute('aria-label', `${expanded ? '收起' : '展开'}${groupLabel(group)}`);
            setText(group.top, `${expanded ? '收起' : '展开'}${group.label || '思考与工具调用'}${group.segment ? ` · 第 ${group.segment} 段` : ''} · ${group.members.length} 项`);
            for (const row of group.members) if (!expanded) wantedHidden.add(row);
          } else {
            if (group.pendingOpen && open(group) !== group.pendingOpen.desired && group.pendingOpen.attempts++ < 2) {
              schedule(true);
            } else {
              delete group.pendingOpen;
              choices.set(group.id, open(group));
            }
          }
          const last = group.members[group.members.length - 1];
          if (last.nextSibling !== group.bottom) flow.insertBefore(group.bottom, last.nextSibling);
          group.bottom.hidden = !open(group);
          group.bottom.setAttribute('aria-label', `收起${groupLabel(group)}`);
        }
        for (const [id, group] of groups) if (!next.has(id)) forget(group);
        groups = next;
        for (const row of hiddenRows) if (!wantedHidden.has(row)) setHidden(row, false);
        for (const row of wantedHidden) setHidden(row, true);
        for (const [button, lease] of nativeLeases) if (!requestedNative.has(button)) releaseNative(button, lease);
        for (const row of nativeReveals) if (!requestedReveals.has(row)) {
          row.removeAttribute('data-dsh-tf-native-reveal');
          nativeReveals.delete(row);
        }
        if (resizeObserver) {
          const wanted = new Set([scope, scope.querySelector('[data-composer-seat]'), ...flows].filter(Boolean));
          for (const node of resizeTargets) if (!wanted.has(node)) { resizeObserver.unobserve(node); resizeTargets.delete(node); }
          for (const node of wanted) if (!resizeTargets.has(node)) { resizeObserver.observe(node); resizeTargets.add(node); }
        }
      }
      function layout() {
        hideProxy();
        if (!visible(scope)) return;
        const bounds = scope.getBoundingClientRect();
        const viewport = win.visualViewport;
        const viewportTop = viewport?.offsetTop ?? 0;
        const viewportBottom = viewportTop + (viewport?.height ?? win.innerHeight);
        const topEdge = Math.max(bounds.top, viewportTop) + 8;
        const composer = scope.querySelector('[data-composer-seat]');
        const composerRect = visible(composer) ? composer.getBoundingClientRect() : null;
        const bottomEdge = Math.min(bounds.bottom, viewportBottom, composerRect && composerRect.bottom > topEdge ? composerRect.top : Infinity) - 8;
        if (bottomEdge - topEdge < 44) return;
        let chosen = null;
        let chosenTop = -Infinity;
        for (const group of groups.values()) {
          if (!open(group) || !group.top.isConnected) continue;
          const members = group.members.filter(visible);
          if (!members.length) continue;
          const start = Math.min(group.top.getBoundingClientRect().top, members[0].getBoundingClientRect().top);
          const end = group.bottom.getBoundingClientRect();
          const lastBottom = members[members.length - 1].getBoundingClientRect().bottom;
          if (start >= bottomEdge - 36 || lastBottom <= topEdge) continue;
          // Visible inline button owns its place; only obscured bottoms need a proxy.
          if (end.height > 0 && end.top >= topEdge && end.bottom <= bottomEdge) continue;
          if (lastBottom < bottomEdge - 36) continue;
          if (start >= chosenTop) { chosen = group; chosenTop = start; }
        }
        if (!chosen) return;
        const column = chosen.flow.getBoundingClientRect();
        const left = Math.max(column.left, bounds.left + 8, viewport?.offsetLeft ?? 0);
        const right = Math.min(column.right, bounds.right - 8, (viewport?.offsetLeft ?? 0) + (viewport?.width ?? win.innerWidth));
        if (right - left < 100) return;
        floatingOwner?.hideProxy();
        floatingOwner = controller;
        target = chosen;
        proxy.hidden = false;
        proxy.style.left = `${left}px`;
        proxy.style.top = `${bottomEdge - 36}px`;
        proxy.style.maxWidth = `${right - left}px`;
        proxy.setAttribute('aria-label', `收起${groupLabel(chosen)}`);
        proxy.title = `仅收起${groupLabel(chosen)}，不影响其他已展开内容`;
      }
      function flush() {
        frame = 0;
        if (disposed) return;
        try {
          if (dirty) { dirty = false; reconcile(); }
          if (anchor) {
            const { top, offset } = anchor;
            anchor = null;
            if (top.isConnected) scope.scrollTop += top.getBoundingClientRect().top - scope.getBoundingClientRect().top - offset;
          }
          layout();
        } catch (error) {
          // Enhancement failures must never leave content hidden or take down Chat.
          dispose();
          console.warn('[dsh-thought-fold] 当前会话增强已安全停用', error);
        }
      }
      const onScroll = () => schedule();
      const onChange = () => schedule(true);
      const onFound = event => {
        for (const group of groups.values()) if (group.kind === 'compat' && group.members.some(row => row === event.target || row.contains(event.target))) {
          choices.set(group.id, true);
          for (const row of group.members) setHidden(row, false);
          schedule(true);
        }
      };
      const observer = new win.MutationObserver(records => {
        // Ignore owned controls and CSS/geometry writes, avoiding observer feedback loops.
        const external = records.some(record => {
          const element = record.target.nodeType === 1 ? record.target : record.target.parentElement;
          if (element?.closest('[' + OWNED + ']')) return false;
          if (record.type === 'childList') return [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType !== 1 || !node.hasAttribute(OWNED));
          return true;
        });
        if (external) schedule(true);
      });
      const resizeObserver = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(() => schedule()) : null;
      const controller = { dispose, hideProxy, refresh: onChange };
      function dispose() {
        if (disposed) return;
        disposed = true;
        observer.disconnect();
        resizeObserver?.disconnect();
        if (frame) win.cancelAnimationFrame(frame);
        frame = 0;
        scope.removeEventListener('scroll', onScroll, true);
        scope.removeEventListener('beforematch', onFound, true);
        win.removeEventListener('resize', onScroll);
        win.visualViewport?.removeEventListener('resize', onScroll);
        win.visualViewport?.removeEventListener('scroll', onScroll);
        for (const row of hiddenRows) setHidden(row, false);
        for (const [button, lease] of nativeLeases) releaseNative(button, lease);
        for (const row of nativeReveals) row.removeAttribute('data-dsh-tf-native-reveal');
        nativeReveals.clear();
        for (const group of groups.values()) forget(group);
        groups.clear();
        hideProxy();
        proxy.remove();
        if (scopeControllers.get(scope) === controller) scopeControllers.delete(scope);
        runtimeControllers.delete(controller);
      }
      observer.observe(scope, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-expanded', 'data-open', 'data-turn-process-member', 'data-turn-process-hidden', 'data-chat-turn', 'data-chat-flow-key', 'data-chat-flow-kind', 'hidden', 'data-streaming'] });
      scope.addEventListener('scroll', onScroll, { passive: true, capture: true });
      scope.addEventListener('beforematch', onFound, true);
      win.addEventListener('resize', onScroll, { passive: true });
      win.visualViewport?.addEventListener('resize', onScroll, { passive: true });
      win.visualViewport?.addEventListener('scroll', onScroll, { passive: true });
      scopeControllers.set(scope, controller);
      runtimeControllers.add(controller);
      schedule(true);
      return controller;
    }

    function FoldDock(props) {
      // Missing optional host hook must not crash the composer on older deployments.
      return typeof props.useChat === 'function' ? h(FoldDockSession, props) : null;
    }

    function FoldDockSession({ useChat, foldSessionId }) {
      const marker = React.useRef(null);
      const store = React.useRef(null);
      const activeController = React.useRef(null);
      // The host's session hook is a live store, not copied transcript data.
      const nodes = useChat((snapshot) => snapshot.nodes);
      const timeline = useChat((snapshot) => snapshot.timeline);
      store.current = nodes;
      useEffect(() => { activeController.current?.refresh(); }, [nodes, timeline]);
      useEffect(() => {
        let controller = null;
        const update = () => {
          const scope = marker.current?.closest('[data-conversation-scroll]');
          if (!runtimeConfig?.enabled || !scope) { controller?.dispose(); controller = null; activeController.current = null; return; }
          try {
            if (!controller) controller = makeFoldController(scope, marker.current, key => store.current?.get(key));
            else controller.refresh();
            activeController.current = controller;
          } catch (error) {
            controller?.dispose();
            controller = null;
            activeController.current = null;
            console.warn('[dsh-thought-fold] 当前宿主不支持会话增强', error);
          }
        };
        runtimeListeners.add(update);
        update();
        return () => { runtimeListeners.delete(update); controller?.dispose(); activeController.current = null; };
      }, [foldSessionId]);
      return h('span', { ref: marker, 'data-dsh-tf-owned': '', style: { display: 'contents' } });
    }

