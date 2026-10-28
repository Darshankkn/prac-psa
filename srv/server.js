const cds = require('@sap/cds');

// ============================================================================
// PSA Sprint — Custom Server Bootstrap
// Auto-authenticates development requests for seamless browser previews
// ============================================================================
cds.on('bootstrap', (app) => {
  // Middleware to auto-authenticate in local development if no header is present
  app.use((req, res, next) => {
    if (!req.headers.authorization) {
      // Default identity based on request path or referer
      let authUser = 'manager@psa.com:manager'; // default to manager
      const url = req.url || '';
      const referer = req.headers.referer || '';

      if (url.includes('/admin') || referer.includes('/admin') || url.includes('/clients') || url.includes('/employees')) {
        authUser = 'admin@psa.com:admin';
      } else if (url.includes('/employee') || referer.includes('/employee')) {
        authUser = 'employee@psa.com:employee';
      } else if (url.includes('/manager') || referer.includes('/manager')) {
        authUser = 'manager@psa.com:manager';
      }

      req.headers.authorization = 'Basic ' + Buffer.from(authUser).toString('base64');
    }
    next();
  });
});

module.exports = cds.server;
