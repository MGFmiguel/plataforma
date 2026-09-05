const form = document.querySelector('#auth-form');
const switchButton = document.querySelector('#switch-mode');
const message = document.querySelector('.form-message');
const nameFields = document.querySelectorAll('.name-field');
const title = document.querySelector('#form-title');
const subtitle = document.querySelector('#form-subtitle');
const submitLabel = document.querySelector('#submit-label');
const switchLabel = document.querySelector('#switch-label');
let isRegistering = false;
let csrfToken = null;

async function loadCsrfToken() {
  const response = await fetch('/api/auth/csrf');
  if (!response.ok) throw new Error('Não foi possível preparar o formulário. Atualize a página.');
  ({ csrfToken } = await response.json());
}

function renderMode() {
  nameFields.forEach((field) => field.classList.toggle('hidden', !isRegistering));
  title.textContent = isRegistering ? 'Criar minha conta' : 'Entrar no portal';
  subtitle.textContent = isRegistering ? 'Seu espaço de cuidado começa com um primeiro passo.' : 'Acesse seu espaço de cuidado e conexão.';
  submitLabel.textContent = isRegistering ? 'Começar agora' : 'Entrar';
  switchLabel.textContent = isRegistering ? 'Já tem uma conta?' : 'Ainda não faz parte?';
  switchButton.textContent = isRegistering ? 'Entrar no portal' : 'Criar minha conta';
  document.querySelector('#password').autocomplete = isRegistering ? 'new-password' : 'current-password';
  document.querySelector('#name').required = isRegistering;
}

switchButton.addEventListener('click', () => { isRegistering = !isRegistering; message.textContent = ''; renderMode(); });
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  const data = Object.fromEntries(new FormData(form));
  try {
    if (!csrfToken) await loadCsrfToken();
    const response = await fetch(`/api/auth/${isRegistering ? 'register' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify(data) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error);
    csrfToken = result.csrfToken;
    window.location.href = '/dashboard';
  } catch (error) { message.textContent = error.message || 'Tente novamente em instantes.'; }
});

loadCsrfToken().catch((error) => { message.textContent = error.message; });
fetch('/api/auth/me').then((response) => response.json()).then(({ user }) => { if (user) window.location.href = '/dashboard'; });
