import { setupAuth } from './auth.js';
import { fromSaltedBase64, toSaltedBase64 } from './base64.js'
import { getExpirationOptions, readMessage, writeMessage } from './api.js';

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

const renderExpirationOptions = (selectElement, options) => {
    selectElement.innerHTML = '';

    for (const option of options) {
        const optionElement = document.createElement('option');
        optionElement.value = String(option.value);
        optionElement.textContent = String(option.label);
        selectElement.appendChild(optionElement);
    }
};

const initPage = async () => {
    const q = window.location.search.slice(1);
    const readSection  = document.querySelector('#readMessageSection');
    const writeSection = document.querySelector('#writeMessageSection');
    const writeMessageTwoStepLink = writeSection.querySelector('[data-role="two-step-link"]');
    const writeMessageKeyText = writeSection.querySelector('[data-role="key-text"]');
    const writeMessageOneClickLink = writeSection.querySelector('[data-role="one-click-link"]');
    const writeMessageForm = writeSection.querySelector('#writeMessageForm');
    const expirationInput = writeMessageForm.querySelector('#expirationInput');

    let expirationOptionsLoaded = false;

    await loadConfig();

    const ensureExpirationOptionsLoaded = async () => {
        if (expirationOptionsLoaded) {
            return;
        }

        const expirationOptions = await getExpirationOptions();
        renderExpirationOptions(expirationInput, expirationOptions);
        expirationOptionsLoaded = true;
    };

    setupAuth(config.auth_google_client_id, async ({ isLoggedIn }) => {
        if (!isLoggedIn) {
            writeSection.classList.add('hidden');
            readSection.classList.add('hidden');
            return;
        }

        try {
            await ensureExpirationOptionsLoaded();
        } catch (error) {
            console.error('Could not load expiration options:', error);
            writeSection.classList.add('hidden');
            readSection.classList.add('hidden');
            return;
        }

        if (q) {
            writeSection.classList.add('hidden');
            readSection.classList.remove('hidden');
        } else {
            writeSection.classList.remove('hidden');
            readSection.classList.add('hidden');
        }
    });

    const setGlobalState = (stateClass = '', statusText = '') => {
        const globalStatus = document.querySelector('#globalStatus');
        const globalStatusText = document.querySelector('#globalStatusText');

        globalStatus.classList.remove('is-submitting', 'is-error', 'is-success');
        if (stateClass) {
            globalStatus.classList.add(stateClass);
        }
        globalStatusText.textContent = statusText;
    }

    if (q) {
        const showReadButton = document.getElementById('showReadButton');
        const readMessageOutput = document.getElementById('readMessageOutput');

        showReadButton.addEventListener('click', async () => {
            setGlobalState('is-submitting', 'Loading...');

            try {
                const messageToken = JSON.parse(fromSaltedBase64(q));
                const expiration = messageToken.expiration;
                const value = await readMessage(expiration, messageToken.id);

                readMessageOutput.textContent = value;

                setGlobalState('is-success');

            } catch (error) {
                setGlobalState('is-error', error.message)
            }
        });
    }

    writeMessageForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const inputMsg = document.getElementById('messageInput');

        setGlobalState('is-submitting', 'Submitting...');

        try {
            const id = await writeMessage(expirationInput.value, inputMsg.value);
            const key = crypto.randomUUID();

            createLink(writeMessageTwoStepLink, {
                expiration: expirationInput.value, id
            });

            writeMessageKeyText.textContent = toSaltedBase64(key)

            createLink(writeMessageOneClickLink, {
                expiration: expirationInput.value, id, key
            });

            inputMsg.value = '';
            setGlobalState('is-success');

        } catch (error) {
            setGlobalState(
                'is-error',
                error.message.startsWith('Error (')
                    ? error.message
                    : `Network error occurred: ${error.message}`
            );
        }
    });
}

window.addEventListener('DOMContentLoaded', initPage);