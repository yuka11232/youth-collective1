(function () {
  const backend = window.YCBackend;
  if (!backend) return;

  const authHtml = `
    <div class="yc-auth-backdrop" data-auth-backdrop hidden>
      <section class="yc-auth-modal" role="dialog" aria-modal="true" aria-labelledby="yc-auth-title">
        <button class="yc-auth-close" type="button" data-auth-close aria-label="Close">×</button>
        <div class="yc-auth-visual" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
        <div class="yc-auth-copy">
          <p class="eyebrow">Member access</p>
          <h2 id="yc-auth-title">Join the Youth Collective community.</h2>
          <p>Create an account, write comments, and keep your participation connected to the website.</p>
        </div>
        <div class="yc-auth-tabs" role="tablist" aria-label="Authentication forms">
          <button type="button" class="active" data-auth-tab="login">Login</button>
          <button type="button" data-auth-tab="register">Register</button>
          <button type="button" data-auth-tab="recover">Recover</button>
        </div>
        <div class="yc-auth-panels">
          <form class="yc-auth-panel active" data-auth-panel="login" novalidate>
            <label>Email<input type="email" name="email" autocomplete="email" required /></label>
            <label>Password<input type="password" name="password" autocomplete="current-password" required /></label>
            <button class="button primary" type="submit">Login</button>
            <button class="yc-google-btn" type="button" data-google-login>Continue with Google</button>
            <p class="yc-auth-status" aria-live="polite"></p>
          </form>
          <form class="yc-auth-panel" data-auth-panel="register" novalidate>
            <label>Name<input type="text" name="name" autocomplete="name" minlength="2" maxlength="70" required /></label>
            <label>Email<input type="email" name="email" autocomplete="email" required /></label>
            <label>Password<input type="password" name="password" autocomplete="new-password" minlength="8" maxlength="128" required data-password-input /></label>
            <div class="yc-password-meter" aria-live="polite">
              <span data-password-bar></span>
            </div>
            <ul class="yc-password-rules" data-password-rules>
              <li data-rule="length">At least 8 characters</li>
              <li data-rule="letter">At least one letter</li>
              <li data-rule="number">At least one number</li>
              <li data-rule="common">Not a common password</li>
            </ul>
            <label>Confirm password<input type="password" name="confirmPassword" autocomplete="new-password" minlength="8" maxlength="128" required data-confirm-password /></label>
            <p class="yc-auth-hint" data-password-match>Passwords must match.</p>
            <button class="button primary" type="submit">Create account</button>
            <button class="yc-google-btn" type="button" data-google-login>Register with Google</button>
            <p class="yc-auth-status" aria-live="polite"></p>
          </form>
          <form class="yc-auth-panel" data-auth-panel="recover" novalidate>
            <label>Email<input type="email" name="email" autocomplete="email" required /></label>
            <button class="button primary" type="submit">Send reset link</button>
            <p class="yc-auth-status" aria-live="polite"></p>
            <div class="yc-reset-box" data-reset-box hidden>
              <label>Reset token<input type="text" name="token" autocomplete="off" /></label>
              <label>New password<input type="password" name="password" autocomplete="new-password" minlength="8" maxlength="128" /></label>
              <button class="button secondary" type="button" data-reset-submit>Set new password</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  `;

  function init() {
    injectNavAuth();
    if (!document.querySelector('[data-auth-backdrop]')) document.body.insertAdjacentHTML('beforeend', authHtml);
    bindModal();
    maybeOpenFromUrl();
    backend.refreshMe().then(updateNav).catch(() => updateNav(null));
  }

  function injectNavAuth() {
    const nav = document.querySelector('[data-site-nav]');
    if (!nav || nav.querySelector('[data-auth-nav]')) return;
    const wrap = document.createElement('div');
    wrap.className = 'yc-auth-nav';
    wrap.dataset.authNav = '';
    wrap.innerHTML = '<button class="yc-auth-open" type="button" data-open-auth="login">Login</button>';
    nav.appendChild(wrap);
    window.addEventListener('yc-auth-changed', (event) => updateNav(event.detail.user));
  }

  function updateNav(user) {
    const wrap = document.querySelector('[data-auth-nav]');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!user) {
      const button = document.createElement('button');
      button.className = 'yc-auth-open';
      button.type = 'button';
      button.textContent = 'Login';
      button.dataset.openAuth = 'login';
      wrap.appendChild(button);
      return;
    }

    const chip = document.createElement('button');
    chip.className = 'yc-user-chip';
    chip.type = 'button';
    chip.title = `Logged in as ${user.email}`;
    chip.innerHTML = `<span>${initials(user.name)}</span><strong>${escapeHtml(user.name)}</strong>`;
    chip.addEventListener('click', () => backend.toast(`Signed in as ${user.email}`, 'success'));

    const logout = document.createElement('button');
    logout.className = 'yc-auth-open subtle';
    logout.type = 'button';
    logout.textContent = 'Logout';
    logout.addEventListener('click', logoutUser);
    wrap.append(chip, logout);
  }

  function bindModal() {
    document.addEventListener('click', (event) => {
      const opener = event.target.closest('[data-open-auth]');
      if (opener) {
        event.preventDefault();
        openAuth(opener.dataset.openAuth || 'login');
      }
      if (event.target.matches('[data-auth-close]') || event.target.matches('[data-auth-backdrop]')) closeAuth();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeAuth();
    });

    document.querySelectorAll('[data-auth-tab]').forEach((tab) => {
      tab.addEventListener('click', () => switchTab(tab.dataset.authTab));
    });

    const loginForm = document.querySelector('[data-auth-panel="login"]');
    const registerForm = document.querySelector('[data-auth-panel="register"]');
    const recoverForm = document.querySelector('[data-auth-panel="recover"]');
    const passwordInput = registerForm.querySelector('[data-password-input]');
    const confirmInput = registerForm.querySelector('[data-confirm-password]');

    passwordInput.addEventListener('input', () => updatePasswordFeedback(registerForm));
    confirmInput.addEventListener('input', () => updatePasswordFeedback(registerForm));
    registerForm.querySelector('input[name="name"]').addEventListener('input', () => updatePasswordFeedback(registerForm));
    registerForm.querySelector('input[name="email"]').addEventListener('input', () => updatePasswordFeedback(registerForm));

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!basicValidate(loginForm)) return;
      await submitForm(loginForm, '/api/auth/login', 'Welcome back.');
    });

    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!basicValidate(registerForm)) return;
      const problems = passwordProblems(registerForm);
      if (problems.length) {
        setStatus(registerForm.querySelector('.yc-auth-status'), problems[0], 'error');
        updatePasswordFeedback(registerForm);
        return;
      }
      await submitForm(registerForm, '/api/auth/register', 'Account created.');
    });

    recoverForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!basicValidate(recoverForm)) return;
      const status = recoverForm.querySelector('.yc-auth-status');
      setStatus(status, 'Preparing reset link...');
      setSubmitting(recoverForm, true);
      try {
        const payload = Object.fromEntries(new FormData(recoverForm));
        const data = await backend.apiFetch('/api/auth/password/request', {
          method: 'POST',
          body: JSON.stringify({ email: payload.email })
        });
        const resetBox = recoverForm.querySelector('[data-reset-box]');
        resetBox.hidden = false;
        if (data.devResetUrl) {
          const token = new URL(data.devResetUrl).searchParams.get('reset');
          recoverForm.querySelector('input[name="token"]').value = token;
          setStatus(status, 'Development mode: reset token filled below. In production this is emailed.', 'success');
        } else {
          setStatus(status, data.message || 'Check your email for the reset link.', 'success');
        }
      } catch (error) {
        setStatus(status, error.message, 'error');
      } finally {
        setSubmitting(recoverForm, false);
      }
    });

    document.querySelector('[data-reset-submit]').addEventListener('click', async () => {
      const status = recoverForm.querySelector('.yc-auth-status');
      const token = recoverForm.querySelector('input[name="token"]').value.trim();
      const password = recoverForm.querySelector('input[name="password"]').value;
      setStatus(status, 'Updating password...');
      if (!token || password.length < 8) {
        setStatus(status, 'Enter the reset token and a new password with at least 8 characters.', 'error');
        return;
      }
      setSubmitting(recoverForm, true);
      try {
        const data = await backend.apiFetch('/api/auth/password/reset', {
          method: 'POST',
          body: JSON.stringify({ token, password })
        });
        setStatus(status, data.message || 'Password updated.', 'success');
        recoverForm.reset();
        switchTab('login');
      } catch (error) {
        setStatus(status, error.message, 'error');
      } finally {
        setSubmitting(recoverForm, false);
      }
    });

    document.querySelectorAll('[data-google-login]').forEach((button) => {
      button.addEventListener('click', () => {
        window.location.href = '/api/auth/google';
      });
    });

    updatePasswordFeedback(registerForm);
  }

  async function submitForm(form, endpoint, successMessage) {
    const status = form.querySelector('.yc-auth-status');
    setStatus(status, 'Checking...');
    setSubmitting(form, true);
    try {
      const payload = Object.fromEntries(new FormData(form));
      if (typeof payload.name === 'string') payload.name = payload.name.replace(/\s+/g, ' ').trim();
      if (typeof payload.email === 'string') payload.email = payload.email.trim();
      const data = await backend.apiFetch(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      backend.state.user = data.user;
      window.dispatchEvent(new CustomEvent('yc-auth-changed', { detail: { user: data.user } }));
      form.reset();
      updatePasswordFeedback(document.querySelector('[data-auth-panel="register"]'));
      setStatus(status, successMessage, 'success');
      backend.toast(successMessage, 'success');
      setTimeout(closeAuth, 500);
    } catch (error) {
      setStatus(status, error.message, 'error');
    } finally {
      setSubmitting(form, false);
    }
  }

  async function logoutUser() {
    try {
      await backend.apiFetch('/api/auth/logout', { method: 'POST' });
      backend.state.user = null;
      window.dispatchEvent(new CustomEvent('yc-auth-changed', { detail: { user: null } }));
      backend.toast('Logged out.', 'success');
    } catch (error) {
      backend.toast(error.message, 'error');
    }
  }

  function basicValidate(form) {
    const status = form.querySelector('.yc-auth-status');
    if (!form.checkValidity()) {
      const firstInvalid = form.querySelector(':invalid');
      if (firstInvalid) firstInvalid.focus();
      setStatus(status, 'Please fill the required fields correctly.', 'error');
      return false;
    }
    return true;
  }

  function passwordProblems(form) {
    const password = form.querySelector('[data-password-input]').value;
    const confirm = form.querySelector('[data-confirm-password]').value;
    const name = form.querySelector('input[name="name"]').value;
    const email = form.querySelector('input[name="email"]').value;
    const lower = password.toLowerCase();
    const emailLocal = String(email || '').split('@')[0].toLowerCase();
    const nameParts = String(name || '').toLowerCase().split(/\s+/).filter((part) => part.length >= 3);
    const problems = [];

    if (password.length < 8) problems.push('Use at least 8 characters.');
    if (!/[A-Za-z]/.test(password)) problems.push('Add at least one letter.');
    if (!/[0-9]/.test(password)) problems.push('Add at least one number.');
    if (/^(password|qwerty|12345678|11111111)$/i.test(password)) problems.push('Choose a less common password.');
    if (emailLocal && emailLocal.length >= 3 && lower.includes(emailLocal)) problems.push('Do not include your email in the password.');
    if (nameParts.some((part) => lower.includes(part))) problems.push('Do not include your name in the password.');
    if (password !== confirm) problems.push('Passwords do not match.');

    return problems;
  }

  function updatePasswordFeedback(form) {
    if (!form) return;
    const password = form.querySelector('[data-password-input]')?.value || '';
    const confirm = form.querySelector('[data-confirm-password]')?.value || '';
    const rules = form.querySelector('[data-password-rules]');
    const bar = form.querySelector('[data-password-bar]');
    const match = form.querySelector('[data-password-match]');
    if (!rules || !bar || !match) return;

    const checks = {
      length: password.length >= 8,
      letter: /[A-Za-z]/.test(password),
      number: /[0-9]/.test(password),
      common: password.length > 0 && !/^(password|qwerty|12345678|11111111)$/i.test(password)
    };
    Object.entries(checks).forEach(([rule, ok]) => {
      const item = rules.querySelector(`[data-rule="${rule}"]`);
      if (item) item.dataset.ok = ok ? 'true' : 'false';
    });

    const score = Object.values(checks).filter(Boolean).length;
    bar.style.width = `${Math.max(10, score * 25)}%`;
    bar.dataset.score = String(score);
    if (!confirm) {
      match.textContent = 'Passwords must match.';
      match.dataset.status = '';
    } else if (password === confirm) {
      match.textContent = 'Passwords match.';
      match.dataset.status = 'success';
    } else {
      match.textContent = 'Passwords do not match.';
      match.dataset.status = 'error';
    }
  }

  function setSubmitting(form, isSubmitting) {
    form.querySelectorAll('button, input').forEach((el) => { el.disabled = isSubmitting; });
  }

  function openAuth(tab = 'login') {
    const backdrop = document.querySelector('[data-auth-backdrop]');
    if (!backdrop) return;
    backdrop.hidden = false;
    switchTab(tab);
    requestAnimationFrame(() => backdrop.classList.add('show'));
    const firstInput = backdrop.querySelector('[data-auth-panel].active input');
    if (firstInput) setTimeout(() => firstInput.focus(), 120);
  }

  function closeAuth() {
    const backdrop = document.querySelector('[data-auth-backdrop]');
    if (!backdrop || backdrop.hidden) return;
    backdrop.classList.remove('show');
    setTimeout(() => { backdrop.hidden = true; }, 180);
  }

  function switchTab(name) {
    document.querySelectorAll('[data-auth-tab]').forEach((tab) => tab.classList.toggle('active', tab.dataset.authTab === name));
    document.querySelectorAll('[data-auth-panel]').forEach((panel) => panel.classList.toggle('active', panel.dataset.authPanel === name));
  }

  function maybeOpenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const reset = params.get('reset');
    const auth = params.get('auth');
    if (reset) {
      openAuth('recover');
      const recover = document.querySelector('[data-auth-panel="recover"]');
      recover.querySelector('[data-reset-box]').hidden = false;
      recover.querySelector('input[name="token"]').value = reset;
    }
    if (auth === 'google-success') backend.toast('Logged in with Google.', 'success');
    if (auth === 'google-failed') backend.toast('Google login failed.', 'error');
  }

  function setStatus(element, message, type = '') {
    if (!element) return;
    element.textContent = message;
    element.dataset.status = type;
  }

  function initials(name) {
    return String(name || 'YC').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
