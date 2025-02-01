document.addEventListener('DOMContentLoaded', function() {
  loadTasks();

  document.getElementById('addCurrentPage').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const url = tabs[0].url;
      if (url.includes('.atlassian.net')) {
        const ticketCode = url.split('/').pop();
        addTask(ticketCode, url);
      } else {
        alert('La URL actual no es un ticket válido de Jira (.atlassian.net)');
      }
    });
  });

  document.getElementById('downloadCSV').addEventListener('click', downloadCSV);
});

function loadTasks() {
  chrome.storage.sync.get(['tasks'], function(result) {
    const tasks = result.tasks || [];
    const activeTasks = tasks.filter(task => !task.completed);
    const completedTasks = tasks.filter(task => task.completed);

    renderTaskList('activeTasks', activeTasks);
    renderTaskList('completedTasks', completedTasks);
  });
}

function renderTaskList(containerId, tasks) {
  const container = document.getElementById(containerId);
  container.innerHTML = tasks.length === 0 ?
    '<div class="empty-state">No hay tickets en esta lista</div>' : '';

  tasks.forEach((task, index) => {
    const taskElement = createTaskElement(task, index);
    container.appendChild(taskElement);
  });
}

function createTaskElement(task, index) {
  const div = document.createElement('div');
  div.className = `task-item ${task.completed ? 'completed' : ''}`;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.completed;
  checkbox.addEventListener('change', () => updateTaskStatus(index, checkbox.checked));

  const contentDiv = document.createElement('div');
  contentDiv.className = 'task-content';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = task.title;
  titleInput.readOnly = task.completed;
  if (!task.completed) {
    titleInput.addEventListener('change', () => updateTaskTitle(index, titleInput.value));
  }

  const dateSpan = document.createElement('span');
  dateSpan.className = 'completion-date';
  dateSpan.textContent = task.completionDate ? `Completado: ${task.completionDate}` : '';

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'task-actions';

  const linkButton = document.createElement('button');
  linkButton.className = 'btn btn-link';
  linkButton.textContent = 'Ir al ticket';
  linkButton.addEventListener('click', () => {
    chrome.tabs.create({ url: task.url });
  });

  contentDiv.appendChild(titleInput);
  if (task.completed) {
    contentDiv.appendChild(dateSpan);
  }

  div.appendChild(checkbox);
  div.appendChild(contentDiv);
  div.appendChild(actionsDiv);
  actionsDiv.appendChild(linkButton);

  return div;
}

function addTask(ticketCode, url) {
  chrome.storage.sync.get(['tasks'], function(result) {
    const tasks = result.tasks || [];
    tasks.push({
      code: ticketCode,
      url: url,
      title: ticketCode,
      completed: false,
      completionDate: null
    });

    chrome.storage.sync.set({tasks: tasks}, function() {
      loadTasks();
    });
  });
}

function updateTaskStatus(index, completed) {
  chrome.storage.sync.get(['tasks'], function(result) {
    const tasks = result.tasks;
    tasks[index].completed = completed;
    tasks[index].completionDate = completed ? new Date().toLocaleDateString() : null;

    chrome.storage.sync.set({tasks: tasks}, function() {
      loadTasks();
    });
  });
}

function updateTaskTitle(index, newTitle) {
  chrome.storage.sync.get(['tasks'], function(result) {
    const tasks = result.tasks;
    tasks[index].title = newTitle;

    chrome.storage.sync.set({tasks: tasks}, function() {
      loadTasks();
    });
  });
}

function downloadCSV() {
  chrome.storage.sync.get(['tasks'], function(result) {
    const tasks = result.tasks || [];
    const csvContent = [
      ['Código', 'Título', 'URL', 'Estado', 'Fecha de finalización'],
      ...tasks.map(task => [
        task.code,
        task.title,
        task.url,
        task.completed ? 'Finalizado' : 'Activo',
        task.completionDate || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jira_tasks.csv';
    a.click();
    URL.revokeObjectURL(url);
  });
}
