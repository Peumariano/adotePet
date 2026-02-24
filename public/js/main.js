function toggleForm() {
    const modal = document.getElementById('modalForm');
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
}

async function carregarAnimais() {
    const grid = document.getElementById('grid-animais');
    try {
        const res = await fetch('/api/animais');
        const animais = await res.json();
        
        grid.innerHTML = animais.map(animal => {
            const zapLink = `https://wa.me/${animal.contatoDoador.replace(/\D/g, '')}?text=Olá! Quero saber mais sobre o ${animal.nome}`;
            return `
                <div class="card">
                    <img src="${animal.imagemUrl}" alt="${animal.nome}">
                    <div class="card-body">
                        <h3>${animal.nome}</h3>
                        <p><strong>${animal.especie}</strong> • ${animal.idade}</p>
                        <p>${animal.descricao || ''}</p>
                        <button class="btn-hero-main" style="width:100%" onclick="window.open('${zapLink}')">Quero Adotar</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        grid.innerHTML = "<p>Erro ao carregar animais.</p>";
    }
}

document.getElementById('formAnimal').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.innerText = "Cadastrando...";

    try {
        const res = await fetch('/api/animais', { method: 'POST', body: formData });
        if (res.ok) {
            alert("Sucesso!");
            location.reload();
        }
    } catch (err) {
        alert("Erro ao cadastrar.");
    } finally {
        btn.disabled = false;
    }
};

// ─── TOAST ───────────────────────────────────────────────
const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icon = type === 'success' ? '✅' : '❌';
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  toastContainer.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

// ─── NAVBAR SCROLL ─────────────────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
});

// ─── MODAL ─────────────────────────────────────────────
function toggleForm() {
  const modal = document.getElementById('modalForm');
  modal.classList.toggle('open');
  document.body.style.overflow = modal.classList.contains('open') ? 'hidden' : '';
}

// close on backdrop click
document.getElementById('modalForm')?.addEventListener('click', e => {
  if (e.target.id === 'modalForm') toggleForm();
});

// Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const m = document.getElementById('modalForm');
    if (m?.classList.contains('open')) toggleForm();
  }
});

// ─── IMAGE PREVIEW ─────────────────────────────────────
const fotoInput = document.querySelector('input[name="foto"]');
let previewEl = null;

if (fotoInput) {
  const wrap = document.createElement('div');
  wrap.className = 'upload-preview';
  const img = document.createElement('img');
  wrap.appendChild(img);
  fotoInput.parentNode.insertBefore(wrap, fotoInput.nextSibling);
  previewEl = { wrap, img };

  fotoInput.addEventListener('change', () => {
    const file = fotoInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        previewEl.img.src = e.target.result;
        previewEl.wrap.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });
}

// ─── SUBMIT FORM ───────────────────────────────────────
document.getElementById('formAnimal')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-success');
  btn.textContent = '⏳ Cadastrando...';
  btn.disabled = true;

  const formData = new FormData(e.target);

  try {
    const res = await fetch('/api/animais', { method: 'POST', body: formData });
    if (res.ok) {
      showToast('Animal cadastrado com sucesso! 🐾');
      e.target.reset();
      if (previewEl) previewEl.wrap.style.display = 'none';
      toggleForm();
      await carregarAnimais();
    } else {
      showToast('Erro ao cadastrar. Tente novamente.', 'error');
    }
  } catch {
    showToast('Erro de conexão.', 'error');
  } finally {
    btn.textContent = 'Cadastrar Animal';
    btn.disabled = false;
  }
});

// ─── ANIMALS ──────────────────────────────────────────
let todosAnimais = [];
let filtroAtual = 'Todos';

async function carregarAnimais() {
  const grid = document.getElementById('grid-animais');
  if (!grid) return;

  // Show skeletons
  grid.innerHTML = Array(6).fill(`
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line long"></div>
        <div class="skeleton skeleton-line"></div>
      </div>
    </div>
  `).join('');

  try {
    const res = await fetch('/api/animais');
    todosAnimais = await res.json();
    renderAnimais();
    atualizarStats();
  } catch {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😿</div>
        <h3>Não foi possível carregar</h3>
        <p>Verifique sua conexão e recarregue a página.</p>
      </div>`;
  }
}

function renderAnimais() {
  const grid = document.getElementById('grid-animais');
  if (!grid) return;

  const filtrados = filtroAtual === 'Todos'
    ? todosAnimais
    : todosAnimais.filter(a => a.especie === filtroAtual);

  if (filtrados.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🐾</div>
        <h3>Nenhum animal por aqui ainda</h3>
        <p>Seja o primeiro a cadastrar um animal para adoção!</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtrados.map((a, i) => {
    const initials = (a.nomeDoador || 'A').charAt(0).toUpperCase();
    const wpp = a.contatoDoador ? a.contatoDoador.replace(/\D/g, '') : '';
    const wppLink = wpp ? `https://wa.me/55${wpp}?text=Olá! Vi o anúncio do ${a.nome} no AdoteAmigo e gostaria de saber mais!` : '#';
    const delay = (i % 6) * 80;

    return `
      <div class="card" style="animation-delay:${delay}ms">
        <div class="card-img-wrap">
          <img src="${a.imagemUrl}" alt="${a.nome}" loading="lazy">
          <div class="card-badge">${a.especie || 'Animal'}</div>
        </div>
        <div class="card-body">
          <div class="card-meta">
            ${a.raca ? `<span class="tag">${a.raca}</span>` : ''}
            ${a.idade ? `<span class="tag sage">${a.idade}</span>` : ''}
          </div>
          <h3>${a.nome}</h3>
          <p>${a.descricao || 'Um amiguinho esperando por um lar cheio de amor.'}</p>
          <div class="card-footer">
            <div class="card-donor">
              <div class="donor-avatar">${initials}</div>
              <span class="donor-name">${a.nomeDoador || 'Doador'}</span>
            </div>
            <a href="${wppLink}" target="_blank" class="btn-whatsapp">
              💬 Adotar
            </a>
          </div>
        </div>
      </div>`;
  }).join('');
}

function atualizarStats() {
  const cachorros = todosAnimais.filter(a => a.especie === 'Cachorro').length;
  const gatos = todosAnimais.filter(a => a.especie === 'Gato').length;

  const els = {
    total: document.getElementById('stat-total'),
    cachorros: document.getElementById('stat-cachorros'),
    gatos: document.getElementById('stat-gatos'),
  };
  if (els.total) animateCount(els.total, todosAnimais.length);
  if (els.cachorros) animateCount(els.cachorros, cachorros);
  if (els.gatos) animateCount(els.gatos, gatos);
}

function animateCount(el, target) {
  let n = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const timer = setInterval(() => {
    n = Math.min(n + step, target);
    el.textContent = n;
    if (n >= target) clearInterval(timer);
  }, 40);
}

// ─── FILTER BUTTONS ─────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroAtual = btn.dataset.filter;
    renderAnimais();
  });
});

// ─── INIT ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', carregarAnimais);