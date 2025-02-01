document.addEventListener('DOMContentLoaded', function() {
  // Cargar tareas guardadas
  loadTasks();

  // Evento para agregar la URL actual
  document.getElementById('addCurrentPage').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const url = tabs[0].url;
      // Verificar si es una URL de Jira
      if (url.includes('.atlassian.net')) {
        // Extraer el código del ticket de la URL
        const ticketCode = url.split('/').pop();
        addTask(ticketCode, url);
      } else {
        alert('La URL actual no parece ser un ticket de Jira');
      }
    });
  });

  // Evento para descargar CSV
  document.getElementById('downloadCSV').addEventListener('click', downloadCSV);
});

function loadTasks() {
  chrome.storage.sync.get(['tasks'], function(result) {
    const tasks = result.tasks || [];
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = '';

    tasks.forEach((task, index) => {
      const taskElement = createTaskElement(task, index);
      taskList.appendChild(taskElement);
    });
  });
}

function createTaskElement(task, index) {
  const div = document.createElement('div');
  div.className = 'task-item';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.completed;
  checkbox.addEventListener('change', () => updateTaskStatus(index, checkbox.checked));

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = task.title;
  titleInput.addEventListener('change', () => updateTaskTitle(index, titleInput.value));

  const dateSpan = document.createElement('span');
  dateSpan.className = 'completion-date';
  dateSpan.textContent = task.completionDate || '';

  div.appendChild(checkbox);
  div.appendChild(titleInput);
  div.appendChild(dateSpan);

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
      ['Código', 'Título', 'URL', 'Completado', 'Fecha de finalización'],
      ...tasks.map(task => [
        task.code,
        task.title,
        task.url,
        task.completed ? 'Sí' : 'No',
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
