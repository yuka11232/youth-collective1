(function () {
  const state = {
    csrfToken: null,
    user: null
  };

  async function getCsrfToken(forceRefresh = false) {
    if (state.csrfToken && !forceRefresh) return state.csrfToken;
    const response = await fetch('/api/csrf', { credentials: 'include', cache: 'no-store' });
    if (!response.ok) throw new Error('Could not prepare the security token.');
    const data = await response.json();
    state.csrfToken = data.csrfToken;
    return state.csrfToken;
  }

  async function apiFetch(path, options = {}, retrying = false) {
    const method = String(options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers || {});

    if (!(options.body instanceof FormData) && options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      headers.set('x-csrf-token', await getCsrfToken(retrying));
    }

    const response = await fetch(path, {
      credentials: 'include',
      cache: method === 'GET' ? 'no-store' : 'default',
      ...options,
      method,
      headers
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
      const message = typeof data === 'string' ? data : (data.error || data.message || 'Something went wrong.');
      if (response.status === 403 && !retrying && message.toLowerCase().includes('security')) {
        state.csrfToken = null;
        return apiFetch(path, options, true);
      }
      throw new Error(message);
    }

    return data;
  }

  function toast(message, type = 'info') {
    let holder = document.querySelector('[data-toast-holder]');
    if (!holder) {
      holder = document.createElement('div');
      holder.className = 'yc-toast-holder';
      holder.dataset.toastHolder = '';
      document.body.appendChild(holder);
    }
    const item = document.createElement('div');
    item.className = `yc-toast ${type}`;
    item.textContent = message;
    holder.appendChild(item);
    requestAnimationFrame(() => item.classList.add('show'));
    window.setTimeout(() => {
      item.classList.remove('show');
      window.setTimeout(() => item.remove(), 220);
    }, 3600);
  }

  async function refreshMe() {
    const data = await apiFetch('/api/auth/me');
    state.user = data.user || null;
    window.dispatchEvent(new CustomEvent('yc-auth-changed', { detail: { user: state.user } }));
    return state.user;
  }

  window.YCBackend = {
    state,
    apiFetch,
    getCsrfToken,
    refreshMe,
    toast
  };
})();
