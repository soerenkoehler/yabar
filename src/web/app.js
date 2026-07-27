import { setupAuth } from './auth.js';
import { readMessage, writeMessage } from './api.js';

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

    const readSection = document.getElementById('readMessageSection');
    const writeSection = document.getElementById('writeMessageSection');
    const writeMessageForm = document.getElementById('writeMessageForm');
    const m = getQueryParam('m');

    if (m) {
        const showReadButton = document.getElementById('showReadButton');
        const readStatusMessage = document.getElementById('readStatusMessage');

        showReadButton.addEventListener('click', async () => {
            readStatusMessage.style.color = 'black';
            readStatusMessage.textContent = 'Loading...';

            try {
                const value = await readMessage(m);
                readStatusMessage.style.color = 'green';
                readStatusMessage.textContent = value;
            } catch (error) {
                readStatusMessage.style.color = 'red';
                readStatusMessage.textContent = error.message;
            }
        });
    }

    setupAuth(({ isLoggedIn }) => {
        ((isLoggedIn) => {
            if (!isLoggedIn) {
                writeSection.classList.add('hidden');
                readSection.classList.add('hidden');
                return;
            }

            if (m) {
                writeSection.classList.add('hidden');
                readSection.classList.remove('hidden');
            } else {
                writeSection.classList.remove('hidden');
                readSection.classList.add('hidden');
            }
        })(isLoggedIn);
    });

    writeMessageForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const messageInput = document.getElementById('messageInput');
        const statusMessage = document.getElementById('statusMessage');

        statusMessage.style.color = 'black';
        statusMessage.textContent = 'Submitting...';

        try {
            const result = await writeMessage(messageInput.value);
            const messageId = result?.messageId ?? result?.message_id ?? result?.id;
            const readUrl = `${window.location.origin}${window.location.pathname}?m=${encodeURIComponent(messageId || '')}`;

            statusMessage.style.color = 'green';
            statusMessage.innerHTML = '';

            const line1 = document.createElement('div');
            line1.textContent = `Success: ${result?.message || '(missing)'}`;

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