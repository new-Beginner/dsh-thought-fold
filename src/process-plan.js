    // Pure boundary planner. Inputs contain only owned scalar facts, never live host objects.
    const PROCESS_INDEPENDENT = new Set(['system-prompt', 'user', 'steering', 'turn-process', 'turn-error', 'turn-max-tokens', 'turn-tail']);
    function planSpecialProcess(items, { closed, endSeq, answerKey }) {
      const process = item => !PROCESS_INDEPENDENT.has(item.kind);
      let seenProcess = false;
      let hasInsertion = false;
      for (const item of items) {
        if ((item.kind === 'user' || item.kind === 'steering') && seenProcess) hasInsertion = true;
        if (process(item)) seenProcess = true;
      }
      const interrupted = items.some(item => item.interrupted || item.kind === 'turn-error' || item.kind === 'turn-max-tokens');
      if (!hasInsertion && !(closed && (interrupted || !answerKey))) return null;
      // Only a closed Turn has a final/partial answer to retain. Running tails stay visible.
      const closingText = closed ? items.findLast(item => item.kind === 'assistant-step' && item.hasText && item.settled) : null;
      const retained = new Set(closed ? [answerKey, closingText?.key].filter(Boolean) : []);
      const segments = [];
      let run = [];
      function finish(boundary) {
        if (!run.length) return;
        // A lone reasoning disclosure already owns its native top control.
        if (run.length === 1 && run[0].onlyReasoning) { run = []; return; }
        const validSeqs = run.every(item => Number.isFinite(item.seq));
        const end = boundary ? boundary.seq : endSeq;
        const ended = closed
          ? Number.isFinite(endSeq) && Number.isFinite(end) && validSeqs && run.every(item => item.seq < end && item.seq < endSeq && !item.running)
          : boundary && (boundary.kind === 'user' || boundary.kind === 'steering') && validSeqs && Number.isFinite(end) && run.every(item => item.seq < end && item.settled && item.stepClosed && Number.isFinite(item.stepEndSeq) && item.stepEndSeq <= end);
        if (ended) segments.push({
          boundary: boundary?.key ?? 'turn-end',
          keys: run.map(item => item.key),
          interrupted: closed && interrupted,
          label: closed && interrupted ? '已中断的思考与工具调用' : '思考与工具调用'
        });
        run = [];
      }
      for (const item of items) {
        if (item.kind === 'turn-process') continue;
        if (!process(item) || retained.has(item.key)) finish(item);
        else run.push(item);
      }
      finish(null);
      return { segments, hasInsertion, interrupted };
    }
