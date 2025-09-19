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
        let lastScrollY = null; // To track scrolling with a second finger

        task.addEventListener('touchstart', e => {
            // Only start a drag for a single finger touch
            if (e.touches.length === 1) {
                draggedItem = e.currentTarget;
                const rect = draggedItem.getBoundingClientRect();
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                isDragging = false; // Reset flag on new touch
                lastScrollY = null; // Reset scroll tracking
            }
        }, { passive: true });

        task.addEventListener('touchmove', e => {
            if (!draggedItem) return;

            // Once a drag is initiated, we must prevent default to control the behavior.
            e.preventDefault();

            // Handle two-finger scroll while dragging
            if (e.touches.length > 1) {
                // Use the second touch point to control scrolling
                const scrollTouch = e.touches[1];
                if (lastScrollY !== null) {
                    const deltaY = scrollTouch.clientY - lastScrollY;
                    window.scrollBy(0, -deltaY); // Scroll the page
                }
                lastScrollY = scrollTouch.clientY;
                // Keep the first finger for dragging logic
            } else {
                // Reset scroll tracking when back to one finger
                lastScrollY = null;
            }

            // Start dragging only if moved beyond a small threshold (with one finger)
            if (!isDragging && e.touches.length === 1) {
                const moveX = Math.abs(e.touches[0].clientX - startX);
                const moveY = Math.abs(e.touches[0].clientY - startY);
                if (moveX > 5 || moveY > 5) {
                    isDragging = true;
                } else {
                    return; // Not a drag yet
                }
            }

            if (!isDragging) return;
            
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

            // Dragging logic always follows the first finger
            const dragTouch = e.touches[0];
            clone.style.left = `${dragTouch.clientX - (clone.offsetWidth / 2)}px`;
            clone.style.top = `${dragTouch.clientY - (clone.offsetHeight / 2)}px`;
            
            // Highlight dropzone based on the first finger's position
            const elementUnder = document.elementFromPoint(dragTouch.clientX, dragTouch.clientY);
            const dropzone = elementUnder ? elementUnder.closest('.dropzone') : null;
            
            document.querySelectorAll('.dropzone').forEach(dz => {
                dz.classList.toggle('dragover', dz === dropzone);
            });

        }, { passive: false }); // This listener must be active to call preventDefault

        task.addEventListener('touchend', e => {
            // Reset scroll tracking on touchend
            lastScrollY = null;

            if (!isDragging || !clone || !draggedItem) {
                // If it wasn't a drag, just reset
                draggedItem = null;
                return;
            }

            // The drop position is determined by the finger that was lifted.
            // We use the last known position of the dragging finger.
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

    // --- NEW: Mobile Collapsible Day Sections & Drag-Over Fix ---
    document.querySelectorAll('.day-column').forEach(column => {
        // 1. Make the section collapsible on mobile
        column.addEventListener('click', (e) => {
            // We only want to toggle if the header area is clicked, not a task inside.
            if (e.target.classList.contains('day-title') || e.target === column) {
                if (window.innerWidth <= 768) {
                    column.classList.toggle('is-open');
                }
            }
        });

        // 2. Fix drag-over to expand the section
        const dropzone = column.querySelector('.dropzone');
        if (dropzone) {
            // When a drag enters the dropzone, add 'drag-over' to the parent column
            dropzone.addEventListener('dragover', () => {
                if (!column.classList.contains('drag-over')) {
                    column.classList.add('drag-over');
                }
            });
            // When a drag leaves the dropzone, remove 'drag-over' from the parent
            dropzone.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });
            // When a drop occurs, also remove the 'drag-over' style
            dropzone.addEventListener('drop', () => {
                column.classList.remove('drag-over');
                // If on mobile, leave the section open after a drop
                if (window.innerWidth <= 768 && !column.classList.contains('is-open')) {
                    column.classList.add('is-open');
                }
            });
        }
    });

    loadState();
});