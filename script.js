// script.js

// — DARK-MODE SVGs
const moonSVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12.79A9 9 0 0111.21 3 7 7 0 0021 12.79z"/>
  </svg>`;
const sunSVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>`;

// — SHA-256 hash helper
async function hashPassword(pw) {
  const enc = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2,'0'))
    .join('');
}

// — Storage keys & defaults
const POSTS_KEY   = 'myBlogPosts';
const PINNED_KEY  = 'myBlogPinned';
const ADMIN_KEY   = 'myBlogIsAdmin';
const PASS_KEY    = 'myBlogPassHash';
const DEFAULT_POSTS = [
  { id:1, title:'Building a Minimalist Portfolio', date:'2025-04-20', video:'', excerpt:'…', content:'' },
  { id:2, title:'My First Design Case Study',      date:'2025-03-15', video:'', excerpt:'…', content:'' }
];

// ── Protect secret.html ──
if (
  location.pathname.endsWith('secret.html') &&
  localStorage.getItem(ADMIN_KEY) !== 'true'
) {
  alert('Access denied. Please log in as admin.');
  location.href = 'index.html';
}

// — Ensure default password
;(async()=>{
  if (!localStorage.getItem(PASS_KEY)) {
    localStorage.setItem(PASS_KEY, await hashPassword('admin123'));
  }
})();

// — load/save
function load(key, def) {
  const j = localStorage.getItem(key);
  return j ? JSON.parse(j) : def;
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// — Theme toggle (emoji)
;(function(){
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const isDark = ()=> document.documentElement.classList.contains('dark');
  if (localStorage.theme === 'dark') document.documentElement.classList.add('dark');
  btn.innerHTML = isDark() ? sunSVG : moonSVG;
  btn.onclick = () => {
    document.documentElement.classList.toggle('dark');
    const d = isDark();
    localStorage.theme = d ? 'dark' : 'light';
    btn.innerHTML = d ? sunSVG : moonSVG;
  };
})();

// — Auth UI
function setupAuth() {
  const login = document.getElementById('login-btn');
  const logout = document.getElementById('logout-btn');
  const add = document.getElementById('add-post-btn');
  const isAdmin = () => localStorage.getItem(ADMIN_KEY) === 'true';

  function refresh() {
    if (isAdmin()) {
      login.style.display = 'none';
      logout.style.display = 'inline';
      if (add) add.style.display = 'inline';
    } else {
      login.style.display = 'inline';
      logout.style.display = 'none';
      if (add) add.style.display = 'none';
    }
  }

  login.onclick = async () => {
    const u = prompt('Username:'), p = prompt('Password:');
    if (u === 'admin' && await hashPassword(p) === localStorage.getItem(PASS_KEY)) {
      localStorage.setItem(ADMIN_KEY, 'true');
      alert('Logged in!');
    } else {
      alert('Bad credentials.');
    }
    refresh(); renderIndex(); renderArchive();
  };
  logout.onclick = () => {
    localStorage.setItem(ADMIN_KEY, 'false');
    refresh(); renderIndex(); renderArchive();
  };
  refresh();
}

// — Secret profile link
function setupSecretLink() {
  const link = document.getElementById('secret-link');
  if (link) link.onclick = e => { e.preventDefault(); location.href = 'secret.html'; };
}

// — Add-Post Modal wiring
function setupAddPost() {
  const addBtn = document.getElementById('add-post-btn');
  const modal = document.getElementById('post-modal');
  const cancelBtn = document.getElementById('cancel-post');
  const form = document.getElementById('post-form');
  if (!addBtn || !modal || !cancelBtn || !form) return;

  addBtn.onclick = () => modal.style.display = 'flex';
  cancelBtn.onclick = () => modal.style.display = 'none';

  form.onsubmit = e => {
    e.preventDefault();
    const f = e.target;
    const posts = load(POSTS_KEY, DEFAULT_POSTS);
    const id = posts.length ? Math.max(...posts.map(p=>p.id)) + 1 : 1;

    posts.push({
      id,
      title:   f.title.value,
      date:    f.date.value,
      video:   f.video.value,
      excerpt: f.excerpt.value,
      content: f.content.value
    });
    save(POSTS_KEY, posts);
    modal.style.display = 'none';
    f.reset();
    renderIndex(); renderArchive();
  };
}

// — Render Home posts
function renderIndex() {
  const out = document.getElementById('posts');
  if (!out) return;
  const posts = load(POSTS_KEY, DEFAULT_POSTS)
                  .sort((a,b)=> new Date(b.date) - new Date(a.date));
  const admin = localStorage.getItem(ADMIN_KEY) === 'true';

  out.innerHTML = '';
  posts.forEach(p => {
    const art = document.createElement('article');
    art.className = 'post';
    art.id = `post-${p.id}`;
    art.innerHTML = `
      <h2 class="post-title"><a href="#">${p.title}</a></h2>
      <time datetime="${p.date}">${new Date(p.date).toLocaleDateString()}</time>
      ${p.video
        ? `<div class="post-video">
             <video controls src="${p.video}" style="max-width:100%;">
               Your browser does not support the video tag.
             </video>
           </div>`
        : ``
      }
      <p class="post-excerpt">${p.excerpt}</p>
      <div class="post-full"><p>${p.content.replace(/\n/g,'</p><p>')}</p></div>
      <button class="read-more">Read more</button>
      ${admin?'<button class="delete-post">Delete</button>':''}
    `;
    out.appendChild(art);
  });
  attachToggles(); attachContext(); attachDeleteIndex();
}

// — Toggle “Read more”
function attachToggles() {
  document.querySelectorAll('button.read-more').forEach(b => {
    b.onclick = () => {
      const full = b.parentNode.querySelector('.post-full');
      full.classList.toggle('expanded');
      b.textContent = full.classList.contains('expanded') ? 'Read less' : 'Read more';
    };
  });
}

// — Render Archive posts
function renderArchive() {
  const out = document.getElementById('archived-posts');
  if (!out) return;
  const posts = load(POSTS_KEY, DEFAULT_POSTS);
  const pins  = load(PINNED_KEY, []);
  out.innerHTML = '<h1>Pinned Posts</h1>';
  posts.filter(p=> pins.includes(p.id))
       .sort((a,b)=> new Date(b.date)-new Date(a.date))
       .forEach(p => {
    const art = document.createElement('article');
    art.className = 'post';
    art.id = `post-${p.id}`;
    art.innerHTML = `
      <h2 class="post-title"><a href="#">${p.title}</a></h2>
      <time datetime="${p.date}">${new Date(p.date).toLocaleDateString()}</time>
      ${p.video
        ? `<div class="post-video">
             <video controls src="${p.video}" style="max-width:100%;">
               Your browser does not support the video tag.
             </video>
           </div>`
        : ``
      }
      <p class="post-excerpt">${p.excerpt}</p>
      <div class="post-full"><p>${p.content.replace(/\n/g,'</p><p>')}</p></div>
      <button class="read-more">Read more</button>
    `;
    out.appendChild(art);
  });
  attachToggles(); attachContext(); attachDeleteArchive();
}

// — Context menu  
function attachContext() {
  document.querySelectorAll('.post').forEach(el => {
    el.oncontextmenu = e => {
      if (localStorage.getItem(ADMIN_KEY) !== 'true') return;
      e.preventDefault();
      const id = +el.id.split('-')[1];
      const menu = document.getElementById('context-menu');
      const pins = load(PINNED_KEY, []);
      document.getElementById('pin-post').style.display = pins.includes(id)?'none':'block';
      document.getElementById('unpin-post').style.display = pins.includes(id)?'block':'none';
      menu.dataset.id = id;
      menu.style.top = `${e.pageY}px`;
      menu.style.left = `${e.pageX}px`;
      menu.style.display = 'block';
    };
  });
  document.body.onclick = () => document.getElementById('context-menu').style.display = 'none';
  document.getElementById('pin-post').onclick = () => {
    const id = +document.getElementById('context-menu').dataset.id;
    const pins = load(PINNED_KEY, []);
    if (!pins.includes(id)) pins.push(id);
    save(PINNED_KEY, pins); renderArchive();
    document.getElementById('context-menu').style.display = 'none';
  };
  document.getElementById('unpin-post').onclick = () => {
    const id = +document.getElementById('context-menu').dataset.id;
    let pins = load(PINNED_KEY, []).filter(x=>x!==id);
    save(PINNED_KEY, pins); renderArchive();
    document.getElementById('context-menu').style.display = 'none';
  };
}

// — Delete handlers
function attachDeleteIndex() {
  document.querySelectorAll('#posts button.delete-post').forEach(btn => {
    btn.onclick = () => {
      if (localStorage.getItem(ADMIN_KEY) !== 'true') return alert('Admin only.');
      if (!confirm('Delete this post?')) return;
      const id = +btn.parentNode.id.split('-')[1];
      save(POSTS_KEY, load(POSTS_KEY, DEFAULT_POSTS).filter(p=>p.id!==id));
      save(PINNED_KEY, load(PINNED_KEY,[]).filter(x=>x!==id));
      renderIndex(); renderArchive();
    };
  });
}
function attachDeleteArchive() {
  document.querySelectorAll('#archived-posts button.delete-post').forEach(btn => {
    btn.onclick = () => {
      if (localStorage.getItem(ADMIN_KEY) !== 'true') return alert('Admin only.');
      if (!confirm('Delete this post?')) return;
      const id = +btn.parentNode.id.split('-')[1];
      save(POSTS_KEY, load(POSTS_KEY, DEFAULT_POSTS).filter(p=>p.id!==id));
      save(PINNED_KEY, load(PINNED_KEY,[]).filter(x=>x!==id));
      renderIndex(); renderArchive();
    };
  });
}

// — Password/profile logic
function setupProfile() {
  const f = document.getElementById('password-form'),
        m = document.getElementById('password-message');
  if (!f) return;
  f.onsubmit = async e => {
    e.preventDefault();
    if (await hashPassword(f.currentPassword.value) !== localStorage.getItem(PASS_KEY)) {
      return m.textContent = 'Current password is incorrect.';
    }
    if (f.newPassword.value !== f.confirmPassword.value) {
      return m.textContent = 'New passwords do not match.';
    }
    localStorage.setItem(PASS_KEY, await hashPassword(f.newPassword.value));
    m.textContent = 'Password updated successfully.';
    f.reset();
    document.getElementById('pw-form').classList.remove('expanded');
    document.getElementById('update-pw').textContent = 'Update Password';
  };
}
function setupPasswordToggle() {
  const b = document.getElementById('update-pw'),
        d = document.getElementById('pw-form');
  if (!b||!d) return;
  b.onclick = () => {
    const o = d.classList.toggle('expanded');
    b.textContent = o ? 'Hide Password Form' : 'Update Password';
  };
}

// — Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupSecretLink();
  setupAuth();
  setupAddPost();
  renderIndex();
  attachDeleteIndex();
  renderArchive();
  attachDeleteArchive();
  setupProfile();
  setupPasswordToggle();

  // deep-link support
  const h = location.hash, t = h && document.querySelector(h);
  if (t) {
    const btn = t.querySelector('button.read-more');
    if (btn) btn.click();
    t.scrollIntoView({behavior:'smooth'});
  }
});
