const db = booksClient();
let STORE = null;
let CATEGORIES = [];
let BOOKS = [];
let activeCategory = 'all';

const esc = (s='') => String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const mxn = n => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(Number(n||0));

async function loadStore(){
  const {data:store,error} = await db.from('bookstore_settings').select('*').eq('slug',BOOKS_STORE_SLUG).single();
  if(error || !store){
    document.getElementById('status').textContent = 'La tienda todavía no está configurada. Ejecuta el archivo setup_supabase.sql.';
    return;
  }
  STORE = store;
  applyStore(store);

  const [{data:cats},{data:books}] = await Promise.all([
    db.from('book_categories').select('*').eq('store_id',store.id).eq('visible',true).order('sort_order'),
    db.from('books').select('*').eq('store_id',store.id).eq('visible',true).order('sort_order')
  ]);
  CATEGORIES = cats || [];
  BOOKS = books || [];
  renderHeroBooks();
  renderTabs();
  renderBooks();
  document.getElementById('status').remove();
}

function applyStore(s){
  document.getElementById('storeName').textContent = s.store_name || 'JR LEÓN · LIBROS';
  document.getElementById('footerStore').textContent = s.store_name || 'JR LEÓN · LIBROS';
  document.getElementById('storeSubtitle').textContent = s.store_subtitle || 'Historias que dejan huella';
  document.getElementById('heroTitle').textContent = s.hero_title || 'Historias para leer, sentir y recordar.';
  document.getElementById('heroText').textContent = s.hero_text || '';
  if(s.logo_url){
    const mark=document.getElementById('brandMark');
    mark.innerHTML = `<img src="${esc(s.logo_url)}" alt="Logo">`;
  }
  const w=(s.whatsapp_number||'').replace(/\D/g,'');
  const btn=document.getElementById('whatsBtn');
  if(w){btn.href=`https://wa.me/${w}?text=${encodeURIComponent('Hola, quiero información sobre sus libros.')}`}
  else btn.classList.add('hidden');
}


function heroMedia(b, index){
  if(!b) return `<div class="hero-book-placeholder hero-book-${index+1}">JR</div>`;
  const cls=`hero-real-book hero-real-book-${index+1}`;
  if(b.cover_video_url){
    return `<div class="${cls}" title="${esc(b.title)}">
      <video src="${esc(b.cover_video_url)}" ${b.cover_url?`poster="${esc(b.cover_url)}"`:''}
        autoplay muted loop playsinline preload="metadata"
        aria-label="Portada en movimiento de ${esc(b.title)}"></video>
    </div>`;
  }
  if(b.cover_url){
    return `<div class="${cls}" title="${esc(b.title)}">
      <img src="${esc(b.cover_url)}" alt="Portada de ${esc(b.title)}">
    </div>`;
  }
  return `<div class="hero-book-placeholder hero-book-${index+1}">JR</div>`;
}

function renderHeroBooks(){
  const root=document.getElementById('heroBooksReal');
  if(!root)return;

  const ordered=[...BOOKS].sort((a,b)=>{
    const fa=a.featured?1:0, fb=b.featured?1:0;
    if(fa!==fb) return fb-fa;
    return Number(a.sort_order||0)-Number(b.sort_order||0);
  });

  const chosen=ordered.slice(0,3);
  root.innerHTML=[0,1,2].map(i=>heroMedia(chosen[i],i)).join('');

  root.querySelectorAll('video').forEach(v=>{
    v.muted=true;
    v.loop=true;
    v.playsInline=true;
    const play=()=>v.play().catch(()=>{});
    play();
    v.addEventListener('loadeddata',play);
    document.addEventListener('click',play,{once:true});
    document.addEventListener('touchstart',play,{once:true,passive:true});
  });
}

function renderTabs(){
  const root=document.getElementById('categoryTabs');
  root.innerHTML = `<button class="tab active" data-id="all">Todos</button>` + CATEGORIES.map(c=>`<button class="tab" data-id="${c.id}">${esc(c.name)}</button>`).join('');
  root.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{
    activeCategory=b.dataset.id;
    root.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));
    renderBooks();
  }));
}

function getFiltered(){
  const q=document.getElementById('searchInput').value.trim().toLowerCase();
  return BOOKS.filter(b=>{
    const catOk=activeCategory==='all'||String(b.category_id)===String(activeCategory);
    const qOk=!q||`${b.title} ${b.author} ${b.description||''}`.toLowerCase().includes(q);
    return catOk && qOk;
  });
}

function renderBooks(){
  const root=document.getElementById('booksGrid');
  const list=getFiltered();
  if(!list.length){root.innerHTML='<div class="empty">No encontramos libros con ese filtro.</div>';return}
  root.innerHTML=list.map(b=>{
    const cover1=b.cover_video_url ? `<video src="${esc(b.cover_video_url)}" ${b.cover_url?`poster="${esc(b.cover_url)}"`:''} autoplay muted loop playsinline preload="metadata" aria-label="Portada en movimiento de ${esc(b.title)}"></video>` : (b.cover_url ? `<img src="${esc(b.cover_url)}" alt="Portada de ${esc(b.title)}" loading="lazy">` : `<div class="cover-placeholder">JR<br>LEÓN</div>`);
    const cover2=b.cover_2_video_url ? `<video src="${esc(b.cover_2_video_url)}" ${b.cover_2_url?`poster="${esc(b.cover_2_url)}"`:''} autoplay muted loop playsinline preload="metadata" aria-label="Segunda portada en movimiento de ${esc(b.title)}"></video>` : (b.cover_2_url ? `<img src="${esc(b.cover_2_url)}" alt="Segunda portada de ${esc(b.title)}" loading="lazy">` : '');
    const badge=b.featured?'<span class="featured-badge">DESTACADO</span>':'';
    const topCover=`<div class="cover-wrap cover-top">${cover1}${badge}</div>`;
    const bottomCover=cover2 ? `<div class="cover-wrap cover-bottom second-cover">${cover2}</div>` : '';
    return `<article class="book-card book-card-vertical" data-id="${b.id}">
      ${topCover}
      <div class="book-body book-body-middle">
        <div class="book-format">${esc(b.format||'Libro digital')}</div>
        <h3>${esc(b.title)}</h3>
        <div class="book-author">${esc(b.author||'JR León')}</div>
        <p>${esc((b.description||'').slice(0,170))}${(b.description||'').length>170?'…':''}</p>
        <div class="book-bottom"><strong>${mxn(b.price)}</strong><button class="details-btn" type="button">Ver libro</button></div>
      </div>
      ${bottomCover}
    </article>`
  }).join('');
  root.querySelectorAll('.book-card').forEach(card=>card.addEventListener('click',()=>openBook(card.dataset.id)));
}

function openBook(id){
  const b=BOOKS.find(x=>String(x.id)===String(id)); if(!b)return;
  const media=document.getElementById('modalMedia');
  let primary='';
  if(b.cover_video_url){
    primary=`<video class="modal-cover" src="${esc(b.cover_video_url)}" ${b.cover_url?`poster="${esc(b.cover_url)}"`:''} autoplay muted loop playsinline controls></video>`;
  }else if(b.cover_url){
    primary=`<img class="modal-cover" src="${esc(b.cover_url)}" alt="Portada de ${esc(b.title)}">`;
  }else{
    const ph='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="100%" height="100%" fill="#151814"/><text x="50%" y="48%" text-anchor="middle" fill="#d2aa55" font-family="serif" font-size="70">JR EDICIONES</text></svg>`);
    primary=`<img class="modal-cover" src="${ph}" alt="Portada">`;
  }
  const secondary=b.cover_2_video_url?`<video class="modal-cover" src="${esc(b.cover_2_video_url)}" ${b.cover_2_url?`poster="${esc(b.cover_2_url)}"`:''} autoplay muted loop playsinline controls aria-label="Segunda portada en movimiento de ${esc(b.title)}"></video>`:(b.cover_2_url?`<img class="modal-cover" src="${esc(b.cover_2_url)}" alt="Segunda portada de ${esc(b.title)}">`:'');
  media.innerHTML=secondary?`<div class="modal-media-duo">${primary}${secondary}</div>`:primary;
  document.getElementById('modalTitle').textContent=b.title;
  document.getElementById('modalAuthor').textContent=b.author||'JR León';
  document.getElementById('modalDescription').textContent=b.description||'';
  document.getElementById('modalPrice').textContent=mxn(b.price);
  document.getElementById('modalFormat').textContent=b.format||'Libro digital';
  const actions=[];
  if(b.buy_url)actions.push(`<a class="btn primary" target="_blank" rel="noopener" href="${esc(b.buy_url)}">Comprar ahora</a>`);
  if(b.amazon_url)actions.push(`<a class="btn ghost dark" target="_blank" rel="noopener" href="${esc(b.amazon_url)}">Ver en Amazon</a>`);
  if(!actions.length)actions.push(`<button class="btn disabled" disabled>Disponible próximamente</button>`);
  document.getElementById('modalActions').innerHTML=actions.join('');
  const m=document.getElementById('bookModal');m.classList.remove('hidden');m.setAttribute('aria-hidden','false');
}

function closeModal(){const m=document.getElementById('bookModal');m.classList.add('hidden');m.setAttribute('aria-hidden','true')}
document.getElementById('modalClose').addEventListener('click',closeModal);
document.getElementById('bookModal').addEventListener('click',e=>{if(e.target.id==='bookModal')closeModal()});
document.getElementById('searchInput').addEventListener('input',renderBooks);
loadStore();
