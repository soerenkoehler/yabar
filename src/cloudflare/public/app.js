import { apiClient } from './api.js';
import { decryptText, encryptText, generateAESKey } from './aes.js';
import { saltedBase64ToString, stringToSaltedBase64 } from './base64.js';

const expirationOptions = [
    { value: 'PT5M', label: '5min', allowOneClick: true },
    { value: 'PT15M', label: '15min', allowOneClick: false },
    { value: 'PT1H', label: '1 Hour', allowOneClick: false },
    { value: 'P1D', label: '1 Day', allowOneClick: false },
    { value: 'P1W', label: '1 Week', allowOneClick: false }
];

const encodeMessage = (data) => encodeURIComponent(stringToSaltedBase64(JSON.stringify(data)));
const createMessageLink = (data) => `${window.location.origin}?${data}`;

const copyTextToClipboard = async (text) => {
    if (!text) {
        return;
    }

    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
};

const enableClickToCopy = (element) => {
    element.addEventListener('click', () => void copyTextToClipboard(element.textContent.trim()));
};

const renderExpirationOptions = (selectElement) => {
    selectElement.innerHTML = '';

    for (const option of expirationOptions) {
        const optionElement = document.createElement('option');
        optionElement.value = String(option.value);
        optionElement.textContent = `${String(option.label)}${option.allowOneClick ? ' (one click enabled)' : ''}`;
        selectElement.appendChild(optionElement);
    }
};

const initPage = () => {
    const client = apiClient();
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
    const writeMessageOutputMessageId = document.getElementById('writeMessageOutputMessageId');
    const writeMessageOutputUrlTwoStep = document.getElementById('writeMessageOutputUrlTwoStep');
    const writeMessageOutputTwoStepKey = document.getElementById('writeMessageOutputKeyTwoStep');
    const writeMessageOutputRowOneClick = document.getElementById('writeMessageOutputRowOneClick');
    const writeMessageOutputUrlOneClick = document.getElementById('writeMessageOutputUrlOneClick');

    for (const outputElement of [
        writeMessageOutputMessageId,
        writeMessageOutputTwoStepKey,
        writeMessageOutputUrlTwoStep,
        writeMessageOutputUrlOneClick,
        readMessageOutput
    ]) {
        enableClickToCopy(outputElement);
    }

    const updateSubmitButtons = () => {
        for (const form of [readMessageInputForm, writeMessageInputForm]) {
            const inputs = form.querySelectorAll('input[type="text"], input[type="password"]');
            form.querySelector('button[type="submit"]').disabled = [...inputs].some((input) => !input.disabled && input.value.trim() === '');
        }
    };

    const setGlobalState = (stateClass = '', statusText = '') => {
        globalState.classList.remove(
            'state-idle',
            'state-loading',
            'state-input',
            'state-submitting',
            'state-error',
            'state-fatal',
            'state-success'
        );
        if (stateClass) {
            globalState.classList.add(stateClass);
        }
        mainPageStatus.textContent = statusText;
        updateSubmitButtons();
    };

    const setGlobalMode = (modeClass = '') => {
        globalState.classList.remove('mode-reading', 'mode-writing');
        if (modeClass) {
            globalState.classList.add(modeClass);
        }

        topMenuModeWrite.setAttribute('aria-selected', String(modeClass === 'mode-writing'));
        topMenuModeRead.setAttribute('aria-selected', String(modeClass === 'mode-reading'));
        readMessageInputMessageId.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const switchMode = (modeClass) => {
        readMessageInputForm.reset();
        writeMessageInputForm.reset();
        setGlobalMode(modeClass);
        setGlobalState('state-input');
    };

    const normalizeMessageIdInput = () => {
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
            const urlQueryToken = JSON.parse(saltedBase64ToString(readMessageInputMessageId.value));
            if (urlQueryToken?.key) {
                readMessageInputKey.value = '';
                readMessageInputKey.disabled = true;
                readMessageInputKey.placeholder = 'one click token';
                updateSubmitButtons();
                return;
            }
        } catch {
            // Not yet valid JSON, keep the user-provided token as-is.
        }

        readMessageInputKey.disabled = false;
        readMessageInputKey.placeholder = 'Enter base64 key...';
        updateSubmitButtons();
    };

    const setInitialMode = () => {
        const urlQuery = decodeURIComponent(window.location.search.slice(1));

        if (urlQuery) {
            switchMode('mode-reading');
            readMessageInputMessageId.value = urlQuery;
            normalizeMessageIdInput();
        } else {
            switchMode('mode-writing');
        }
    };

    const submitReadForm = async (event) => {
        event.preventDefault();
        setGlobalState('state-submitting', 'Loading...');

        try {
            const urlQueryToken = JSON.parse(saltedBase64ToString(readMessageInputMessageId.value));
            const value = await client.read(urlQueryToken?.expiration, urlQueryToken?.id);
            const key = urlQueryToken?.key ?? readMessageInputKey.value;
            readMessageOutput.textContent = await decryptText(value, key);
            readMessageInputMessageId.value = '';
            readMessageInputKey.value = '';
            setGlobalState('state-success');
        } catch (error) {
            setGlobalState('state-error', error.message);
        }
    };

    const submitWriteForm = async (event) => {
        event.preventDefault();
        setGlobalState('state-submitting', 'Submitting...');

        try {
            const expiration = writeMessageInputExpiration.value;
            const expirationOption = expirationOptions.find((option) => String(option.value) === expiration);
            const allowOneClick = expirationOption?.allowOneClick;

            const key = await generateAESKey();
            const encryptedValue = await encryptText(writeMessageInputText.value, key);
            const id = await client.write(expiration, encryptedValue);

            const messageData = encodeMessage({ expiration, id });
            writeMessageOutputMessageId.textContent = messageData;
            writeMessageOutputTwoStepKey.textContent = key;
            writeMessageOutputUrlTwoStep.textContent = createMessageLink(messageData);

            if (allowOneClick) {
                writeMessageOutputRowOneClick.classList.remove('writeMessageOutputRowHidden');
                writeMessageOutputUrlOneClick.textContent = createMessageLink(encodeMessage({
                    expiration,
                    id,
                    key
                }));
            } else {
                writeMessageOutputRowOneClick.classList.add('writeMessageOutputRowHidden');
                writeMessageOutputUrlOneClick.textContent = '';
            }

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
    };

    topMenuModeWrite.addEventListener('click', () => void switchMode('mode-writing'));
    topMenuModeRead.addEventListener('click', () => void switchMode('mode-reading'));
    writeMessageInputText.addEventListener('input', updateSubmitButtons);
    readMessageInputKey.addEventListener('input', updateSubmitButtons);
    readMessageInputMessageId.addEventListener('input', normalizeMessageIdInput);
    readMessageInputForm.addEventListener('submit', submitReadForm);
    writeMessageInputForm.addEventListener('submit', submitWriteForm);

    renderExpirationOptions(writeMessageInputExpiration);
    setGlobalState('state-input');
    setInitialMode();
};

const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    try {
        await navigator.serviceWorker.register('/service-worker.js');
    } catch (error) {
        console.error('Service worker registration failed:', error);
    }
};

window.addEventListener('DOMContentLoaded', initPage);
window.addEventListener('DOMContentLoaded', registerServiceWorker);