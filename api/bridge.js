import adminHandler from './admin.js';
import orderHandler from './order.js';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', async () => {
  try {
    if (!input.trim()) {
      process.stdout.write(JSON.stringify({ statusCode: 400, body: { error: 'Empty input' } }));
      return;
    }
    const req = JSON.parse(input);
    let statusCode = 200;
    let headers = { 'content-type': 'application/json; charset=utf-8' };
    let responseBody = null;

    const res = {
      setHeader: (k, v) => { headers[k.toLowerCase()] = v; },
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { responseBody = data; },
          end: () => {}
        };
      }
    };

    if (req.path === '/api/admin' || (req.url && req.url.startsWith('/api/admin'))) {
      await adminHandler(req, res);
    } else if (req.path === '/api/order' || (req.url && req.url.startsWith('/api/order'))) {
      await orderHandler(req, res);
    } else {
      statusCode = 404;
      responseBody = { error: 'Unknown route' };
    }

    process.stdout.write(JSON.stringify({ statusCode, headers, body: responseBody }));
  } catch (err) {
    process.stdout.write(JSON.stringify({
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: { success: false, error: err.message || 'Internal bridge error' }
    }));
  }
});
