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
        let touchClone = null;
        let lastDropzone = null;
        let dropzoneRects = [];
        let longPressTimer = null;
        let isDragging = false;

        const longPressDuration = 200; // ms

        task.addEventListener('touchstart', e => {
            draggedItem = e.currentTarget;
            
            // Start a timer for long press
            longPressTimer = setTimeout(() => {
                isDragging = true;
                
                // Get fresh positions of all dropzones
                dropzoneRects = Array.from(dropzones).map(zone => ({
                    element: zone,
                    rect: zone.getBoundingClientRect()
                }));

                // Create and position the visual clone
                touchClone = draggedItem.cloneNode(true);
                touchClone.style.position = 'fixed'; // Use fixed for viewport positioning
                touchClone.style.opacity = '0.8';
                touchClone.style.pointerEvents = 'none';
                touchClone.style.zIndex = '1000';
                document.body.appendChild(touchClone);

                const touch = e.touches[0];
                touchClone.style.left = touch.clientX - touchClone.offsetWidth / 2 + 'px';
                touchClone.style.top = touch.clientY - touchClone.offsetHeight / 2 + 'px';

                draggedItem.classList.add('dragging');
            }, longPressDuration);
        });

        task.addEventListener('touchmove', e => {
            if (!isDragging || !touchClone) return;
            e.preventDefault(); // Prevent scrolling WHILE dragging

            const touch = e.touches[0];
            touchClone.style.left = touch.clientX - touchClone.offsetWidth / 2 + 'px';
            touchClone.style.top = touch.clientY - touchClone.offsetHeight / 2 + 'px';
            
            let currentDropzone = null;
            // Find dropzone by coordinates instead of elementFromPoint
            for (const item of dropzoneRects) {
                const rect = item.rect;
                if (touch.clientX > rect.left && touch.clientX < rect.right &&
                    touch.clientY > rect.top && touch.clientY < rect.bottom) {
                    currentDropzone = item.element;
                    break;
                }
            }

            if (lastDropzone && lastDropzone !== currentDropzone) {
                lastDropzone.classList.remove('dragover');
            }
            if (currentDropzone) {
                currentDropzone.classList.add('dragover');
            }
            lastDropzone = currentDropzone;
        });

        const endTouch = () => {
            clearTimeout(longPressTimer); // Cancel long press if finger lifts early
            if (!isDragging) return;

            if (lastDropzone) {
                lastDropzone.classList.remove('dragover');
                handleDrop(lastDropzone, draggedItem);
            }
            
            if (draggedItem) draggedItem.classList.remove('dragging');
            if (touchClone) document.body.removeChild(touchClone);
            
            // Reset all state variables
            touchClone = null;
            draggedItem = null;
            lastDropzone = null;
            isDragging = false;
        };

        task.addEventListener('touchend', endTouch);
        task.addEventListener('touchcancel', endTouch);
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