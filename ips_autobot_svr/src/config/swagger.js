const path = require('path');

const definition = {
  openapi: '3.0.0',
  info: {
    title: 'ips_autobot_svr API',
    version: '1.0.0',
    description: 'Admin and user auth, logs, recharge APIs. Password fields use RSA encryption (GET /api/public-key).',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Development' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

module.exports = {
  definition,
  apis: [
    path.join(__dirname, '..', 'routes', '*.js'),
  ],
};
