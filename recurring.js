document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const addRecurringTaskBtn = document.getElementById('add-recurring-task-btn');
    const newTaskInput = document.getElementById('new-recurring-task-input');
    const myTasksList = document.getElementById('my-tasks-list');
    const dropzones = document.querySelectorAll('.dropzone');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const container = document.querySelector('.container');
    
    let draggedItem = null;

    // --- State Management ---
    function saveState() {
        const scheduleState = {};
        document.querySelectorAll('.weekday-section .task-list').forEach(list => {
            const day = list.id.toLowerCase();
            const tasks = Array.from(list.querySelectorAll('.task span')).map(span => span.textContent);
            scheduleState[day] = tasks;
        });
        localStorage.setItem('recurringTasks', JSON.stringify(scheduleState));

        const myTasks = Array.from(document.querySelectorAll('#my-tasks-list .task span')).map(span => span.textContent);
        localStorage.setItem('myTaskTemplates', JSON.stringify(myTasks));
    }

    function loadState() {
        const scheduleState = JSON.parse(localStorage.getItem('recurringTasks')) || {};
        for (const dayKey in scheduleState) {
            const list = document.getElementById(dayKey);
            if (list && scheduleState[dayKey]) {
                scheduleState[dayKey].forEach(taskText => {
                    const task = createNewTask(taskText, false); // Use false to get delete button
                    list.appendChild(task);
                });
            }
        }

        const myTasks = JSON.parse(localStorage.getItem('myTaskTemplates')) || [];
        myTasks.forEach(taskText => {
            const task = createNewTask(taskText, true); // Use true for templates
            myTasksList.appendChild(task);
        });
    }

    // --- Task Creation ---
    function createNewTask(text, isTemplate = false) {
        const task = document.createElement('div');
        task.className = 'task';
        task.draggable = true;
        
        const label = document.createElement('span');
        label.textContent = text;
        task.appendChild(label);

        // Add both mouse and touch listeners
        addDragListeners(task);
        addTouchListeners(task);

        // Add a delete button only to tasks in the schedule, not templates
        if (!isTemplate) {
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.className = 'delete-btn';
            task.appendChild(deleteBtn);
        }
        return task;
    }

    // --- Event Handlers ---
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const task = e.target.closest('.task');
            if (task) {
                task.classList.add('fade-out');
                task.addEventListener('animationend', () => {
                    task.remove();
                    saveState();
                });
            }
        }
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetPanelId = btn.getAttribute('data-tab');
            tabPanels.forEach(panel => panel.classList.toggle('active', panel.id === targetPanelId));
        });
    });

    addRecurringTaskBtn.addEventListener('click', () => {
        const taskText = newTaskInput.value.trim();
        if (taskText) {
            const newTask = createNewTask(taskText, true);
            myTasksList.appendChild(newTask);
            newTaskInput.value = '';
            saveState();
        }
    });
    
    // --- Drag and Drop Logic ---
    function handleDrop(zone, item) {
        if (!item || !zone) return;

        const isMyTaskTemplate = item.parentElement.id === 'my-tasks-list';
        const isSuggestedTemplate = item.parentElement.id === 'suggested-tasks-list';

        if (zone.id === 'template-trash') {
            if (isMyTaskTemplate) {
                item.remove();
            }
        } else if (isMyTaskTemplate || isSuggestedTemplate) {
            const taskText = item.querySelector('span').textContent;
            const clonedTask = createNewTask(taskText, false);
            zone.appendChild(clonedTask);
        } else {
            zone.appendChild(item);
        }
        saveState();
    }

    // 1. Mouse-based Drag Listeners (for Desktop)
    function addDragListeners(task) {
        task.addEventListener('dragstart', (e) => {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        });
        task.addEventListener('dragend', () => {
            if (draggedItem) draggedItem.classList.remove('dragging');
            draggedItem = null;
        });
    }

    // 2. NEW Touch-based Drag Listeners (for Mobile)
    function addTouchListeners(task) {
        let clone = null;
        let startX, startY;
        let isDragging = false; // Flag to track if dragging has started

        task.addEventListener('touchstart', e => {
            draggedItem = e.currentTarget;
            const rect = draggedItem.getBoundingClientRect();
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isDragging = false; // Reset flag on new touch
        }, { passive: true }); // Keep touchstart passive for better scroll performance initially

        task.addEventListener('touchmove', e => {
            if (!draggedItem) return;

            // If more than one finger is on the screen, the user is likely trying to scroll or zoom.
            // In this case, we cancel the drag and let the browser handle the gesture.
            if (e.touches.length > 1) {
                // If a drag was in progress, clean it up
                if (clone) {
                    document.querySelectorAll('.dropzone').forEach(dz => dz.classList.remove('dragover'));
                    document.body.removeChild(clone);
                    clone = null;
                    draggedItem.style.opacity = '1';
                    draggedItem = null;
                    isDragging = false;
                }
                return; // Allow native browser scrolling/zooming
            }

            // Start dragging only if moved beyond a small threshold
            if (!isDragging) {
                const moveX = Math.abs(e.touches[0].clientX - startX);
                const moveY = Math.abs(e.touches[0].clientY - startY);
                if (moveX > 5 || moveY > 5) { // Threshold to prevent accidental drags
                    isDragging = true;
                } else {
                    return; // Not a drag yet, allow scrolling
                }
            }
            
            // Once a single-finger drag starts, prevent scrolling
            e.preventDefault();

            // Create clone only when dragging starts
            if (!clone) {
                const rect = draggedItem.getBoundingClientRect();
                clone = draggedItem.cloneNode(true);
                clone.style.position = 'fixed'; // Use fixed positioning for stability
                clone.style.left = `${rect.left}px`;
                clone.style.top = `${rect.top}px`;
                clone.style.width = `${rect.width}px`;
                clone.style.height = `${rect.height}px`;
                clone.style.pointerEvents = 'none';
                clone.style.opacity = '0.8';
                clone.classList.add('dragging');
                document.body.appendChild(clone);
                draggedItem.style.opacity = '0.5';
            }

            const touch = e.touches[0];
            clone.style.left = `${touch.clientX - (clone.offsetWidth / 2)}px`;
            clone.style.top = `${touch.clientY - (clone.offsetHeight / 2)}px`;

            // Highlight dropzone
            const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
            const dropzone = elementUnder ? elementUnder.closest('.dropzone') : null;
            
            document.querySelectorAll('.dropzone').forEach(dz => {
                dz.classList.toggle('dragover', dz === dropzone);
            });

        }, { passive: false }); // This listener must be active to call preventDefault

        task.addEventListener('touchend', e => {
            if (!isDragging || !clone || !draggedItem) {
                // If it wasn't a drag, just reset
                draggedItem = null;
                return;
            }

            const touch = e.changedTouches[0];
            const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
            const dropzone = elementUnder ? elementUnder.closest('.dropzone') : null;

            if (dropzone) {
                handleDrop(dropzone, draggedItem);
            }
            
            document.querySelectorAll('.dropzone').forEach(dz => dz.classList.remove('dragover'));
            
            document.body.removeChild(clone);
            clone = null;
            draggedItem.style.opacity = '1';
            draggedItem = null;
            isDragging = false;
        });
    }
    
    // Add listeners to all dropzones
    dropzones.forEach(zone => {
        zone.addEventListener('dragover', e => {
            e.preventDefault();
            zone.classList.add('dragover');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('dragover');
            handleDrop(zone, draggedItem);
        });
    });

    // --- Initial Load ---
    document.querySelectorAll('#suggested-tasks-list .task').forEach(task => {
        const label = document.createElement('span');
        label.textContent = task.textContent.trim();
        task.innerHTML = '';
        task.appendChild(label);
        addDragListeners(task);
        addTouchListeners(task);
    });

    loadState();
});