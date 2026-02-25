/**
 * Request timing middleware: logs total request duration in ms.
 * Use for performance auditing and identifying slow endpoints.
 */

function requestTimingMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const method = req.method;
    const path = req.originalUrl || req.url || req.path;
    const status = res.statusCode;
    console.log(`[timing] ${method} ${path} ${status} ${duration}ms`);
  });

  next();
}

module.exports = { requestTimingMiddleware };
