let currentUserHint = null;
let currentIdToken = null; // <-- add this
let config = {};
window.config = config;

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

function setLoggedIn(username, userHint) {
    const authStatus = document.getElementById('authStatus');
    const logoutButton = document.getElementById('logoutButton');
    authStatus.textContent = `logged in as ${username}`;
    logoutButton.style.display = 'inline-block';
    currentUserHint = userHint || null;
}

function setLoggedOut() {
    const authStatus = document.getElementById('authStatus');
    const logoutButton = document.getElementById('logoutButton');
    authStatus.textContent = 'Not logged in';
    logoutButton.style.display = 'none';
    currentUserHint = null;
    currentIdToken = null;
}

// must be global for data-callback="handleCredentialResponse"
window.handleCredentialResponse = async function handleCredentialResponse(response) {
    const payload = parseJwt(response.credential);
    if (!payload) {
        setLoggedOut();
        return;
    }

    currentIdToken = response.credential;
    const username = payload.name || payload.email || payload.sub || 'unknown user';
    const userHint = payload.email || payload.sub;
    setLoggedIn(username, userHint);
};

async function loadConfig() {
    try {
        const response = await fetch('/config.json', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Failed to load config.json (${response.status})`);
        }
        config = await response.json();
        window.config = config;
    } catch (error) {
        console.error('Could not load config.json:', error);
        config = {};
        window.config = config;
    }
}

function loadGoogleGsiScript() {
    return new Promise((resolve, reject) => {
        if (document.querySelector('script[data-google-gsi="true"]')) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleGsi = 'true';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load Google GSI script'));
        document.head.appendChild(script);
    });
}

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

async function readFromQueue(id) {
    const response = await fetch(
        `${window.config.api_hostname}/api/readFromQueue?id=${encodeURIComponent(id)}`,
        {
            method: 'GET',
            headers: currentIdToken ? {
                'Authorization': `Bearer ${currentIdToken}`
            } : {}
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error (${response.status}): ${errorText}`);
    }

    return response.text();
}

async function writeToQueue(value) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (currentIdToken) {
        headers.Authorization = `Bearer ${currentIdToken}`;
    }

    const response = await fetch(
        `${window.config.api_hostname}/api/writeToQueue`,
        {
            method: 'POST',
            headers,
            body: JSON.stringify({ value })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error (${response.status}): ${errorText}`);
    }

    return response.json();
}

async function initPage() {
    await loadConfig();

    document
        .getElementById('g_id_onload')
        .setAttribute('data-client_id', `${window.config.auth_google_client_id || ''}`);

    const queueForm = document.getElementById('queueForm');
    const readSection = document.getElementById('readFromQueueSection');
    const m = getQueryParam('m');

    if (m) {
        queueForm.classList.add('hidden');
        readSection.classList.remove('hidden');

        const showReadButton = document.getElementById('showReadButton');
        const readStatusMessage = document.getElementById('readStatusMessage');

        showReadButton.addEventListener('click', async () => {
            readStatusMessage.style.color = 'black';
            readStatusMessage.textContent = 'Loading...';

            try {
                const value = await readFromQueue(m);
                readStatusMessage.style.color = 'green';
                readStatusMessage.textContent = value;
            } catch (error) {
                readStatusMessage.style.color = 'red';
                readStatusMessage.textContent = error.message;
            }
        });
    } else {
        queueForm.classList.remove('hidden');
        readSection.classList.add('hidden');
    }

    document.getElementById('logoutButton').addEventListener('click', () => {
        if (currentUserHint && window.google?.accounts?.id?.revoke) {
            google.accounts.id.revoke(currentUserHint, () => setLoggedOut());
        } else {
            setLoggedOut();
        }

        if (window.google?.accounts?.id?.disableAutoSelect) {
            google.accounts.id.disableAutoSelect();
        }
    });

    queueForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const messageInput = document.getElementById('messageInput');
        const statusMessage = document.getElementById('statusMessage');

        statusMessage.style.color = 'black';
        statusMessage.textContent = 'Submitting...';

        try {
            const result = await writeToQueue(messageInput.value);
            const messageId = result?.messageId ?? result?.message_id ?? result?.id;
            const readUrl = `${window.location.origin}${window.location.pathname}?m=${encodeURIComponent(messageId || '')}`;

            statusMessage.style.color = 'green';
            statusMessage.innerHTML = '';

            const line1 = document.createElement('div');
            line1.textContent = `Success: ${result?.message || 'Queued'}`;

            const line2 = document.createElement('div');
            line2.textContent = `messageId: ${messageId || '(missing)'}`;

            const line3 = document.createElement('div');
            const link = document.createElement('a');
            link.href = readUrl;
            link.textContent = readUrl;
            line3.append('URL: ', link);

            statusMessage.append(line1, line2, line3);

            messageInput.value = '';
        } catch (error) {
            statusMessage.style.color = 'red';
            statusMessage.innerHTML = error.message.startsWith('Error (')
                ? error.message
                : `Network error occurred: ${error.message}`;
        }
    });

    // requirement: initPage() runs before loading Google GSI
    await loadGoogleGsiScript();
}

window.addEventListener('DOMContentLoaded', initPage);