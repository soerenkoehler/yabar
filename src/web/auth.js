export let currentIdToken = null;

let currentUserHint = null;
let authStateChangedListener = null;

function notifyAuthStateChanged() {
    if (!authStateChangedListener) {
        return;
    }

    authStateChangedListener({
        isLoggedIn: Boolean(currentIdToken),
        userHint: currentUserHint,
        idToken: currentIdToken
    });
}

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

function setAuthButtonVisibility(isLoggedIn) {
    const loginButton = document.querySelector('.g_id_signin');
    const logoutButton = document.getElementById('logoutButton');

    if (loginButton) {
        loginButton.style.display = isLoggedIn ? 'none' : '';
    }

    if (logoutButton) {
        logoutButton.style.display = isLoggedIn ? 'inline-block' : 'none';
    }
}

function setLoggedIn(username, userHint) {
    const authStatus = document.getElementById('authStatus');
    authStatus.textContent = `logged in as ${username}`;
    setAuthButtonVisibility(true);
    currentUserHint = userHint || null;
    notifyAuthStateChanged();
}

function setLoggedOut() {
    const authStatus = document.getElementById('authStatus');
    authStatus.textContent = 'Not logged in';
    setAuthButtonVisibility(false);
    currentUserHint = null;
    currentIdToken = null;
    notifyAuthStateChanged();
}

// must be global for data-callback="handleCredentialResponse"
window.handleGoogleGsiResponse = async function handleCredentialResponse(response) {
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

export function setupAuth(listener) {
    const logoutButton = document.getElementById('logoutButton');
    if (!logoutButton || logoutButton.dataset.boundLogoutHandler === 'true') {
        return;
    }

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
