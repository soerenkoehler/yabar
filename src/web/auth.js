export let currentIdToken = null;

let currentUserHint = null;
let authStateChangedListener = null;

const loginDataBinder = document.getElementById('g_id_onload');
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const authStatus = document.getElementById('authStatus');
// FIXME const loginButton = document.querySelector('.g_id_signin');

const notifyAuthStateChanged = () => {
    if (!authStateChangedListener) {
        return;
    }

    authStateChangedListener({
        isLoggedIn: Boolean(currentIdToken),
        userHint: currentUserHint,
        idToken: currentIdToken
    });
};

const parseJwt = (token) => JSON.parse(
    new TextDecoder().decode(
        Uint8Array.fromBase64(token.split('.')[1], { alphabet: 'base64url' })
    )
);

const setAuthButtonVisibility = (isLoggedIn) => {
    if (loginButton) {
        loginButton.style.display = isLoggedIn ? 'none' : '';
    }

    if (logoutButton) {
        logoutButton.style.display = isLoggedIn ? 'inline-block' : 'none';
    }
};

const setLoggedIn = (username, userHint) => {
    authStatus.textContent = `logged in as ${username}`;
    setAuthButtonVisibility(true);
    currentUserHint = userHint || null;
    notifyAuthStateChanged();
};

const setLoggedOut = () => {
    authStatus.textContent = 'Not logged in';
    setAuthButtonVisibility(false);
    currentUserHint = null;
    currentIdToken = null;
    notifyAuthStateChanged();
};

// must be global for data-callback="handleCredentialResponse"
window.handleGoogleGsiResponse = async (response) => {
    const payload = parseJwt(response.credential);
    if (!payload) {
        setLoggedOut();
        return;
    }

    currentIdToken = response.credential;
    const userName = payload.name || payload.email || payload.sub || 'unknown user';
    const userHint = payload.email || payload.sub;
    setLoggedIn(`${userName} (${userHint})`, userHint);
};

const loadGoogleGsiScript = () => {
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
};

export const setupAuth = (client_id, listener) => {
    // FIXME check if the test is necessary in this form
    if (!logoutButton || logoutButton.dataset.boundLogoutHandler === 'true') {
        return;
    }

    loginDataBinder.setAttribute('data-client_id', `${client_id || ''}`);

    loadGoogleGsiScript();

    logoutButton.addEventListener('click', () => {
        if (currentUserHint && window.google?.accounts?.id?.revoke) {
            google.accounts.id.revoke(currentUserHint, () => setLoggedOut());
        } else {
            setLoggedOut();
        }

        if (window.google?.accounts?.id?.disableAutoSelect) {
            google.accounts.id.disableAutoSelect();
        }
    });

    logoutButton.dataset.boundLogoutHandler = 'true';

    authStateChangedListener = listener;
    notifyAuthStateChanged();
}
