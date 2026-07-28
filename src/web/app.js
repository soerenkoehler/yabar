import { setupAuth } from './auth.js';
import { toSaltedBase64 } from './base64.js'
import { readMessage, writeMessage } from './api.js';

let config = {};
window.config = config;

const createLink = (element, data) => {
    const token = encodeURIComponent(toSaltedBase64(JSON.stringify(data)));
    const shortToken = token.length > 6 ? `${token.slice(0, 6)}...` : token;

    element.href = `${window.location.origin}?${token}`;
    element.textContent = `${window.location.origin}?${shortToken}`;
};

const loadConfig = async () => {
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
};

const initPage = async () => {
    await loadConfig();

    document
        .getElementById('g_id_onload')
        .setAttribute('data-client_id', `${config.auth_google_client_id || ''}`);

    await loadGoogleGsiScript();

    const readSection = document.getElementById('readMessageSection');
    const writeSection = document.getElementById('writeMessageSection');
    const writeMessageForm = document.getElementById('writeMessageForm');
    const writeMessageStatus = writeSection.querySelector('[data-role="status"]');
    const writeMessageTwoStepLink = writeSection.querySelector('[data-role="two-step-link"]');
    const writeMessageKeyText = writeSection.querySelector('[data-role="key-text"]');
    const writeMessageOneClickLink = writeSection.querySelector('[data-role="one-click-link"]');
    const m = window.location.search.slice(1);

    if (m) {
        const showReadButton = document.getElementById('showReadButton');
        const readMessageOutput = document.getElementById('readMessageOutput');

        showReadButton.addEventListener('click', async () => {
            readMessageOutput.style.color = 'black';
            readMessageOutput.textContent = 'Loading...';

            try {
                const value = await readMessage(m);
                readMessageOutput.style.color = 'green';
                readMessageOutput.textContent = value;
            } catch (error) {
                readMessageOutput.style.color = 'red';
                readMessageOutput.textContent = error.message;
            }
        });
    }

    setupAuth(({ isLoggedIn }) => {
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
    });

    writeMessageForm.addEventListener('submit', async (event) => {
        const setWriteMessageState = (stateClass = '', statusText = '') => {
            writeSection.classList.remove('is-submitting', 'is-error', 'is-success');
            if (stateClass) {
                writeSection.classList.add(stateClass);
            }
            writeMessageStatus.textContent = statusText;
        }

        event.preventDefault();
        const inputTtl = document.getElementById('durationInput');
        const inputMsg = document.getElementById('messageInput');

        setWriteMessageState('is-submitting', 'Submitting...');

        try {
            const id = await writeMessage(inputTtl.value, inputMsg.value);
            const key = crypto.randomUUID();

            setWriteMessageState('is-success');

            createLink(writeMessageTwoStepLink, {
                ttl: inputTtl.value, id
            });

            writeMessageKeyText.textContent = toSaltedBase64(key)

            createLink(writeMessageOneClickLink, {
                ttl: inputTtl.value, id, key
            });

            inputMsg.value = '';
        } catch (error) {
            setWriteMessageState(
                'is-error',
                error.message.startsWith('Error (')
                    ? error.message
                    : `Network error occurred: ${error.message}`
            );
        }
    });
}

window.addEventListener('DOMContentLoaded', initPage);