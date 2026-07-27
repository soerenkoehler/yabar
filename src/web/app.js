import './auth.js';
import { readFromQueue, writeToQueue } from './api.js';

let config = {};
window.config = config;

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

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

async function initPage() {
    await loadConfig();

    document
        .getElementById('g_id_onload')
        .setAttribute('data-client_id', `${config.auth_google_client_id || ''}`);

    const writeSection = document.getElementById('writeToQueueSection');
    const queueForm = document.getElementById('queueForm');
    const readSection = document.getElementById('readFromQueueSection');
    const m = getQueryParam('m');

    if (m) {
        writeSection.classList.add('hidden');
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
        writeSection.classList.remove('hidden');
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