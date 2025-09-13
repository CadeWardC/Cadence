// script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const dayNameDisplay = document.getElementById('day-name-display');
    const dateDisplay = document.getElementById('date-display');
    const recurringTasksList = document.getElementById('recurring-tasks');
    const deadlineTasksList = document.getElementById('deadline-tasks'); // MODIFICATION
    const dailyTasksList = document.getElementById('daily-tasks');
    const completedTasksList = document.getElementById('completed-tasks');
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');

    // --- Constants and Keys ---
    const today = new Date();
    // const today = new Date('2025-09-13T12:00:00'); // For testing specific dates
    
    // --- Date Display ---
    function updateDateDisplay() {
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
        const dateString = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        dayNameDisplay.textContent = dayName;
        dateDisplay.textContent = dateString;
    }

    // --- Task Data ---
    let recurringTasks = {};

    // --- Helper Functions ---
    // This function is assumed to be in utils.js, but defined here for clarity.
    function getLocalDayKey(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}-${month}-${day}`;
    }
    
    const calendarTaskKey = `calendarTasks-${getLocalDayKey(today)}`;
    const completedRecurringKey = `completedRecurring-${getLocalDayKey(today)}`;

    function formatTime(timeString) {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${minutes} ${ampm}`;
    }

    // --- RENDER RECURRING TASKS ---
    function renderRecurringTasks() {
        const recurringTasksData = JSON.parse(localStorage.getItem('recurringTasks')) || {};
        const completedRecurringForToday = JSON.parse(localStorage.getItem(completedRecurringKey)) || [];
        const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayName = weekdays[today.getDay()];
        
        const tasksForToday = recurringTasksData[todayName] || [];
        
        recurringTasksList.innerHTML = ''; 

        if (tasksForToday.length === 0) {
            recurringTasksList.innerHTML = '<li class="no-tasks">No recurring tasks for today.</li>';
            return;
        }

        tasksForToday.forEach(taskText => {
            const isCompleted = completedRecurringForToday.includes(taskText);
            const li = document.createElement('li');
            li.dataset.taskType = 'recurring';
            li.dataset.taskText = taskText; 
            li.className = isCompleted ? 'completed' : '';
            
            li.innerHTML = `
                <input type="checkbox" ${isCompleted ? 'checked' : ''}>
                <label>${taskText}</label>
            `;
            recurringTasksList.appendChild(li);
        });
    }

    // --- NEW: RENDER DEADLINE TASKS ---
    function renderDeadlineTasks() {
        const deadlineTasksData = JSON.parse(localStorage.getItem('deadlineTasks')) || {};
        const tasksToShow = [];
        const todayNorm = new Date();
        todayNorm.setHours(0, 0, 0, 0);

        for (const taskId in deadlineTasksData) {
            const task = deadlineTasksData[taskId];
            const [year, month, day] = task.deadlineDateKey.split('-').map(Number);
            const deadlineDate = new Date(year, month - 1, day);
            deadlineDate.setHours(23, 59, 59, 999);

            if (!task.completed && todayNorm <= deadlineDate) {
                tasksToShow.push(task);
            }
        }
        
        deadlineTasksList.innerHTML = '';

        if (tasksToShow.length === 0) {
            deadlineTasksList.innerHTML = '<li class="no-tasks">No open deadlines.</li>';
            return;
        }

        tasksToShow.sort((a, b) => new Date(a.deadlineDateKey) - new Date(b.deadlineDateKey));

        tasksToShow.forEach(task => {
            const li = document.createElement('li');
            li.dataset.taskId = task.id;
            li.dataset.taskType = 'deadline';
            li.dataset.deadlineDateKey = task.deadlineDateKey;
            
            li.innerHTML = `
                <input type="checkbox">
                <label>${task.text} <span class="task-time">(Due: ${task.deadlineDateKey})</span></label>
            `;
            deadlineTasksList.appendChild(li);
        });
    }

    // --- RENDER DAILY & CALENDAR TASKS ---
    function renderDailyTasks() {
        const calendarTasks = JSON.parse(localStorage.getItem(calendarTaskKey)) || [];
        
        dailyTasksList.innerHTML = '';
        if(completedTasksList) completedTasksList.innerHTML = '';

        const activeTasks = calendarTasks.filter(task => !task.completed);
        const completedTasks = calendarTasks.filter(task => task.completed);

        activeTasks.sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));

        if (activeTasks.length === 0) {
            dailyTasksList.innerHTML = '<li class="no-tasks">No unique tasks for today.</li>';
        } else {
            activeTasks.forEach(task => createTaskElement(task, dailyTasksList));
        }

        if (completedTasksList) {
            if (completedTasks.length === 0) {
                completedTasksList.innerHTML = '<li class="no-tasks">No completed tasks.</li>';
            } else {
                completedTasks.forEach(task => createTaskElement(task, completedTasksList));
            }
        }
    }

    function createTaskElement(task, list) {
        const li = document.createElement('li');
        li.dataset.taskId = task.id;
        li.dataset.taskType = 'daily';
        li.className = task.completed ? 'completed' : '';
        const timeDisplay = task.time ? `<span class="task-time">${formatTime(task.time)}</span>` : '';
        li.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''}>
            ${timeDisplay}
            <label>${task.text}</label>
            <button class="delete-btn">×</button>
        `;
        list.appendChild(li);
    }

    // --- Event Handlers ---
    function addDailyTask() {
        const taskText = newTaskInput.value.trim();
        if (!taskText) return;
        const allCalendarTasks = JSON.parse(localStorage.getItem(calendarTaskKey)) || [];
        const newTask = { id: Date.now(), text: taskText, completed: false, time: null, isDeadline: false };
        allCalendarTasks.push(newTask);
        localStorage.setItem(calendarTaskKey, JSON.stringify(allCalendarTasks));
        newTaskInput.value = '';
        renderDailyTasks();
    }

    function handleTaskClick(e) {
        const li = e.target.closest('li');
        if (!li || !li.dataset.taskType) return;

        const taskType = li.dataset.taskType;

        if (taskType === 'daily') {
            const taskId = li.dataset.taskId;
            if (e.target.matches('.delete-btn')) {
                let calendarTasks = JSON.parse(localStorage.getItem(calendarTaskKey)) || [];
                calendarTasks = calendarTasks.filter(t => t.id != taskId);
                localStorage.setItem(calendarTaskKey, JSON.stringify(calendarTasks));
                renderDailyTasks();
            } else if (e.target.matches('input[type="checkbox"]')) {
                let calendarTasks = JSON.parse(localStorage.getItem(calendarTaskKey)) || [];
                const task = calendarTasks.find(t => t.id == taskId);
                if (task) {
                    task.completed = e.target.checked;
                }
                localStorage.setItem(calendarTaskKey, JSON.stringify(calendarTasks));
                renderDailyTasks();
            }
        } else if (taskType === 'recurring') {
            if (e.target.matches('input[type="checkbox"]')) {
                const taskText = li.dataset.taskText;
                let completedRecurring = JSON.parse(localStorage.getItem(completedRecurringKey)) || [];
                if (e.target.checked) {
                    if (!completedRecurring.includes(taskText)) {
                        completedRecurring.push(taskText);
                    }
                } else {
                    completedRecurring = completedRecurring.filter(t => t !== taskText);
                }
                localStorage.setItem(completedRecurringKey, JSON.stringify(completedRecurring));
                renderRecurringTasks();
            }
        } else if (taskType === 'deadline') { // MODIFICATION
            if (e.target.matches('input[type="checkbox"]')) {
                const taskId = li.dataset.taskId;
                const deadlineDateKey = li.dataset.deadlineDateKey;

                const deadlineTasks = JSON.parse(localStorage.getItem('deadlineTasks')) || {};
                if (deadlineTasks[taskId]) {
                    deadlineTasks[taskId].completed = true;
                    localStorage.setItem('deadlineTasks', JSON.stringify(deadlineTasks));
                }

                const originalTaskKey = `calendarTasks-${deadlineDateKey}`;
                const originalTasks = JSON.parse(localStorage.getItem(originalTaskKey)) || [];
                const originalTask = originalTasks.find(t => t.id == taskId);
                if (originalTask) {
                    originalTask.completed = true;
                    localStorage.setItem(originalTaskKey, JSON.stringify(originalTasks));
                }
                
                renderDeadlineTasks();
            }
        }
    }

    // --- Initial Load ---
    function initialize() {
        updateDateDisplay();
        renderRecurringTasks();
        renderDeadlineTasks(); // MODIFICATION
        renderDailyTasks();
    }

    // --- Event Listeners ---
    addTaskBtn.addEventListener('click', addDailyTask);
    newTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addDailyTask();
    });
    document.querySelector('.container').addEventListener('click', handleTaskClick);

    initialize();
});