// Minimal app.js — handles auth flag, course rendering & filtering, and chat widget (mock replies)
console.log('app.js loaded');

// --- Authentication helpers (simple localStorage flag) ---
function isLoggedIn(){ return localStorage.getItem('loggedIn') === 'true'; }
function setLoggedIn(flag){ if(flag) localStorage.setItem('loggedIn','true'); else localStorage.removeItem('loggedIn'); updateAuthUI(); }
function updateAuthUI(){
  const logged = isLoggedIn();
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
document.addEventListener('DOMContentLoaded', ()=>{
  try{
    updateAuthUI();

    // Logout links
    document.querySelectorAll('.btn-logout').forEach(btn=> btn.addEventListener('click', e=>{ e.preventDefault(); setLoggedIn(false); window.location.href='index.html'; }));

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

    // Login/register forms handling (minimal, preserve previous behavior)
    const loginForm = document.getElementById('login-form');
    if(loginForm) loginForm.addEventListener('submit', e=>{ e.preventDefault(); const id = loginForm.elements['identifier'].value.trim(); const pass = loginForm.elements['password'].value; if(!id||!pass){ alert('Пожалуйста, заполните оба поля.'); return; } const stored = (()=>{ try{ return JSON.parse(localStorage.getItem('edu_user')||'null'); }catch(e){return null;} })(); if(stored){ const match = (id===stored.username || id===stored.email) && pass===stored.password; if(!match){ alert('Неверный логин/пароль.'); return; } } setLoggedIn(true); window.location.href='index.html'; });

    const regForm = document.getElementById('register-form');
    if(regForm) regForm.addEventListener('submit', e=>{ e.preventDefault(); const username = regForm.elements['username'].value.trim(); const email = regForm.elements['email'].value.trim(); const pass = regForm.elements['password'].value; if(!username||!email||!pass){ alert('Пожалуйста, заполните все поля.'); return; } const emailRe = /^\S+@\S+\.\S+$/; if(!emailRe.test(email)){ alert('Введите корректный e-mail.'); return; } const user = { username, email, password: pass }; try{ localStorage.setItem('edu_user', JSON.stringify(user)); }catch(err){} setLoggedIn(true); window.location.href='index.html'; });

  }catch(err){ console.error('app.js initialization error', err); }
});
