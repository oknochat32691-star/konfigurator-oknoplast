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
 const reference=state.scene===1?.8:key==='roof'?.59:.66;
 const channels=color.slice(1).match(/../g).map(v=>parseInt(v,16)/255);
 const transfer=channels.map((v,i)=>`<feFunc${'RGB'[i]} type="linear" slope="${(v/reference).toFixed(4)}" intercept="0"/>`).join('');
 return `<defs><clipPath id="${key}Mask"><path d="${path}" clip-rule="evenodd"/></clipPath><filter id="${key}Finish" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer>${transfer}</feComponentTransfer></filter></defs><image href="assets/sceny/scena-${id}.webp" x="0" y="0" width="1824" height="1368" preserveAspectRatio="none" clip-path="url(#${key}Mask)" filter="url(#${key}Finish)" pointer-events="none"/>`;
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

// Villa: coordinates measured on the 1920x1440 source, inset inside dark profiles.
// Balcony profiles stop above the railing; concealed areas remain photographic.
const villaBands={vertical:[],horizontal:[]};
function villaBand(axis,x,y,w,h){villaBands[axis].push([x,y,w,h]);}
function villaFrame(x,y,w,h,t,middle){
 villaBand('vertical',x,y+t,t,h-2*t);villaBand('vertical',x+w-t,y+t,t,h-2*t);
 villaBand('horizontal',x,y,w,t);villaBand('horizontal',x,y+h-t,w,t);
 if(middle)villaBand('vertical',middle,y+t,6,h-2*t);
}
villaFrame(371,407,100,129,5);
villaFrame(1429,408,100,128,5);
villaFrame(368,716,99,223,5);
villaFrame(692,711,201,234,7,795);
villaFrame(1001,712,201,233,7,1102);
villaFrame(1433,717,97,220,5);
villaBand('horizontal',728,438,171,7);
villaBand('vertical',728,445,6,82);villaBand('vertical',893,445,6,82);villaBand('vertical',816,445,6,82);
villaBand('horizontal',992,438,171,6);
villaBand('vertical',992,444,5,83);villaBand('vertical',1158,444,5,83);
geometry[1].windows=Object.values(villaBands).flat().map(([x,y,w,h])=>`M${x*.95} ${y*.95}h${w*.95}v${h*.95}h${-w*.95}Z`).join(' ');
function villaProfileLayer(){
 const texture=PROFILE_TEXTURES[state.color];
 const patterns=['vertical','horizontal'].map((axis,i)=>`<pattern id="villa-${axis}" width="350" height="350" patternUnits="userSpaceOnUse" patternTransform="rotate(${i*90})"><image href="${texture.source}" width="350" height="350" preserveAspectRatio="xMidYMid slice"/></pattern>`).join('');
 const strips=Object.entries(villaBands).map(([axis,bands])=>bands.map(([x,y,w,h])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#villa-${axis})"/>`).join('')).join('');
 return `<defs>${patterns}<clipPath id="villaMask"><path d="${geometry[1].windows}"/></clipPath><filter id="villaLight" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="1.5" intercept=".55"/><feFuncG type="linear" slope="1.5" intercept=".55"/><feFuncB type="linear" slope="1.5" intercept=".55"/></feComponentTransfer></filter></defs><g clip-path="url(#villaMask)" style="isolation:isolate" pointer-events="none"><g transform="scale(.95)">${strips}</g><image href="assets/sceny/scena-01.webp" width="1824" height="1368" preserveAspectRatio="none" filter="url(#villaLight)" style="mix-blend-mode:multiply"/></g>`;
}

// Material masks are expressed in original photo pixels and normalized to the overlay.
function photoPath(d,height=1440){let i=0;return d.replace(/-?\d+(?:\.\d+)?/g,n=>String(+(Number(n)*(i++%2?1368/height:.95)).toFixed(3)));}
// Villa plaster: exclude openings, lights, balcony and foreground planting.
geometry[1].facade=photoPath('M232 348 L608 348 L640 378 L1247 378 L1282 348 L1664 348 L1664 507 L1635 518 L1610 550 L1580 552 L1572 587 L1540 592 L1540 630 L1327 630 L1327 526 L569 526 L569 630 L232 630 Z M350 392 L486 392 L486 553 L350 553 Z M709 422 L917 422 L917 526 L709 526 Z M976 422 L1182 422 L1182 526 L976 526 Z M1410 391 L1547 391 L1547 553 L1410 553 Z M675 414 L680 414 L681 431 L690 439 L684 460 L670 460 L666 440 L674 431 Z M1213 414 L1219 414 L1220 430 L1229 440 L1223 462 L1208 462 L1204 440 L1212 430 Z M226 653 L577 653 L584 649 L1325 649 L1325 653 L1537 653 L1537 700 L1550 730 L1540 781 L1552 810 L1535 845 L1545 880 L1555 940 L1407 940 L1407 916 L1390 904 L1400 883 L1385 858 L1364 846 L1343 865 L1330 887 L1345 911 L1340 940 L1290 940 L1282 911 L1273 899 L1285 873 L1270 846 L1257 837 L1239 861 L1237 886 L1251 904 L1247 940 L1217 940 L1217 692 L974 692 L974 950 L908 950 L908 693 L669 693 L669 940 L631 940 L625 916 L647 897 L641 875 L621 865 L602 871 L582 887 L583 910 L597 923 L594 940 L540 940 L540 923 L555 903 L546 880 L557 868 L545 844 L531 829 L516 845 L499 852 L491 878 L502 896 L493 912 L509 927 L509 940 L481 940 L481 699 L350 699 L350 940 L280 940 L280 924 L269 913 L264 868 L286 854 L306 845 L321 824 L315 801 L324 788 L305 771 L301 751 L283 740 L272 751 L259 738 L249 758 L232 760 L226 744 Z M1416 699 L1540 699 L1540 943 L1416 943 Z M620 711 L627 711 L627 730 L638 744 L632 764 L626 770 L626 779 L620 779 L620 769 L611 763 L609 743 L619 730 Z M942 711 L948 711 L948 731 L958 744 L953 766 L946 770 L946 780 L940 780 L940 769 L931 763 L930 742 L941 731 Z M1263 711 L1269 711 L1269 730 L1278 743 L1272 765 L1266 770 L1266 779 L1260 779 L1260 769 L1252 764 L1250 743 L1262 731 Z');
// Lakeside glazing: photograph is 1920x1452. Keep furniture and reveals outside the mask.
geometry[2]={windows:photoPath('M683 719 L1000 696 L1000 1114 L730 1106 L730 1088 L772 1089 L772 720 L694 726 L694 946 L683 946 Z M793 720 L884 713 L884 1092 L793 1089 Z M920 710 L1000 704 L1000 1093 L920 1092 Z M1124 700 L1370 713 L1370 1100 L1124 1114 Z M1127 709 L1177 712 L1177 1093 L1127 1095 Z M1206 718 L1275 723 L1275 1090 L1206 1093 Z M1295 728 L1351 731 L1351 1086 L1295 1089 Z',1452)};
function lakesideProfileLayer(){
 const src=PROFILE_TEXTURES[state.color].source;
 const patterns=[0,90].map((angle,i)=>`<pattern id="lake${i}" width="420" height="420" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><image href="${src}" width="420" height="420" preserveAspectRatio="xMidYMid slice"/></pattern>`).join('');
 return `<defs>${patterns}<clipPath id="lakeMask"><path d="${geometry[2].windows}" clip-rule="evenodd"/></clipPath><filter id="lakeLight" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="1.25"/><feFuncG type="linear" slope="1.25"/><feFuncB type="linear" slope="1.25"/></feComponentTransfer></filter></defs><g clip-path="url(#lakeMask)" style="isolation:isolate" pointer-events="none"><rect width="1824" height="1368" fill="url(#lake0)"/><path d="${photoPath('M680 699 L1002 681 L1002 716 L680 737 Z M680 1088 L1002 1090 L1002 1116 L680 1116 Z M1122 697 L1372 711 L1372 733 L1122 718 Z M1122 1094 L1372 1084 L1372 1116 L1122 1116 Z',1452)}" fill="url(#lake1)"/><image href="assets/sceny/scena-02.webp" width="1824" height="1368" preserveAspectRatio="none" filter="url(#lakeLight)" style="mix-blend-mode:multiply"/></g>`;
}

// Visible profile surfaces, in original 1920x1440 photo coordinates.
const additionalFrames={4:[],6:[],7:[],8:[]};
const frameExclusions={4:'M423 999h11v25h-11Z M1328 987h12v33h-12Z',6:'',7:'',8:'M838 592h19v40h-19Z M1232 552h22v50h-22Z M1853 493h22v63h-22Z M1604 322h13v42h-13Z M1083 413h13v33h-13Z M1600 527L1700 527L1715 560L1668 645L1598 692Z M1630 698L1657 698L1640 767L1612 767Z M1690 696L1708 696L1728 767L1707 767Z'};
function profileStrip(scene,d,angle=0){additionalFrames[scene].push({d,angle});}
function profileBox(scene,x,y,w,h,t=7,mullions=[]){
 profileStrip(scene,`M${x} ${y+t}h${t}v${h-2*t}h${-t}Z M${x+w-t} ${y+t}h${t}v${h-2*t}h${-t}Z`);
 profileStrip(scene,`M${x} ${y}h${w}v${t}h${-w}Z M${x} ${y+h-t}h${w}v${t}h${-w}Z`,90);
 for(const m of mullions)profileStrip(scene,`M${m} ${y+t}h${t}v${h-2*t}h${-t}Z`);
}
// Triangular window: sloping top follows the actual profile, not the roof.
profileStrip(4,'M268 645L662 355L662 376L280 654Z',54);
profileStrip(4,'M268 652L280 652L280 674L268 674Z M396 560L411 549L411 676L396 676Z M527 463L543 452L543 676L527 676Z M652 378L663 370L663 680L652 680Z');
profileStrip(4,'M268 675L663 680L663 687L268 682Z',90);
profileBox(4,280,839,377,286,12,[412,533]);
profileBox(4,1264,858,173,262,8,[1345]);
// Lower right frame stops above foreground grass.
profileStrip(4,'M1565 863h8v249h-8Z M1641 864h10v248h-10Z M1725 863h8v126h-8Z');
profileStrip(4,'M1565 858h168v7h-168Z M1565 1113h135v8h-135Z',90);
// Terrace: omit all bands hidden by chairs, table, plants or glass balustrade.
profileStrip(6,'M449 846L459 844L459 1071L449 1071Z M570 830L580 829L580 1093L570 1093Z M624 824L630 823L630 1093L624 1093Z M974 835h12v260h-12Z M1075 841h7v252h-7Z M1148 547h7v220h-7Z M1317 571h9v209h-9Z M1684 631h8v180h-8Z M1637 880h7v197h-7Z M1690 882h7v195h-7Z M1402 866h8v134h-8Z M1480 870h6v130h-6Z M260 872h7v142h-7Z M190 881h5v142h-5Z M201 880h5v144h-5Z M838 601h6v40h-6Z M922 581h6v59h-6Z');
profileStrip(6,'M449 839L630 819L630 826L449 846Z M461 1086L566 1092L566 1099L461 1093Z M745 819L1080 836L1080 843L745 826Z M747 1094h332v7H747Z M1148 539L1326 565L1326 573L1148 547Z M1341 857L1486 865L1486 872L1341 864Z M1579 870L1697 877L1697 884L1579 877Z M1580 1078h117v7h-117Z',90);
// Blinds remain photographic. Only exposed sash edges are colored.
profileStrip(7,'M61 488L67 488L67 700L61 700Z M287 501h6v207h-6Z M173 494h5v207h-5Z M1055 480h7v71h-7Z M1136 485h7v67h-7Z M1230 489h6v65h-6Z M980 944h6v165h-6Z M1054 945h8v165h-8Z M1137 944h6v165h-6Z M1718 949h5v130h-5Z M1786 948h7v130h-7Z M1830 949h6v130h-6Z M1891 950h6v120h-6Z M89 947h6v118h-6Z M171 946h7v129h-7Z M254 948h6v111h-6Z M340 948h6v88h-6Z M421 949h6v95h-6Z M730 935h5v139h-5Z M755 932h6v144h-6Z');
profileStrip(7,'M61 483L293 498L293 504L61 489Z M67 700L293 707L293 712L67 706Z M1055 475L1236 485L1236 491L1055 481Z M980 939h163v6h-163Z M980 1110h163v5h-163Z M89 941h171v6H89Z M340 943h108v5H340Z M1718 942h75v6h-75Z M1830 943h67v6h-67Z',90);
// Living room: preserve three silver handles and the foreground lamp.
profileStrip(8,'M746 465L760 462L760 745L746 745Z M835 448L862 443L862 745L835 745Z M1089 403L1111 399L1111 740L1089 740Z M1225 378L1259 372L1259 741L1225 741Z M1607 311L1640 305L1640 738L1607 738Z M1824 273L1881 261L1881 738L1824 738Z');
profileStrip(8,'M746 460L904 433L904 455L746 482Z M746 745h158v17H746Z M1089 398L1369 350L1369 378L1089 426Z M1089 741h280v21h-280Z M1607 306L1920 249L1920 285L1607 342Z M1607 738h313v23h-313Z',90);
for(const scene of [4,6,7,8])geometry[scene]={windows:additionalFrames[scene].map(p=>photoPath(p.d)).join(' ')};
function additionalProfileLayer(id){
 const scene=state.scene,texture=PROFILE_TEXTURES[state.color],size=scene===8?700:400;
 const angles=[...new Set(additionalFrames[scene].map(p=>p.angle))];
 const patterns=angles.map(a=>`<pattern id="finish${a}" width="${size}" height="${size}" patternUnits="userSpaceOnUse" patternTransform="rotate(${a})"><image href="${texture.source}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice"/></pattern>`).join('');
 const strips=additionalFrames[scene].map(p=>`<path d="${p.d}" fill="url(#finish${p.angle})"/>`).join('');
 const gain=scene===8?1.4:1,offset=scene===8?.55:scene===7?.18:.3;
 return `<defs>${patterns}<mask id="visibleFrames" maskUnits="userSpaceOnUse" x="0" y="0" width="1824" height="1368" style="mask-type:luminance"><path d="${geometry[scene].windows}" fill="white"/><path d="${photoPath(frameExclusions[scene])}" fill="black"/></mask><filter id="frameLight" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer>${'RGB'.split('').map(c=>`<feFunc${c} type="linear" slope="${gain}" intercept="${offset}"/>`).join('')}</feComponentTransfer></filter></defs><g mask="url(#visibleFrames)" style="isolation:isolate" pointer-events="none"><g transform="scale(.95)">${strips}</g><image href="assets/sceny/scena-${id}.webp" width="1824" height="1368" preserveAspectRatio="none" filter="url(#frameLight)" style="mix-blend-mode:multiply"/></g>`;
}

function profileLayer(path,id){
 if(state.color===null || (state.scene===3 && state.color===6))return '';
 if(state.scene===5)return kitchenProfileLayer(path,id);
 if(state.scene===1)return villaProfileLayer();
 if(state.scene===2)return lakesideProfileLayer();
 if(additionalFrames[state.scene])return additionalProfileLayer(id);
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
function renderPanel(){if(state.scene===1&&tab==='roof')tab='scenes';document.querySelector('nav [data-tab=roof]').hidden=state.scene===1;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('selected',b.dataset.tab===tab));let content='';if(tab==='scenes'){content='<h2>Wybierz przestrzeń</h2><p>Sześć domów i dwa wnętrza.</p><div class="grid">'+scenes.map((n,i)=>`<button class="card ${state.scene===i+1?'selected':''}" data-scene="${i+1}"><img src="assets/sceny/scena-${String(i+1).padStart(2,'0')}.webp" alt=""><span>${n}</span></button>`).join('')+'</div>';}else if(tab==='windows'){content='<h2>Kolor okien</h2><p>System PRISMATIC</p><p class="notice">'+(additionalFrames[state.scene]?'Oryginalne tekstury na widocznych profilach. Fragmenty zasłonięte meblami, roślinami, balustradami i żaluzjami pozostają fotograficzne.':state.scene===2?'Tekstury na ramach okien tarasowych. Okna dachowe pozostają oryginalne.':state.scene===1?'Tekstury na widocznych profilach. Fragmenty zasłonięte balustradą pozostają oryginalne.':state.scene===5?'Oryginalne próbki oklein producenta, w stałej skali i z zachowaniem światła wnętrza. Klamka pozostaje w oryginalnym kolorze.':geometry[state.scene]?.windows?'Podgląd zachowuje światło i detale ram. Usłojenie pochodzi ze zdjęcia, nie ze wzornika wybranej okleiny.':'Ta scena jest dostępna jako zdjęcie referencyjne. Zmianę ram możesz sprawdzić na domu parterowym lub w kuchni.')+'</p><button data-original>Oryginalny wygląd</button><div class="grid colors">'+PROFILE_COLORS.map((c,i)=>`<button class="card ${state.color===i?'selected':''}" data-color="${i}" ${geometry[state.scene]?.windows ? "" : "disabled"}><img loading="lazy" src="assets/kolory-prismatic/${c.file}" alt="Profil ${names[i]}"><span>${names[i]}</span></button>`).join('')+'</div>';}else{let titles={facade:'Wykończenie elewacji',roof:'Kolor dachu'};content=`<h2>${titles[tab]}</h2>`;if(!geometry[state.scene]?.[tab])content+='<p>Zmiana tego elementu jest obecnie przygotowana dla domu parterowego — Orzech.</p><button data-demo>Przejdź do domu parterowego</button>';else content+='<p>Wybierz odcień. Podgląd ma charakter orientacyjny.</p><button data-clear>Oryginalny wygląd</button><div class="swatches">'+['#f2eee5','#bcb6aa','#8a8d8e','#45494c','#b49b7d','#8a5b43','#7896ac','#c6dce8'].map(c=>`<button class="swatch ${state[tab]===c?'selected':''}" style="background:${c}" data-paint="${c}" aria-label="Kolor ${c}"></button>`).join('')+'</div>';}
$('#panel').innerHTML=content;}
$('#panel').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.scene){state={...initial,scene:Number(b.dataset.scene)};}else if(b.dataset.color!==undefined){if(!geometry[state.scene]?.windows)return;state.color=Number(b.dataset.color);}else if(b.hasAttribute('data-original'))state.color=null;else if(b.dataset.paint)state[tab]=b.dataset.paint;else if(b.hasAttribute('data-clear'))state[tab]=null;else if(b.hasAttribute('data-demo'))state={...initial};sync();renderPanel();document.querySelector('#status').textContent=state.color===null?'Oryginalny wygląd.':'Wybrany kolor: '+names[state.color];};
document.querySelector('nav').onclick=e=>{if(e.target.dataset.tab){tab=e.target.dataset.tab;renderPanel();}};
$('#reset').onclick=()=>{state={...initial};sync();renderPanel();document.querySelector('#status').textContent=state.color===null?'Oryginalny wygląd.':'Wybrany kolor: '+names[state.color];};
$('#save').onclick=()=>{const a=document.createElement('a');const u=URL.createObjectURL(new Blob([JSON.stringify({version:1,...state},null,2)],{type:'application/json'}));a.href=u;a.download='oknoplast-projekt.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);$('#status').textContent='Projekt zapisany do pliku.';};
$('#load').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>100000)throw Error('Plik jest zbyt duży');state=validate(JSON.parse(await f.text()));sync();renderPanel();$('#status').textContent='Projekt wczytany.';}catch(err){$('#status').textContent='Nie można wczytać projektu: '+err.message;}e.target.value='';};
$('#share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('#status').textContent=location.protocol==='file:'?'Skopiowano lokalny link. Zadziała na komputerze z tym folderem.':'Link skopiowany.';}catch(e){$('#status').textContent='Skopiuj adres z paska przeglądarki.';}};
$('#print').onclick=()=>window.print();renderScene();renderPanel();


