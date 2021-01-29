const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = (app) => {
    const socketProxy = createProxyMiddleware('/api', {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
        logLevel: 'debug'
    });
    app.use(socketProxy);
};