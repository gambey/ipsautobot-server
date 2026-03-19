const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const swaggerConfig = require('./config/swagger');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const logsRoutes = require('./routes/logs');
const rechargeRoutes = require('./routes/recharge');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : true;
app.use(cors({ origin: corsOrigin, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const swaggerSpec = swaggerJsdoc(swaggerConfig);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/recharge', rechargeRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use(errorHandler);

module.exports = app;
module.exports.swaggerSpec = swaggerSpec;
