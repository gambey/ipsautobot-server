function errorHandler(err, req, res, next) {
  const code = err.statusCode || err.code || 500;
  const message = err.message || 'Internal Server Error';
  if (res.headersSent) return next(err);
  res.status(typeof code === 'number' ? code : 500).json({
    code: typeof code === 'number' ? code : 500,
    message,
  });
}

module.exports = { errorHandler };
