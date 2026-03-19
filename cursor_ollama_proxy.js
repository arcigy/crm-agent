const http = require('http');

const PORT = 11435;
const OLLAMA_HOST = '127.0.0.1';
const OLLAMA_PORT = 11434;
const DEFAULT_MODEL = 'qwen2.5-coder:14b';

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    let bodyData = [];
    req.on('data', chunk => {
        bodyData.push(chunk);
    });

    req.on('end', () => {
        let finalBody = null;
        if (bodyData.length > 0) {
            const rawBody = Buffer.concat(bodyData).toString();
            try {
                const parsed = JSON.parse(rawBody);
                if (req.url.includes('/chat/completions') || req.url.includes('/completions')) {
                    console.log(`\n--- REQUEST TO ${req.url} ---`);
                    console.log(`Original model: ${parsed.model}`);
                    parsed.model = DEFAULT_MODEL;
                    console.log(`Forced model: ${parsed.model}`);
                }
                finalBody = JSON.stringify(parsed);
            } catch (e) {
                finalBody = rawBody; // Keep raw if not JSON
            }
        }

        const options = {
            hostname: OLLAMA_HOST,
            port: OLLAMA_PORT,
            path: req.url,
            method: req.method,
            headers: {
                ...req.headers,
                host: `${OLLAMA_HOST}:${OLLAMA_PORT}`
            }
        };

        if (finalBody) {
            options.headers['content-length'] = Buffer.byteLength(finalBody);
        }

        const proxyReq = http.request(options, proxyRes => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
        });

        proxyReq.on('error', err => {
            console.error(`Proxy Error:`, err);
            res.writeHead(502);
            res.end(`Proxy Error: ${err.message}`);
        });

        if (finalBody) {
            proxyReq.write(finalBody);
        }
        proxyReq.end();
    });
});

server.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`Raw HTTP Proxy running on port ${PORT}`);
    console.log(`All chat completions will force model: ${DEFAULT_MODEL}`);
    console.log(`===========================================`);
});
