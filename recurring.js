document.addEventListener('DOMContentLoaded', () => {
    const addRecurringTaskBtn = document.getElementById('add-recurring-task-btn');
    const newTaskInput = document.getElementById('new-recurring-task-input');
    const dropzones = document.querySelectorAll('.dropzone');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const container = document.querySelector('.container');
    const taskLists = document.querySelectorAll('.day-task-list');
    let draggedItem = null;

    // --- State Management ---
    function saveState() {
        // Save the weekly schedule
        const scheduleState = {};
        document.querySelectorAll('.weekday-section .task-list').forEach(list => {
            // FIX: Ensure the key is always lowercase to match what the main page expects.
            const day = list.id.toLowerCase(); 
            const tasks = Array.from(list.querySelectorAll('.task span')).map(span => span.textContent);
            scheduleState[day] = tasks;
        });
        localStorage.setItem('recurringTasks', JSON.stringify(scheduleState));

        // Save "My Tasks" templates
        const myTasks = Array.from(document.querySelectorAll('#my-tasks-list .task span')).map(span => span.textContent);
        localStorage.setItem('myTaskTemplates', JSON.stringify(myTasks));
    }

    function loadState() {
        // Load weekly schedule
        const scheduleState = JSON.parse(localStorage.getItem('recurringTasks')) || {};
        
        // FIX: Correctly find each day's list and populate it with saved tasks.
        for (const dayKey in scheduleState) { // dayKey will be "monday", "tuesday", etc.
            const list = document.getElementById(dayKey); // This correctly looks for id="monday", etc.
            
            if (list && scheduleState[dayKey]) {
                scheduleState[dayKey].forEach(taskText => {
                    const task = createTask(taskText);
                    list.appendChild(task);
                });
            }
        }

        // Load "My Tasks" templates
        const myTasks = JSON.parse(localStorage.getItem('myTaskTemplates')) || [];
        myTasks.forEach(taskText => {
            const task = createTask(taskText);
            myTasksList.appendChild(task);
        });
    }

    function createTask(text) {
        const task = document.createElement('div');
        task.className = 'task';
        task.draggable = true;
        
        const label = document.createElement('span');
        label.textContent = text;
        task.appendChild(label);

        addDragListeners(task);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&times;';
        deleteBtn.className = 'delete-btn';
        task.appendChild(deleteBtn);

        return task;
    }

    function renderTasks() {
        taskLists.forEach(list => {
            const day = list.dataset.day;
            list.innerHTML = ''; // Clear the list first
            const tasksForDay = recurringTasks[day] || [];
            tasksForDay.forEach(taskText => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <label>${taskText}</label>
                    <button class="delete-btn">×</button>
                `;
                list.appendChild(li);
            });
        });
    }

    // --- Event Delegation for Deleting Scheduled Tasks ---
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const task = e.target.closest('.task');
            const parentId = task.parentElement.id;
            if (task && parentId !== 'my-tasks-list' && parentId !== 'suggested-tasks-list') {
                task.classList.add('fade-out');
                task.addEventListener('animationend', () => {
                    task.remove();
                    saveState(); // Save state after deleting
                });
            } else {
                const li = e.target.parentElement;
                const taskText = li.querySelector('label').textContent;
                const list = li.parentElement;
                const day = list.dataset.day;

                if (recurringTasks[day]) {
                    recurringTasks[day] = recurringTasks[day].filter(t => t !== taskText);
                    renderTasks();
                }
            }
        }
    });

    // --- Tab Functionality ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetPanelId = btn.getAttribute('data-tab');
            tabPanels.forEach(panel => panel.classList.toggle('active', panel.id === targetPanelId));
        });
    });

    // Function to create a new task element
    function createNewTask(text, isTemplate = false) {
        const task = document.createElement('div');
        task.className = 'task';
        task.draggable = true;
        
        const label = document.createElement('span');
        label.textContent = text;
        task.appendChild(label);

        addDragListeners(task);

        if (!isTemplate) {
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.className = 'delete-btn';
            task.appendChild(deleteBtn);
        }
        return task;
    }

    // Add new custom task to "My Tasks"
    addRecurringTaskBtn.addEventListener('click', () => {
        const taskText = newTaskInput.value.trim();
        if (taskText) {
            const newTask = createNewTask(taskText, true);
            myTasksList.appendChild(newTask);
            newTaskInput.value = '';
            saveState(); // Save state after adding
        }
    });

    // Initialize all tasks found in the HTML
    document.querySelectorAll('.task').forEach(task => {
        const label = document.createElement('span');
        label.textContent = task.textContent.trim();
        task.textContent = '';
        task.appendChild(label);
        addDragListeners(task);
    });

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
            if (!draggedItem) return;

            const isMyTaskTemplate = draggedItem.parentElement.id === 'my-tasks-list';

            if (zone.id === 'template-trash') {
                if (isMyTaskTemplate) {
                    draggedItem.remove();
                    saveState(); // Save state after deleting template
                }
                return;
            }

            const isSuggestedTemplate = draggedItem.parentElement.id === 'suggested-tasks-list';

            if (isMyTaskTemplate || isSuggestedTemplate) {
                const taskText = draggedItem.querySelector('span').textContent;
                const clonedTask = createNewTask(taskText, false);
                zone.appendChild(clonedTask);
            } else {
                zone.appendChild(draggedItem);
            }
            saveState(); // Save state after any drop
        });
    });

    // Save all changes to localStorage
    // saveBtn.addEventListener('click', () => {
    //     // FIX: Call the correct saveState function.
    //     saveState(); 
    //     saveBtn.textContent = 'Saved!';
    //     setTimeout(() => {
    //         saveBtn.textContent = 'Save All Changes';
    //     }, 1500);
    // });

    loadState(); // Load all saved states when the page loads
});