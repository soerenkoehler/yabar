import { setupAuth } from './auth.js';
import { fromSaltedBase64, toSaltedBase64 } from './base64.js'
import { getApiClient } from './api.js';

let config = {};
let urlQueryToken = {};

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
    } catch (error) {
        console.error('Could not load config.json:', error);
        config = {};
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
    const topMenu = document.getElementById('topMenu');

    const mainPage = document.getElementById('mainPage');
    const mainPageStatus = document.getElementById('mainPageStatus');

    const topMenuModeWrite = document.getElementById('topMenuModeWrite');
    const topMenuModeRead = document.getElementById('topMenuModeRead');

    const readMessageInputForm = document.getElementById('readMessageInputForm');
    const readMessageInputMessageId = document.getElementById('readMessageInputMessageId');
    const readMessageInputKey = document.getElementById('readMessageInputKey');
    const readMessageOutput = document.getElementById('readMessageOutput');

    const writeMessageInputForm = document.getElementById('writeMessageInputForm');
    const writeMessageInputText = document.getElementById('messageInput');
    const writeMessageInputExpiration = document.getElementById('writeMessageInputExpiration');
    const writeMessageOutputUrlTwoStep = document.getElementById('writeMessageOutputUrlTwoStep');
    const writeMessageOutputTwoStepKey = document.getElementById('writeMessageOutputKeyTwoStep');
    const writeMessageOutputUrlOneClick = document.getElementById('writeMessageOutputUrlOneClick');

    let expirationOptionsLoaded = false;
    let isAuthenticated = false;

    const setAuthenticated = (authenticated) => {
        isAuthenticated = authenticated;
        topMenu.classList.remove(
            'auth-logged-in',
            'auth-logged-out'
        );
        topMenu.classList.add(authenticated ? 'auth-logged-in' : 'auth-logged-out');
    };

    const setGlobalState = (stateClass = '', statusText = '') => {
        mainPage.classList.remove(
            'state-idle',
            'state-input',
            'state-submitting',
            'state-error',
            'state-success'
        );
        if (stateClass) {
            mainPage.classList.add(stateClass);
        }
        mainPageStatus.textContent = statusText;
    };

    const setGlobalMode = (modeClass = '') => {
        mainPage.classList.remove(
            'mode-reading',
            'mode-writing'
        );
        if (modeClass) {
            mainPage.classList.add(modeClass);
        }
    };

    const setInitialMode = () => {
        const urlQuery = decodeURIComponent(window.location.search.slice(1));

        if (urlQuery) {
            readMessageInputMessageId.value = urlQuery;

            const urlQueryToken = JSON.parse(fromSaltedBase64(urlQuery));
            if (urlQueryToken?.key) {
                readMessageInputKey.value = '';
                readMessageInputKey.disabled = true;
                readMessageInputKey.placeholder = 'one click token';
            }

            setGlobalMode('mode-reading');
        } else {
            setGlobalMode('mode-writing');
        }
    };

    const switchMode = (modeClass) => {
        if (!isAuthenticated) {
            return;
        }

        readMessageInputForm.reset();
        readMessageInputKey.value = '';
        readMessageInputKey.disabled = false;
        readMessageInputKey.placeholder = 'Enter base64 key...';

        writeMessageInputForm.reset();

        setGlobalMode(modeClass);
        setGlobalState('state-input');
    };

    topMenuModeWrite.addEventListener('click', () => void switchMode('mode-writing'));
    topMenuModeRead.addEventListener('click', () => void switchMode('mode-reading'));

    const ensureExpirationOptionsLoaded = async () => {
        if (expirationOptionsLoaded) {
            return;
        }

        const client = await getApiClient(config.api_hostname);
        const expirationOptions = await client.getExpirationOptions();
        renderExpirationOptions(writeMessageInputExpiration, expirationOptions);
        expirationOptionsLoaded = true;
    };

    await loadConfig();

    setupAuth(config.auth_google_client_id, async ({ isLoggedIn }) => {
        setGlobalState('state-idle');
        setAuthenticated(isLoggedIn);
        if (isLoggedIn) {
            try {
                await ensureExpirationOptionsLoaded();
                setInitialMode();
                setGlobalState('state-input');
            } catch (error) {
                setGlobalState('state-error', `Could not load expiration options: ${error}`);
            }
        }
    });

    readMessageInputForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        setGlobalState('state-submitting', 'Loading...');

        try {
            const client = await getApiClient(config.api_hostname);
            const value = await client.readMessage(expiration, readMessageInputMessageId.value);
            readMessageOutput.textContent = value;
            setGlobalState('state-success');
        } catch (error) {
            setGlobalState('state-error', error.message)
        }
    });

    writeMessageInputForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        setGlobalState('state-submitting', 'Submitting...');

        try {
            const client = await getApiClient(config.api_hostname);
            const id = await client.writeMessage(writeMessageInputExpiration.value, writeMessageInputText.value);
            const key = crypto.randomUUID();

            createLink(writeMessageOutputUrlTwoStep, {
                expiration: writeMessageInputExpiration.value, id
            });

            writeMessageOutputTwoStepKey.textContent = toSaltedBase64(key)

            createLink(writeMessageOutputUrlOneClick, {
                expiration: writeMessageInputExpiration.value, id, key
            });

            writeMessageInputText.value = '';
            setGlobalState('state-success');

        } catch (error) {
            setGlobalState(
                'state-error',
                error.message.startsWith('Error (')
                    ? error.message
                    : `Network error occurred: ${error.message}`
            );
        }
    });
}

window.addEventListener('DOMContentLoaded', initPage);