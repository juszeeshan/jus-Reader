/* Jus Reader — local-first reading PWA */
const DB_NAME='jus-reader-db', DB_VERSION=1, STORE='books';
let db, books=[], currentBook=null, currentFormat=null, epubBook=null, epubRendition=null, pdfDoc=null, pdfPage=1, textPages=[], textPage=0, fontSize=19, selectedText='', deferredInstall=null, readingStarted=0, toastTimer;
const $=id=>document.getElementById(id);
const requestDB=()=>new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const tx=(mode,fn)=>new Promise((resolve,reject)=>{const t=db.transaction(STORE,mode),s=t.objectStore(STORE);let result;try{result=fn(s)}catch(e){reject(e);return}t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error);});
const allBooks=()=>new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});
const saveBook=b=>tx('readwrite',s=>s.put(b));
const getBook=id=>books.find(b=>b.id===id);
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2400)}
function escapeHTML(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fileId(){return crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2)}
function coverStyle(title){const palettes=[['#a99a7e','#5e5a4c'],['#9ca9a2','#465e57'],['#b58f80','#6e4e47'],['#9b9bb0','#4f506a'],['#c0ad83','#6c5838']];let n=[...title].reduce((a,c)=>a+c.charCodeAt(0),0)%palettes.length;return `linear-gradient(145deg,${palettes[n][0]},${palettes[n][1]})`}
function renderLibrary(){
  const q=$('searchInput').value.toLowerCase(), shown=books.filter(b=>b.title.toLowerCase().includes(q)||b.name.toLowerCase().includes(q));
  $('bookGrid').innerHTML=shown.map(b=>`<div class="book-card" data-open="${b.id}"><button class="book-delete" data-delete="${b.id}" title="Remove book">×</button><div class="cover" style="background:${coverStyle(b.title)}">${escapeHTML(b.title.slice(0,65))}</div><h3>${escapeHTML(b.title)}</h3><p>${b.type.toUpperCase()} · ${Math.round(b.progress||0)}% read</p></div>`).join('');
  $('emptyState').hidden=books.length>0;$('bookCountLabel').textContent=`${books.length} ${books.length===1?'item':'items'}`;$('bookStat').textContent=books.length;
  const recent=[...books].filter(b=>b.lastOpened).sort((a,b)=>b.lastOpened-a.lastOpened)[0];
  $('continueCard').className=recent?'continue-card':'continue-empty';
  $('continueCard').innerHTML=recent?`<div class="cover" style="background:${coverStyle(recent.title)}">${escapeHTML(recent.title.slice(0,50))}</div><div class="continue-info"><h3>${escapeHTML(recent.title)}</h3><p class="muted small">${recent.type.toUpperCase()} · ${Math.round(recent.progress||0)}% completed</p><div class="progress-track"><span style="width:${recent.progress||0}%"></span></div><button class="quiet-btn" data-open="${recent.id}">Resume reading →</button></div>`:'Your recently opened books will appear here.';
  $('wordsStat').textContent=books.reduce((n,b)=>n+(b.vocabulary||[]).length,0);
  $('minutesStat').textContent=books.reduce((n,b)=>n+(b.minutes||0),0);
}
async function addFiles(fileList){
  const supported=['epub','pdf','docx','txt','html','htm','xhtml','rtf','md','markdown','csv','json','xml'];let added=0;
  for(const file of fileList){const ext=file.name.split('.').pop().toLowerCase();if(!supported.includes(ext)){toast(`Unsupported format: ${file.name}`);continue}
    const book={id:fileId(),name:file.name,title:file.name.replace(/\.[^.]+$/,''),type:ext==='htm'?'html':ext,blob:file,added:Date.now(),progress:0,lastOpened:0,minutes:0,bookmarks:[],notes:[],highlights:[],vocabulary:[]};
    try{await saveBook(book);books.push(book);added++}catch(e){console.error(e);toast('Could not save file. Device storage may be full.')}
  }renderLibrary();toast(added?`${added} file${added===1?'':'s'} added to your library`:'No supported files were added');
}
function setView(name){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$(name+'View').classList.add('active');document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===name));$('breadcrumb').textContent={library:'Your library',vocabulary:'Vocabulary',notes:'Notes & highlights',reader:'Reading'}[name]||name;if(name==='vocabulary')renderVocabulary();if(name==='notes')renderNotes();$('sidebar').classList.remove('open')}
function openBook(id){const b=getBook(id);if(!b)return;currentBook=b;currentFormat=b.type;b.lastOpened=Date.now();readingStarted=Date.now();saveBook(b);$('readerTitle').textContent=b.title;$('readerContent').innerHTML='<p class="muted">Opening your book…</p>';$('tocList').innerHTML='<p class="muted small">Contents will appear here when available.</p>';setView('reader');$('readingArea').scrollTop=0;
  if(b.type==='epub')openEpub(b);else if(b.type==='pdf')openPdf(b);else if(b.type==='docx')openDocx(b);else openText(b);
}
async function openEpub(b){if(!window.ePub){$('readerContent').textContent='EPUB reader library could not load. Check your internet connection once, then refresh.';return}
  try{const buf=await b.blob.arrayBuffer();epubBook=ePub(buf);epubRendition=epubBook.renderTo('readerContent',{width:'100%',height:'100%',flow:'scrolled-doc',manager:'continuous'});epubRendition.themes.default({'body':{'font-family':'Literata, Georgia, serif','line-height':'1.8','color':'inherit','background':'transparent'},'p':{'line-height':'1.8'}});await epubRendition.display();epubBook.loaded.navigation.then(nav=>{const links=nav.toc||[];$('tocList').innerHTML=links.map(l=>`<button data-href="${escapeHTML(l.href)}">${escapeHTML(l.label)}</button>`).join('')||'<p class="muted small">No table of contents found.</p>';});epubRendition.on('relocated',loc=>{const c=loc.start.cfi; b.cfi=c;b.progress=Math.round((loc.start.location||0)/(epubBook.locations.total||1)*100);updateProgress();saveBook(b)});await epubBook.locations.generate(1000); }catch(e){console.error(e);$('readerContent').innerHTML='<p>Could not open this EPUB. The file may be damaged or protected by DRM.</p>'}
}
async function openPdf(b){if(!window.pdfjsLib){$('readerContent').textContent='PDF reader library did not load. Check your internet connection once, then refresh.';return}
  try{pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';pdfDoc=await pdfjsLib.getDocument({data:await b.blob.arrayBuffer()}).promise;pdfPage=b.page||1;renderPdfPage()}catch(e){console.error(e);$('readerContent').textContent='Could not open this PDF.'}
}
async function renderPdfPage(){if(!pdfDoc)return;const page=await pdfDoc.getPage(pdfPage),viewport=page.getViewport({scale:1.35}),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=viewport.width;canvas.height=viewport.height;canvas.style.width='100%';canvas.style.height='auto';$('readerContent').innerHTML='';$('readerContent').appendChild(canvas);await page.render({canvasContext:ctx,viewport}).promise;try{const tc=await page.getTextContent(),txt=tc.items.map(x=>x.str).join(' ').trim();if(txt){const layer=document.createElement('div');layer.className='pdf-readable-text';layer.textContent=txt;$('readerContent').appendChild(layer)}}catch(e){console.warn('PDF text extraction unavailable',e)}$('pageLabel').textContent=`Page ${pdfPage} of ${pdfDoc.numPages}`;currentBook.page=pdfPage;currentBook.progress=Math.round(pdfPage/pdfDoc.numPages*100);updateProgress();saveBook(currentBook)}
async function openDocx(b){
  if(!window.mammoth){$('readerContent').textContent='DOCX reader library could not load. Connect to the internet and refresh once.';return}
  try{const result=await mammoth.convertToHtml({arrayBuffer:await b.blob.arrayBuffer()});$('readerContent').innerHTML=sanitizeHTML(result.value);$('pageLabel').textContent='Word document';currentBook.progress=100;updateProgress();if(result.messages?.length)console.info('DOCX import notes:',result.messages)}catch(e){console.error(e);$('readerContent').textContent='Could not read this DOCX file. It may be damaged or password-protected.'}
}
function rtfToText(rtf){return rtf.replace(/\\'[0-9a-fA-F]{2}/g,' ').replace(/\\par[d]?\b/g,'\n\n').replace(/\\line\b/g,'\n').replace(/\\tab\b/g,'\t').replace(/\\[a-zA-Z]+-?\d* ?/g,'').replace(/[{}]/g,'').replace(/\\\\/g,'\\').replace(/\\~/g,' ').replace(/\\-/g,'').trim()}
function markdownToHtml(md){let x=escapeHTML(md);x=x.replace(/^###### (.*)$/gm,'<h6>$1</h6>').replace(/^##### (.*)$/gm,'<h5>$1</h5>').replace(/^#### (.*)$/gm,'<h4>$1</h4>').replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/^&gt; (.*)$/gm,'<blockquote>$1</blockquote>').replace(/^[-*] (.*)$/gm,'<li>$1</li>').replace(/(?:<li>.*?<\/li>\n?)+/gs,m=>'<ul>'+m+'</ul>').replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>');return '<p>'+x+'</p>'}
async function openText(b){let raw=await b.blob.text();if(b.type==='rtf')raw=rtfToText(raw);else if(b.type==='json'){try{raw=JSON.stringify(JSON.parse(raw),null,2)}catch(e){}}else if(b.type==='csv'){raw=raw.split(/\r?\n/).map(line=>line.split(',').map(v=>v.replace(/^"|"$/g,'')).join('    |    ')).join('\n')}if(['txt','rtf','json','csv','xml'].includes(b.type)){renderPlainText(raw)}else if(['md','markdown'].includes(b.type)){$('readerContent').innerHTML=markdownToHtml(raw);$('pageLabel').textContent='Markdown document';currentBook.progress=100;updateProgress()}else{$('readerContent').innerHTML=sanitizeHTML(raw);$('pageLabel').textContent='HTML document';currentBook.progress=100;updateProgress()}}
function renderPlainText(raw){const paragraphs=raw.split(/\n\s*\n/).filter(Boolean);textPages=[];let page='';for(const p of paragraphs){if((page+p).length>2200&&page){textPages.push(page);page=''}page+=p+'\n\n'}if(page)textPages.push(page);textPage=Math.min(currentBook.page||0,Math.max(0,textPages.length-1));renderTextPage()}
function sanitizeHTML(html){const doc=new DOMParser().parseFromString(html,'text/html');doc.querySelectorAll('script,iframe,object,embed,form,link,meta,style').forEach(n=>n.remove());doc.querySelectorAll('*').forEach(el=>[...el.attributes].forEach(a=>{if(/^on/i.test(a.name)||((a.name==='href'||a.name==='src')&&/^\s*javascript:/i.test(a.value)))el.removeAttribute(a.name)}));return doc.body.innerHTML}
function renderTextPage(){if(!textPages.length){$('readerContent').textContent='This file appears to be empty.';return}$('readerContent').innerHTML=textPages[textPage].split(/\n\s*\n/).map(p=>`<p>${escapeHTML(p).replace(/\n/g,'<br>')}</p>`).join('');$('pageLabel').textContent=`Section ${textPage+1} of ${textPages.length}`;currentBook.page=textPage;currentBook.progress=Math.round((textPage+1)/textPages.length*100);updateProgress();saveBook(currentBook)}
function updateProgress(){$('progressFill').style.width=(currentBook?.progress||0)+'%';$('progressLabel').textContent=Math.round(currentBook?.progress||0)+'% completed'}
function nextPage(dir){if(!currentBook)return;if(currentFormat==='pdf'&&pdfDoc){pdfPage=Math.max(1,Math.min(pdfDoc.numPages,pdfPage+dir));renderPdfPage()}else if(['txt','rtf','json','csv','xml'].includes(currentFormat)){textPage=Math.max(0,Math.min(textPages.length-1,textPage+dir));renderTextPage()}else if(currentFormat==='epub'&&epubBook){dir>0?epubRendition.next():epubRendition.prev()}}
function saveBookmark(){if(!currentBook)return;const mark={label:`${Math.round(currentBook.progress||0)}% · ${new Date().toLocaleString()}`,page:currentBook.page||0,cfi:currentBook.cfi||null,created:Date.now()};currentBook.bookmarks.push(mark);saveBook(currentBook);toast('Bookmark saved')}
function selected(){return window.getSelection()?.toString().trim()||''}
function showSelection(){const s=selected();if(!s||!currentBook)return;selectedText=s;const pop=$('selectionPopover');const range=window.getSelection().getRangeAt(0).getBoundingClientRect();pop.style.left=Math.min(window.innerWidth-300,Math.max(8,range.left))+'px';pop.style.top=Math.max(8,range.top-48)+'px';pop.classList.add('show')}
function hideSelection(){setTimeout(()=>$('selectionPopover').classList.remove('show'),180)}
function addHighlight(){if(!selectedText)return;currentBook.highlights.push({text:selectedText,created:Date.now(),progress:currentBook.progress||0});saveBook(currentBook);$('selectionPopover').classList.remove('show');toast('Highlight saved')}
function explainSelection(){const phrase=(selectedText||'').trim();if(!phrase){toast('Select a sentence first');return}const parts=phrase.split(/[,;:]|\b(?:because|although|however|therefore|which|that)\b/i).filter(Boolean);const words=[...new Set((phrase.match(/[A-Za-z'-]+/g)||[]).map(w=>w.toLowerCase()))].slice(0,18);const msg='Selected sentence:\n'+phrase+'\n\nRead it in smaller parts:\n'+parts.join(' / ')+'\n\nUseful words to check:\n'+words.join(', ')+'\n\nThis is a basic reading aid, not an AI-generated explanation or translation.';const w=window.open('','_blank');if(w){w.document.write('<meta charset="utf-8"><title>Sentence helper</title><body style="font:16px/1.7 system-ui;max-width:760px;margin:40px auto;padding:0 20px;white-space:pre-wrap"></body>');w.document.body.textContent=msg}else toast('Allow pop-ups to view the sentence helper');$('selectionPopover').classList.remove('show')}
function openWordDialog(word){$('wordInput').value=word||selectedText.split(/\s+/)[0]||'';$('meaningInput').value='';$('wordDialog').showModal();$('selectionPopover').classList.remove('show')}
function openNoteDialog(context=''){ $('noteContext').textContent=context?`Selected text: “${context.slice(0,180)}”`:currentBook?.title||'';$('noteText').value='';$('noteDialog').showModal();$('selectionPopover').classList.remove('show')}
function saveNote(){if(!currentBook)return;const text=$('noteText').value.trim();if(!text)return;currentBook.notes.push({text,quote:selectedText||'',created:Date.now(),progress:currentBook.progress||0});saveBook(currentBook);$('noteDialog').close();selectedText='';toast('Note saved')}
function saveWord(){const word=$('wordInput').value.trim();if(!word)return;const meaning=$('meaningInput').value.trim();currentBook.vocabulary=currentBook.vocabulary||[];const exists=currentBook.vocabulary.some(w=>w.word.toLowerCase()===word.toLowerCase());if(!exists)currentBook.vocabulary.push({word,meaning,created:Date.now()});saveBook(currentBook);$('wordDialog').close();renderLibrary();toast(exists?'Word already saved':'Word added to vocabulary')}
function renderVocabulary(){const words=books.flatMap(b=>(b.vocabulary||[]).map(w=>({...w,book:b.title,bookId:b.id}))).sort((a,b)=>b.created-a.created);$('vocabCount').textContent=words.length;$('vocabularyList').innerHTML=words.map((w,i)=>`<div class="data-item"><strong>${escapeHTML(w.word)}</strong><p>${escapeHTML(w.meaning||'No meaning added yet.')}</p><span class="item-meta">From ${escapeHTML(w.book)}</span><div class="item-actions"><button data-edit-word="${w.bookId}|${i}">Edit meaning</button><button data-remove-word="${w.bookId}|${w.word}">Remove</button></div></div>`).join('');$('vocabEmpty').hidden=words.length>0}
function renderNotes(){const items=books.flatMap(b=>[...(b.notes||[]).map(n=>({...n,kind:'Note',book:b.title})),...(b.highlights||[]).map(h=>({...h,kind:'Highlight',book:b.title,text:h.text}))]).sort((a,b)=>b.created-a.created);$('notesList').innerHTML=items.map(n=>`<div class="data-item"><span class="item-meta">${n.kind.toUpperCase()} · ${escapeHTML(n.book)} · ${Math.round(n.progress||0)}%</span><p>${escapeHTML(n.quote||n.text)}</p>${n.quote&&n.text?`<p>${escapeHTML(n.text)}</p>`:''}</div>`).join('');$('notesEmpty').hidden=items.length>0}

async function lookupDefinition(word){
  const clean=(word||'').replace(/[^a-zA-Z'-]/g,'').trim();
  if(!clean){toast('Select a word first');return}
  $('wordInput').value=clean;$('meaningInput').value='Looking up definition…';$('wordDialog').showModal();
  try{
    const res=await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(clean));
    if(!res.ok)throw new Error('No definition');const entry=(await res.json())[0];
    const phon=entry.phonetic||entry.phonetics?.find(p=>p.text)?.text||'';
    const defs=(entry.meanings||[]).slice(0,3).map(m=>(m.partOfSpeech||'Meaning')+': '+(m.definitions?.[0]?.definition||''));
    $('meaningInput').value=[phon,...defs].filter(Boolean).join('\n');
    const audio=entry.phonetics?.find(p=>p.audio)?.audio;
    if(audio){const b=document.createElement('button');b.type='button';b.className='quiet-btn';b.textContent='▶ Play pronunciation';b.onclick=()=>new Audio(audio).play().catch(()=>toast('Audio unavailable'));$('meaningInput').after(b)}
  }catch(e){$('meaningInput').value='Could not retrieve a definition. Add your own meaning or check your internet connection.'}
}
function speakCurrentPage(){
  if(!('speechSynthesis'in window)){toast('Text-to-speech is not supported here');return}
  if(speechSynthesis.speaking){speechSynthesis.cancel();toast('Read aloud stopped');return}
  const text=$('readerContent').innerText.trim();if(!text){toast('No readable text on this page');return}
  const u=new SpeechSynthesisUtterance(text);u.lang='en-IN';u.rate=1;speechSynthesis.speak(u);
}
function exportNotes(){
  const lines=['JUS READER — NOTES & VOCABULARY',''];
  for(const b of books){
    for(const n of b.notes||[])lines.push(`NOTE — ${b.title}\n${n.quote||''}\n${n.text}\n`);
    for(const h of b.highlights||[])lines.push(`HIGHLIGHT — ${b.title}\n${h.text}\n`);
    for(const w of b.vocabulary||[])lines.push(`WORD — ${w.word}\n${w.meaning||''}\nBook: ${b.title}\n`);
  }
  if(lines.length===2){toast('Nothing to export yet');return}
  const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='jus-reader-notes.txt';a.click();URL.revokeObjectURL(url);toast('Notes exported');
}

function switchTheme(){document.body.classList.toggle('dark');localStorage.setItem('jr-dark',document.body.classList.contains('dark')?'1':'0')}
function applyReaderTheme(v){$('readingArea').dataset.theme=v;localStorage.setItem('jr-reader-theme',v)}
function finishSession(){if(currentBook&&readingStarted){const mins=Math.floor((Date.now()-readingStarted)/60000);if(mins>0){currentBook.minutes=(currentBook.minutes||0)+mins;saveBook(currentBook);readingStarted=Date.now();renderLibrary()}}}
$('addBookBtn').onclick=$('emptyAddBtn').onclick=()=>$('fileInput').click();
$('fileInput').addEventListener('change',e=>{addFiles([...e.target.files]);e.target.value=''});
$('bookGrid').addEventListener('click',e=>{const del=e.target.closest('[data-delete]');if(del){e.stopPropagation();const id=del.dataset.delete;if(confirm('Remove this book and its saved notes from this device?')){books=books.filter(b=>b.id!==id);tx('readwrite',s=>s.delete(id)).then(renderLibrary)}return}const card=e.target.closest('[data-open]');if(card)openBook(card.dataset.open)});
$('continueCard').addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b)openBook(b.dataset.open)});
document.querySelectorAll('.nav-item').forEach(n=>n.onclick=()=>setView(n.dataset.view));
$('searchInput').oninput=renderLibrary;$('backLibrary').onclick=()=>{finishSession();if('speechSynthesis'in window)speechSynthesis.cancel();setView('library');renderLibrary()};
$('prevPage').onclick=()=>nextPage(-1);$('nextPage').onclick=()=>nextPage(1);$('bookmarkBtn').onclick=saveBookmark;$('speakBtn').onclick=speakCurrentPage;
$('fontDown').onclick=()=>{fontSize=Math.max(14,fontSize-1);$('readerContent').style.fontSize=fontSize+'px'};
$('fontUp').onclick=()=>{fontSize=Math.min(32,fontSize+1);$('readerContent').style.fontSize=fontSize+'px'};
$('readerTheme').value=localStorage.getItem('jr-reader-theme')||'paper';$('readerTheme').onchange=e=>applyReaderTheme(e.target.value);applyReaderTheme($('readerTheme').value);
$('themeToggle').onclick=switchTheme;if(localStorage.getItem('jr-dark')==='1')document.body.classList.add('dark');
$('menuBtn').onclick=()=>$('sidebar').classList.toggle('open');$('addNoteBtn').onclick=()=>openNoteDialog();$('noteSelection').onclick=()=>openNoteDialog(selectedText);$('highlightSelection').onclick=addHighlight;$('lookupSelection').onclick=()=>lookupDefinition(selectedText.split(/\s+/)[0]);$('explainSelection').onclick=explainSelection;$('saveNoteBtn').onclick=saveNote;$('saveWordBtn').onclick=saveWord;
$('readingArea').addEventListener('mouseup',showSelection);$('readingArea').addEventListener('touchend',()=>setTimeout(showSelection,250));document.addEventListener('mousedown',e=>{if(!e.target.closest('.selection-popover'))hideSelection()});
$('tocList').addEventListener('click',e=>{const b=e.target.closest('[data-href]');if(b&&epubRendition)epubRendition.display(b.dataset.href)});
$('readerMenuBtn').onclick=()=>{const v=prompt('1 = Read aloud / stop\n2 = Export notes');if(v==='1')speakCurrentPage();if(v==='2')exportNotes()};
$('exportNotesBtn').onclick=exportNotes;$('vocabularyList').addEventListener('click',e=>{const edit=e.target.closest('[data-edit-word]');if(edit){const [id]=edit.dataset.editWord.split('|'),b=getBook(id);const w=b.vocabulary.find(x=>x.word);const word=prompt('Word',w?.word||'');if(word){const meaning=prompt('Meaning',w?.meaning||'');w.word=word;w.meaning=meaning||'';saveBook(b).then(renderVocabulary)}}
 const rem=e.target.closest('[data-remove-word]');if(rem){const [id,word]=rem.dataset.removeWord.split('|'),b=getBook(id);b.vocabulary=b.vocabulary.filter(w=>w.word!==word);saveBook(b).then(()=>{renderVocabulary();renderLibrary()})}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('installBtn').hidden=false});$('installBtn').onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('installBtn').hidden=true};
window.addEventListener('beforeunload',finishSession);
(async()=>{try{db=await requestDB();books=await allBooks();renderLibrary();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn)}catch(e){console.error(e);toast('Storage is unavailable in this browser.')}})();
