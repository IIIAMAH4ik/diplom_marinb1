// Minimal app.js — handles auth flag, course rendering & filtering, and chat widget (mock replies)
console.log('app.js loaded');

// --- Authentication helpers (server-backed sessions)
const API_BASE = (window.__API_BASE__ || 'http://localhost:4000');
async function fetchMe(){
  try{
    const r = await fetch(`${API_BASE}/api/me`, { credentials: 'include' });
    return await r.json();
  }catch(e){ return { user: null } }
}
function updateAuthUIFromUser(user){
  const logged = !!user;
  document.querySelectorAll('.btn-login').forEach(el=> el.style.display = logged ? 'none' : 'inline-block');
  document.querySelectorAll('.btn-logout').forEach(el=> el.style.display = logged ? 'inline-block' : 'none');
}

// --- Courses data and rendering ---
const COURSES = [
  {id:1, title:'Веб-разработка с нуля', category:'Разработка', level:'Начальный', hours:30},
  {id:2, title:'Продвинутый JavaScript', category:'Разработка', level:'Продвинутый', hours:40},
  {id:3, title:'UI/UX дизайн — практический', category:'Дизайн', level:'Средний', hours:20},
  {id:4, title:'Маркетинг в социальных сетях', category:'Маркетинг', level:'Начальный', hours:15},
  {id:5, title:'Python для анализа данных', category:'Разработка', level:'Средний', hours:25},
  {id:6, title:'Курс по SQL', category:'Разработка', level:'Начальный', hours:10}
];

function renderCourses(container, list){
  if(!container) return;
  container.innerHTML = list.map(c => `
    <article class="course-card" data-category="${c.category}">
      <div class="thumb" aria-hidden="true"></div>
      <h3>${c.title}</h3>
      <p class="meta">Уровень: ${c.level} • ${c.hours} часов</p>
      <a class="course-cta" href="#">Подробнее</a>
    </article>
  `).join('');
}

function filterCourses(query, category){
  const q = (query||'').toLowerCase().trim();
  return COURSES.filter(c => {
    const matchesQuery = !q || c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
    const matchesCat = !category || category === 'Все' || c.category === category;
    return matchesQuery && matchesCat;
  });
}

// --- Main initialization ---
document.addEventListener('DOMContentLoaded', async ()=>{
  try{

    // Logout links
    document.querySelectorAll('.btn-logout').forEach(btn=> btn.addEventListener('click', async e=>{ e.preventDefault(); try{ await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' }); }catch(_){} window.location.href='index.html'; }));

    // Initial render of course grids
    document.querySelectorAll('.courses-grid').forEach(grid => {
      const path = window.location.pathname || '';
      const isIndex = path.endsWith('index.html') || path.endsWith('/') || path === '';
      renderCourses(grid, isIndex ? COURSES.slice(0,3) : COURSES);
    });

    // Search handlers
    function applySearch(query, category, targetAll){
      const results = filterCourses(query, category);
      if(targetAll){
        document.querySelectorAll('.courses-grid').forEach(g => renderCourses(g, results));
      }else{
        const g = document.querySelector('.courses-grid'); renderCourses(g, results);
      }
    }

    const mainSearch = document.getElementById('search-form-main');
    const coursesSearch = document.getElementById('search-form-courses');
    const filterSelect = document.getElementById('filter-select');

    if(mainSearch) mainSearch.addEventListener('submit', e=>{ e.preventDefault(); const q = mainSearch.querySelector('input[type=search]').value; applySearch(q, filterSelect?filterSelect.value:null, false); });
    if(coursesSearch) coursesSearch.addEventListener('submit', e=>{ e.preventDefault(); const q = coursesSearch.querySelector('input[type=search]').value; applySearch(q, filterSelect?filterSelect.value:null, true); });
    if(filterSelect) filterSelect.addEventListener('change', ()=>{ const q = (coursesSearch? coursesSearch.querySelector('input[type=search]').value : '') || ''; applySearch(q, filterSelect.value, true); });

    // --- Chat widget (mock) injection on all pages except login/register ---
    const page = (window.location.pathname || '').split('/').pop().toLowerCase();
    if(page !== 'login.html' && page !== 'register.html'){
      const widget = document.createElement('div'); widget.className = 'chat-widget';
      widget.innerHTML = `
        <div class="chat-toggle" title="Чат">💬</div>
        <div class="chat-panel" role="dialog" aria-label="Чат поддержки">
          <div class="chat-header"><div class="title">Помощник EduStart</div><div class="mini">online</div></div>
          <div class="chat-messages"><div class="chat-empty">Здравствуйте! Напишите сообщение, и я помогу с подбором курса.</div></div>
          <div class="chat-input"><input type="text" placeholder="Напишите сообщение..." aria-label="Сообщение"><button type="button">Отправить</button></div>
        </div>
      `;
      document.body.appendChild(widget);

      const toggle = widget.querySelector('.chat-toggle');
      const messages = widget.querySelector('.chat-messages');
      const input = widget.querySelector('.chat-input input');
      const sendBtn = widget.querySelector('.chat-input button');

      function appendMessage(role, text){
        const empty = messages.querySelector('.chat-empty'); if(empty) empty.remove();
        const el = document.createElement('div'); el.className = 'message '+(role==='user'?'user':'bot'); el.textContent = text; messages.appendChild(el); messages.scrollTop = messages.scrollHeight;
      }

      const MOCK = ['Привет! Чем могу помочь с курсами?','Могу предложить популярные курсы по веб-разработке и дизайну.','Какой уровень подготовки у вас?','Могу подобрать курсы и расписание.'];
      function mockReply(){ setTimeout(()=> appendMessage('bot', MOCK[Math.floor(Math.random()*MOCK.length)]), 600 + Math.random()*800); }

      toggle.addEventListener('click', ()=>{ widget.classList.toggle('open'); if(widget.classList.contains('open')) input.focus(); });
      sendBtn.addEventListener('click', ()=>{ const v = input.value.trim(); if(!v) return; appendMessage('user', v); input.value=''; mockReply(); });
      input.addEventListener('keydown', e=>{ if(e.key === 'Enter'){ e.preventDefault(); sendBtn.click(); } });
    }

    // Login/register forms handling (server API)
    const loginForm = document.getElementById('login-form');
    if(loginForm) loginForm.addEventListener('submit', async e=>{
      e.preventDefault();
      const identifier = loginForm.elements['identifier'].value.trim();
      const password = loginForm.elements['password'].value;
      const idErr = document.getElementById('login-error-identifier');
      const passErr = document.getElementById('login-error-password');
      const genErr = document.getElementById('login-error-general');
      if(idErr){ idErr.style.display='none'; idErr.textContent=''; }
      if(passErr){ passErr.style.display='none'; passErr.textContent=''; }
      if(genErr){ genErr.style.display='none'; genErr.textContent=''; }

      if(!identifier || !password){ if(genErr){ genErr.textContent='Пожалуйста, заполните оба поля.'; genErr.style.display='block' } else alert('Пожалуйста, заполните оба поля.'); return; }

      const emailRe = /^\S+@\S+\.\S+$/;
      // identifier can be email or username
      if(identifier.includes('@')){
        if(!emailRe.test(identifier)){ if(idErr){ idErr.textContent='Введите корректный e-mail.'; idErr.style.display='block' } else alert('Введите корректный e-mail.'); return; }
      }else{
        if(identifier.length < 3){ if(idErr){ idErr.textContent='Логин слишком короткий'; idErr.style.display='block' } else alert('Логин слишком короткий'); return; }
      }

      // For login we only require a non-empty password; strength is enforced on registration

      try{
        const resp = await fetch(`${API_BASE}/api/login`, { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ identifier, password }) });
        const data = await resp.json();
        if(!resp.ok){
          const msg = data && data.error ? data.error : (resp.status === 401 ? 'Неверный логин или пароль' : 'Ошибка входа');
          if(genErr){ genErr.textContent = msg; genErr.style.display = 'block'; } else alert(msg);
          return;
        }
        window.location.href = 'index.html';
      }catch(err){ console.error(err); if(genErr){ genErr.textContent='Ошибка сети'; genErr.style.display='block' } else alert('Ошибка сети'); }
    });

    // Clear login errors on input
    if(loginForm){
      const identifierInput = loginForm.elements['identifier'];
      const passwordInput = loginForm.elements['password'];
      const clearId = ()=>{ const el=document.getElementById('login-error-identifier'); if(el){ el.style.display='none'; el.textContent=''; } };
      const clearPass = ()=>{ const el=document.getElementById('login-error-password'); if(el){ el.style.display='none'; el.textContent=''; } };
      const clearGen = ()=>{ const el=document.getElementById('login-error-general'); if(el){ el.style.display='none'; el.textContent=''; } };
      if(identifierInput) identifierInput.addEventListener('input', ()=>{ clearId(); clearGen(); });
      if(passwordInput) passwordInput.addEventListener('input', ()=>{ clearPass(); clearGen(); });
    }

    const regForm = document.getElementById('register-form');
    if(regForm) regForm.addEventListener('submit', async e=>{
      e.preventDefault();
      const username = regForm.elements['username'].value.trim();
      const email = regForm.elements['email'].value.trim();
      const password = regForm.elements['password'].value;
      const errorEl = document.getElementById('register-error');
      if(errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }
      if(!username||!email||!password){ if(errorEl){ errorEl.textContent='Пожалуйста, заполните все поля.'; errorEl.style.display='block' } else alert('Пожалуйста, заполните все поля.'); return; }
      const emailRe = /^\S+@\S+\.\S+$/; if(!emailRe.test(email)){ if(errorEl){ errorEl.textContent='Введите корректный e-mail.'; errorEl.style.display='block' } else alert('Введите корректный e-mail.'); return; }
      // Password criteria on registration: min 8 chars, at least one letter and one digit
      const passRe = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
      if(!passRe.test(password)){ if(errorEl){ errorEl.textContent='Пароль должен содержать ≥8 символов, буквы и цифры'; errorEl.style.display='block' } else alert('Пароль должен содержать ≥8 символов, буквы и цифры'); return; }
      try{
        const resp = await fetch(`${API_BASE}/api/register`, { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username, email, password }) });
        const data = await resp.json();
        if(!resp.ok){
          const msg = (data && data.error) ? data.error : 'Ошибка регистрации';
          if(errorEl){ errorEl.textContent = msg; errorEl.style.display = 'block'; } else alert(msg);
          return;
        }
        if(errorEl){ errorEl.style.display='none'; errorEl.textContent=''; }
        window.location.href = 'index.html';
      }catch(err){ console.error(err); if(errorEl){ errorEl.textContent='Ошибка сети'; errorEl.style.display='block' } else alert('Ошибка сети'); }
    });

    // hide register error when user edits username or email
    if(regForm){
      const usernameInput = regForm.elements['username'];
      const emailInput = regForm.elements['email'];
      const errorEl = document.getElementById('register-error');
      const clear = ()=>{ if(errorEl){ errorEl.style.display='none'; errorEl.textContent=''; } };
      if(usernameInput) usernameInput.addEventListener('input', clear);
      if(emailInput) emailInput.addEventListener('input', clear);
    }

    // Refresh auth UI from server session
    try{ const me = await fetchMe(); updateAuthUIFromUser(me.user); }catch(e){ updateAuthUIFromUser(null); }

  }catch(err){ console.error('app.js initialization error', err); }
});
