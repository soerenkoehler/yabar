import { authClient } from './auth.js';
import { apiClient } from './api.js';
import { fromSaltedBase64, toSaltedBase64 } from './base64.js'

let config = {};

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

    const globalState = document.getElementById('globalState');
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

    const updateSubmitButtons = () => {
        for (const form of [readMessageInputForm, writeMessageInputForm]) {
            const inputs = form.querySelectorAll('input[type="text"], input[type="password"]');
            form.querySelector('button[type="submit"]').disabled = [...inputs].some(i => !i.disabled && i.value.trim() === '');
        }
    };

    let backendConfigLoaded = false;
    let isAuthenticated = false;

    const setAuthenticated = (authenticated) => {
        isAuthenticated = authenticated;
        globalState.classList.remove(
            'auth-logged-in',
            'auth-logged-out'
        );
        globalState.classList.add(authenticated ? 'auth-logged-in' : 'auth-logged-out');
    };

    const setGlobalState = (stateClass = '', statusText = '') => {
        globalState.classList.remove(
            'state-idle',
            'state-input',
            'state-submitting',
            'state-error',
            'state-success'
        );
        if (stateClass) {
            globalState.classList.add(stateClass);
        }
        mainPageStatus.textContent = statusText;
    };

    const setGlobalMode = (modeClass = '') => {
        globalState.classList.remove(
            'mode-reading',
            'mode-writing'
        );
        if (modeClass) {
            globalState.classList.add(modeClass);
        }

        topMenuModeWrite.setAttribute('aria-selected', String(modeClass === 'mode-writing'));
        topMenuModeRead.setAttribute('aria-selected', String(modeClass === 'mode-reading'));

        readMessageInputMessageId.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const setModeRestrictions = (roles) => {
        const hasWriteRole = roles.includes('write');
        topMenuModeWrite.disabled = !hasWriteRole;

        if (!hasWriteRole) {
            setGlobalMode('mode-reading');
        }
    };

    const setInitialMode = () => {
        const urlQuery = decodeURIComponent(window.location.search.slice(1));

        if (urlQuery) {
            readMessageInputMessageId.value = urlQuery;
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
        writeMessageInputForm.reset();

        setGlobalMode(modeClass);
        setGlobalState('state-input');
        updateSubmitButtons();
    };

    topMenuModeWrite.addEventListener('click', () => void switchMode('mode-writing'));
    topMenuModeRead.addEventListener('click', () => void switchMode('mode-reading'));

    const ensureBackendConfigLoaded = async () => {
        if (backendConfigLoaded) {
            return;
        }

        const client = await apiClient(config.api_hostname);
        const backendConfig = await client.config();
        config = { ...config, ...backendConfig };
        renderExpirationOptions(writeMessageInputExpiration, config.expiration_options ?? []);
        backendConfigLoaded = true;
    };

    await loadConfig();

    try {
        await ensureBackendConfigLoaded();
    } catch (error) {
        setGlobalState('state-error', `Could not load config: ${error}`);
        return;
    }

    authClient(config.auth_google_client_id, async ({ isLoggedIn }) => {
        setGlobalState('state-idle');
        setAuthenticated(isLoggedIn);
        if (isLoggedIn) {
            try {
                const client = await apiClient(config.api_hostname);
                const { roles = [] } = await client.roles();
                setInitialMode();
                setModeRestrictions(roles);
                setGlobalState('state-input');
                updateSubmitButtons();
            } catch (error) {
                setGlobalState('state-error', `Could not initialize page: ${error}`);
            }
        }
    });

    readMessageInputMessageId.addEventListener('input', async () => {
        const inputValue = readMessageInputMessageId.value.trim();

        try {
            const inputUrl = new URL(inputValue);
            if (inputUrl.search.length > 1) {
                readMessageInputMessageId.value = inputUrl.search.slice(1);
            }
        } catch {
            // Not a URL, keep the user-provided token as-is.
        }

        try {
            const urlQueryToken = JSON.parse(fromSaltedBase64(readMessageInputMessageId.value));
            if (urlQueryToken?.key) {
                readMessageInputKey.value = '';
                readMessageInputKey.disabled = true;
                readMessageInputKey.placeholder = 'one click token';
                updateSubmitButtons();
                return;
            }
        }
        catch {
            // Not yet valid JSON, keep the user-provided token as-is.
        }

        readMessageInputKey.disabled = false;
        readMessageInputKey.placeholder = 'Enter base64 key...';
        updateSubmitButtons();
    });

    readMessageInputKey.addEventListener('input', updateSubmitButtons);
    writeMessageInputText.addEventListener('input', updateSubmitButtons);

    readMessageInputForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        setGlobalState('state-submitting', 'Loading...');

        try {
            const client = await apiClient(config.api_hostname);
            const urlQueryToken = JSON.parse(fromSaltedBase64(readMessageInputMessageId.value));
            const value = await client.read(urlQueryToken?.expiration, urlQueryToken?.id);
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
            const client = await apiClient(config.api_hostname);
            const id = await client.write(writeMessageInputExpiration.value, writeMessageInputText.value);
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