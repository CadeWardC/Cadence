// calendar.js

document.addEventListener('DOMContentLoaded', () => {
    const monthYearDisplay = document.getElementById('month-year-display');
    const calendarBody = document.getElementById('calendar-body');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const monthYearSelects = document.getElementById('month-year-selects');
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');

    // Task section elements
    const dayTasksHeader = document.getElementById('day-tasks-header');
    const dayTaskList = document.getElementById('day-task-list');
    const dayTaskInput = document.getElementById('day-task-input');
    const addDayTaskBtn = document.getElementById('add-day-task-btn');
    const dayTaskTimeInput = document.getElementById('day-task-time-input');
    const dayTaskDeadlineCheckbox = document.getElementById('day-task-deadline-checkbox');

    // Modal elements
    const taskModal = document.getElementById('task-modal');
    const modalTitle = document.getElementById('modal-title');
    const taskNameInput = document.getElementById('task-name-input');
    const taskTimeInput = document.getElementById('task-time-input');
    const taskDeadlineCheckbox = document.getElementById('task-deadline-checkbox');
    const saveTaskBtn = document.getElementById('save-task-btn');
    const deleteTaskBtn = document.getElementById('delete-task-btn');
    const cancelTaskBtn = document.getElementById('cancel-task-btn');

    let currentDate = new Date();
    let selectedDate = new Date();
    let currentEditingDateKey = null;
    let currentEditingTaskId = null;

    // --- Task Functions ---
    function getTasksForDay(date) {
        const key = `calendarTasks-${getLocalDayKey(date)}`;
        return JSON.parse(localStorage.getItem(key)) || [];
    }

    function saveTasksForDay(date, tasks) {
        const key = `calendarTasks-${getLocalDayKey(date)}`;
        localStorage.setItem(key, JSON.stringify(tasks));
    }

    function renderTasks(date) {
        dayTasksHeader.textContent = `Tasks for ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
        dayTaskList.innerHTML = '';
        const tasks = getTasksForDay(date);

        if (tasks.length === 0) {
            dayTaskList.innerHTML = '<li class="no-tasks">No tasks for this day.</li>';
            return;
        }

        tasks.sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));

        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = task.completed ? 'completed' : '';
            li.dataset.taskId = task.id;

            const timeDisplay = task.time ? `<span class="task-time">${formatTime(task.time)}</span>` : '';
            const deadlineIndicator = task.isDeadline ? ` <span style="color: #e57373; font-weight: bold;">(Deadline)</span>` : '';

            li.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''}>
                ${timeDisplay}
                <label>${task.text}${deadlineIndicator}</label>
                <button class="edit-btn" title="Edit Task">✏️</button>
                <button class="delete-btn">×</button>
            `;
            dayTaskList.appendChild(li);
        });
    }

    function addTask() {
        const text = dayTaskInput.value.trim();
        const time = dayTaskTimeInput.value;
        const isDeadline = dayTaskDeadlineCheckbox.checked;
        
        if (text === '') return;

        let tasks = getTasksForDay(selectedDate);
        const newTask = {
            id: Date.now(),
            text: text,
            time: time,
            completed: false,
            isDeadline: isDeadline
        };
        tasks.push(newTask);
        saveTasksForDay(selectedDate, tasks);

        // MODIFICATION: Also save to the global deadline list if it's a deadline
        if (isDeadline) {
            const deadlineTasks = JSON.parse(localStorage.getItem('deadlineTasks')) || {};
            const deadlineDateKey = getLocalDayKey(selectedDate);
            deadlineTasks[newTask.id] = { ...newTask, deadlineDateKey: deadlineDateKey };
            localStorage.setItem('deadlineTasks', JSON.stringify(deadlineTasks));
        }
        
        renderTasks(selectedDate);
        
        // Clear the form
        dayTaskInput.value = '';
        dayTaskTimeInput.value = '';
        dayTaskDeadlineCheckbox.checked = false;
    }

    function formatTime(timeString) {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
        return `${formattedHour}:${minutes} ${ampm}`;
    }

    // --- Calendar Functions ---
    function populateSelects() {
        monthSelect.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = new Date(0, i).toLocaleString('default', { month: 'long' });
            monthSelect.appendChild(option);
        }

        yearSelect.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let i = currentYear - 5; i <= currentYear + 10; i++) { // Allow viewing past years
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            yearSelect.appendChild(option);
        }
    }

    function toggleSelectView(showSelects) {
        monthYearSelects.classList.toggle('hidden', !showSelects);
        monthYearDisplay.classList.toggle('hidden', showSelects);
    }

    function renderCalendar() {
        toggleSelectView(false);
        calendarBody.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const lastDayOfPrevMonth = new Date(year, month, 0);

        monthYearDisplay.textContent = `${firstDayOfMonth.toLocaleString('default', { month: 'long' })} ${year}`;

        for (let i = firstDayOfMonth.getDay(); i > 0; i--) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('calendar-day', 'prev-month');
            dayCell.textContent = lastDayOfPrevMonth.getDate() - i + 1;
            calendarBody.appendChild(dayCell);
        }

        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('calendar-day', 'current-month');
            dayCell.textContent = i;
            dayCell.dataset.day = i;

            const today = new Date();
            if (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
                dayCell.classList.add('today');
            }

            if (year === selectedDate.getFullYear() && month === selectedDate.getMonth() && i === selectedDate.getDate()) {
                dayCell.classList.add('selected');
            }

            calendarBody.appendChild(dayCell);
        }

        const remainingCells = 42 - calendarBody.children.length;
        for (let i = 1; i <= remainingCells; i++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('calendar-day', 'next-month');
            dayCell.textContent = i;
            calendarBody.appendChild(dayCell);
        }
    }

    // --- Modal Functions (for editing only) ---
    function openTaskModal(dateKey, task) {
        currentEditingDateKey = dateKey;
        modalTitle.textContent = 'Edit Task';
        taskNameInput.value = task.text;
        taskTimeInput.value = task.time || '';
        taskDeadlineCheckbox.checked = !!task.isDeadline;
        currentEditingTaskId = task.id;
        deleteTaskBtn.classList.remove('hidden');
        taskModal.classList.remove('hidden');
        taskNameInput.focus();
    }

    function saveTask() {
        const taskName = taskNameInput.value.trim();
        if (!taskName) {
            alert('Task name cannot be empty.');
            return;
        }

        const taskTime = taskTimeInput.value;
        const isDeadline = taskDeadlineCheckbox.checked;

        const [year, month, day] = currentEditingDateKey.split('-').map(Number);
        const taskDate = new Date(year, month - 1, day);
        
        let tasks = getTasksForDay(taskDate);
        const task = tasks.find(t => t.id === currentEditingTaskId);
        
        const wasDeadline = task ? task.isDeadline : false;
        
        if (task) {
            task.text = taskName;
            task.time = taskTime;
            task.isDeadline = isDeadline;
        }

        saveTasksForDay(taskDate, tasks);

        // MODIFICATION: Update the global deadline list
        const deadlineTasks = JSON.parse(localStorage.getItem('deadlineTasks')) || {};
        if (isDeadline) {
            deadlineTasks[task.id] = { ...task, deadlineDateKey: currentEditingDateKey };
        } else if (wasDeadline && !isDeadline) {
            delete deadlineTasks[task.id];
        }
        localStorage.setItem('deadlineTasks', JSON.stringify(deadlineTasks));

        renderTasks(taskDate);
        closeTaskModal();
    }

    function deleteTaskFromStorage(taskId) {
        // MODIFICATION: Also remove from the global deadline list
        const deadlineTasks = JSON.parse(localStorage.getItem('deadlineTasks')) || {};
        if (deadlineTasks[taskId]) {
            delete deadlineTasks[taskId];
            localStorage.setItem('deadlineTasks', JSON.stringify(deadlineTasks));
        }
    }
    
    function deleteTask() {
        if (currentEditingTaskId && currentEditingDateKey) {
            const [year, month, day] = currentEditingDateKey.split('-').map(Number);
            const taskDate = new Date(year, month - 1, day);
            
            deleteTaskFromStorage(currentEditingTaskId);
            
            let tasks = getTasksForDay(taskDate);
            tasks = tasks.filter(task => task.id !== currentEditingTaskId);
            saveTasksForDay(taskDate, tasks);
            renderTasks(taskDate);
            closeTaskModal();
        }
    }

    function closeTaskModal() {
        taskModal.classList.add('hidden');
    }

    // --- Event Listeners ---
    monthYearDisplay.addEventListener('click', () => {
        monthSelect.value = currentDate.getMonth();
        yearSelect.value = currentDate.getFullYear();
        toggleSelectView(true);
    });

    monthSelect.addEventListener('change', () => {
        currentDate.setMonth(monthSelect.value);
        renderCalendar();
    });

    yearSelect.addEventListener('change', () => {
        currentDate.setFullYear(yearSelect.value);
        renderCalendar();
    });

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    calendarBody.addEventListener('click', (e) => {
        const dayCell = e.target.closest('.calendar-day.current-month');
        if (!dayCell) return;

        const day = parseInt(dayCell.dataset.day, 10);
        selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

        const previouslySelected = calendarBody.querySelector('.selected');
        if (previouslySelected) {
            previouslySelected.classList.remove('selected');
        }
        dayCell.classList.add('selected');
        renderTasks(selectedDate);
    });

    addDayTaskBtn.addEventListener('click', addTask);
    dayTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    dayTaskList.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li || !li.dataset.taskId) return;

        const taskId = parseInt(li.dataset.taskId, 10);
        let tasks = getTasksForDay(selectedDate);

        if (e.target.matches('.delete-btn')) {
            deleteTaskFromStorage(taskId);
            tasks = tasks.filter(task => task.id !== taskId);
            saveTasksForDay(selectedDate, tasks);
            renderTasks(selectedDate);
        } else if (e.target.matches('.edit-btn')) {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                const dateKey = getLocalDayKey(selectedDate);
                openTaskModal(dateKey, task);
            }
        } else if (e.target.matches('input[type="checkbox"]')) {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.completed = e.target.checked;
            }
            saveTasksForDay(selectedDate, tasks);
            renderTasks(selectedDate);
        }
    });

    saveTaskBtn.addEventListener('click', saveTask);
    deleteTaskBtn.addEventListener('click', deleteTask);
    cancelTaskBtn.addEventListener('click', closeTaskModal);

    taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) {
            closeTaskModal();
        }
    });

    // --- Initial Load ---
    populateSelects();
    renderCalendar();
    renderTasks(selectedDate);
});