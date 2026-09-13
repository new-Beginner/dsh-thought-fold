export const name = 'dsh-thought-fold-web';
export const inject = ['connection', 'thoughtFoldService'];

export function apply(ctx) {
  const service = ctx.thoughtFoldService;
  const reply = (value, status = 200) => new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });

  async function buildPayload() {
    return {
      ok: true,
      config: service.getConfig(),
      writable: Boolean(service.settingsScope),
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
        if (data.action === 'saveSettings') {
          if (!service.settingsScope) {
            return reply({ error: '设置服务不可用，当前配置为只读状态' }, 503);
          }
          if (data.patch) {
            await service.settingsScope.update(data.patch);
          }
          return reply(await buildPayload());
        }

        return reply({ error: `未知操作: ${data.action}` }, 400);
      } catch (err) {
        return reply({ error: err.message || String(err) }, 500);
      }
    }
  });
}
