(function () {
  const backend = window.YCBackend;
  if (!backend) return;

  function init() {
    const main = document.querySelector('main');
    const footer = document.querySelector('footer');
    if (!main || !footer || document.querySelector('[data-comments-section]')) return;

    main.insertAdjacentHTML('beforeend', `
      <section class="section-shell yc-comments-section reveal" data-comments-section>
        <div class="yc-comments-head">
          <div>
            <p class="eyebrow">Community comments</p>
            <h2>Leave a note on this page.</h2>
            <p>Members can ask questions, suggest ideas, or react to Youth Collective updates.</p>
          </div>
          <button class="button secondary" type="button" data-open-auth="login" data-comment-login>Login to comment</button>
        </div>
        <form class="yc-comment-form" data-comment-form hidden>
          <label for="yc-comment-content">Your comment</label>
          <textarea id="yc-comment-content" name="content" rows="4" maxlength="1200" placeholder="Write something useful, respectful, and specific." required></textarea>
          <div class="yc-comment-actions">
            <span data-comment-count>0/1200</span>
            <button class="button primary" type="submit">Post comment</button>
          </div>
          <p class="yc-comment-status" data-comment-status aria-live="polite"></p>
        </form>
        <div class="yc-comment-list" data-comment-list aria-live="polite"></div>
      </section>
    `);

    bind();
    refreshAuthState();
    loadComments();
  }

  function pageKey() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    return path + window.location.search.replace(/[?&]reset=[^&]+/g, '').replace(/[?&]auth=[^&]+/g, '');
  }

  function bind() {
    const form = document.querySelector('[data-comment-form]');
    const textarea = form.querySelector('textarea');
    const counter = document.querySelector('[data-comment-count]');

    textarea.addEventListener('input', () => {
      counter.textContent = `${textarea.value.length}/1200`;
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = document.querySelector('[data-comment-status]');
      status.textContent = 'Posting...';
      try {
        const data = await backend.apiFetch('/api/comments', {
          method: 'POST',
          body: JSON.stringify({ page: pageKey(), content: textarea.value })
        });
        textarea.value = '';
        counter.textContent = '0/1200';
        status.textContent = data.message || 'Comment posted.';
        backend.toast(status.textContent, 'success');
        await loadComments();
      } catch (error) {
        status.textContent = error.message;
      }
    });

    document.querySelector('[data-comment-list]').addEventListener('click', async (event) => {
      const button = event.target.closest('[data-delete-comment]');
      if (!button) return;
      button.disabled = true;
      try {
        await backend.apiFetch(`/api/comments/${button.dataset.deleteComment}`, { method: 'DELETE' });
        backend.toast('Comment deleted.', 'success');
        await loadComments();
      } catch (error) {
        backend.toast(error.message, 'error');
        button.disabled = false;
      }
    });

    window.addEventListener('yc-auth-changed', (event) => {
      updateCommentAuth(event.detail.user);
      loadComments();
    });
  }

  async function refreshAuthState() {
    try {
      const user = await backend.refreshMe();
      updateCommentAuth(user);
    } catch (error) {
      updateCommentAuth(null);
    }
  }

  function updateCommentAuth(user) {
    const form = document.querySelector('[data-comment-form]');
    const login = document.querySelector('[data-comment-login]');
    if (!form || !login) return;
    const loggedIn = Boolean(user);
    form.hidden = !loggedIn;
    login.hidden = loggedIn;
  }

  async function loadComments() {
    const list = document.querySelector('[data-comment-list]');
    if (!list) return;
    list.innerHTML = '<div class="yc-comment-empty">Loading comments...</div>';
    try {
      const data = await backend.apiFetch(`/api/comments?page=${encodeURIComponent(pageKey())}`);
      renderComments(data.comments || []);
    } catch (error) {
      list.innerHTML = `<div class="yc-comment-empty">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderComments(comments) {
    const list = document.querySelector('[data-comment-list]');
    if (!comments.length) {
      list.innerHTML = '<div class="yc-comment-empty">No comments yet. Be the first to start a useful conversation.</div>';
      return;
    }

    list.innerHTML = '';
    comments.forEach((comment) => {
      const card = document.createElement('article');
      card.className = 'yc-comment-card';

      const top = document.createElement('div');
      top.className = 'yc-comment-top';

      const avatar = document.createElement('span');
      avatar.className = 'yc-comment-avatar';
      avatar.textContent = initials(comment.user.name);

      const meta = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = comment.user.name;
      const time = document.createElement('small');
      time.textContent = formatDate(comment.createdAt);
      meta.append(name, time);

      top.append(avatar, meta);
      if (comment.canDelete) {
        const del = document.createElement('button');
        del.className = 'yc-comment-delete';
        del.type = 'button';
        del.dataset.deleteComment = comment.id;
        del.textContent = 'Delete';
        top.appendChild(del);
      }

      const body = document.createElement('p');
      body.textContent = comment.content;
      card.append(top, body);
      list.appendChild(card);
    });
  }

  function initials(name) {
    return String(name || 'YC').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value + 'Z'));
    } catch {
      return value;
    }
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
