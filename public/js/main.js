/* ══════════════════════════════════════════
   ADOTEPET — Main JS
   ══════════════════════════════════════════ */

// ─── STATE ──────────────────────────────────────────────────────
let allAnimals = [];
let currentFilter = 'Todos';

// ─── UTILS ──────────────────────────────────────────────────────
function toast(msg, type = 'ok') {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'err' ? ' err' : '');
  el.innerHTML = `<span>${type === 'err' ? '❌' : '✅'}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'tOut .3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3800);
}

function animateCount(el, target) {
  if (!el || target === 0) { if(el) el.textContent = 0; return; }
  let n = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const timer = setInterval(() => {
    n = Math.min(n + step, target);
    el.textContent = n;
    if (n >= target) clearInterval(timer);
  }, 40);
}

// ─── NAVBAR ─────────────────────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});

// Hamburger
const hamburger = document.getElementById('hamburger');
const navActions = document.getElementById('navActions');
hamburger?.addEventListener('click', () => {
  navActions.classList.toggle('open');
});

// ─── MODAL ──────────────────────────────────────────────────────
function openModal() {
  document.getElementById('modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('modal')?.addEventListener('click', e => {
  if (e.target.id === 'modal') closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ─── IMAGE PREVIEW ───────────────────────────────────────────────
const fotoInput = document.getElementById('fotoInput');
const imgPreview = document.getElementById('imgPreview');
const imgPreviewImg = document.getElementById('imgPreviewImg');

const uploadArea = document.querySelector('.upload-area');
uploadArea?.addEventListener('click', () => fotoInput.click());
uploadArea?.addEventListener('dragover', e => { e.preventDefault(); uploadArea.style.borderColor = 'var(--terra)'; });
uploadArea?.addEventListener('dragleave', () => { uploadArea.style.borderColor = ''; });
uploadArea?.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.style.borderColor = '';
  if (e.dataTransfer.files[0]) {
    fotoInput.files = e.dataTransfer.files;
    handleFilePreview(e.dataTransfer.files[0]);
  }
});

fotoInput?.addEventListener('change', () => {
  if (fotoInput.files[0]) handleFilePreview(fotoInput.files[0]);
});

function handleFilePreview(file) {
  const reader = new FileReader();
  reader.onload = e => {
    imgPreviewImg.src = e.target.result;
    imgPreview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

document.getElementById('removeImg')?.addEventListener('click', e => {
  e.stopPropagation();
  fotoInput.value = '';
  imgPreview.style.display = 'none';
  imgPreviewImg.src = '';
});

// ─── FORM SUBMIT ─────────────────────────────────────────────────
document.getElementById('formAnimal')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Cadastrando...';

  try {
    const res = await fetch('/api/animais', {
      method: 'POST',
      body: new FormData(e.target),
    });
    if (res.ok) {
      toast('Animal cadastrado com sucesso! 🐾');
      e.target.reset();
      imgPreview.style.display = 'none';
      closeModal();
      await loadAnimals();
    } else {
      const data = await res.json().catch(() => ({}));
      toast(data.error || 'Erro ao cadastrar.', 'err');
    }
  } catch {
    toast('Erro de conexão.', 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🐾 Cadastrar Animal';
  }
});

// ─── FILTER ──────────────────────────────────────────────────────
document.querySelectorAll('.f-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.f-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.f;
    renderAnimals();
  });
});

// ─── RENDER ──────────────────────────────────────────────────────
function renderAnimals() {
  const grid = document.getElementById('grid');
  const countEl = document.getElementById('animalCount');

  const filtered = currentFilter === 'Todos'
    ? allAnimals
    : allAnimals.filter(a => a.especie === currentFilter);

  if (countEl) {
    countEl.innerHTML = `<strong>${filtered.length}</strong> ${filtered.length === 1 ? 'animal disponível' : 'animais disponíveis'}`;
  }

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty">
        <span class="empty-ico">🐾</span>
        <h3>Nenhum animal aqui ainda</h3>
        <p>Seja o primeiro a cadastrar um para adoção!</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map((a, i) => {
    const initials = (a.nomeDoador || 'A').charAt(0).toUpperCase();
    const wpp = (a.contatoDoador || '').replace(/\D/g, '');
    const waLink = wpp
      ? `https://wa.me/55${wpp}?text=Olá!%20Vi%20o%20anúncio%20de%20*${encodeURIComponent(a.nome)}*%20no%20AdotePet%20e%20quero%20saber%20mais!`
      : '#';
    const delay = (i % 8) * 65;

    return `
      <div class="card" style="animation-delay:${delay}ms">
        <div class="card-img">
          <img
            src="${a.imagemUrl || 'https://placedog.net/600/450?r'}"
            alt="${a.nome}"
            loading="lazy"
            onerror="this.src='https://placedog.net/600/450?id=${i}'"
          >
          <div class="card-badge">${a.especie || 'Animal'}</div>
        </div>
        <div class="card-body">
          <div class="card-tags">
            ${a.raca ? `<span class="tag">${a.raca}</span>` : ''}
            ${a.idade ? `<span class="tag sage">${a.idade}</span>` : ''}
            ${a.porte ? `<span class="tag">${a.porte}</span>` : ''}
          </div>
          <h3>${a.nome}</h3>
          <p class="card-desc">${a.descricao || 'Um amiguinho esperando por um lar cheio de amor e carinho.'}</p>
          <div class="card-foot">
            <div class="donor">
              <div class="av">${initials}</div>
              <span class="donor-name">${a.nomeDoador || 'Doador'}</span>
            </div>
            <a href="${waLink}" target="_blank" rel="noopener" class="btn-wa">
              💬 Adotar
            </a>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ─── LOAD ────────────────────────────────────────────────────────
async function loadAnimals() {
  const grid = document.getElementById('grid');
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
    if (!res.ok) throw new Error('API error');
    allAnimals = await res.json();
    renderAnimals();

    const dogs = allAnimals.filter(a => a.especie === 'Cachorro').length;
    const cats = allAnimals.filter(a => a.especie === 'Gato').length;

    animateCount(document.getElementById('sTotal'), allAnimals.length);
    animateCount(document.getElementById('sCach'), dogs);
    animateCount(document.getElementById('sGato'), cats);
  } catch {
    grid.innerHTML = `
      <div class="empty">
        <span class="empty-ico">😿</span>
        <h3>Não foi possível carregar</h3>
        <p>Verifique a conexão e recarregue a página.</p>
      </div>`;
  }
}

// ─── SCROLL REVEAL ────────────────────────────────────────────────
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  els.forEach(el => obs.observe(el));
}

// ─── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadAnimals();
  initReveal();
});