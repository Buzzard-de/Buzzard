const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL, URLSearchParams } = require('url');
const { createRateLimiter, setSecurityHeaders, publicErrorBody } = require('./lib/security');
const { logSecurityEvent } = require('./lib/securityLog');

const port = process.env.PORT || 3000;
const rootDir = path.join(__dirname, '..');
const pluginsDir = path.join(__dirname, 'plugins');
const routes = [];
const apiRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: 180, keyPrefix: 'api:' });

function setCommonHeaders(res) {
  setSecurityHeaders(res);
}

function setApiCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const allowed = new Set([
    "http://localhost:8000",
    "http://localhost:3000",
    "http://localhost:3001",
    "https://buzzard24.de",
    "https://www.buzzard24.de",
    "null",
  ]);
  if (origin && allowed.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Accept,Authorization");
}

function addRoute(method, routePath, handler) {
  const segments = routePath.split('/').filter(Boolean).map(segment => {
    if (segment.startsWith(':')) {
      return { name: segment.slice(1), dynamic: true };
    }
    return { name: segment, dynamic: false };
  });
  routes.push({ method, routePath, handler, segments });
}

const app = {
  get(routePath, handler) {
    addRoute('GET', routePath, handler);
  },
  post(routePath, handler) {
    addRoute('POST', routePath, handler);
  },
  put(routePath, handler) {
    addRoute('PUT', routePath, handler);
  },
  patch(routePath, handler) {
    addRoute('PATCH', routePath, handler);
  },
  delete(routePath, handler) {
    addRoute('DELETE', routePath, handler);
  }
};

function matchRoute(method, pathname) {
  const requestSegments = pathname.split('/').filter(Boolean);

  for (const route of routes) {
    if (route.method !== method) continue;
    if (route.segments.length !== requestSegments.length) continue;

    const params = {};
    let matched = true;

    for (let i = 0; i < route.segments.length; i += 1) {
      const routeSegment = route.segments[i];
      const requestSegment = decodeURIComponent(requestSegments[i]);

      if (routeSegment.dynamic) {
        params[routeSegment.name] = requestSegment;
      } else if (routeSegment.name !== requestSegment) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { handler: route.handler, params };
    }
  }

  return null;
}

function sendJson(res, statusCode, body) {
  const data = JSON.stringify(body || {});
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data)
  });
  res.end(data);
}

function attachResponseHelpers(res) {
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };

  res.json = function (body) {
    sendJson(this, this.statusCode || 200, body);
  };

  res.send = function (body) {
    if (typeof body === 'object') {
      this.setHeader('Content-Type', 'application/json; charset=utf-8');
      this.end(JSON.stringify(body));
      return;
    }
    this.setHeader('Content-Type', 'text/plain; charset=utf-8');
    this.end(String(body));
  };
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json'
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { message: 'Datei nicht gefunden.' });
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function safePath(requestPath) {
  const cleaned = path.normalize(requestPath).replace(/^\.\.[/\\]+/, '');
  return path.join(rootDir, cleaned);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const contentType = (req.headers['content-type'] || '').split(';')[0].trim();

      if (!raw) {
        resolve({});
        return;
      }

      if (contentType === 'application/json') {
        try {
          resolve(JSON.parse(raw));
        } catch (error) {
          reject(error);
        }
        return;
      }

      if (contentType === 'application/x-www-form-urlencoded') {
        resolve(Object.fromEntries(new URLSearchParams(raw)));
        return;
      }

      resolve({});
    });
    req.on('error', reject);
  });
}

function loadPlugins() {
  const pluginFiles = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));

  for (const file of pluginFiles) {
    const plugin = require(path.join(pluginsDir, file));
    if (plugin && typeof plugin.register === 'function') {
      plugin.register(app);
      console.log(`Loaded plugin: ${file}`);
    }
  }
}

app.get('/api/status', (req, res) => {
  sendJson(res, 200, { status: 'ok', app: 'Buzzard API' });
});

loadPlugins();

const server = http.createServer(async (req, res) => {
  attachResponseHelpers(res);
  setCommonHeaders(res);
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;

  if (pathname.startsWith('/api/')) {
    setApiCorsHeaders(req, res);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (apiRateLimit(req)) {
      logSecurityEvent({
        type: 'api_rate_limited',
        success: false,
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
        path: pathname,
      });
      sendJson(res, 429, publicErrorBody('security.rateLimited'));
      return;
    }

    const route = matchRoute(req.method, pathname);
    if (!route) {
      sendJson(res, 404, publicErrorBody('security.notFound'));
      return;
    }

    req.params = route.params;
    try {
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
        req.body = await parseBody(req);
      }
      route.handler(req, res);
    } catch (error) {
      console.error('API error:', error);
      logSecurityEvent({
        type: 'api_error',
        success: false,
        path: pathname,
        detail: { message: error.message },
      });
      sendJson(res, 500, publicErrorBody('security.internalError'));
    }
    return;
  }

  let filePath = pathname === '/' ? path.join(rootDir, 'index.html') : safePath(pathname);

  if (!filePath.startsWith(rootDir)) {
    sendJson(res, 403, { message: 'Zugriff verweigert.' });
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    sendJson(res, 404, { message: 'Seite nicht gefunden.' });
    return;
  }

  sendFile(res, filePath);
});

server.listen(port, () => {
  console.log(`Buzzard API server running on http://localhost:${port}`);
});
