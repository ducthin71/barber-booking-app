/* Kỷ Niệm · Book Reader v2
   Reader controller: renders only two open pages; one lightweight turning leaf.
   All original album data and collage rendering remain owned by the app. */
(function(){
"use strict";
const S={main:false,pages:[],start:0,selected:0,busy:false,drag:null,pointer:null,timer:null,raf:0,ignoreClickUntil:0,modal:null,home:false,homePageId:null,homePageCount:0,photoIds:[],photoPos:0,scale:1,x:0,y:0,pointers:new Map(),pinchStart:null};
const $b=id=>document.getElementById(id);
const escapeText=x=>String(x??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduced=()=>!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const at=i=>i>=0&&i<S.pages.length?S.pages[i]:null;
function paper(i,side){
 const page=at(i),contents=page?bookPaper(page,i,S.main):'<div class="book-sheet-content"><div class="openbook-page-empty">✿</div></div>';
 return '<div class="openbook-page" data-side="'+side+'" data-page-index="'+i+'" tabindex="0" role="group" aria-label="'+(page?'Trang '+(i+1)+': '+escapeText(page.title||'Kỷ niệm'):'Trang trống')+'"'+(i===S.selected?' aria-current="page"':'')+'>'+contents+'</div>';
}
function spread(i){
 return paper(i,'left')+paper(i+1,'right');
}
function mainActions(page){
 return '<button class="btn" onclick="chronicleContents()">☷ Mục lục</button>'+
 (page?.type==='chronicle-story'?'<button class="btn" onclick="editChroniclePage()">✎ Sửa trang</button>':'<button class="btn" onclick="openChronicleManage()">✎ Chỉnh chương</button>');
}
function render(main){
 const pages=bookPages(main),original=main?chroniclePage:activePage;
 if(!pages.length)return '<section class="section"><button class="back" onclick="goBackBook()">← Quay lại</button><p class="muted">Album này chưa có trang nào.</p></section>';
 S.home=false;S.main=main;S.pages=pages;S.selected=Math.max(0,Math.min(original,pages.length-1));S.start=Math.floor(S.selected/2)*2;
 const album=main?null:current(),title=main?'Cuốn Kỷ Niệm Của Tôi':album.title;
 const label=main?'CUỐN SÁCH TỰ CẬP NHẬT':album.accepted?'ALBUM ĐÃ HOÀN THÀNH':'BẢN NHÁP ALBUM';
 return '<section class="section openbook"><div class="book-reader-top">'+
 '<button class="back" onclick="goBackBook()">← Quay lại</button>'+
 '<div style="display:flex;gap:7px">'+(main?'<button class="btn" onclick="chronicleContents()">☷ Mục lục</button><button class="btn" onclick="openChronicleManage()" aria-label="Quản lý cuốn sách">⋯</button>':'<button class="btn" onclick="albumMenu()" aria-label="Quản lý album">⋯</button>')+'</div></div>'+
 '<div class="book-reader-subtitle">'+label+'</div><h1>'+escapeText(title)+'</h1>'+
 '<p class="book-hint">Cuốn sách đang mở · vuốt trang phải sang trái để lật. Chạm vào ảnh để phóng to.</p>'+
 '<div id="openbookStage" class="openbook-stage" role="region" aria-label="Cuốn album đang mở">'+spread(S.start)+'</div>'+
 '<div class="openbook-controls"><button id="openbookPrev" class="btn" onclick="BookReader.turn(-1)" '+(S.start===0?'disabled':'')+'>← Trước</button>'+
 '<span class="openbook-count" id="openbookCount">'+(S.start+1)+'–'+Math.min(S.start+2,S.pages.length)+' / '+S.pages.length+'</span>'+
 '<button id="openbookNext" class="btn" onclick="BookReader.turn(1)" '+(S.start+2>=S.pages.length?'disabled':'')+'>Sau →</button></div>'+
 '<p class="openbook-section-caption" id="openbookPageLabel">'+escapeText(at(S.selected)?.title||'')+'</p>'+
 '<div class="openbook-tools" id="openbookActions">'+(main?mainActions(at(S.selected)):'<button class="btn" onclick="navigate(&quot;editor&quot;)">✎ Chỉnh sửa trang</button>'+(album.accepted?'':'<button class="btn primary" onclick="acceptAlbum()">✓ Hoàn thành album</button>'))+'</div>'+
 '<p class="book-hint" style="text-align:center;margin-top:14px">PC: kéo bằng chuột hoặc dùng ← → · Điện thoại: vuốt ngang trang giấy</p></section>';
}

/* Homepage is another view of this very same reader, not a second page-turn engine.
   Default to the newest story spread so the user sees their own photographs first. */
function renderHome(knownPages){
 const pages=Array.isArray(knownPages)?knownPages:bookPages(true);
 S.main=true;S.home=true;S.pages=pages;
 const prev=S.homePageId&&S.homePageCount===pages.length?pages.findIndex(p=>p.id===S.homePageId):-1;
 let lastStory=-1;
 for(let i=pages.length-1;i>=0;i--)if(pages[i].type==='chronicle-story'){lastStory=i;break}
 const selected=prev>=0?prev:lastStory>=0?lastStory:0;
 S.selected=Math.max(0,Math.min(selected,pages.length-1));
 S.start=Math.floor(S.selected/2)*2;
 S.homePageId=pages[S.selected]?.id||null;S.homePageCount=pages.length;
 const hasStory=lastStory>=0;
 return '<section class="openbook home-book-feature" aria-label="Cuốn Kỷ Niệm Của Tôi đang mở">'+
 '<div class="home-book-heading"><div><div class="home-book-eyebrow">✿ CUỐN SÁCH CỦA BẠN</div>'+
 '<h2>Cuốn Kỷ Niệm <em>Của Tôi</em></h2></div>'+
 '<button type="button" class="home-book-expand" onclick="BookReader.expand()" aria-label="Xem cuốn sách ở chế độ đọc đầy đủ">Mở rộng ↗</button></div>'+
 '<div class="home-book-subheading">'+(hasStory?'Cuốn sách lớn lên từ từng khoảnh khắc bạn lưu.':'Cuốn sách đang chờ trang đầu tiên của bạn.')+'</div>'+
 '<div id="openbookStage" class="openbook-stage" role="region" aria-label="Vuốt để lật các trang cuốn Kỷ Niệm">'+spread(S.start)+'</div>'+
 '<div class="openbook-controls home-book-controls">'+
 '<button id="openbookPrev" class="btn" type="button" onclick="BookReader.turn(-1)" '+(S.start===0?'disabled':'')+' aria-label="Lật về hai trang trước">← Trước</button>'+
 '<span class="openbook-count" id="openbookCount">'+(S.start+1)+'–'+Math.min(S.start+2,pages.length)+' / '+pages.length+'</span>'+
 '<button id="openbookNext" class="btn" type="button" onclick="BookReader.turn(1)" '+(S.start+2>=pages.length?'disabled':'')+' aria-label="Lật sang hai trang tiếp theo">Sau →</button></div>'+
 '<p class="openbook-section-caption" id="openbookPageLabel">'+escapeText(pages[S.selected]?.title||'Cuốn sách của tôi')+'</p>'+
 (hasStory?'<p class="home-book-gesture">Vuốt ngang để lật trang · Chạm ảnh để xem lớn</p>':
 '<div class="home-book-empty"><p>Chọn một vài tấm ảnh, Kỷ Niệm sẽ bắt đầu viết cuốn sách này cùng bạn.</p>'+
 '<button type="button" class="btn primary" onclick="startMemory()">＋ Lưu kỷ niệm đầu tiên</button></div>')+
 '</section>';
}
function expand(){
 if(!S.home)return;
 readerOrigin='home';
 chroniclePage=S.selected;
 navigate('chronicle');
}

function setSelected(i){
 if(i<0||i>=S.pages.length)return;
 S.selected=i;
 if(S.home){S.homePageId=at(i)?.id||null;S.homePageCount=S.pages.length}
 if(S.main)chroniclePage=i;else activePage=i;
 const stage=$b('openbookStage');if(stage)stage.querySelectorAll('.openbook-page').forEach(el=>{if(Number(el.dataset.pageIndex)===i)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});
 const title=$b('openbookPageLabel');if(title)title.textContent=at(i)?.title||'';
 const actions=$b('openbookActions');if(actions&&S.main)actions.innerHTML=mainActions(at(i));
}
function updateControls(){
 const prev=$b('openbookPrev'),next=$b('openbookNext'),label=$b('openbookCount');
 if(prev)prev.disabled=S.start===0;
 if(next)next.disabled=S.start+2>=S.pages.length;
 if(label)label.textContent=(S.start+1)+'–'+Math.min(S.start+2,S.pages.length)+' / '+S.pages.length;
 setSelected(S.selected);
}
function draw(){
 const stage=$b('openbookStage');if(!stage)return;
 stage.innerHTML=spread(S.start);updateControls();
}
function finalize(start){
 S.start=start;setSelected(Math.min(start+1,S.pages.length-1));
 S.busy=false;S.drag=null;
 draw();
}
function clearFlip(){
 if(S.timer){clearTimeout(S.timer);S.timer=null}
 if(S.raf){cancelAnimationFrame(S.raf);S.raf=0}
}
function startFlip(direction,interactive=false){
 if(S.busy)return null;
 const next=S.start+direction*2;
 if(next<0||next>=S.pages.length)return null;
 const stage=$b('openbookStage');if(!stage)return null;
 if(reduced()){finalize(next);return null}
 S.busy=true;
 const leaf=document.createElement('div');
 leaf.className='openbook-turn-leaf';leaf.dataset.direction=String(direction);
 leaf.innerHTML='<span class="leaf-motif">kỷniệm ✿</span>';
 leaf.style.transform='rotateY(0deg)';
 stage.appendChild(leaf);
 return {leaf,next,direction,progress:0};
}
function finishFlip(f,complete){
 const leaf=f.leaf;leaf.style.transition='transform 260ms cubic-bezier(.2,.7,.25,1)';
 // Keep the rest of the reader and the original images stationary.
 leaf.style.transform='rotateY('+(complete?(f.direction>0?-176:176):0)+'deg)';
 let ended=false;
 const done=()=>{
  if(ended)return;ended=true;clearFlip();
  leaf.remove();
  S.busy=false;S.drag=null;
  if(complete)finalize(f.next);
 };
 leaf.addEventListener('transitionend',ev=>{if(ev.target===leaf&&ev.propertyName==='transform')done()},{once:true});
 S.timer=setTimeout(done,400);
}
function turn(direction){
 if(S.busy||S.modal)return;
 const f=startFlip(direction);
 if(!f)return;
 S.raf=requestAnimationFrame(()=>{f.leaf.getBoundingClientRect();finishFlip(f,true)});
}
function onDown(e){
 if(S.busy||S.modal||e.target.closest('button,a,input,textarea,select,video'))return;
 S.pointer={id:e.pointerId,x:e.clientX,y:e.clientY};
}
function onMove(e){
 const p=S.pointer;if(!p||p.id!==e.pointerId)return;
 const dx=e.clientX-p.x,dy=e.clientY-p.y;
 if(!S.drag){
  if(Math.abs(dx)<18||Math.abs(dx)<Math.abs(dy)*1.2)return;
  const dir=dx<0?1:-1,f=startFlip(dir,true);
  if(!f){S.pointer=null;return}
  S.drag=f;
  try{$b('openbookStage').setPointerCapture(e.pointerId)}catch(err){}
 }
 const f=S.drag;f.progress=Math.min(.985,Math.max(0,(f.direction===1?-dx:dx)/Math.max(1,$b('openbookStage').clientWidth*.63)));
 if(S.raf)cancelAnimationFrame(S.raf);
 S.raf=requestAnimationFrame(()=>{if(S.drag===f)f.leaf.style.transform='rotateY('+(f.direction>0?-176:176)*f.progress+'deg)'});
}
function onUp(e){
 const p=S.pointer;if(!p||p.id!==e.pointerId)return;
 S.pointer=null;
 const dx=e.clientX-p.x,dy=e.clientY-p.y;
 if(S.drag){
  const f=S.drag;S.drag=null;S.ignoreClickUntil=Date.now()+350;
  const commit=(f.direction===1?-dx:dx)>Math.max(56,$b('openbookStage').clientWidth*.13);
  if(S.raf){cancelAnimationFrame(S.raf);S.raf=0}
  finishFlip(f,commit);
 }else if(Math.abs(dx)>52&&Math.abs(dx)>Math.abs(dy)*1.25)turn(dx<0?1:-1);
}
function onCancel(){
 S.pointer=null;
 if(S.drag){const f=S.drag;S.drag=null;if(S.raf)cancelAnimationFrame(S.raf);finishFlip(f,false)}
}
function onClick(e){
 if(Date.now()<S.ignoreClickUntil)return;
 const photo=e.target.closest('[data-book-photo]');
 if(photo){e.preventDefault();e.stopPropagation();openPhoto(photo.dataset.bookPhoto,Number(photo.closest('[data-page-index]')?.dataset.pageIndex??S.selected));return}
 const page=e.target.closest('.openbook-page');
 if(page)setSelected(Number(page.dataset.pageIndex));
}
function onKey(e){
 const photo=e.target.closest('[data-book-photo]');
 if(photo&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openPhoto(photo.dataset.bookPhoto,Number(photo.closest('[data-page-index]')?.dataset.pageIndex??S.selected))}
}
function mount(){
 clearFlip();S.busy=false;S.drag=null;S.pointer=null;
 const stage=$b('openbookStage');if(!stage)return;
 stage.addEventListener('dragstart',e=>e.preventDefault());
 stage.addEventListener('pointerdown',onDown);
 stage.addEventListener('pointermove',onMove);
 stage.addEventListener('pointerup',onUp);
 stage.addEventListener('pointercancel',onCancel);
 stage.addEventListener('click',onClick);
 stage.addEventListener('keydown',onKey);
}
function destroy(){
 clearFlip();S.busy=false;S.drag=null;S.pointer=null;closePhoto();
}
function pagePhotoIds(page){
 return (page?.items||[]).filter(id=>{const m=db.memories.find(x=>x.id===id);return m&&(m.kind==='photo'||m.kind==='video')&&(mediaURLs[m.id]||m.media)});
}
function openPhoto(id,pageIndex){
 const page=at(pageIndex);
 let ids=pagePhotoIds(page);
 if(!ids.includes(id)){ids=sliceItems(S.main?{items:[]}:current(),page).filter(m=>m.kind==='photo'||m.kind==='video').map(m=>m.id)}
 if(!ids.includes(id))return;
 setSelected(pageIndex);
 S.photoIds=ids;S.photoPos=ids.indexOf(id);S.modal=true;resetZoom();renderPhoto();
}
function resetZoom(){S.scale=1;S.x=0;S.y=0;S.pointers.clear();S.pinchStart=null}
function renderPhoto(){
 const host=$b('bookPhotoHost');if(!host)return;
 const id=S.photoIds[S.photoPos],m=db.memories.find(x=>x.id===id);if(!m){closePhoto();return}
 const src=mediaURLs[id]||m.media||'';
 const visual=m.kind==='video'?'<video class="book-photo-media" id="bookZoomMedia" src="'+src+'" controls playsinline preload="metadata"></video>':
 '<img class="book-photo-media" id="bookZoomMedia" src="'+src+'" alt="'+escapeText(m.title||'Ảnh kỷ niệm')+'" draggable="false">';
 host.innerHTML='<div class="book-photo-overlay" role="dialog" aria-modal="true" aria-label="Xem ảnh từ trang album">'+
 '<div class="book-photo-toolbar"><button type="button" onclick="BookReader.closePhoto()" aria-label="Đóng xem ảnh">✕</button>'+
 '<span>'+escapeText(m.title||'Một kỷ niệm')+'</span><span style="font-size:12px">'+(S.photoPos+1)+' / '+S.photoIds.length+'</span></div>'+
 '<div class="book-photo-viewport" id="bookPhotoViewport">'+visual+'</div>'+
 '<div class="book-photo-footer"><button type="button" onclick="BookReader.photoStep(-1)" '+(S.photoPos===0?'disabled':'')+' aria-label="Ảnh trước">‹</button>'+
 '<div class="photo-info"><b>'+escapeText(m.title||'Ảnh kỷ niệm')+'</b><small>'+escapeText(m.note||m.date||'')+'</small></div>'+
 (m.kind==='photo'?'<button type="button" onclick="BookReader.zoom(-1)" aria-label="Thu nhỏ">−</button><button type="button" onclick="BookReader.zoom(1)" aria-label="Phóng to">＋</button>':'')+
 '<button type="button" onclick="BookReader.photoStep(1)" '+(S.photoPos===S.photoIds.length-1?'disabled':'')+' aria-label="Ảnh tiếp theo">›</button></div></div>';
 const viewport=$b('bookPhotoViewport');if(viewport){
  viewport.addEventListener('pointerdown',zoomPointerDown);
  viewport.addEventListener('pointermove',zoomPointerMove);
  viewport.addEventListener('pointerup',zoomPointerUp);
  viewport.addEventListener('pointercancel',zoomPointerUp);
  viewport.addEventListener('dblclick',e=>{e.preventDefault();if(m.kind==='photo')zoom(S.scale>1?-1:1)});
  viewport.addEventListener('wheel',e=>{if(m.kind==='photo'&&e.ctrlKey){e.preventDefault();zoom(e.deltaY<0?1:-1)}},{passive:false});
 }
}
function closePhoto(){
 const host=$b('bookPhotoHost');
 if(host){host.querySelectorAll('video').forEach(video=>{try{video.pause()}catch(e){}});host.innerHTML=''}
 S.modal=false;S.photoIds=[];resetZoom();
}
function photoStep(dir){
 const at=S.photoPos+dir;if(at<0||at>=S.photoIds.length)return;
 S.photoPos=at;resetZoom();renderPhoto();
}
function applyZoom(){
 const m=$b('bookZoomMedia');if(!m||m.tagName!=='IMG')return;
 const w=$b('bookPhotoViewport')?.clientWidth||390,h=$b('bookPhotoViewport')?.clientHeight||600;
 S.x=Math.max(-w*(S.scale-1)/2,Math.min(w*(S.scale-1)/2,S.x));
 S.y=Math.max(-h*(S.scale-1)/2,Math.min(h*(S.scale-1)/2,S.y));
 m.style.transform='translate3d('+S.x+'px,'+S.y+'px,0) scale('+S.scale+')';
}
function zoom(dir){
 const id=S.photoIds[S.photoPos],m=db.memories.find(x=>x.id===id);if(m?.kind!=='photo')return;
 S.scale=dir>0?Math.min(5,S.scale*1.65):Math.max(1,S.scale/1.65);
 if(S.scale===1){S.x=0;S.y=0}
 applyZoom();
}
function zoomPointerDown(e){
 if(e.target.closest('video'))return;
 const vp=$b('bookPhotoViewport');try{vp?.setPointerCapture(e.pointerId)}catch(_){}
 S.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});
 if(S.pointers.size===2){
  const [a,b]=[...S.pointers.values()];
  S.pinchStart={distance:Math.hypot(a.x-b.x,a.y-b.y)||1,scale:S.scale};
 }
}
function zoomPointerMove(e){
 const p=S.pointers.get(e.pointerId);if(!p)return;
 if(S.pointers.size>=2){
  p.x=e.clientX;p.y=e.clientY;
  const [a,b]=[...S.pointers.values()];
  if(S.pinchStart){S.scale=Math.max(1,Math.min(5,S.pinchStart.scale*Math.hypot(a.x-b.x,a.y-b.y)/S.pinchStart.distance));if(S.scale===1){S.x=0;S.y=0}applyZoom()}
 }else if(S.scale>1){
  S.x+=e.clientX-p.x;S.y+=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;applyZoom();
 }else {p.x=e.clientX;p.y=e.clientY}
}
function zoomPointerUp(e){
 const p=S.pointers.get(e.pointerId);if(!p)return;
 const wasMulti=!!S.pinchStart;
 S.pointers.delete(e.pointerId);
 if(S.pointers.size<2)S.pinchStart=null;
 if(!wasMulti&&S.scale<=1){
  const dx=e.clientX-p.startX;
  if(Math.abs(dx)>55)photoStep(dx<0?1:-1);
 }
}
document.addEventListener('keydown',e=>{
 if(!S.modal)return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closePhoto()}
 else if(e.key==='ArrowLeft'){e.preventDefault();e.stopImmediatePropagation();photoStep(-1)}
 else if(e.key==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();photoStep(1)}
},true);
window.BookReader={render,renderHome,expand,mount,destroy,turn,openPhoto,closePhoto,photoStep,zoom,isPhotoOpen:()=>S.modal};
})();