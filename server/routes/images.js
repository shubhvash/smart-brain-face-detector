const express = require('express');
const dns = require('dns').promises;
const net = require('net');
const router = express.Router();
const auth = require('../middlewares/auth');

// Face detection runs in the browser, which needs CORS-clean pixels. Most image
// hosts don't send CORS headers, so we fetch the image server-side and serve it
// from our own origin.

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10000;

const isPrivateIp = (ip) => {
    if (net.isIPv4(ip)) {
        const [a, b] = ip.split('.').map(Number);
        return a === 0 || a === 10 || a === 127 ||
            (a === 100 && b >= 64 && b <= 127) ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) ||
            a >= 224;
    }
    const lower = ip.toLowerCase();
    if (lower.startsWith('::ffff:')) {
        return isPrivateIp(lower.slice(7));
    }
    return lower === '::' || lower === '::1' ||
        lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80');
};

const assertPublicUrl = async (rawUrl) => {
    let url;
    try {
        url = new URL(rawUrl);
    } catch (e) {
        throw new Error('Invalid URL');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Only http and https URLs are allowed');
    }
    const addresses = await dns.lookup(url.hostname, { all: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
        throw new Error('URL resolves to a disallowed address');
    }
    return url;
};

router.get('/proxy', auth.authenticate, async (req, res) => {
    try {
        let url = await assertPublicUrl(req.query.url);
        let response;

        for (let hops = 0; ; hops++) {
            response = await fetch(url, {
                redirect: 'manual',
                headers: { 'User-Agent': 'smart-brain-image-proxy/1.0', 'Accept': 'image/*' },
                signal: AbortSignal.timeout(TIMEOUT_MS)
            });
            const location = response.headers.get('location');
            if (response.status >= 300 && response.status < 400 && location) {
                if (hops >= MAX_REDIRECTS) {
                    throw new Error('Too many redirects');
                }
                url = await assertPublicUrl(new URL(location, url).toString());
                continue;
            }
            break;
        }

        if (!response.ok) {
            res.status(502).send({ error: `Image host responded with ${response.status}` });
            return;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
            res.status(415).send({ error: 'URL does not point to an image' });
            return;
        }

        const declaredLength = Number(response.headers.get('content-length'));
        if (declaredLength > MAX_BYTES) {
            res.status(413).send({ error: 'Image is too large' });
            return;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > MAX_BYTES) {
            res.status(413).send({ error: 'Image is too large' });
            return;
        }

        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'private, max-age=3600');
        res.set('X-Content-Type-Options', 'nosniff');
        res.send(buffer);
    } catch (err) {
        res.status(400).send({ error: err.message || 'Could not fetch image' });
    }
});

module.exports = router;
