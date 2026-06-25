(function () {
  'use strict';

  // ── Utilities ──────────────────────────────────────────────────────────────

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtDate(str) {
    if (!str) return '—';
    const d = new Date(str.replace(' ', 'T') + 'Z');
    return isNaN(d) ? str : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function truncate(str, n) {
    str = String(str || '');
    return str.length > n ? str.slice(0, n) + '…' : str;
  }

  function toast(msg, type) {
    if (window.YCBackend && window.YCBackend.toast) {
      window.YCBackend.toast(msg, type || 'success');
      return;
    }
    alert(msg);
  }

  async function api(path, options) {
    if (window.YCBackend && window.YCBackend.apiFetch) {
      return window.YCBackend.apiFetch(path, options);
    }
    const resp = await fetch(path, { credentials: 'include', ...options });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }

  // ── DOM refs ───────────────────────────────────────────────────────────────

  const viewLoading   = document.getElementById('view-loading');
  const viewAuth      = document.getElementById('view-auth');
  const viewDashboard = document.getElementById('view-dashboard');
  const adminUserName = document.getElementById('admin-user-name');
  const adminLogoutBtn = document.getElementById('admin-logout-btn');
  const setupForm     = document.getElementById('setup-form');
  const setupError    = document.getElementById('setup-error');
  const navItems      = document.querySelectorAll('[data-nav]');
  const panels        = document.querySelectorAll('[data-panel]');

  // ── Auth & setup ───────────────────────────────────────────────────────────

  async function checkAuth() {
    try {
      const data = await api('/api/auth/me');
      if (data.user && data.user.role === 'admin') {
        showDashboard(data.user);
      } else {
        showSetup(data.user);
      }
    } catch (_) {
      showSetup(null);
    }
  }

  function showSetup(user) {
    if (viewLoading) viewLoading.style.display = 'none';
    viewAuth.style.display = '';
    viewDashboard.style.display = 'none';

    if (user) {
      const nameField = document.getElementById('setup-name');
      const emailField = document.getElementById('setup-email');
      if (nameField && user.name) nameField.value = user.name;
      if (emailField && user.email) emailField.value = user.email;

      const setupSub = document.getElementById('setup-sub');
      if (setupSub) {
        setupSub.textContent = 'Logged in as ' + user.name + '. Enter the setup key to promote this account to admin.';
      }
    }
  }

  function showDashboard(user) {
    if (viewLoading) viewLoading.style.display = 'none';
    viewAuth.style.display = 'none';
    viewDashboard.style.display = '';
    if (adminUserName) adminUserName.textContent = user.name || user.email || 'Admin';
    loadPanel('overview');
  }

  if (setupForm) {
    setupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (setupError) setupError.textContent = '';
      const btn = setupForm.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;

      try {
        const data = await api('/api/admin/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setupKey: document.getElementById('setup-key').value,
            name: document.getElementById('setup-name').value,
            email: document.getElementById('setup-email').value,
            password: document.getElementById('setup-password').value
          })
        });
        toast(data.message || 'Admin account ready.', 'success');
        showDashboard(data.user);
      } catch (err) {
        if (setupError) setupError.textContent = err.message;
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', async () => {
      try {
        await api('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      } catch (_) {}
      window.location.href = 'index.html';
    });
  }

  // ── Tab navigation ────────────────────────────────────────────────────────

  navItems.forEach((item) => {
    item.addEventListener('click', () => loadPanel(item.dataset.nav));
  });

  function setActiveNav(key) {
    navItems.forEach((item) => item.classList.toggle('active', item.dataset.nav === key));
    panels.forEach((panel) => panel.classList.toggle('is-active', panel.dataset.panel === key));
  }

  // ── Panel loader ──────────────────────────────────────────────────────────

  async function loadPanel(key) {
    setActiveNav(key);
    const panel = document.querySelector('[data-panel="' + key + '"]');
    if (!panel) return;

    switch (key) {
      case 'overview':  await renderOverview(panel); break;
      case 'events':    await renderEvents(panel);   break;
      case 'comments':  await renderComments(panel); break;
      case 'messages':  await renderMessages(panel); break;
      case 'users':     await renderUsers(panel);    break;
    }
  }

  // ── Overview ──────────────────────────────────────────────────────────────

  async function renderOverview(panel) {
    panel.innerHTML = '<p class="admin-loading">Loading…</p>';
    try {
      const stats = await api('/api/admin/overview');
      panel.innerHTML = `
        <h2 class="admin-panel-title">Overview</h2>
        <div class="admin-stat-grid">
          <div class="admin-stat-card"><strong>${stats.events}</strong><span>Active events</span></div>
          <div class="admin-stat-card"><strong>${stats.pendingComments}</strong><span>Pending comments</span></div>
          <div class="admin-stat-card"><strong>${stats.totalComments}</strong><span>Total comments</span></div>
          <div class="admin-stat-card"><strong>${stats.unreadMessages}</strong><span>Unread messages</span></div>
          <div class="admin-stat-card"><strong>${stats.messages}</strong><span>Total messages</span></div>
          <div class="admin-stat-card"><strong>${stats.users}</strong><span>Registered users</span></div>
        </div>
        <p style="color:#9ca3af;font-size:.85rem;">Use the sidebar to manage events, comments, messages, and users.</p>
      `;
      const commentBadge = document.querySelector('[data-nav="comments"] .admin-badge-count');
      if (commentBadge) {
        if (stats.pendingComments > 0) {
          commentBadge.textContent = stats.pendingComments;
          commentBadge.style.display = '';
        } else {
          commentBadge.style.display = 'none';
        }
      }
      const msgBadge = document.querySelector('[data-nav="messages"] .admin-badge-count');
      if (msgBadge) {
        if (stats.unreadMessages > 0) {
          msgBadge.textContent = stats.unreadMessages;
          msgBadge.style.display = '';
        } else {
          msgBadge.style.display = 'none';
        }
      }
    } catch (err) {
      panel.innerHTML = '<p style="color:#b91c1c;">Failed to load overview: ' + esc(err.message) + '</p>';
    }
  }

  // ── Events ────────────────────────────────────────────────────────────────

  async function renderEvents(panel) {
    panel.innerHTML = '<p class="admin-loading">Loading…</p>';
    try {
      const data = await api('/api/admin/events');
      const events = data.events || [];

      let tableRows = '';
      if (events.length === 0) {
        tableRows = '<tr><td colspan="6" class="admin-empty">No events yet. Add one below.</td></tr>';
      } else {
        events.forEach((ev) => {
          const active = ev.isActive ? '<span class="status-badge active">Active</span>' : '<span class="status-badge inactive">Inactive</span>';
          tableRows += `<tr>
            <td>${esc(ev.title)}</td>
            <td>${esc(ev.category)}</td>
            <td>${esc(String(ev.year))}</td>
            <td>${active}</td>
            <td>${esc(fmtDate(ev.createdAt))}</td>
            <td>
              <div class="admin-action-group">
                <button class="admin-action-btn toggle" data-ev-toggle="${ev.id}" data-active="${ev.isActive ? '1' : '0'}">${ev.isActive ? 'Deactivate' : 'Activate'}</button>
                <button class="admin-action-btn delete" data-ev-delete="${ev.id}">Delete</button>
              </div>
            </td>
          </tr>`;
        });
      }

      panel.innerHTML = `
        <h2 class="admin-panel-title">Events</h2>
        <div class="admin-form-card">
          <h3>Add a new event</h3>
          <form id="add-event-form">
            <div class="admin-form-grid">
              <div class="admin-field full-width">
                <label for="ev-title">Title <span style="color:#ef4444">*</span></label>
                <input id="ev-title" type="text" placeholder="Event name" required maxlength="120">
              </div>
              <div class="admin-field full-width">
                <label for="ev-desc">Description <span style="color:#ef4444">*</span></label>
                <textarea id="ev-desc" placeholder="Describe the event…" required maxlength="1200"></textarea>
              </div>
              <div class="admin-field">
                <label for="ev-category">Category <span style="color:#ef4444">*</span></label>
                <select id="ev-category">
                  <option value="energy">Energy / Innovation</option>
                  <option value="forums">Forums</option>
                  <option value="eco">Ecology</option>
                  <option value="sport">Sport</option>
                  <option value="health">Health</option>
                  <option value="community" selected>Community</option>
                </select>
              </div>
              <div class="admin-field">
                <label for="ev-year">Year <span style="color:#ef4444">*</span></label>
                <input id="ev-year" type="number" min="2020" max="2100" value="2026">
              </div>
              <div class="admin-field">
                <label for="ev-location">Location</label>
                <input id="ev-location" type="text" placeholder="City, Country" maxlength="120">
              </div>
              <div class="admin-field">
                <label for="ev-type">Type</label>
                <input id="ev-type" type="text" placeholder="e.g. Field visit / Forum" maxlength="120">
              </div>
              <div class="admin-field full-width">
                <label for="ev-focus">Focus keywords</label>
                <input id="ev-focus" type="text" placeholder="e.g. Sustainability, youth, ecology" maxlength="240">
              </div>
              <div class="admin-field">
                <label for="ev-status">Status</label>
                <input id="ev-status" type="text" placeholder="e.g. Attended — photos available" maxlength="120" value="Upcoming">
              </div>
              <div class="admin-field">
                <label for="ev-image">Image URL</label>
                <input id="ev-image" type="text" placeholder="assets/images/..." maxlength="300">
              </div>
              <div class="admin-field full-width">
                <label for="ev-gallery">Gallery key</label>
                <input id="ev-gallery" type="text" placeholder="e.g. energy-week (must match lightbox.js)" maxlength="60">
                <p class="admin-field-hint">Lowercase, hyphens only. Must match a gallery registered in js/lightbox.js to enable photo browsing.</p>
              </div>
            </div>
            <div class="admin-form-footer">
              <button class="admin-form-submit" type="submit">Add event</button>
              <span class="admin-form-msg" id="add-event-msg"></span>
            </div>
          </form>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Title</th><th>Category</th><th>Year</th><th>Status</th><th>Added</th><th>Actions</th></tr></thead>
            <tbody id="events-tbody">${tableRows}</tbody>
          </table>
        </div>
      `;

      document.getElementById('add-event-form').addEventListener('submit', addEvent);
      panel.removeEventListener('click', handleEventActions);
      panel.addEventListener('click', handleEventActions);
    } catch (err) {
      panel.innerHTML = '<p style="color:#b91c1c;">Failed to load events: ' + esc(err.message) + '</p>';
    }
  }

  async function addEvent(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const msg = document.getElementById('add-event-msg');
    btn.disabled = true;
    msg.textContent = '';
    msg.className = 'admin-form-msg';

    try {
      await api('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: document.getElementById('ev-title').value,
          description: document.getElementById('ev-desc').value,
          category: document.getElementById('ev-category').value,
          year: Number(document.getElementById('ev-year').value),
          location: document.getElementById('ev-location').value,
          eventType: document.getElementById('ev-type').value,
          focus: document.getElementById('ev-focus').value,
          status: document.getElementById('ev-status').value,
          imageUrl: document.getElementById('ev-image').value,
          galleryKey: document.getElementById('ev-gallery').value
        })
      });
      toast('Event added.', 'success');
      msg.textContent = 'Event added.';
      msg.className = 'admin-form-msg success';
      e.target.reset();
      document.getElementById('ev-year').value = '2026';
      document.getElementById('ev-status').value = 'Upcoming';
      await renderEvents(document.querySelector('[data-panel="events"]'));
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'admin-form-msg error';
    } finally {
      btn.disabled = false;
    }
  }

  async function handleEventActions(e) {
    const toggleBtn = e.target.closest('[data-ev-toggle]');
    const deleteBtn = e.target.closest('[data-ev-delete]');

    if (toggleBtn) {
      const id = toggleBtn.dataset.evToggle;
      const currentlyActive = toggleBtn.dataset.active === '1';
      toggleBtn.disabled = true;
      try {
        await api('/api/admin/events/' + id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !currentlyActive })
        });
        toast(currentlyActive ? 'Event deactivated.' : 'Event activated.', 'success');
        await renderEvents(document.querySelector('[data-panel="events"]'));
      } catch (err) {
        toast(err.message, 'error');
        toggleBtn.disabled = false;
      }
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.evDelete;
      if (!confirm('Delete this event permanently? This cannot be undone.')) return;
      deleteBtn.disabled = true;
      try {
        await api('/api/admin/events/' + id, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        });
        toast('Event deleted.', 'success');
        await renderEvents(document.querySelector('[data-panel="events"]'));
      } catch (err) {
        toast(err.message, 'error');
        deleteBtn.disabled = false;
      }
    }
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async function renderComments(panel) {
    panel.innerHTML = '<p class="admin-loading">Loading…</p>';
    try {
      const data = await api('/api/admin/comments');
      const comments = data.comments || [];

      let rows = '';
      if (comments.length === 0) {
        rows = '<tr><td colspan="6" class="admin-empty">No comments yet.</td></tr>';
      } else {
        comments.forEach((c) => {
          let badge;
          if (c.isDeleted)      badge = '<span class="status-badge deleted">Deleted</span>';
          else if (!c.isApproved) badge = '<span class="status-badge pending">Pending</span>';
          else                  badge = '<span class="status-badge approved">Approved</span>';

          let actions = '';
          if (!c.isApproved && !c.isDeleted) {
            actions += '<button class="admin-action-btn approve" data-c-approve="' + c.id + '">Approve</button>';
          }
          if (!c.isDeleted) {
            actions += '<button class="admin-action-btn delete" data-c-delete="' + c.id + '">Delete</button>';
          }

          rows += `<tr>
            <td class="truncate" style="max-width:120px">${esc(c.page)}</td>
            <td>${esc(c.user.name)}<br><span style="font-size:.75rem;color:#9ca3af">${esc(c.user.email)}</span></td>
            <td style="max-width:280px">${esc(truncate(c.content, 120))}</td>
            <td>${badge}</td>
            <td style="white-space:nowrap">${esc(fmtDate(c.createdAt))}</td>
            <td><div class="admin-action-group">${actions || '—'}</div></td>
          </tr>`;
        });
      }

      panel.innerHTML = `
        <h2 class="admin-panel-title">Comments</h2>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Page</th><th>User</th><th>Content</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      panel.removeEventListener('click', handleCommentActions);
      panel.addEventListener('click', handleCommentActions);
    } catch (err) {
      panel.innerHTML = '<p style="color:#b91c1c;">Failed to load comments: ' + esc(err.message) + '</p>';
    }
  }

  async function handleCommentActions(e) {
    const approveBtn = e.target.closest('[data-c-approve]');
    const deleteBtn  = e.target.closest('[data-c-delete]');

    if (approveBtn) {
      const id = approveBtn.dataset.cApprove;
      approveBtn.disabled = true;
      try {
        await api('/api/admin/comments/' + id + '/approve', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        });
        toast('Comment approved.', 'success');
        await renderComments(document.querySelector('[data-panel="comments"]'));
      } catch (err) {
        toast(err.message, 'error');
        approveBtn.disabled = false;
      }
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.cDelete;
      if (!confirm('Delete this comment?')) return;
      deleteBtn.disabled = true;
      try {
        await api('/api/comments/' + id, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        });
        toast('Comment deleted.', 'success');
        await renderComments(document.querySelector('[data-panel="comments"]'));
      } catch (err) {
        toast(err.message, 'error');
        deleteBtn.disabled = false;
      }
    }
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  async function renderMessages(panel) {
    panel.innerHTML = '<p class="admin-loading">Loading…</p>';
    try {
      const data = await api('/api/admin/messages');
      const msgs = data.messages || [];

      let rows = '';
      if (msgs.length === 0) {
        rows = '<tr><td colspan="6" class="admin-empty">No messages yet.</td></tr>';
      } else {
        msgs.forEach((m) => {
          const badge = m.isRead
            ? '<span class="status-badge read">Read</span>'
            : '<span class="status-badge unread">Unread</span>';
          let actions = '';
          if (!m.isRead) {
            actions += '<button class="admin-action-btn read-btn" data-m-read="' + m.id + '">Mark read</button>';
          }
          actions += '<button class="admin-action-btn delete" data-m-delete="' + m.id + '">Delete</button>';

          rows += `<tr>
            <td>${esc(m.name)}</td>
            <td>${esc(m.email)}</td>
            <td>${esc(m.interest || '—')}</td>
            <td style="max-width:240px">${esc(truncate(m.message || '', 100))}</td>
            <td>${badge}</td>
            <td style="white-space:nowrap">${esc(fmtDate(m.created_at))}</td>
            <td><div class="admin-action-group">${actions}</div></td>
          </tr>`;
        });
      }

      panel.innerHTML = `
        <h2 class="admin-panel-title">Contact Messages</h2>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Interest</th><th>Message</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      panel.removeEventListener('click', handleMessageActions);
      panel.addEventListener('click', handleMessageActions);
    } catch (err) {
      panel.innerHTML = '<p style="color:#b91c1c;">Failed to load messages: ' + esc(err.message) + '</p>';
    }
  }

  async function handleMessageActions(e) {
    const readBtn   = e.target.closest('[data-m-read]');
    const deleteBtn = e.target.closest('[data-m-delete]');

    if (readBtn) {
      const id = readBtn.dataset.mRead;
      readBtn.disabled = true;
      try {
        await api('/api/admin/messages/' + id + '/read', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        });
        await renderMessages(document.querySelector('[data-panel="messages"]'));
      } catch (err) {
        toast(err.message, 'error');
        readBtn.disabled = false;
      }
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.mDelete;
      if (!confirm('Delete this message permanently?')) return;
      deleteBtn.disabled = true;
      try {
        await api('/api/admin/messages/' + id, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        });
        toast('Message deleted.', 'success');
        await renderMessages(document.querySelector('[data-panel="messages"]'));
      } catch (err) {
        toast(err.message, 'error');
        deleteBtn.disabled = false;
      }
    }
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  async function renderUsers(panel) {
    panel.innerHTML = '<p class="admin-loading">Loading…</p>';
    try {
      const me = await api('/api/auth/me');
      const myId = me.user ? me.user.id : null;
      const data = await api('/api/admin/users');
      const users = data.users || [];

      let rows = '';
      if (users.length === 0) {
        rows = '<tr><td colspan="5" class="admin-empty">No users yet.</td></tr>';
      } else {
        users.forEach((u) => {
          const roleBadge = u.role === 'admin'
            ? '<span class="status-badge admin">Admin</span>'
            : '<span class="status-badge member">Member</span>';
          const isMe = u.id === myId;
          let actions = isMe ? '<span style="color:#9ca3af;font-size:.8rem">You</span>' : '';
          if (!isMe) {
            if (u.role !== 'admin') {
              actions = '<button class="admin-action-btn promote" data-u-role="' + u.id + '" data-u-set="admin">Make admin</button>';
            } else {
              actions = '<button class="admin-action-btn demote" data-u-role="' + u.id + '" data-u-set="member">Remove admin</button>';
            }
          }

          rows += `<tr>
            <td>${esc(u.name)}</td>
            <td>${esc(u.email)}</td>
            <td>${esc(u.provider)}</td>
            <td>${roleBadge}</td>
            <td style="white-space:nowrap">${esc(fmtDate(u.created_at))}</td>
            <td>${actions}</td>
          </tr>`;
        });
      }

      panel.innerHTML = `
        <h2 class="admin-panel-title">Users</h2>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Provider</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      panel.removeEventListener('click', handleUserActions);
      panel.addEventListener('click', handleUserActions);
    } catch (err) {
      panel.innerHTML = '<p style="color:#b91c1c;">Failed to load users: ' + esc(err.message) + '</p>';
    }
  }

  async function handleUserActions(e) {
    const roleBtn = e.target.closest('[data-u-role]');
    if (!roleBtn) return;

    const id = roleBtn.dataset.uRole;
    const newRole = roleBtn.dataset.uSet;
    const label = newRole === 'admin' ? 'promote this user to admin' : 'remove admin from this user';
    if (!confirm('Are you sure you want to ' + label + '?')) return;

    roleBtn.disabled = true;
    try {
      await api('/api/admin/users/' + id + '/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      toast(newRole === 'admin' ? 'User promoted to admin.' : 'Admin role removed.', 'success');
      await renderUsers(document.querySelector('[data-panel="users"]'));
    } catch (err) {
      toast(err.message, 'error');
      roleBtn.disabled = false;
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
  } else {
    checkAuth();
  }
})();
