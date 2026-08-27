const db=booksClient();
let SESSION=null, STORE=null, CATS=[], BOOKS=[];
const $=id=>document.getElementById(id);
const e=(s='')=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

async function boot(){
  const {data:{session}}=await db.auth.getSession();
  if(session){SESSION=session;showAdmin();}
}

$('loginBtn').onclick=async()=>{
  $('loginMsg').textContent='Entrando…';
  const {data,error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
  if(error){$('loginMsg').textContent=error.message;return}
  SESSION=data.session;showAdmin();
};
$('logoutBtn').onclick=async()=>{await db.auth.signOut();location.reload()};

async function showAdmin(){
  $('loginPanel').classList.add('hidden');$('adminPanel').classList.remove('hidden');
  const {data:s,error}=await db.from('bookstore_settings').select('*').eq('slug',BOOKS_STORE_SLUG).single();
  if(error||!s){flash('No se encontró la tienda. Ejecuta setup_supabase.sql');return}
  STORE=s; fillStore(); await reloadAll();
}
function fillStore(){
  $('aStoreName').value=STORE.store_name||'';$('aStoreSubtitle').value=STORE.store_subtitle||'';$('aHeroTitle').value=STORE.hero_title||'';$('aHeroText').value=STORE.hero_text||'';$('aWhatsapp').value=STORE.whatsapp_number||'';$('aLogoUrl').value=STORE.logo_url||'';
}
$('saveStoreBtn').onclick=async()=>{
  const payload={store_name:$('aStoreName').value.trim(),store_subtitle:$('aStoreSubtitle').value.trim(),hero_title:$('aHeroTitle').value.trim(),hero_text:$('aHeroText').value.trim(),whatsapp_number:$('aWhatsapp').value.trim(),logo_url:$('aLogoUrl').value.trim()||null};
  const {data,error}=await db.from('bookstore_settings').update(payload).eq('id',STORE.id).select().single();
  if(error)return flash(error.message); STORE=data; flash('Tienda guardada');
};

async function reloadAll(){
  const [{data:c},{data:b}]=await Promise.all([
    db.from('book_categories').select('*').eq('store_id',STORE.id).order('sort_order'),
    db.from('books').select('*').eq('store_id',STORE.id).order('sort_order')
  ]); CATS=c||[];BOOKS=b||[];renderCats();renderBooks();
}
function renderCats(){
  $('categoriesEditor').innerHTML=CATS.map((c,i)=>`<div class="edit-row cat-edit" data-id="${c.id}"><span class="order-num">${i+1}</span><input class="cat-name" value="${e(c.name)}"><label class="check"><input class="cat-visible" type="checkbox" ${c.visible?'checked':''}> Visible</label><button class="btn mini save-cat">Guardar</button><button class="btn mini danger delete-cat">Eliminar</button></div>`).join('')||'<p class="muted">Aún no hay categorías.</p>';
  document.querySelectorAll('.cat-edit').forEach(row=>{
    row.querySelector('.save-cat').onclick=()=>saveCat(row);
    row.querySelector('.delete-cat').onclick=()=>deleteCat(row.dataset.id);
  });
}
async function saveCat(row){const {error}=await db.from('book_categories').update({name:row.querySelector('.cat-name').value.trim(),visible:row.querySelector('.cat-visible').checked}).eq('id',row.dataset.id);if(error)return flash(error.message);flash('Categoría guardada');reloadAll()}
async function deleteCat(id){if(!confirm('¿Eliminar esta categoría?'))return;const {error}=await db.from('book_categories').delete().eq('id',id);if(error)return flash(error.message);flash('Categoría eliminada');reloadAll()}
$('addCategoryBtn').onclick=async()=>{const {error}=await db.from('book_categories').insert({store_id:STORE.id,name:'Nueva categoría',sort_order:CATS.length+1,visible:true});if(error)return flash(error.message);reloadAll()};

function catOptions(selected){return `<option value="">Sin categoría</option>`+CATS.map(c=>`<option value="${c.id}" ${String(selected)===String(c.id)?'selected':''}>${e(c.name)}</option>`).join('')}
function renderBooks(){
  $('booksEditor').innerHTML=BOOKS.map((b,i)=>`<article class="book-edit" data-id="${b.id}">
    <div class="book-edit-head"><strong>${i+1}. ${e(b.title)}</strong><span>${b.visible?'Visible':'Oculto'}</span></div>
    <div class="form-grid two">
      <label>Título<input class="b-title" value="${e(b.title)}"></label>
      <label>Autor<input class="b-author" value="${e(b.author||'JR León')}"></label>
      <label>Precio MXN<input class="b-price" type="number" step="1" value="${Number(b.price||0)}"></label>
      <label>Formato<input class="b-format" value="${e(b.format||'Libro digital')}"></label>
      <label>Categoría<select class="b-cat">${catOptions(b.category_id)}</select></label>
      <label>Orden<input class="b-order" type="number" value="${Number(b.sort_order||0)}"></label>
      <label class="full">Descripción<textarea class="b-desc">${e(b.description||'')}</textarea></label>
      <label class="full">URL portada estática<input class="b-cover" value="${e(b.cover_url||'')}" placeholder="https://..."></label>
      <label class="full">URL portada en movimiento<input class="b-video" value="${e(b.cover_video_url||'')}" placeholder="MP4 / WebM"></label>
      <label class="full">URL segunda portada fija (opcional)<input class="b-cover2" value="${e(b.cover_2_url||'')}" placeholder="https://..."></label>
      <label class="full">URL segunda portada en movimiento<input class="b-video2" value="${e(b.cover_2_video_url||'')}" placeholder="MP4 / WebM"></label>
      <div class="full motion-upload">
        <div class="motion-preview">${b.cover_2_video_url?`<video src="${e(b.cover_2_video_url)}" muted loop autoplay playsinline></video>`:(b.cover_2_url?`<img src="${e(b.cover_2_url)}" alt="Segunda portada">`:'<span>Sin segunda portada</span>')}</div>
        <div class="motion-actions">
          <input class="b-video2-file" type="file" accept="video/mp4,video/webm,video/quicktime">
          <button type="button" class="btn mini upload-video2">Subir segunda portada en movimiento</button>
          <button type="button" class="btn mini ghost dark clear-video2">Quitar segundo video</button>
          <small>Recomendado: MP4 vertical, 6–12 segundos, sin audio, máximo 25 MB.</small>
        </div>
      </div>
      <div class="full motion-upload">
        <div class="motion-preview">${b.cover_2_url?`<img src="${e(b.cover_2_url)}" alt="Segunda portada fija">`:'<span>Imagen fija opcional</span>'}</div>
        <div class="motion-actions">
          <input class="b-cover2-file" type="file" accept="image/jpeg,image/png,image/webp">
          <button type="button" class="btn mini upload-cover2">Subir segunda portada fija</button>
          <button type="button" class="btn mini ghost dark clear-cover2">Quitar imagen fija</button>
          <small>Opcional: sirve como respaldo si no hay video.</small>
        </div>
      </div>
      <div class="full motion-upload">
        <div class="motion-preview">${b.cover_video_url?`<video src="${e(b.cover_video_url)}" muted loop autoplay playsinline></video>`:(b.cover_url?`<img src="${e(b.cover_url)}" alt="Portada">`:'<span>Sin portada</span>')}</div>
        <div class="motion-actions">
          <input class="b-video-file" type="file" accept="video/mp4,video/webm,video/quicktime">
          <button type="button" class="btn mini upload-video">Subir portada en movimiento</button>
          <button type="button" class="btn mini ghost dark clear-video">Quitar video</button>
          <small>Recomendado: MP4 vertical, 6–12 segundos, sin audio, máximo 25 MB.</small>
        </div>
      </div>
      <label class="full">URL compra principal<input class="b-buy" value="${e(b.buy_url||'')}" placeholder="Hotmart u otra plataforma"></label>
      <label class="full">URL Amazon<input class="b-amazon" value="${e(b.amazon_url||'')}" placeholder="https://amazon..."></label>
    </div>
    <div class="edit-flags"><label class="check"><input class="b-visible" type="checkbox" ${b.visible?'checked':''}> Visible</label><label class="check"><input class="b-featured" type="checkbox" ${b.featured?'checked':''}> Destacado</label></div>
    <div class="edit-actions"><button class="btn primary save-book">Guardar libro</button><button class="btn danger delete-book">Eliminar</button></div>
  </article>`).join('')||'<p class="muted">Aún no hay libros.</p>';
  document.querySelectorAll('.book-edit').forEach(row=>{row.querySelector('.save-book').onclick=()=>saveBook(row);row.querySelector('.delete-book').onclick=()=>deleteBook(row.dataset.id);row.querySelector('.upload-video').onclick=()=>uploadCoverVideo(row);row.querySelector('.clear-video').onclick=()=>clearCoverVideo(row);row.querySelector('.upload-cover2').onclick=()=>uploadCover2(row);row.querySelector('.clear-cover2').onclick=()=>clearCover2(row);row.querySelector('.upload-video2').onclick=()=>uploadCover2Video(row);row.querySelector('.clear-video2').onclick=()=>clearCover2Video(row)});
}
async function saveBook(row){
  const p={title:row.querySelector('.b-title').value.trim(),author:row.querySelector('.b-author').value.trim(),price:Number(row.querySelector('.b-price').value||0),format:row.querySelector('.b-format').value.trim(),category_id:row.querySelector('.b-cat').value||null,sort_order:Number(row.querySelector('.b-order').value||0),description:row.querySelector('.b-desc').value.trim(),cover_url:row.querySelector('.b-cover').value.trim()||null,cover_video_url:row.querySelector('.b-video').value.trim()||null,cover_2_url:row.querySelector('.b-cover2').value.trim()||null,cover_2_video_url:row.querySelector('.b-video2').value.trim()||null,buy_url:row.querySelector('.b-buy').value.trim()||null,amazon_url:row.querySelector('.b-amazon').value.trim()||null,visible:row.querySelector('.b-visible').checked,featured:row.querySelector('.b-featured').checked};
  const {error}=await db.from('books').update(p).eq('id',row.dataset.id);if(error)return flash(error.message);flash('Libro guardado');reloadAll();
}

async function uploadCoverVideo(row){
  const file=row.querySelector('.b-video-file').files?.[0];
  if(!file)return flash('Selecciona primero un video');
  if(file.size>25*1024*1024)return flash('El video supera 25 MB');
  const ok=['video/mp4','video/webm','video/quicktime'].includes(file.type);
  if(!ok)return flash('Usa MP4, WebM o MOV');
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const path=`${SESSION.user.id}/${row.dataset.id}/${Date.now()}_${safe}`;
  flash('Subiendo video…');
  const {error:upErr}=await db.storage.from('book-media').upload(path,file,{upsert:false,contentType:file.type});
  if(upErr)return flash(upErr.message);
  const {data:urlData}=db.storage.from('book-media').getPublicUrl(path);
  const url=urlData?.publicUrl;
  if(!url)return flash('No se pudo obtener la URL del video');
  const {error}=await db.from('books').update({cover_video_url:url}).eq('id',row.dataset.id);
  if(error)return flash(error.message);
  row.querySelector('.b-video').value=url;
  flash('Portada en movimiento subida');
  reloadAll();
}
async function clearCoverVideo(row){
  const {error}=await db.from('books').update({cover_video_url:null}).eq('id',row.dataset.id);
  if(error)return flash(error.message);
  row.querySelector('.b-video').value='';
  flash('Video de portada eliminado');
  reloadAll();
}


async function uploadCover2Video(row){
  const file=row.querySelector('.b-video2-file').files?.[0];
  if(!file)return flash('Selecciona primero el video de la segunda portada');
  if(file.size>25*1024*1024)return flash('El video supera 25 MB');
  const ok=['video/mp4','video/webm','video/quicktime'].includes(file.type);
  if(!ok)return flash('Usa MP4, WebM o MOV');
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const path=`${SESSION.user.id}/${row.dataset.id}/cover2video/${Date.now()}_${safe}`;
  flash('Subiendo segunda portada en movimiento…');
  const {error:upErr}=await db.storage.from('book-media').upload(path,file,{upsert:false,contentType:file.type});
  if(upErr)return flash(upErr.message);
  const {data:urlData}=db.storage.from('book-media').getPublicUrl(path);
  const url=urlData?.publicUrl;
  if(!url)return flash('No se pudo obtener la URL del segundo video');
  const {error}=await db.from('books').update({cover_2_video_url:url}).eq('id',row.dataset.id);
  if(error)return flash(error.message);
  row.querySelector('.b-video2').value=url;
  flash('Segunda portada en movimiento subida');
  reloadAll();
}
async function clearCover2Video(row){
  const {error}=await db.from('books').update({cover_2_video_url:null}).eq('id',row.dataset.id);
  if(error)return flash(error.message);
  row.querySelector('.b-video2').value='';
  flash('Segundo video eliminado');
  reloadAll();
}

async function uploadCover2(row){
  const file=row.querySelector('.b-cover2-file').files?.[0];
  if(!file)return flash('Selecciona primero una imagen');
  if(file.size>10*1024*1024)return flash('La imagen supera 10 MB');
  const ok=['image/jpeg','image/png','image/webp'].includes(file.type);
  if(!ok)return flash('Usa JPG, PNG o WebP');
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const path=`${SESSION.user.id}/${row.dataset.id}/cover2/${Date.now()}_${safe}`;
  flash('Subiendo segunda portada…');
  const {error:upErr}=await db.storage.from('book-media').upload(path,file,{upsert:false,contentType:file.type});
  if(upErr)return flash(upErr.message);
  const {data:urlData}=db.storage.from('book-media').getPublicUrl(path);
  const url=urlData?.publicUrl;
  if(!url)return flash('No se pudo obtener la URL de la imagen');
  const {error}=await db.from('books').update({cover_2_url:url}).eq('id',row.dataset.id);
  if(error)return flash(error.message);
  row.querySelector('.b-cover2').value=url;
  flash('Segunda portada subida');
  reloadAll();
}
async function clearCover2(row){
  const {error}=await db.from('books').update({cover_2_url:null}).eq('id',row.dataset.id);
  if(error)return flash(error.message);
  row.querySelector('.b-cover2').value='';
  flash('Segunda portada eliminada');
  reloadAll();
}

async function deleteBook(id){if(!confirm('¿Eliminar este libro?'))return;const {error}=await db.from('books').delete().eq('id',id);if(error)return flash(error.message);flash('Libro eliminado');reloadAll()}
$('addBookBtn').onclick=async()=>{const {error}=await db.from('books').insert({store_id:STORE.id,title:'Nuevo libro',author:'JR León',price:150,format:'Libro digital',visible:true,featured:false,sort_order:BOOKS.length+1});if(error)return flash(error.message);reloadAll()};

function flash(msg){$('saveMsg').textContent=msg;$('saveMsg').classList.add('show');clearTimeout(window._t);window._t=setTimeout(()=>$('saveMsg').classList.remove('show'),2600)}
boot();
