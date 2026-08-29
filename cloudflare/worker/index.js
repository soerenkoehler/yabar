const jsonResponse = (body, init = {}) => new Response(JSON.stringify(body), {
    ...init,
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...(init.headers ?? {})
    }
});

const textResponse = (body, init = {}) => new Response(body, {
    ...init,
    headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        ...(init.headers ?? {})
    }
});

const httpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const parseJsonBody = async (request) => {
    try {
        return await request.json();
    } catch {
        throw httpError(400, 'Request body must be valid JSON.');
    }
};

const getConfig = (env) => {
    if (env.config && typeof env.config === 'object' && Array.isArray(env.config.expirationOptions)) {
        return env.config;
    }
    throw httpError(500, 'Bad configuration');
};

const getExpirationOptions = (env) => getConfig(env).expirationOptions;

const getAllowedExpirations = (env) => new Set(
    getExpirationOptions(env).map((option) => String(option?.value ?? '').trim())
);

const validateExpiration = (env, expiration) => {
    const normalized = String(expiration ?? '').trim();
    if (!getAllowedExpirations(env).has(normalized)) {
        throw httpError(400, `Unsupported expiration '${expiration}'`);
    }
    return normalized;
};

const parseDurationToMilliseconds = (duration) => {
    const match = String(duration ?? '').trim().match(/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
    if (!match) {
        return null;
    }

    const [, weeks = '0', days = '0', hours = '0', minutes = '0', seconds = '0'] = match;
    const total = Number(weeks) * 7 * 24 * 60 * 60 * 1000
        + Number(days) * 24 * 60 * 60 * 1000
        + Number(hours) * 60 * 60 * 1000
        + Number(minutes) * 60 * 1000
        + Number(seconds) * 1000;

    return Number.isFinite(total) && total > 0 ? total : null;
};

const handleWrite = async (request, env) => {
    const body = await parseJsonBody(request);
    const expiration = validateExpiration(env, body?.expiration);
    const value = String(body?.value ?? '');
    if (!value) {
        throw httpError(400, "Missing 'value' property in request payload.");
    }

    const id = `${Date.now()}_${crypto.randomUUID()}`;
    await env.DB.prepare(
        'INSERT INTO messages (id, expiration, value, created_at) VALUES (?, ?, ?, ?)'
    ).bind(id, expiration, value, Date.now()).run();

    return textResponse(id);
};

const handleRead = async (request, env) => {
    const body = await parseJsonBody(request);
    const expiration = validateExpiration(env, body?.expiration);
    const id = String(body?.id ?? '').trim();
    if (!id) {
        throw httpError(400, "Missing 'id' property.");
    }

    const message = await env.DB.prepare(
        'SELECT value FROM messages WHERE expiration = ? AND id = ?'
    ).bind(expiration, id).first();

    if (!message) {
        throw httpError(404, 'Message not found.');
    }

    await env.DB.prepare(
        'DELETE FROM messages WHERE expiration = ? AND id = ?'
    ).bind(expiration, id).run();

    return textResponse(message.value ?? '');
};

// FIXME add a once a day function that cleans undefined expiration values
// TODO test/debug locally
const cleanupMessages = async (env) => {
    let deleted = 0;
    const now = Date.now();

    for (const expiration of getAllowedExpirations(env)) {
        const durationMs = parseDurationToMilliseconds(expiration);
        if (durationMs == null) {
            continue;
        }

        const result = await env.DB.prepare(
            'DELETE FROM messages WHERE expiration = ? AND created_at < ?'
        ).bind(expiration, now - durationMs).run();

        deleted += result.meta?.changes ?? 0;
    }

    return deleted;
};

const routeRequest = async (request, env) => {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/api/write') {
        return handleWrite(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/api/read') {
        return handleRead(request, env);
    }

    if (request.method === 'GET' && url.pathname === '/api/config') {
        return jsonResponse(getConfig(env));
    }

    if (request.method === 'GET' && url.pathname === '/api/info') {
        return jsonResponse({ build_timestamp: env.build_timestamp ?? 'unknown'});
    }

    return textResponse('Not found.', { status: 404 });
};

export default {
    fetch: async (request, env) => {
        try {
            return await routeRequest(request, env);
        } catch (error) {
            if (error.status) {
                return textResponse(error.message, { status: error.status });
            }

            console.error('Request failed:', error);
            return textResponse('Internal server error.', { status: 500 });
        }
    },

    scheduled: async (event, env, context) => {
        context.waitUntil(cleanupMessages(env));
    }
};