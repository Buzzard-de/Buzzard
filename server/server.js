const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL, URLSearchParams } = require('url');
// Checked before anything opens a store: several modules create their files while loading.
if (require('./lib/runtimeEnv').isProduction()) {
  const problem = require('./lib/dataDir').productionDataDirProblem();
  if (problem) {
    console.error(`[startup] ${problem.message}`);
    process.exit(1);
  }
}

const { createRateLimiter, setSecurityHeaders, publicErrorBody, getClientIp } = require('./lib/security');
const { logSecurityEvent } = require('./lib/securityLog');
const { wrapRouteHandler } = require('./lib/globalAuthMiddleware');
const { resolveRoutePermission } = require('./lib/routePermissions');
const { resolvePublicFile } = require('./lib/staticFilePolicy');

const port = process.env.PORT || 3001;
const rootDir = path.join(__dirname, '..');
const pluginsDir = path.join(__dirname, 'plugins');
const routes = [];
const apiRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: 180, keyPrefix: 'api:' });
const healthRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: 240, keyPrefix: 'health:' });
const anonymousWriteLimit = createRateLimiter({ windowMs: 60 * 1000, max: 60, keyPrefix: 'api-anon-write:' });

function setCommonHeaders(res) {
  setSecurityHeaders(res);
}

function setApiCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (require("./lib/corsOrigins").originAllowed(origin)) {
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
  routes.push({ method, routePath, handler: wrapRouteHandler(method, routePath, handler), segments });
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

class BadRequestError extends Error {
  constructor(errorKey) {
    super(errorKey);
    this.errorKey = errorKey;
  }
}

function matchRoute(method, pathname) {
  const requestSegments = pathname.split('/').filter(Boolean);
  let decodedSegments;
  try {
    decodedSegments = requestSegments.map((segment) => decodeURIComponent(segment));
  } catch {
    throw new BadRequestError('security.malformedUrl');
  }

  for (const route of routes) {
    if (route.method !== method) continue;
    if (route.segments.length !== requestSegments.length) continue;

    const params = {};
    let matched = true;

    for (let i = 0; i < route.segments.length; i += 1) {
      const routeSegment = route.segments[i];
      const requestSegment = decodedSegments[i];

      if (routeSegment.dynamic) {
        params[routeSegment.name] = requestSegment;
      } else if (routeSegment.name !== requestSegment) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { handler: route.handler, params, routePath: route.routePath };
    }
  }

  return null;
}

/**
 * Health and readiness routes are public and describe storage (database file,
 * backup directory). In production an anonymous caller gets the file names
 * without the directory layout of the host.
 */
let publicPathRoots = null;
function withoutHostPaths(json) {
  if (!publicPathRoots) {
    const { resolveDataDir } = require('./lib/dataDir');
    const candidates = [
      [resolveDataDir(), '[data]'],
      [process.env.BUZZARD_DB_PATH ? path.dirname(path.resolve(process.env.BUZZARD_DB_PATH)) : null, '[data]'],
      [process.env.BUZZARD_BACKUP_DIR ? path.resolve(process.env.BUZZARD_BACKUP_DIR) : null, '[backups]'],
      [rootDir, '[app]'],
    ];
    publicPathRoots = candidates
      .filter(([dir]) => typeof dir === 'string' && dir.length > 1)
      .map(([dir, label]) => [JSON.stringify(dir).slice(1, -1), label])
      .sort((a, b) => b[0].length - a[0].length);
  }
  let out = json;
  for (const [dir, label] of publicPathRoots) out = out.split(dir).join(label);
  return out;
}

function sendJson(res, statusCode, body) {
  let data = JSON.stringify(body || {});
  const req = res.req;
  if (req && !req.adminUser && !req.user && require('./lib/runtimeEnv').isProduction()) {
    data = withoutHostPaths(data);
  }
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
    // A handler that already declared its type (XML feed, CSV export) keeps it.
    if (!this.getHeader('Content-Type')) this.setHeader('Content-Type', 'text/plain; charset=utf-8');
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


const MAX_BODY_BYTES = 256 * 1024;

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      const rawBuffer = Buffer.concat(chunks);
      // Signature checks need the bytes as they were sent, not a re-serialised object.
      req.rawBody = rawBuffer;
      const raw = rawBuffer.toString("utf8");
      const contentType = (req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();

      if (!raw) {
        resolve({});
        return;
      }

      if (contentType === "application/json") {
        try {
          resolve(JSON.parse(raw));
        } catch {
          reject(new BadRequestError('security.invalidJson'));
        }
        return;
      }

      if (contentType === "application/x-www-form-urlencoded") {
        resolve(Object.fromEntries(new URLSearchParams(raw)));
        return;
      }

      resolve({});
    });
    req.on("error", reject);
  });
}

function loadPlugins() {
  const pluginFiles = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));
  const priority = ['productionHealthPlugin.js', 'storefrontBridgePlugin.js', 'orderAutomationPlugin.js'];
  const sorted = [
    ...priority.filter(file => pluginFiles.includes(file)),
    ...pluginFiles.filter(file => !priority.includes(file)).sort(),
  ];

  for (const file of sorted) {
    const plugin = require(path.join(pluginsDir, file));
    if (plugin && typeof plugin.register === 'function') {
      plugin.register(app);
      console.log(`Loaded plugin: ${file}`);
    }
  }
}

app.get('/api/status', (req, res) => {
  sendJson(res, 200, {
    status: 'ok',
    app: 'Buzzard API',
    health: '/api/health',
    docs: 'BUZZARD_MASTER_IMPLEMENTATION.md',
  });
});

loadPlugins();

const { isProduction } = require("./lib/runtimeEnv");

// A production process without its mandatory secrets must not start serving.
try {
  const { assertProductionSafeStartup } = require("./lib/environmentValidation");
  assertProductionSafeStartup();
  const { validateConfiguration } = require("./lib/operations/configurationValidation");
  const configResult = validateConfiguration();
  if (!configResult.ok) {
    console.error("[config-validation] FAIL CLOSED:", configResult.errors.map((e) => e.message).join("; "));
    if (isProduction()) process.exit(1);
  }
  for (const w of configResult.warnings) {
    console.warn("[config-validation]", w.message);
  }
} catch (err) {
  console.error(err.message);
  if (isProduction()) process.exit(1);
}

try {
  const { validateDatabaseStartup } = require("./lib/dbStartup");
  validateDatabaseStartup();
} catch (err) {
  console.error(err.message);
  if (isProduction()) process.exit(1);
}

if (process.env.BUZZARD_WORKER_ENABLED === "1") {
  const jobWorker = require("./lib/jobWorker");
  const jobScheduler = require("./lib/jobScheduler");
  jobWorker.setupGracefulShutdown();
  jobWorker.startWorker({ pollIntervalMs: Number(process.env.BUZZARD_WORKER_POLL_MS) || 3000 });
  jobScheduler.startSchedulerLoop();
}

async function handleRequest(req, res) {
  const correlationContext = require("./lib/operations/correlationContext");
  const ctx = correlationContext.createContext({
    requestId: req.headers["x-request-id"],
    correlationId: req.headers["x-correlation-id"],
  });
  req.requestId = ctx.requestId;
  req.correlationId = ctx.correlationId;
  req.operationsContext = ctx;
  res.once("close", () => correlationContext.releaseContext(ctx.requestId));
  res.setHeader("X-Request-Id", ctx.requestId);
  res.setHeader("X-Correlation-Id", ctx.correlationId);

  return require("./lib/requestScope").run(
    { requestId: ctx.requestId, correlationId: ctx.correlationId },
    // The error answer is written inside the scope too, so what gets logged
    // while reporting it still carries the ids of this request.
    () => serveRequest(req, res).catch((error) => sendRequestError(req, res, error))
  );
}

async function serveRequest(req, res) {
  let requestUrl;
  try {
    requestUrl = new URL(req.url, 'http://localhost');
  } catch {
    throw new BadRequestError('security.malformedUrl');
  }
  const pathname = requestUrl.pathname;

  if (pathname.startsWith('/api/')) {
    setApiCorsHeaders(req, res);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const healthProbe = pathname === '/api/health' || pathname.startsWith('/api/health/');
    if (healthProbe ? healthRateLimit(req) : apiRateLimit(req)) {
      logSecurityEvent({
        type: 'api_rate_limited',
        success: false,
        ip: getClientIp(req),
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

    // Writes without credentials are the storefront's guest actions (cart, contact, registration).
    // They get a tighter budget than reads. A webhook that carries a signature is exempt:
    // it authenticates per request and has its own failure budget. One without a signature is not.
    const isWrite = req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE';
    if (isWrite && !req.headers.authorization) {
      const policy = resolveRoutePermission(req.method, route.routePath);
      const signedWebhook = Boolean(policy?.webhook && req.headers['x-buzzard-signature']);
      if (!signedWebhook && anonymousWriteLimit(req)) {
        logSecurityEvent({
          type: 'api_rate_limited',
          success: false,
          ip: getClientIp(req),
          path: route.routePath,
          detail: { scope: 'anonymous_write' },
        });
        sendJson(res, 429, publicErrorBody('security.rateLimited'));
        return;
      }
    }

    // Answers to the back office and to anything sent with credentials must not sit in a shared or disk cache.
    if (pathname.startsWith('/api/admin/') || req.headers.authorization) {
      res.setHeader('Cache-Control', 'no-store');
    }

    req.params = route.params;
    req.routePath = route.routePath;
    req.query = Object.fromEntries(requestUrl.searchParams.entries());
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
      req.body = await parseBody(req);
    }
    await route.handler(req, res);
    return;
  }

  const filePath = req.method === 'GET' || req.method === 'HEAD' ? resolvePublicFile(rootDir, pathname) : null;
  if (!filePath) {
    sendJson(res, 404, { message: 'Seite nicht gefunden.' });
    return;
  }

  sendFile(res, filePath);
}

function isRejectedInput(error) {
  const code = error && typeof error.code === 'string' ? error.code : '';
  return code.startsWith('SQLITE_CONSTRAINT') || code === 'SQLITE_MISMATCH';
}

function sendRequestError(req, res, error) {
  let statusCode = 500;
  let errorKey = 'security.internalError';
  if (error instanceof BadRequestError) {
    statusCode = 400;
    errorKey = error.errorKey;
  } else if (error && error.message === 'Payload too large') {
    statusCode = 413;
    errorKey = 'security.payloadTooLarge';
  } else if (isRejectedInput(error)) {
    // The database refused the values (missing field, unknown reference, wrong
    // type). Nothing was written; the caller sent input the route cannot store.
    statusCode = 400;
    errorKey = 'security.invalidInput';
    console.warn('API input rejected by storage:', String(req.url || '').split('?')[0].slice(0, 200), error.code);
  } else {
    console.error('API error:', error);
    try {
      logSecurityEvent({
        type: 'api_error',
        success: false,
        ip: getClientIp(req),
        userId: req.adminUser?.id || null,
        path: String(req.url || '').split('?')[0].slice(0, 200),
        detail: { message: String(error && error.message).slice(0, 200) },
      });
    } catch {
      /* the log store itself may be the failing part */
    }
  }
  if (res.headersSent || res.writableEnded) {
    res.end();
    return;
  }
  sendJson(res, statusCode, publicErrorBody(errorKey));
}

// One malformed request must not end the process: every failure, including a
// rejected async route handler, is answered here.
const server = http.createServer((req, res) => {
  attachResponseHelpers(res);
  setCommonHeaders(res);
  handleRequest(req, res).catch((error) => {
    try {
      sendRequestError(req, res, error);
    } catch (fatal) {
      console.error('API error while reporting an error:', fatal && fatal.message);
      res.destroy();
    }
  });
});

const bindHost = process.env.BUZZARD_BIND_HOST || "0.0.0.0";
server.listen(port, bindHost, () => {
  console.log(`Buzzard API server running on http://${bindHost}:${port}`);
});

server.on("error", (err) => {
  console.error("Buzzard API server failed to start:", err.message);
  process.exit(1);
});
