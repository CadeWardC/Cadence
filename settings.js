document.addEventListener('DOMContentLoaded', async () => {
    // --- Element Selectors ---
    const storageSelect = document.getElementById('storage-select');
    const dropboxSettings = document.getElementById('dropbox-settings');
    const connectionStatusDiv = document.getElementById('dropbox-connection-status');
    const getCodeBtn = document.getElementById('get-dropbox-code-btn');
    const codeInput = document.getElementById('dropbox-code-input');
    const submitCodeBtn = document.getElementById('submit-dropbox-code-btn');
    const step1Div = document.getElementById('dropbox-step-1');
    const step2Div = document.getElementById('dropbox-step-2');
    const authStepsDiv = document.getElementById('dropbox-auth-steps');
    const saveToDropboxBtn = document.getElementById('save-to-dropbox-btn');
    const loadFromDropboxBtn = document.getElementById('load-from-dropbox-btn');
    const clearDataBtn = document.getElementById('clear-data-btn');
    const exportDataBtn = document.getElementById('export-data-btn');
    const importDataBtn = document.getElementById('import-data-btn');
    const importFileInput = document.getElementById('import-file-input');
    const modal = document.getElementById('confirmation-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const initialView = document.getElementById('confirm-initial-view');
    const successView = document.getElementById('confirm-success-view');
    const autosaveIntervalSelect = document.getElementById('autosave-interval-select');
    const autosaveStatus = document.getElementById('autosave-status');
    const accentColorPicker = document.getElementById('accent-color-picker');
    const resetColorBtn = document.getElementById('reset-color-btn');

    const DEFAULT_ACCENT_COLOR = '#5B7C99';

    // --- Accent Color Logic ---
    function applyAccentColor(color) {
        document.documentElement.style.setProperty('--accent-color', color);
    }

    accentColorPicker.addEventListener('input', (e) => {
        applyAccentColor(e.target.value);
    });

    accentColorPicker.addEventListener('change', (e) => {
        localStorage.setItem('accentColor', e.target.value);
    });

    resetColorBtn.addEventListener('click', () => {
        applyAccentColor(DEFAULT_ACCENT_COLOR);
        accentColorPicker.value = DEFAULT_ACCENT_COLOR;
        localStorage.removeItem('accentColor'); // Remove to fall back to default
    });

    // --- Dropbox OAuth 2 PKCE Constants & Functions ---
    const DROPBOX_CLIENT_ID = 'jghzh4x67volsfv';

    function generateCodeVerifier() {
        const random = crypto.getRandomValues(new Uint8Array(32));
        return btoa(String.fromCharCode.apply(null, random)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    async function generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode.apply(null, new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    // --- Dropbox API Functions ---
    // saveToDropbox and refreshDropboxToken are now in autosave.js

    async function loadFromDropbox(isRetry = false) {
        let accessToken = localStorage.getItem('dropboxAccessToken');
        if (!accessToken) {
            alert('Not connected to Dropbox.');
            return;
        }
        loadFromDropboxBtn.textContent = 'Loading...';
        loadFromDropboxBtn.disabled = true;
        try {
            const response = await fetch('https://content.dropboxapi.com/2/files/download', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify({ path: '/backup.td' })
                }
            });

            if (response.status === 401 && !isRetry) {
                const newAccessToken = await refreshDropboxToken(); // This now calls the global function
                if (newAccessToken) {
                    await loadFromDropbox(true); // Correctly retry the operation
                } else {
                    alert('Your Dropbox session has expired. Please reconnect.');
                }
                return; // Exit this attempt
            }

            if (response.status === 409) {
                alert('No backup file found in Dropbox.');
            } else if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Dropbox API error: ${response.statusText} - ${errorText}`);
            } else {
                const fileContent = await response.text();
                const importedData = JSON.parse(fileContent);

                // Use the new modal handler
                showConfirmationModal(
                    'Confirm Dropbox Load',
                    'This will overwrite all current data with the backup from Dropbox. This cannot be undone.',
                    'Yes, Overwrite and Load',
                    () => {
                        const accessToken = localStorage.getItem('dropboxAccessToken');
                        const refreshToken = localStorage.getItem('dropboxRefreshToken');
                        // The storageMethod from the backup file will be used, so we don't need to preserve the current one.

                        localStorage.clear();

                        // Restore the connection tokens
                        if (accessToken) localStorage.setItem('dropboxAccessToken', accessToken);
                        if (refreshToken) localStorage.setItem('dropboxRefreshToken', refreshToken);

                        // Load all data from the backup, including the storageMethod
                        for (const key in importedData) {
                            if (Object.hasOwnProperty.call(importedData, key)) {
                                // The backup file's value for a key is the source of truth.
                                // We handle JSON objects and plain strings (like storageMethod) correctly.
                                const value = importedData[key];
                                localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
                            }
                        }
                        showSuccessAndRedirect('Data successfully loaded from Dropbox. Redirecting...');
                    }
                );
            }
        } catch (error) {
            console.error('Failed to load from Dropbox:', error);
            alert('An error occurred while loading from Dropbox. Check the console for details.');
        } finally {
            loadFromDropboxBtn.textContent = 'Load from Dropbox';
            if (!isRetry) loadFromDropboxBtn.disabled = false;
        }
    }

    // --- Autosave Logic ---
    function updateAutosaveStatus() {
        const intervalMs = parseInt(localStorage.getItem('autosaveInterval') || '0', 10);
        const isEnabled = intervalMs > 0;
        const intervalMinutes = intervalMs / 60000;

        if (isEnabled && localStorage.getItem('storageMethod') === 'dropbox' && localStorage.getItem('dropboxAccessToken')) {
            autosaveStatus.textContent = `Autosave is active (every ${intervalMinutes} minutes).`;
        } else if (isEnabled) {
            autosaveStatus.textContent = 'Autosave is enabled, but will only be active when using Dropbox storage.';
        } else {
            autosaveStatus.textContent = 'Autosave is disabled.';
        }
    }

    // setupAutosave is now global, but we call it from here to update the status text
    function setupAutosaveAndStatus() {
        if (window.setupAutosave) {
            window.setupAutosave();
        }
        updateAutosaveStatus();
    }


    // --- UI Update Function ---
    function updateDropboxUI() {
        const accessToken = localStorage.getItem('dropboxAccessToken');
        if (accessToken) {
            authStepsDiv.classList.add('hidden');
            connectionStatusDiv.innerHTML = `
                <p>✅ Connected to Dropbox.</p>
                <button id="disconnect-dropbox-btn" class="danger-btn">Disconnect</button>
            `;
            saveToDropboxBtn.disabled = false;
            loadFromDropboxBtn.disabled = false;
            document.getElementById('disconnect-dropbox-btn').addEventListener('click', () => {
                localStorage.removeItem('dropboxAccessToken');
                localStorage.removeItem('dropboxRefreshToken');
                updateDropboxUI();
            });
        } else {
            authStepsDiv.classList.remove('hidden');
            step1Div.classList.remove('hidden');
            step2Div.classList.add('hidden');
            connectionStatusDiv.innerHTML = '<p>❌ Not connected to Dropbox.</p>';
            saveToDropboxBtn.disabled = true;
            loadFromDropboxBtn.disabled = true;
            codeInput.value = '';
        }
        // When UI updates, check if we need to start/stop autosave
        setupAutosaveAndStatus();
    }

    // --- Refactored Modal Logic ---
    let confirmAction = null;

    function showConfirmationModal(title, message, confirmText, onConfirm) {
        initialView.querySelector('h3').textContent = title;
        initialView.querySelector('p').textContent = message;
        confirmDeleteBtn.textContent = confirmText;
        confirmAction = onConfirm; // Store the action to be executed
        
        initialView.classList.remove('hidden');
        successView.classList.add('hidden');
        modal.classList.remove('hidden');
    }

    function showSuccessAndRedirect(message) {
        initialView.classList.add('hidden');
        successView.classList.remove('hidden');
        successView.querySelector('p').textContent = message;
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    }

    // Single listener for the confirm button
    confirmDeleteBtn.addEventListener('click', () => {
        if (typeof confirmAction === 'function') {
            confirmAction();
            confirmAction = null; // Clear action after execution
        }
    });

    cancelDeleteBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        confirmAction = null; // Clear action on cancel
    });


    // --- Setup Initial State and Event Listeners ---
    getCodeBtn.addEventListener('click', async () => {
        const verifier = generateCodeVerifier();
        const challenge = await generateCodeChallenge(verifier);
        sessionStorage.setItem('dropboxCodeVerifier', verifier);

        // FIX: Added the 'scope' parameter to request file read/write permissions.
        const authUrl = `https://www.dropbox.com/oauth2/authorize?${new URLSearchParams({
            'client_id': DROPBOX_CLIENT_ID,
            'response_type': 'code',
            'token_access_type': 'offline',
            'code_challenge_method': 'S256',
            'code_challenge': challenge,
            'scope': 'files.content.read files.content.write'
        })}`;
        
        window.open(authUrl, '_blank');
        step1Div.classList.add('hidden');
        step2Div.classList.remove('hidden');
    });

    submitCodeBtn.addEventListener('click', async () => {
        const authCode = codeInput.value.trim();
        const codeVerifier = sessionStorage.getItem('dropboxCodeVerifier');

        if (!authCode) {
            alert('Please paste the authorization code from Dropbox.');
            return;
        }
        if (!codeVerifier) {
            alert('An error occurred. Please try generating a new code.');
            return;
        }

        submitCodeBtn.textContent = 'Verifying...';
        submitCodeBtn.disabled = true;

        try {
            const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    'grant_type': 'authorization_code',
                    'code': authCode,
                    'code_verifier': codeVerifier,
                    'client_id': DROPBOX_CLIENT_ID,
                }),
            });

            if (!response.ok) throw new Error('Invalid or expired code. Please try again.');

            const data = await response.json();
            localStorage.setItem('dropboxAccessToken', data.access_token);
            localStorage.setItem('dropboxRefreshToken', data.refresh_token);
            sessionStorage.removeItem('dropboxCodeVerifier');
            updateDropboxUI();
        } catch (error) {
            console.error('Dropbox token exchange error:', error);
            alert(error.message);
        } finally {
            submitCodeBtn.textContent = 'Submit Code';
            submitCodeBtn.disabled = false;
        }
    });

    saveToDropboxBtn.addEventListener('click', () => saveToDropbox(false));
    loadFromDropboxBtn.addEventListener('click', () => loadFromDropbox(false));

    storageSelect.addEventListener('change', () => {
        const selectedMethod = storageSelect.value;
        localStorage.setItem('storageMethod', selectedMethod);
        dropboxSettings.classList.toggle('hidden', selectedMethod !== 'dropbox');

        // If the user switches away from Dropbox, disconnect.
        if (selectedMethod !== 'dropbox') {
            localStorage.removeItem('dropboxAccessToken');
            localStorage.removeItem('dropboxRefreshToken');
            updateDropboxUI();
        }
        // When storage method changes, check if we need to start/stop autosave
        setupAutosaveAndStatus();
    });

    autosaveIntervalSelect.addEventListener('change', () => {
        localStorage.setItem('autosaveInterval', autosaveIntervalSelect.value);
        setupAutosaveAndStatus();
    });

    // --- Initialization ---
    const savedMethod = localStorage.getItem('storageMethod') || 'local';
    storageSelect.value = savedMethod;
    const savedInterval = localStorage.getItem('autosaveInterval') || '300000'; // 5 minutes default
    autosaveIntervalSelect.value = savedInterval;
    const savedColor = localStorage.getItem('accentColor') || DEFAULT_ACCENT_COLOR;
    accentColorPicker.value = savedColor;
    applyAccentColor(savedColor);

    dropboxSettings.classList.toggle('hidden', savedMethod !== 'dropbox');
    updateDropboxUI();
    updateAutosaveStatus();

    // --- Import/Export/Clear Data Logic (Updated to use new modal) ---
    if (importDataBtn && importFileInput) {
        importDataBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file || !file.name.toLowerCase().endsWith('.td')) {
                alert('Invalid file type. Please select a .td backup file.');
                importFileInput.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    showConfirmationModal(
                        'Confirm Import',
                        'This will overwrite all current data with the contents of the backup file. This cannot be undone.',
                        'Yes, Overwrite and Import',
                        () => {
                            localStorage.clear();
                            for (const key in importedData) {
                                if (Object.hasOwnProperty.call(importedData, key)) {
                                    const value = importedData[key];
                                    localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
                                }
                            }
                            showSuccessAndRedirect('Data successfully imported. Redirecting...');
                        }
                    );
                } catch (error) {
                    alert('Error: The selected file is not a valid backup file.');
                } finally {
                    importFileInput.value = '';
                }
            };
            reader.readAsText(file);
        });
    }

    // --- Data Management Event Listeners ---
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', () => {
            const dataToExport = {};
            // This loop correctly includes 'accentColor' and all other non-sensitive settings
            const sensitiveKeys = ['dropboxAccessToken', 'dropboxRefreshToken', 'pkceCodeVerifier'];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!sensitiveKeys.includes(key)) {
                    dataToExport[key] = localStorage.getItem(key);
                }
            }
            
            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `todo-app-backup-${new Date().toISOString().slice(0, 10)}.td`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    if (clearDataBtn && modal) {
        clearDataBtn.addEventListener('click', () => {
            showConfirmationModal(
                'Are you sure?',
                'This action will permanently delete all your data and cannot be undone.',
                'Yes, Delete Everything',
                () => {
                    localStorage.clear();
                    showSuccessAndRedirect('All data has been cleared. Redirecting...');
                }
            );
        });
    }
});