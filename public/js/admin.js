/* ══════════════════════════════════════════
   ADOTEPET — Admin JS
   ══════════════════════════════════════════ */

let adminPwd = '';
let allData  = [];

// ─── TOAST ──────────────────────────────────────────────────────
function toast(msg, type) {
  const wrap = document.getElementById('twrap');
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'err' ? ' err' : '');
  el.innerHTML = `<span>${type === 'err' ? '❌' : '✅'}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'tOut .3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3800);
}

// ─── COUNT ANIMATION ────────────────────────────────────────────
function count(id, n) {
  const el = document.getElementById(id);
  if (!el) return;
  let i = 0;
  const step = Math.max(1, Math.ceil(n / 28));
  const timer = setInterval(() => {
    i = Math.min(i + step, n);
    el.textContent = i;
    if (i >= n) clearInterval(timer);
  }, 40);
}

// ─── LOGIN ──────────────────────────────────────────────────────
async function login() {
  const input = document.getElementById('pwdInput');
  const errEl = document.getElementById('pwdError');
  const btn   = document.getElementById('loginBtn');
  const v = input.value.trim();
  if (!v) return;

  btn.innerHTML = '<span class="spinner"></span> Verificando...';
  btn.disabled = true;
  errEl.textContent = '';

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: v }),
    });
    if (res.ok) {
      adminPwd = v;
      document.getElementById('pwdOverlay').style.display = 'none';
      document.body.style.overflow = '';
      loadAnimals();
    } else {
      errEl.textContent = 'Senha incorreta. Tente novamente.';
      input.value = '';
      input.focus();
    }
  } catch {
    errEl.textContent = 'Erro de conexão.';
  } finally {
    btn.innerHTML = '🔓 Entrar no Painel';
    btn.disabled = false;
  }
}

document.getElementById('pwdInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') login();
});

// ─── LOAD ────────────────────────────────────────────────────────
async function loadAnimals() {
  const grid = document.getElementById('agrid');
  grid.innerHTML = Array(6).fill(`
    <div class="skel-card">
      <div class="skel skel-img"></div>
      <div class="skel-body">
        <div class="skel skel-ln s"></div>
        <div class="skel skel-ln l"></div>
        <div class="skel skel-ln m"></div>
      </div>
    </div>`).join('');

  try {
    const res = await fetch('/api/animais');
    allData = await res.json();
    renderAnimals(allData);

    const dogs = allData.filter(a => a.especie === 'Cachorro').length;
    const cats = allData.filter(a => a.especie === 'Gato').length;
    count('stTotal', allData.length);
    count('stCach',  dogs);
    count('stGato',  cats);
  } catch {
    grid.innerHTML = `
      <div class="aempty">
        <span class="aempty-ico">😿</span>
        <h3>Erro ao carregar</h3>
        <p>Verifique a conexão e tente novamente.</p>
      </div>`;
  }
}

// ─── FILTER ──────────────────────────────────────────────────────
document.getElementById('adminSearch')?.addEventListener('input', function () {
  const q = this.value.toLowerCase();
  const filtered = allData.filter(a =>
    (a.nome    || '').toLowerCase().includes(q) ||
    (a.especie || '').toLowerCase().includes(q) ||
    (a.raca    || '').toLowerCase().includes(q)
  );
  renderAnimals(filtered);
});

// ─── RENDER ──────────────────────────────────────────────────────
function renderAnimals(data) {
  const grid = document.getElementById('agrid');

  if (!data.length) {
    grid.innerHTML = `
      <div class="aempty">
        <span class="aempty-ico">🎉</span>
        <h3>Tudo certo!</h3>
        <p>Todos os animais já encontraram um lar.</p>
      </div>`;
    return;
  }

  grid.innerHTML = data.map((a, i) => {
    const nameSafe = (a.nome || '').replace(/'/g, '');
    const delay    = Math.min(i, 8) * 50;
    return `
      <div class="acard" style="animation-delay:${delay}ms">
        <img
          src="${a.imagemUrl || 'https://placedog.net/600/400?r'}"
          alt="${a.nome || 'Animal'}"
          loading="lazy"
          onerror="this.src='https://via.placeholder.com/600x400?text=Sem+foto'"
        >
        <div class="acard-body">
          <div class="atags">
            ${a.especie ? `<span class="atag">${a.especie}</span>` : ''}
            ${a.raca    ? `<span class="atag">${a.raca}</span>`    : ''}
            ${a.idade   ? `<span class="atag">${a.idade}</span>`   : ''}
          </div>
          <h3>${a.nome || 'Sem nome'}</h3>
          <p class="ameta">
            Doador: ${a.nomeDoador || '—'}&nbsp;&nbsp;•&nbsp;&nbsp;${a.contatoDoador || '—'}
          </p>
          <button class="btn-del" onclick="deleteAnimal('${a._id}', '${nameSafe}', this)">
            🗑️ Remover — Encontrou um lar!
          </button>
        </div>
      </div>`;
  }).join('');
}

// ─── DELETE ──────────────────────────────────────────────────────
async function deleteAnimal(id, nome, btn) {
  if (!confirm(`Remover "${nome}"?\nEsta ação não pode ser desfeita.`)) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Removendo...';

  try {
    const res = await fetch(`/api/animais/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': adminPwd },
    });

    if (res.ok) {
      toast(`${nome} removido! 🏡`);
      allData = allData.filter(a => a._id !== id);
      renderAnimals(allData);
      document.getElementById('stTotal').textContent = allData.length;
      document.getElementById('stCach').textContent  = allData.filter(a => a.especie === 'Cachorro').length;
      document.getElementById('stGato').textContent  = allData.filter(a => a.especie === 'Gato').length;
    } else if (res.status === 401) {
      toast('Senha inválida!', 'err');
      adminPwd = '';
      document.getElementById('pwdInput').value = '';
      document.getElementById('pwdOverlay').style.display = 'flex';
      document.body.style.overflow = 'hidden';
    } else {
      toast('Erro ao remover.', 'err');
      btn.disabled = false;
      btn.innerHTML = '🗑️ Remover — Encontrou um lar!';
    }
  } catch {
    toast('Erro de conexão.', 'err');
    btn.disabled = false;
    btn.innerHTML = '🗑️ Remover — Encontrou um lar!';
  }
}

// ─── INIT ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.body.style.overflow = 'hidden';
  document.getElementById('pwdInput')?.focus();
});