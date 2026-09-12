import { getPromptText } from './prompt.js';

export const name = 'dsh-thought-fold-web';
export const inject = ['connection', 'thoughtFoldService'];

export function apply(ctx) {
  const service = ctx.thoughtFoldService;
  const reply = (value, status = 200) => new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });

  async function buildPayload() {
    const config = service.getConfig();
    const promptPreview = getPromptText(config);

    return {
      ok: true,
      config,
      promptPreview,
      timestamp: Date.now()
    };
  }

  ctx.connection.fetch.register({
    path: '/api/dsh-thought-fold',
    methods: ['GET', 'POST'],
    requestBody: 'buffered',
    async fetch(request) {
      try {
        if (request.method === 'GET') {
          return reply(await buildPayload());
        }

        if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
          return reply({ error: '需要 JSON 请求体' }, 415);
        }

        const data = await request.json();
        const { action } = data;

        if (action === 'saveSettings') {
          if (service.settingsScope && data.patch) {
            await service.settingsScope.update(data.patch);
            ctx.emit('system-prompt/change');
          }
          return reply(await buildPayload());
        }

        if (action === 'reload') {
          ctx.emit('system-prompt/change');
          return reply(await buildPayload());
        }

        return reply({ error: `未知操作: ${action}` }, 400);
      } catch (err) {
        return reply({ error: err.message || String(err) }, 500);
      }
    }
  });
}
