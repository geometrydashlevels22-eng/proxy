const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
// Uses Render's automatic port or defaults to 3000
const PORT = process.env.PORT || 3000;

// Enable cross-origin access so your HTML file can communicate with it
app.use(cors());

// Health check endpoint so you can verify the server is active
app.get('/', (req, res) => {
  res.send('Proxy backend is live and operational!');
});

// Proxy route handling
app.use('/service', (req, res, next) => {
  // Extracts the target website URL from the request parameter
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).send('Error: Missing target URL parameter.');
  }

  createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    ws: true, // Enables WebSockets for live chat/streaming features
    pathRewrite: { '^/service': '' },
    onProxyReq: (proxyReq) => {
      // Spoof User-Agent header to avoid bot detection on YouTube/Spotify
      proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      proxyReq.setHeader('Referer', targetUrl);
    },
    onProxyRes: (proxyRes) => {
      // Strip restrictive headers that block websites from loading inside an iframe
      delete proxyRes.headers['x-frame-options'];
      delete proxyRes.headers['content-security-policy'];
      proxyRes.headers['access-control-allow-origin'] = '*';
    },
    onError: (err, req, res) => {
      console.error('Proxy Request Error:', err);
      res.status(500).send('Error loading requested webpage.');
    }
  })(req, res, next);
});

app.listen(PORT, () => {
  console.log(`Proxy server is running on port ${PORT}`);
});
