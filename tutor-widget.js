/* =====================================================================
   VOYAGE TUTOR WIDGET  — drop-in floating tutor for every page
   Usage: add  <script src="tutor-widget.js"></script>  before </body>
   - Floating button bottom-right; panel slides out over the page
   - Reads the kid's saved progress (localStorage) as memory
   - Full within-session conversation; sends a photo only ONCE
   - The AI call is isolated in callTutor() — swap its body for your
     Cloudflare Worker endpoint when you go live
   ===================================================================== */
(function(){
  if (window.__voyageTutor) return; window.__voyageTutor = true;

  var C = { paper:'#f3f0e6', ink:'#16233a', blue:'#1b4f8a', line:'#b9cbdf',
            accent:'#f0663f', muted:'#5d6b7e', card:'#fbfaf5', green:'#2e7d5b' };

  /* ---------- the orbiting-planet glyph ---------- */
  var GLYPH = ''
    + '<svg viewBox="0 0 24 24" fill="none" class="vt-g">'
    +   '<ellipse cx="12" cy="12" rx="8.4" ry="3.2" fill="none" stroke="'+C.accent+'" stroke-width="1.4" opacity="0.45" transform="rotate(-24 12 12)"/>'
    +   '<g transform="translate(12,12) rotate(-24)"><circle r="1.9" fill="'+C.accent+'" opacity="0">'
    +     '<animateMotion class="vt-m" dur="4s" begin="indefinite" repeatCount="indefinite" rotate="0" path="M8.4,0 A8.4,3.2 0 1,1 -8.4,0 A8.4,3.2 0 1,1 8.4,0"/>'
    +     '<animate class="vt-o" attributeName="opacity" values="0;1" keyTimes="0;0.5" dur="4s" begin="indefinite" repeatCount="indefinite" calcMode="discrete"/>'
    +   '</circle></g>'
    +   '<circle cx="12" cy="12" r="4.3" fill="currentColor"/>'
    +   '<g transform="translate(12,12) rotate(-24)"><circle r="1.9" fill="'+C.accent+'" opacity="0">'
    +     '<animateMotion class="vt-m" dur="4s" begin="indefinite" repeatCount="indefinite" rotate="0" path="M8.4,0 A8.4,3.2 0 1,1 -8.4,0 A8.4,3.2 0 1,1 8.4,0"/>'
    +     '<animate class="vt-o" attributeName="opacity" values="1;0" keyTimes="0;0.5" dur="4s" begin="indefinite" repeatCount="indefinite" calcMode="discrete"/>'
    +   '</circle></g>'
    + '</svg>';

  /* ---------- styles ---------- */
  var css = ''
  + '.vt-btn{position:fixed;bottom:22px;right:22px;z-index:99998;display:flex;align-items:center;gap:9px;'
  +   'padding:11px 17px 11px 12px;background:'+C.card+';color:'+C.blue+';border:2px solid '+C.ink+';border-radius:30px;'
  +   'cursor:pointer;box-shadow:3px 3px 0 '+C.ink+';font-family:"Space Grotesk",system-ui,sans-serif;font-weight:600;font-size:15px;transition:transform .08s,box-shadow .08s}'
  + '.vt-btn:hover{transform:translateY(-1px)}'
  + '.vt-btn:active{transform:translate(3px,3px);box-shadow:0 0 0 '+C.ink+'}'
  + '.vt-btn .vt-g{width:30px;height:30px;overflow:visible}'
  + '.vt-btn span{color:'+C.ink+'}'
  + '.vt-btn.vt-hide{display:none}'
  + '.vt-back{position:fixed;inset:0;z-index:99998;background:rgba(22,35,58,.28);opacity:0;pointer-events:none;transition:opacity .3s}'
  + '.vt-back.open{opacity:1;pointer-events:auto}'
  + '.vt-panel{position:fixed;top:0;right:0;z-index:99999;height:100vh;width:410px;max-width:94vw;background:'+C.paper+';'
  +   'border-left:2px solid '+C.ink+';box-shadow:-6px 0 24px rgba(22,35,58,.18);display:flex;flex-direction:column;'
  +   'transform:translateX(105%);transition:transform .32s cubic-bezier(.4,.0,.2,1);font-family:"Space Grotesk",system-ui,sans-serif;color:'+C.ink+'}'
  + '.vt-panel.open{transform:translateX(0)}'
  + '.vt-head{flex-shrink:0;padding:15px 18px;border-bottom:1.5px solid '+C.line+';display:flex;align-items:center;justify-content:space-between;gap:10px}'
  + '.vt-title{display:flex;align-items:center;gap:9px}'
  + '.vt-title .vt-g{width:34px;height:34px;overflow:visible;color:'+C.blue+'}'
  + '.vt-title b{font-family:"Fraunces",Georgia,serif;font-weight:700;font-size:18px}'
  + '.vt-knows{font-family:"Space Mono",monospace;font-size:9.5px;letter-spacing:.05em;text-transform:uppercase;color:'+C.muted+';margin-top:1px}'
  + '.vt-x{background:none;border:none;cursor:pointer;font-size:24px;line-height:1;color:'+C.muted+';padding:2px 6px;border-radius:8px}'
  + '.vt-x:hover{background:rgba(22,35,58,.07);color:'+C.ink+'}'
  + '.vt-chat{flex:1;overflow-y:auto;padding:18px}'
  + '.vt-msg{display:flex;margin-bottom:15px;gap:9px}'
  + '.vt-who{flex-shrink:0;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:15px;border-radius:11px}'
  + '.vt-msg.tutor .vt-who{color:'+C.blue+'}'
  + '.vt-msg.tutor .vt-who .vt-g{width:40px;height:40px;overflow:visible}'
  + '.vt-msg.kid .vt-who{background:'+C.accent+';color:#fff}'
  + '.vt-msg.tutor.think .vt-who .vt-m,.vt-msg.tutor.think .vt-who .vt-o{}'
  + '.vt-bub{background:'+C.card+';border:1.5px solid '+C.line+';border-radius:14px;padding:11px 14px;font-size:15px;line-height:1.55;max-width:80%}'
  + '.vt-msg.kid{flex-direction:row-reverse}'
  + '.vt-msg.kid .vt-bub{background:'+C.blue+';color:#fff;border-color:'+C.blue+'}'
  + '.vt-bub img{max-width:180px;border-radius:8px;display:block;margin-bottom:6px}'
  + '.vt-bub p{margin:0 0 8px}.vt-bub p:last-child{margin:0}'
  + '.vt-typing{color:'+C.muted+';font-style:italic;font-size:14px}'
  + '.vt-comp{flex-shrink:0;border-top:1.5px solid '+C.line+';padding:12px 16px}'
  + '.vt-thumbs{display:flex;gap:6px;margin-bottom:7px}'
  + '.vt-thumbs img{height:42px;border-radius:6px;border:1.5px solid '+C.line+'}'
  + '.vt-cbox{display:flex;gap:8px;align-items:flex-end}'
  + '.vt-cbox textarea{flex:1;font-family:inherit;font-size:15px;padding:12px 13px;border:1.5px solid '+C.line+';border-radius:12px;background:#fff;color:'+C.ink+';outline:none;resize:none;max-height:110px;min-height:44px;line-height:1.4;overflow-y:hidden}'
  + '.vt-cbox textarea:focus{border-color:'+C.blue+'}'
  + '.vt-ic{flex-shrink:0;width:44px;height:44px;border-radius:11px;border:1.5px solid '+C.ink+';background:#fff;cursor:pointer;font-size:17px;box-shadow:2px 2px 0 '+C.ink+';display:flex;align-items:center;justify-content:center;transition:transform .08s,box-shadow .08s}'
  + '.vt-ic:active{transform:translate(2px,2px);box-shadow:0 0 0 '+C.ink+'}'
  + '.vt-send{background:'+C.accent+';color:#fff}'
  + '.vt-hidden{display:none}'
  + '@media(max-width:520px){.vt-btn span{display:none}.vt-btn{padding:12px}}';
  var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  /* ---------- memory from saved progress ---------- */
  function readProfile(){ var p={name:'friend',grade:'4'};
    try{ var r=localStorage.getItem('voyage_profile'); if(r){ var o=JSON.parse(r); if(o&&typeof o==='object') p=Object.assign(p,o); } }catch(e){}
    return p; }
  function countDone(k){ try{ var r=localStorage.getItem(k); if(r){ var o=JSON.parse(r); return Object.keys((o&&o.done)||{}).length; } }catch(e){} return 0; }
  function buildMemory(){
    var p=readProfile();
    var proj=[['plane','voyage_project_plane_g4'],['guard bot','voyage_project_guardbot_g4'],['arcade game','voyage_project_arcade_g4']]
      .map(function(a){ var d=countDone(a[1]); return d>0? a[0]+' ('+d+'/6 steps)':null; }).filter(Boolean);
    return { profile:p,
      math:countDone('voyage_g4math_progress'), ela:countDone('voyage_g4ela_progress'),
      sci:countDone('voyage_g4sci_progress'), ss:countDone('voyage_g4ss_progress'), projects:proj };
  }
  var MEM = buildMemory();

  /* What the student is looking at RIGHT NOW — re-read on every send so it
     tracks them through the lesson. Lessons render into #stage (#intro before
     they start); course pages use .card. */
  function captureScreen(){
    var el = null;
    var ids = ['stage','intro'];
    for (var i=0;i<ids.length;i++){
      var c = document.getElementById(ids[i]);
      if (c && c.offsetParent !== null && c.innerText && c.innerText.trim()){ el = c; break; }
    }
    if (!el){ var card = document.querySelector('.card'); if (card && card.innerText) el = card; }
    if (!el) return '';
    var txt = el.innerText.replace(/\n{3,}/g,'\n\n').trim();
    if (txt.length > 2000) txt = txt.slice(0, 2000) + '…';
    return 'WHAT IS ON '+MEM.profile.name.toUpperCase()+"'S SCREEN RIGHT NOW (page: "+document.title+'):\n---\n'+txt+'\n---\nAssume their question is about this screen unless they say otherwise — never ask them to describe what they are looking at. If the screen shows a quiz question, do NOT give away the answer; guide them to it.';
  }

  function systemPrompt(){
    var p=MEM.profile;
    var ctx='STUDENT: '+p.name+', Grade '+p.grade+'.\nProgress so far: '+MEM.math+' math skills, '+MEM.ela+' reading/writing, '+MEM.sci+' science, '+MEM.ss+' social studies mastered.';
    if(MEM.projects.length) ctx+='\nWorking on project(s): '+MEM.projects.join(', ')+'.';
    var screen=captureScreen();
    if(screen) ctx+='\n\n'+screen;
    return 'You are Aurora, the Voyage tutor — warm, patient, and encouraging — for a homeschool student named '+p.name+'. You are their ONE tutor across everything: lessons, hands-on projects, and practice.\n\n'+ctx+'\n\nHOW YOU TEACH (this matters most): You are the "We Do" — guided practice. Do NOT just hand over answers. Guide '+p.name+' to figure it out with small questions, hints, and encouragement, the way a great tutor does. Break things into little steps. Use plain examples a 9–10 year old gets. Celebrate small wins. If they share a photo of a project, look closely and give specific, concrete, doable feedback. LENGTH RULE: say exactly as much as the idea needs, then stop. Articulate the concept fully and clearly — but zero filler: no "great question!", no restating what they said, no recapping, no tacked-on extras. One concept or one question per reply; let the back-and-forth carry the rest. If they seem stuck or frustrated, slow down and reassure them.';
  }

  /* ---------- build DOM ---------- */
  var btn=document.createElement('button'); btn.className='vt-btn';
  btn.innerHTML=GLYPH+'<span>Tutor</span>';
  var back=document.createElement('div'); back.className='vt-back';
  var panel=document.createElement('div'); panel.className='vt-panel';
  panel.innerHTML=''
    + '<div class="vt-head"><div class="vt-title">'+GLYPH+'<div><b>Aurora</b><div class="vt-knows" id="vt-knows"></div></div></div>'
    +   '<button class="vt-x" id="vt-x" title="Close">\u00d7</button></div>'
    + '<div class="vt-chat" id="vt-chat"></div>'
    + '<div class="vt-comp"><div class="vt-thumbs" id="vt-thumbs"></div>'
    +   '<div class="vt-cbox"><button class="vt-ic" id="vt-photo" title="Share a photo">\uD83D\uDCF7</button>'
    +   '<input type="file" accept="image/*" class="vt-hidden" id="vt-file">'
    +   '<textarea id="vt-in" rows="1" placeholder="Ask me anything\u2026"></textarea>'
    +   '<button class="vt-ic vt-send" id="vt-send" title="Send">\u2191</button></div></div>';
  document.body.appendChild(btn); document.body.appendChild(back); document.body.appendChild(panel);

  document.getElementById('vt-knows').textContent='Helping '+MEM.profile.name+' \u00b7 Grade '+MEM.profile.grade;

  var chat=document.getElementById('vt-chat');
  var input=document.getElementById('vt-in');
  var fileIn=document.getElementById('vt-file');
  var thumbs=document.getElementById('vt-thumbs');
  var convo=[]; var pendingImages=[]; var greeted=false;

  function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function renderText(t){ return esc(t).split(/\n\n+/).map(function(p){
    p = p.replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>').replace(/\*([^*\n]+)\*/g,'<i>$1</i>');
    return '<p>'+p.replace(/\n/g,'<br>')+'</p>';
  }).join(''); }
  function bubble(role, html){
    var d=document.createElement('div'); d.className='vt-msg '+(role==='kid'?'kid':'tutor');
    var who = role==='kid' ? (MEM.profile.name[0]||'K').toUpperCase() : GLYPH;
    d.innerHTML='<div class="vt-who">'+who+'</div><div class="vt-bub">'+html+'</div>';
    chat.appendChild(d); chat.scrollTop=chat.scrollHeight; return d;
  }
  function greetWord(){ var h=new Date().getHours(); return h<12?'Good morning':h<18?'Good afternoon':'Good evening'; }

  /* ---------- open / close ---------- */
  function open(){ panel.classList.add('open'); back.classList.add('open'); btn.classList.add('vt-hide');
    if(!greeted){ greeted=true; bubble('tutor', renderText(greetWord()+', '+MEM.profile.name+'! I\u2019m Aurora, your Voyage tutor. I can help you understand a lesson, work through your project, or get unstuck on a problem. What are you working on?')); }
    setTimeout(function(){ input.focus(); },320); }
  function close(){ panel.classList.remove('open'); back.classList.remove('open'); btn.classList.remove('vt-hide'); }
  btn.addEventListener('click', open);
  back.addEventListener('click', close);
  document.getElementById('vt-x').addEventListener('click', close);

  /* ---------- photo ---------- */
  document.getElementById('vt-photo').addEventListener('click', function(){ fileIn.click(); });
  fileIn.addEventListener('change', function(e){
    var f=e.target.files[0]; if(!f) return;
    var reader=new FileReader();
    reader.onload=function(ev){ var dataUrl=ev.target.result;
      pendingImages.push({ dataUrl:dataUrl, media_type:f.type||'image/jpeg', base64:dataUrl.split(',')[1] });
      var img=document.createElement('img'); img.src=dataUrl; thumbs.appendChild(img); };
    reader.readAsDataURL(f);
  });

  input.addEventListener('input', function(){ input.style.height='auto'; var h=Math.min(input.scrollHeight,110);
    input.style.height=h+'px'; input.style.overflowY = input.scrollHeight>110?'auto':'hidden'; });
  input.addEventListener('keydown', function(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } });
  document.getElementById('vt-send').addEventListener('click', send);

  /* ---------- the AI call (SWAP for your Worker later) ---------- */
  function callTutor(){
    var apiMessages = convo.map(function(m,i){
      var isLast=(i===convo.length-1);
      if(Array.isArray(m.content)){
        if(isLast) return { role:m.role, content:m.content };
        var tp=m.content.filter(function(c){return c.type==='text';})[0];
        return { role:m.role, content:(tp?tp.text+' ':'')+'[shared a photo earlier]' };
      }
      return { role:m.role, content:m.content };
    });
    return fetch('https://voyage-tutor.superjames735.workers.dev', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ system:systemPrompt(), messages:apiMessages })
    }).then(function(r){ return r.json(); }).then(function(data){
      var text=(data.content||[]).filter(function(b){return b.type==='text';}).map(function(b){return b.text;}).join('\n');
      return text || 'Hmm, I didn\u2019t catch that \u2014 can you say it again?';
    });
  }

  function send(){
    var text=input.value.trim();
    if(!text && pendingImages.length===0) return;
    var content, bubbleHtml='';
    if(pendingImages.length){
      content=[];
      pendingImages.forEach(function(im){ content.push({type:'image', source:{type:'base64', media_type:im.media_type, data:im.base64}}); bubbleHtml+='<img src="'+im.dataUrl+'">'; });
      content.push({type:'text', text:text||'(here\u2019s my photo)'});
      bubbleHtml+=renderText(text||'(here\u2019s my photo)');
    } else { content=text; bubbleHtml=renderText(text); }
    bubble('kid', bubbleHtml);
    convo.push({ role:'user', content:content });
    input.value=''; input.style.height='auto'; pendingImages=[]; thumbs.innerHTML='';

    var typing=bubble('tutor','<span class="vt-typing">thinking\u2026</span>');
    typing.classList.add('think');
    var anims=typing.querySelectorAll('.vt-m,.vt-o');
    anims.forEach(function(a){ if(a.beginElement){ try{a.beginElement();}catch(e){} } });
    function stopOrbit(){ anims.forEach(function(a){ if(a.endElement){ try{a.endElement();}catch(e){} } }); }
    callTutor().then(function(reply){
      stopOrbit();
      typing.classList.remove('think');
      typing.querySelector('.vt-bub').innerHTML=renderText(reply);
      convo.push({ role:'assistant', content:reply });
      chat.scrollTop=chat.scrollHeight;
    }).catch(function(err){
      stopOrbit();
      typing.classList.remove('think');
      typing.querySelector('.vt-bub').innerHTML=renderText('I couldn\u2019t reach my brain just now \u2014 on your live site this connects through your own setup. (Error: '+err.message+')');
    });
  }
})();
