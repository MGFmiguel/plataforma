const userName = document.querySelector('#user-name');
const list = document.querySelector('#activity-list');
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const dayFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' });
let csrfToken = null;

function formatDate(dateString) { const date = new Date(`${dateString}T12:00:00`); return { day: dayFormatter.format(date), month: monthFormatter.format(date).replace('.', ''), full: dateFormatter.format(date) }; }
function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderActivities(activities) {
  const fragment = document.createDocumentFragment();
  for (const activity of activities) {
    const date = formatDate(activity.date);
    const article = createElement('article', 'activity');
    const dateBlock = createElement('div', 'date');
    dateBlock.append(createElement('strong', '', date.day), createElement('span', '', date.month));
    const info = createElement('div', 'activity-info');
    info.append(
      createElement('span', 'tag', activity.category),
      createElement('h3', '', activity.title),
      createElement('p', '', activity.description),
    );
    const button = createElement('button', 'round-arrow', '→');
    button.type = 'button';
    button.setAttribute('aria-label', 'Ver detalhes');
    article.append(dateBlock, info, button);
    fragment.append(article);
  }
  list.replaceChildren(fragment);
}

async function loadDashboard() {
  const response = await fetch('/api/dashboard/summary');
  if (response.status === 401) return window.location.href = '/';
  const { stats, activities } = await response.json();
  const me = await fetch('/api/auth/me').then((result) => result.json());
  userName.textContent = (me.user?.name || 'querida').split(' ')[0];
  document.querySelector('#member-count').textContent = String(stats.members).padStart(2, '0');
  document.querySelector('#activity-count').textContent = String(stats.activities).padStart(2, '0');
  document.querySelector('#next-date').textContent = stats.nextActivity ? formatDate(stats.nextActivity).day : '—';
  renderActivities(activities);
}
async function loadCsrfToken() {
  const response = await fetch('/api/auth/csrf');
  if (!response.ok) throw new Error('Não foi possível preparar sua sessão.');
  ({ csrfToken } = await response.json());
}

document.querySelector('#logout').addEventListener('click', async () => {
  try {
    if (!csrfToken) await loadCsrfToken();
    const response = await fetch('/api/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } });
    if (!response.ok) throw new Error();
  } finally {
    window.location.href = '/';
  }
});
loadCsrfToken().catch(() => { window.location.href = '/'; });
loadDashboard();
