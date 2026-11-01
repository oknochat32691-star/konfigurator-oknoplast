const $=s=>document.querySelector(s);
const scenes=['Willa z basenem','Dom nad wodą','Dom parterowy — Orzech','Dom z przeszkleniem trójkątnym','Kuchnia','Dom z tarasem','Willa z żaluzjami','Salon'];
const initial={scene:3,color:null,facade:null,roof:null};let state={...initial},tab='scenes';
const names=['Aluminium szczotkowane','Biały','Black Jet','Dąb bagienny','Mattex Fenstergrau','Mattex Kitami Dark','Orzech','Sheffield Oak','Winchester','Woodec Dark Toffee','Woodec Turner Oak Malt','Złoty Dąb','Amber Oak','Coke Semimatt','Graphen Semimatt','Onyx Semimatt'];
const hex=['#9a9d9c','#eeeae5','#181a1d','#40352c','#777b7c','#49443e','#67402a','#b6a387','#ac8054','#66503c','#b6966c','#ad783d','#a57e56','#353636','#626664','#292b2c'];
const geometry={3:{windows:'M390 824H660V1030H390Z M406 839V1016H472V839Z M493 839V1016H559V839Z M579 839V1016H644V839Z M997 783H1362V1064H997Z M1014 803V1045H1097V803Z M1127 803V1045H1220V803Z M1244 803V1045H1344V803Z',roof:'M110 790L346 590H1584L1725 796H1525V748H830V790Z',facade:'M830 748H1525V1064H830Z M997 783V1064H1362V783Z'},5:{windows:'M710 310L1248 282V987L710 962Z M746 353V918L951 930V342Z M1020 339V929L1246 941V325Z'}};
// Front elevation: frame bands only; glazing remains untouched.
function frameRect(x,y,w,h,t=9,mullions=[]) {
 let d=`M${x} ${y}h${w}v${h}h${-w}Z M${x+t} ${y+t}v${h-2*t}h${w-2*t}v${-(h-2*t)}Z`;
 for(const offset of mullions)d+=` M${x+offset-t/2} ${y+t}h${t}v${h-2*t}h${-t}Z`;
 return d;
}
geometry[1]={windows:[
 frameRect(350,384,100,128,7),frameRect(690,415,165,89,8,[82]),
 frameRect(943,414,165,90,8),frameRect(1359,384,95,126,7),
 frameRect(347,677,100,217,8),frameRect(653,671,196,229,9,[98]),
 frameRect(946,677,196,221,9,[98]),frameRect(1361,679,96,215,8)
].join(' ')};
// Retain source shading and grain instead of covering profiles with flat paint.
geometry[3].windows='M399 831H652V1028H399Z M413 842V1016H475V842Z M497 842V1016H561V842Z M582 842V1016H642V842Z M1009 796H1352V1059H1009Z M1023 808V1046H1097V808Z M1130 808V1046H1218V808Z M1247 808V1046H1337V808Z';
// Visible bottom and right frame of the small window behind the timber facade.
geometry[3].windows+=' M1526 887H1613V848H1625V898H1526Z';
// Exact visible material boundaries in the 1824 x 1368 scene coordinate system.
geometry[3].roof='M116 789L318 596H1524L1722 787H1528V747H833V789Z';
geometry[3].facade='M834 756H1524V1062H1360V782H997V1062H834Z';
function materialLayer(path,color,key,id){
 const reference=key==='roof'?.59:.66;
 const channels=color.slice(1).match(/../g).map(v=>parseInt(v,16)/255);
 const transfer=channels.map((v,i)=>`<feFunc${'RGB'[i]} type="linear" slope="${(v/reference).toFixed(4)}" intercept="0"/>`).join('');
 return `<defs><clipPath id="${key}Mask"><path d="${path}"/></clipPath><filter id="${key}Finish" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer>${transfer}</feComponentTransfer></filter></defs><image href="assets/sceny/scena-${id}.webp" x="0" y="0" width="1824" height="1368" preserveAspectRatio="none" clip-path="url(#${key}Mask)" filter="url(#${key}Finish)" pointer-events="none"/>`;
}

// Kitchen: material samples from manufacturer renders; glazing and handle are excluded.
geometry[5].windows='M711 324L1249 289V977L711 949Z M739 353L953 340V927L739 917Z M1012 337L1249 324V941L1012 931Z M985 642L997 641V674L991 675V709L978 709V653L985 653Z';
function kitchenProfileLayer(path,id){
 const texture=PROFILE_TEXTURES[state.color];
 // Fixed scene-space scale: never stretch a texture to a profile's width.
 const pattern=(key,rotate)=>`<pattern id="${key}" width="700" height="700" patternUnits="userSpaceOnUse" patternTransform="rotate(${rotate})"><image href="${texture.source}" width="700" height="700" preserveAspectRatio="xMidYMid slice"/></pattern>`;
 const strips='<path d="M711 289H741V977H711Z M953 289H1012V977H953Z" fill="url(#grainVertical)"/><path d="M711 324L1249 289V319L711 354Z M711 919L1249 947V978L711 950Z" fill="url(#grainHorizontal)"/>';
 return `<defs><clipPath id="profileMask"><path d="${path}" clip-rule="evenodd"/></clipPath>${pattern('grainVertical',0)}${pattern('grainHorizontal',90)}<filter id="kitchenLight" x="0" y="0" width="1824" height="1368" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="1.18"/><feFuncG type="linear" slope="1.18"/><feFuncB type="linear" slope="1.18"/></feComponentTransfer></filter></defs><g clip-path="url(#profileMask)" style="isolation:isolate" pointer-events="none">${strips}<image href="assets/sceny/scena-${id}.webp" width="1824" height="1368" preserveAspectRatio="none" filter="url(#kitchenLight)" style="mix-blend-mode:multiply"/></g>`;
}

function profileLayer(path,id){
 if(state.color===null || (state.scene===3 && state.color===6))return '';
 if(state.scene===5)return kitchenProfileLayer(path,id);
 const rgb=hex[state.color].slice(1).match(/../g).map(v=>parseInt(v,16)/255);
 const reference=state.scene===5?.74:state.scene===1?.19:.36;
 const slopes=rgb.map(v=>Math.min(3.4,v/reference));
 const transfers=slopes.map((v,i)=>`<feFunc${'RGB'[i]} type="linear" slope="${v.toFixed(4)}" intercept="0.012"/>`).join('');
 return `<defs><clipPath id="profileMask"><path d="${path}" clip-rule="evenodd"/></clipPath><filter id="profileFinish" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer>${transfers}</feComponentTransfer></filter></defs><image href="assets/sceny/scena-${id}.webp" x="0" y="0" width="1824" height="1368" preserveAspectRatio="none" clip-path="url(#profileMask)" filter="url(#profileFinish)" pointer-events="none"/>`;
}

function validate(v){if(!v||!Number.isInteger(v.scene)||v.scene<1||v.scene>8)throw Error('Nieprawidłowy obiekt');for(const k of ['facade','roof'])if(v[k]!==null&&!/^#[0-9a-f]{6}$/i.test(v[k]||''))throw Error('Nieprawidłowy kolor');if(v.color!==null&&(!Number.isInteger(v.color)||v.color<0||v.color>=PROFILE_COLORS.length))throw Error('Nieprawidłowy profil');return Object.fromEntries(Object.keys(initial).map(k=>[k,v[k]]));}
try{if(location.hash)state=validate(JSON.parse(decodeURIComponent(location.hash.slice(1))));}catch(e){$('#status').textContent='Link zawiera nieprawidłową konfigurację.';}
function sync(){try{history.replaceState(null,'','#'+encodeURIComponent(JSON.stringify(state)));}catch(e){}renderScene();}
function renderScene(){const id=String(state.scene).padStart(2,'0');$('#house').src=`assets/sceny/scena-${id}.webp`;$('#sceneTitle').textContent=scenes[state.scene-1];$('#summary').textContent=state.color===null?'Oryginalna wizualizacja':`PRISMATIC · ${names[state.color]}`;const g=geometry[state.scene]||{};$('#overlay').innerHTML=Object.entries({roof:state.roof,facade:state.facade,windows:state.color===null?null:hex[state.color]}).filter(([k,v])=>v&&g[k]&&k!=="windows").map(([k,v])=>materialLayer(g[k],v,k,id)).join('')+(g.windows?profileLayer(g.windows,id):'');$('#overlay').onclick=e=>{if(e.target.dataset.layer){tab=e.target.dataset.layer;renderPanel();}};}
function renderPanel(){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('selected',b.dataset.tab===tab));let content='';if(tab==='scenes'){content='<h2>Wybierz przestrzeń</h2><p>Sześć domów i dwa wnętrza.</p><div class="grid">'+scenes.map((n,i)=>`<button class="card ${state.scene===i+1?'selected':''}" data-scene="${i+1}"><img src="assets/sceny/scena-${String(i+1).padStart(2,'0')}.webp" alt=""><span>${n}</span></button>`).join('')+'</div>';}else if(tab==='windows'){content='<h2>Kolor okien</h2><p>System PRISMATIC</p><p class="notice">'+(state.scene===5?'Oryginalne próbki oklein producenta, w stałej skali i z zachowaniem światła wnętrza. Klamka pozostaje w oryginalnym kolorze.':geometry[state.scene]?.windows?'Podgląd zachowuje światło i detale ram. Usłojenie pochodzi ze zdjęcia, nie ze wzornika wybranej okleiny.':'Ta scena jest dostępna jako zdjęcie referencyjne. Zmianę ram możesz sprawdzić na domu parterowym lub w kuchni.')+'</p><button data-original>Oryginalny wygląd</button><div class="grid colors">'+PROFILE_COLORS.map((c,i)=>`<button class="card ${state.color===i?'selected':''}" data-color="${i}" ${geometry[state.scene]?.windows ? "" : "disabled"}><img loading="lazy" src="assets/kolory-prismatic/${c.file}" alt="Profil ${names[i]}"><span>${names[i]}</span></button>`).join('')+'</div>';}else{let titles={facade:'Wykończenie elewacji',roof:'Kolor dachu'};content=`<h2>${titles[tab]}</h2>`;if(!geometry[state.scene]?.[tab])content+='<p>Zmiana tego elementu jest obecnie przygotowana dla domu parterowego — Orzech.</p><button data-demo>Przejdź do domu parterowego</button>';else content+='<p>Wybierz odcień. Podgląd ma charakter orientacyjny.</p><button data-clear>Oryginalny wygląd</button><div class="swatches">'+['#f2eee5','#bcb6aa','#8a8d8e','#45494c','#b49b7d','#8a5b43','#7896ac','#c6dce8'].map(c=>`<button class="swatch ${state[tab]===c?'selected':''}" style="background:${c}" data-paint="${c}" aria-label="Kolor ${c}"></button>`).join('')+'</div>';}
$('#panel').innerHTML=content;}
$('#panel').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.scene){state={...initial,scene:Number(b.dataset.scene)};}else if(b.dataset.color!==undefined){if(!geometry[state.scene]?.windows)return;state.color=Number(b.dataset.color);}else if(b.hasAttribute('data-original'))state.color=null;else if(b.dataset.paint)state[tab]=b.dataset.paint;else if(b.hasAttribute('data-clear'))state[tab]=null;else if(b.hasAttribute('data-demo'))state={...initial};sync();renderPanel();document.querySelector('#status').textContent=state.color===null?'Oryginalny wygląd.':'Wybrany kolor: '+names[state.color];};
document.querySelector('nav').onclick=e=>{if(e.target.dataset.tab){tab=e.target.dataset.tab;renderPanel();}};
$('#reset').onclick=()=>{state={...initial};sync();renderPanel();document.querySelector('#status').textContent=state.color===null?'Oryginalny wygląd.':'Wybrany kolor: '+names[state.color];};
$('#save').onclick=()=>{const a=document.createElement('a');const u=URL.createObjectURL(new Blob([JSON.stringify({version:1,...state},null,2)],{type:'application/json'}));a.href=u;a.download='oknoplast-projekt.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);$('#status').textContent='Projekt zapisany do pliku.';};
$('#load').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>100000)throw Error('Plik jest zbyt duży');state=validate(JSON.parse(await f.text()));sync();renderPanel();$('#status').textContent='Projekt wczytany.';}catch(err){$('#status').textContent='Nie można wczytać projektu: '+err.message;}e.target.value='';};
$('#share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('#status').textContent=location.protocol==='file:'?'Skopiowano lokalny link. Zadziała na komputerze z tym folderem.':'Link skopiowany.';}catch(e){$('#status').textContent='Skopiuj adres z paska przeglądarki.';}};
$('#print').onclick=()=>window.print();renderScene();renderPanel();


