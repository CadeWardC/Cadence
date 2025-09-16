document.addEventListener('DOMContentLoaded', async () => {
    // --- Element Selectors ---
    const storageSelect = document.getElementById('storage-select');
    const dropboxSettings = document.getElementById('dropbox-settings');
    const connectionStatusDiv = document.getElementById('dropbox-connection-status');
    const saveToDropboxBtn = document.getElementById('save-to-dropbox-btn');
    const loadFromDropboxBtn = document.getElementById('load-from-dropbox-btn');
    const exportDataBtn = document.getElementById('export-data-btn');
    const importDataBtn = document.getElementById('import-data-btn'); // Added selector for the button
    const importDataInput = document.getElementById('import-file-input'); // Corrected ID from HTML
    const clearDataBtn = document.getElementById('clear-data-btn');
    const modal = document.getElementById('confirmation-modal');
    const confirmClearBtn = document.getElementById('confirm-delete-btn'); // Corrected ID from HTML
    const cancelClearBtn = document.getElementById('cancel-delete-btn'); // Corrected ID from HTML
    const initialView = document.getElementById('confirm-initial-view');
    const successView = document.getElementById('confirm-success-view');
    const autosaveIntervalSelect = document.getElementById('autosave-interval-select');
    const autosaveStatus = document.getElementById('autosave-status');
    const accentColorPicker = document.getElementById('accent-color-picker');
    const resetColorBtn = document.getElementById('reset-color-btn');
    // FIX: Added missing selectors for Dropbox authentication elements. This prevents the script from crashing.
    const authStepsDiv = document.getElementById('dropbox-auth-steps');
    const step1Div = document.getElementById('dropbox-step-1');
    const step2Div = document.getElementById('dropbox-step-2');
    const getCodeBtn = document.getElementById('get-dropbox-code-btn');
    const codeInput = document.getElementById('dropbox-code-input');
    const submitCodeBtn = document.getElementById('submit-dropbox-code-btn');


    // --- Dropbox OAuth 2 PKCE Constants & Functions ---
    const DROPBOX_CLIENT_ID = 'q3ra3185xx6ftrd';

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
            showAlert('Connection Error', 'Not connected to Dropbox.');
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
                    showAlert('Session Expired', 'Your Dropbox session has expired. Please reconnect.');
                }
                return; // Exit this attempt
            }

            if (response.status === 409) {
                showAlert('File Not Found', 'No backup file found in Dropbox.');
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
            showAlert('Load Error', 'An error occurred while loading from Dropbox. Check the console for details.');
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

    // --- Accent Color Logic ---
    const DEFAULT_ACCENT_COLOR = '#5B7C99';

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

    // --- Refactored Modal Logic ---
    let confirmAction = null;

    function showConfirmationModal(title, message, confirmText, onConfirm) {
        initialView.querySelector('h3').textContent = title;
        initialView.querySelector('p').textContent = message;
        confirmClearBtn.textContent = confirmText;
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
    confirmClearBtn.addEventListener('click', () => {
        if (typeof confirmAction === 'function') {
            confirmAction();
            confirmAction = null; // Clear action after execution
        }
    });

    cancelClearBtn.addEventListener('click', () => {
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
            showAlert('Input Required', 'Please paste the authorization code from Dropbox.');
            return;
        }
        if (!codeVerifier) {
            showAlert('Session Error', 'An error occurred. Please try generating a new code.');
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
            showAlert('Authentication Error', error.message);
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
        }
        // FIX: Explicitly update the Dropbox UI state when the selection changes.
        updateDropboxUI();
        // When storage method changes, check if we need to start/stop autosave
        setupAutosaveAndStatus();
    });

    autosaveIntervalSelect.addEventListener('change', () => {
        localStorage.setItem('autosaveInterval', autosaveIntervalSelect.value);
        setupAutosaveAndStatus();
    });

    // --- Initialization ---
    function initializeSettingsPage() {
        // REMOVED: The complex and faulty section-reordering logic has been removed.
        // The layout should be defined directly in the HTML file for reliability.

        // Set initial values from localStorage
        const savedMethod = localStorage.getItem('storageMethod') || 'local';
        storageSelect.value = savedMethod;
        const savedInterval = localStorage.getItem('autosaveInterval') || '300000';
        autosaveIntervalSelect.value = savedInterval;
        const savedColor = localStorage.getItem('accentColor') || DEFAULT_ACCENT_COLOR;
        accentColorPicker.value = savedColor;
        applyAccentColor(savedColor);

        // Set initial UI visibility
        dropboxSettings.classList.toggle('hidden', savedMethod !== 'dropbox');
        updateDropboxUI();
        updateAutosaveStatus();
    }

    // Run the initialization function
    initializeSettingsPage();


    // --- Import/Export/Clear Data Logic (Updated to use new modal) ---

    // FIX: Added listener to make the button trigger the hidden file input.
    if (importDataBtn) {
        importDataBtn.addEventListener('click', () => {
            importDataInput.click();
        });
    }

    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', () => {
            // FIX: Implemented the full export logic.
            const dataToExport = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                dataToExport[key] = localStorage.getItem(key);
            }
            const dataStr = JSON.stringify(dataToExport, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cadence_backup.td';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showAlert('Export Successful', 'Your data has been exported to cadence_backup.td.');
        });
    }

    // FIX: Implemented the full import logic.
    if (importDataInput) {
        importDataInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    // Use the confirmation modal before proceeding
                    showConfirmationModal(
                        'Confirm Import',
                        'This will overwrite all current data with the contents of the backup file. This cannot be undone.',
                        'Yes, Overwrite and Import',
                        () => {
                            // This code runs only if the user confirms
                            localStorage.clear();
                            for (const key in importedData) {
                                if (Object.hasOwnProperty.call(importedData, key)) {
                                    localStorage.setItem(key, importedData[key]);
                                }
                            }
                            showSuccessAndRedirect('Data successfully imported. Redirecting...');
                        }
                    );
                } catch (error) {
                    showAlert('Import Error', 'The selected file is not a valid backup file.');
                } finally {
                    // Reset the input so the user can select the same file again
                    event.target.value = '';
                }
            };
            reader.readAsText(file);
        });
    }

    // FIX: Reverted to use the original, dedicated modal for clearing data.
    clearDataBtn.addEventListener('click', () => {
        initialView.querySelector('h3').textContent = 'Confirm Clear Data';
        initialView.querySelector('p').textContent = 'This will permanently delete all tasks, settings, and connection tokens. This cannot be undone.';
        confirmClearBtn.textContent = 'Yes, Delete Everything';
        
        initialView.classList.remove('hidden');
        successView.classList.add('hidden');
        modal.classList.remove('hidden');
    });

    // This listener now correctly corresponds to the clearDataBtn action.
    confirmClearBtn.addEventListener('click', () => {
        // Check if the modal is for clearing data by checking the button text
        if (confirmClearBtn.textContent === 'Yes, Delete Everything') {
            localStorage.clear();
            showSuccessAndRedirect('All data has been cleared. Redirecting...');
        } else if (typeof confirmAction === 'function') {
            // This handles the other modal uses (like Dropbox load)
            confirmAction();
            confirmAction = null; // Clear action after execution
        }
    });


    // --- Calendar Logic ---
    const calendarEl = document.getElementById('calendar');
    const monthYearLabel = document.getElementById('month-year-label');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const todayBtn = document.getElementById('today-btn');

    let currentDate = new Date();
    let selectedDate = new Date();

    function renderCalendar(date) {
        const year = date.getFullYear();
        const month = date.getMonth();

        // Update the month/year label
        monthYearLabel.textContent = date.toLocaleString('default', { month: 'long', year: 'numeric' });

        // Clear the calendar body
        const calendarBody = document.getElementById('calendar-body');
        calendarBody.innerHTML = '';

        // Get the first day of the month and the number of days in the month
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // Get the day of the week for the first day of the month (0 = Sunday, 6 = Saturday)
        const startDay = firstDayOfMonth.getDay();

        // Add empty cells for days of the week before the first day of the month
        for (let i = 0; i < startDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('calendar-day', 'empty');
            calendarBody.appendChild(emptyCell);
        }

        // Add the actual days of the month
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('calendar-day', 'current-month');

            // Mark the selected day
            if (year === selectedDate.getFullYear() && month === selectedDate.getMonth() && i === selectedDate.getDate()) {
                dayCell.classList.add('selected');
            }

            const tasksOnDay = getTasksForDay(new Date(year, month, i));

            // Add task indicators first
            if (tasksOnDay.length > 0) {
                const indicatorsContainer = document.createElement('div');
                indicatorsContainer.className = 'day-indicators';

                const hasUniqueTask = tasksOnDay.some(task => !task.isDeadline);
                const hasDeadlineTask = tasksOnDay.some(task => task.isDeadline);

                if (hasUniqueTask) {
                    const uniqueIndicator = document.createElement('div');
                    uniqueIndicator.className = 'day-indicator unique';
                    indicatorsContainer.appendChild(uniqueIndicator);
                }

                if (hasDeadlineTask) {
                    const deadlineIndicator = document.createElement('div');
                    deadlineIndicator.className = 'day-indicator deadline';
                    indicatorsContainer.appendChild(deadlineIndicator);
                }
                
                dayCell.appendChild(indicatorsContainer);
            }

            // Then add the task text previews
            if (tasksOnDay.length > 0) {
                const tasksContainer = document.createElement('div');
                tasksContainer.className = 'tasks-container';
                tasksOnDay.slice(0, 2).forEach(task => {
                    const taskEl = document.createElement('div');
                    taskEl.className = 'task-preview';
                    taskEl.textContent = task.title;
                    tasksContainer.appendChild(taskEl);
                });
                dayCell.appendChild(tasksContainer);
            }

            calendarBody.appendChild(dayCell);
        }

        const remainingCells = 42 - calendarBody.children.length;
        for (let i = 0; i < remainingCells; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('calendar-day', 'empty');
            calendarBody.appendChild(emptyCell);
        };
    }

    function getTasksForDay(date) {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        return tasks.filter(task => {
            const taskDate = new Date(task.date);
            return taskDate.getFullYear() === date.getFullYear() &&
                   taskDate.getMonth() === date.getMonth() &&
                   taskDate.getDate() === date.getDate();
        });
    }

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(currentDate);
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(currentDate);
    });

    todayBtn.addEventListener('click', () => {
        currentDate = new Date();
        renderCalendar(currentDate);
    });

    // Initial render
    renderCalendar(currentDate);
});