/**
 * Central error handler — nuk ekspozon stack në production
 */
export function notFound(req, res, next) {
  res.status(404).json({ message: `Rruga nuk u gjet: ${req.originalUrl}` })
}

export function errorHandler(err, req, res, _next) {
  const status = err.statusCode || err.status || 500
  const isProd = process.env.NODE_ENV === 'production'
  if (!isProd) {
    console.error('❌', err)
  } else {
    console.error('❌', err.message)
  }
  res.status(status).json({
    message: isProd && status === 500 ? 'Gabim i brendshëm i serverit' : err.message || 'Gabim',
    ...(isProd ? {} : { stack: err.stack }),
  })
}
