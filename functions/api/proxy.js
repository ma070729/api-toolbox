// Cloudflare Pages Function — API 代理
// 解决前端跨域问题：浏览器 → 同源 Worker → 外部 API
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: '缺少 url 参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 安全校验：只允许白名单域名
  try {
    const target = new URL(targetUrl);
    const allowedHosts = ['api.kuleu.com', 'www.free-api.com', 'free-api.com'];
    if (!allowedHosts.some(h => target.hostname === h)) {
      return new Response(JSON.stringify({ error: '不允许的目标域名: ' + target.hostname }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: '无效的 URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const method = request.method === 'POST' ? 'POST' : 'GET';
    const apiResponse = await fetch(targetUrl, {
      method: method,
      headers: {
        'User-Agent': 'api-toolbox/1.0'
      }
    });

    const body = await apiResponse.text();

    return new Response(body, {
      status: apiResponse.status,
      headers: {
        'Content-Type': apiResponse.headers.get('Content-Type') || 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: '请求失败: ' + err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
