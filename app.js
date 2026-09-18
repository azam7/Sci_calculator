const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let angle=localStorage.ncAngle||"DEG", ans=Number(localStorage.ncAns||0), memory=Number(localStorage.ncMem||0);
const hist=JSON.parse(localStorage.ncHist||"[]"), notes=JSON.parse(localStorage.ncNotes||"[]");

/* ---------- Toasts ---------- */
function toast(msg){
  const wrap=$("#toastWrap"); if(!wrap) return;
  const t=document.createElement("div"); t.className="toast"; t.textContent=msg; wrap.appendChild(t);
  requestAnimationFrame(()=>t.classList.add("show"));
  setTimeout(()=>{t.classList.remove("show"); setTimeout(()=>t.remove(),250)},1800);
}

/* ---------- HTML escaping (history/notes hold user-typed text) ---------- */
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

/* ---------- History / Notes rendering ---------- */
function renderHistory(){let h=$("#historyList");h.innerHTML=hist.slice(-30).reverse().map(x=>`<div class="history-row" data-e="${encodeURIComponent(x.e)}"><b>${esc(x.r)}</b><small>${esc(x.e)}</small></div>`).join("")||"<div class=\"empty\">No calculations yet.</div>"}
function renderNotes(){$("#notes").innerHTML=notes.map(x=>`<div class="history-row"><b>${esc(x.slice(0,40))}</b><small>${esc(x)}</small></div>`).join("")||"<div class=\"empty\">No notes yet.</div>"}

/* ---------- Core math engine ---------- */
function factorial(n){if(n<0||n>170||n%1)return NaN;let r=1;for(let i=2;i<=n;i++)r*=i;return r}
function deg(v){return angle==="DEG"?v*Math.PI/180:angle==="GRAD"?v*Math.PI/200:v}
function rad(v){return angle==="DEG"?v*180/Math.PI:angle==="GRAD"?v*200/Math.PI:v}
/* Angle-aware trig wrappers. Using named functions (instead of textually
   inserting extra "Math.sin(deg(" characters in front of the user's own
   parentheses) keeps parenthesis counts correct — the old approach added
   two unmatched "(" per call and broke every trig function. */
function sinD(v){return Math.sin(deg(v))}
function cosD(v){return Math.cos(deg(v))}
function tanD(v){return Math.tan(deg(v))}
function asinD(v){return rad(Math.asin(v))}
function acosD(v){return rad(Math.acos(v))}
function atanD(v){return rad(Math.atan(v))}
function evalExpr(s,x=0){
  s=s.replaceAll("π","Math.PI").replace(/\be\b/g,"Math.E").replace(/\bAns\b/g,`(${ans})`).replace(/\bx\b/g,`(${x})`).replace(/\bmod\b/g,"%");
  s=s.replace(/\brand\b/g,"Math.random()").replace(/\bsqrt\(/g,"Math.sqrt(").replace(/\bcbrt\(/g,"Math.cbrt(").replace(/\bln\(/g,"Math.log(").replace(/\blog2\(/g,"Math.log2(").replace(/\blog\(/g,"Math.log10(").replace(/\babs\(/g,"Math.abs(");
  /* Longer names (asin/acos/atan) must be substituted before the shorter
     ones (sin/cos/tan), otherwise "asin(" gets partially matched by the
     "sin(" replacement first and is corrupted before its own turn comes. */
  s=s.replaceAll("asin(","asinD(").replaceAll("acos(","acosD(").replaceAll("atan(","atanD(");
  s=s.replaceAll("sin(","sinD(").replaceAll("cos(","cosD(").replaceAll("tan(","tanD(");
  s=s.replace(/(\d+(?:\.\d+)?)!/g,"factorial($1)");
  s=s.replace(/\^/g,"**");
  try{return Function("Math","factorial","deg","rad","sinD","cosD","tanD","asinD","acosD","atanD",`return (${s})`)(Math,factorial,deg,rad,sinD,cosD,tanD,asinD,acosD,atanD)}catch(e){return NaN}
}
function calculate(){
  let e=$("#expr").value.trim(); if(!e)return;
  let r=evalExpr(e);
  if(Number.isFinite(r)){ans=r;localStorage.ncAns=ans;hist.push({e,r:Number(r.toPrecision(14))});localStorage.ncHist=JSON.stringify(hist);$("#result").textContent=Number(r.toPrecision(14));renderHistory()}
  else{$("#result").textContent="Error";toast("Couldn't evaluate that expression")}
}

/* ---------- Navigation (rail + mobile tabbar share data-tab) ---------- */
function setActiveTab(name){
  $$(".panel").forEach(x=>x.classList.remove("active"));
  $("#"+name).classList.add("active");
  $$(".rail [data-tab],.tabbar [data-tab]").forEach(b=>{
    const on=b.dataset.tab===name; b.classList.toggle("active",on);
    if(on) b.setAttribute("aria-current","page"); else b.removeAttribute("aria-current");
  });
  if(name==="matrix") buildMatrix();
}
$$(".rail [data-tab],.tabbar [data-tab]").forEach(b=>b.onclick=()=>setActiveTab(b.dataset.tab));

function setDark(on){
  document.body.classList.toggle("dark",on);
  localStorage.ncDark=on;
}
if(localStorage.ncDark==="true") setDark(true);
$("#themeBtn").onclick=()=>setDark(!document.body.classList.contains("dark"));
$("#themeBtnMobile").onclick=()=>setDark(!document.body.classList.contains("dark"));

/* ---------- Calculator keypad ---------- */
$$(".keypad button").forEach(b=>b.onclick=()=>{
  let a=b.dataset.act,i=b.dataset.in;
  if(i!==undefined){$("#expr").value+=i;$("#expr").focus()}
  else if(a==="clear"){$("#expr").value="";$("#result").textContent="0"}
  else if(a==="back")$("#expr").value=$("#expr").value.slice(0,-1);
  else if(a==="equals")calculate();
  else if(a==="memory"){memory+=Number(evalExpr($("#expr").value)||0);localStorage.ncMem=memory;$("#mem").classList.add("on")}
  else if(a==="memoryMinus"){memory-=Number(evalExpr($("#expr").value)||0);localStorage.ncMem=memory;$("#mem").classList.toggle("on",memory!==0)}
  else if(a==="memoryRecall"){$("#expr").value+=memory}
});
$("#expr").addEventListener("keydown",e=>{if(e.key==="Enter")calculate()});
$("#ans").onclick=()=>{$("#expr").value+="Ans"};
$$(".mode").forEach(b=>b.onclick=()=>{
  $$(".mode").forEach(x=>x.classList.remove("active"));b.classList.add("active");
  angle=b.dataset.angle;localStorage.ncAngle=angle;
  $("#angle").textContent=angle; $("#angleChip").textContent=angle;
});
$("#clearHistory").onclick=()=>{hist.length=0;localStorage.ncHist="[]";renderHistory();toast("History cleared")};
$("#historyList").onclick=e=>{let r=e.target.closest(".history-row");if(r)$("#expr").value=decodeURIComponent(r.dataset.e)};
if(memory) $("#mem").classList.add("on");

/* ---------- CAS ---------- */
function symbolicDerivative(s,v){
  s=s.replace(/\s/g,"");let terms=s.split(/(?=[+-])/),out=[];
  for(let t of terms){
    let sign=t.startsWith("-")?-1:1;t=t.replace(/^[-+]/,"");
    let m=t.match(/^([0-9.]+)?\*?([a-zA-Z]+)(?:\^([0-9.]+))?$/);
    if(m&&m[2]===v){let c=Number(m[1]||1),p=Number(m[3]||1);if(p===1)out.push(sign*c);else out.push(sign*c*p+"*"+v+"^"+(p-1))}
    else if(!t.includes(v)&&!isNaN(Number(t))){}
    else if(/^([0-9.]+)?\*?sin\(/.test(t))out.push(sign+"*cos("+t.match(/sin\((.*)\)/)[1]+")");
    else if(/^([0-9.]+)?\*?cos\(/.test(t))out.push(sign+"*-sin("+t.match(/cos\((.*)\)/)[1]+")");
    else out.push("?["+t+"]")
  }
  return out.filter(x=>x!==0).join(" + ").replace(/\+\s-/g,"- ")
}
$("#derive").onclick=()=>$("#casOut").textContent=symbolicDerivative($("#casExpr").value,$("#casVar").value);
$("#integrate").onclick=()=>{$("#casOut").textContent="Numerical definite integral: use the Numerical Integration tool in the Lab tab for a computed result — enter f(x) and the bounds there.\n\nExample: integrate sin(x) from 0 to π."};
$("#limit").onclick=()=>{
  let s=$("#casExpr").value,v=$("#casVar").value,a=Number($("#casPoint").value)||0,h=1e-6;
  let r=(evalExpr(s.replace(new RegExp("\\b"+v+"\\b","g"),`(${a+h})`))+evalExpr(s.replace(new RegExp("\\b"+v+"\\b","g"),`(${a-h})`)))/2;
  $("#casOut").textContent=`lim ${v}→${a} ≈ ${Number(r.toPrecision(12))}`;
};
$("#taylor").onclick=()=>{
  let s=$("#casExpr").value,v=$("#casVar").value,a=Number($("#casPoint").value)||0,vals=[];
  for(let n=0;n<6;n++){let d=s;for(let k=0;k<n;k++)d=symbolicDerivative(d,v);let f=evalExpr(d.replace(new RegExp("\\b"+v+"\\b","g"),`(${a})`));let fac=factorial(n);vals.push({n,c:f/fac})}
  $("#casOut").textContent=vals.map(q=>`n=${q.n}: ${q.c.toPrecision(7)}·(${v}-${a})^${q.n}`).join("\n");
};
function polyRoots(s){
  s=s.replace(/\s/g,"").replace(/=0$/,"");
  let q=s.match(/^([+-]?[\d.]+)?x\^2([+-][\d.]+)?x([+-][\d.]+)?$/i);
  if(q){let a=Number(q[1]||1),b=Number(q[2]||0),c=Number(q[3]||0),d=b*b-4*a*c;return d>=0?[(-b+Math.sqrt(d))/(2*a),(-b-Math.sqrt(d))/(2*a)]:["complex"]}
  return ["Use quadratic format ax^2+bx+c for exact roots here — or try the Quadratic Solver in Tools."]
}
$("#roots").onclick=()=>$("#casOut").textContent=polyRoots($("#casExpr").value).join("\n");
$("#factor").onclick=()=>{let n=Math.abs(Math.trunc(Number($("#casExpr").value))),a=[];for(let p=2;p*p<=n;p++)while(n%p===0){a.push(p);n/=p}if(n>1)a.push(n);$("#casOut").textContent=a.join(" × ")||"Enter an integer."};
function parseEq(s){s=s.replace(/\s/g,"").replace("=","-");let ax=(s.match(/([+-]?\d*\.?\d*)x/g)||[]).reduce((a,t)=>a+Number(t.replace("x","")||1),0);let ay=(s.match(/([+-]?\d*\.?\d*)y/g)||[]).reduce((a,t)=>a+Number(t.replace("y","")||1),0);let c=Number((s.replace(/[+-]?\d*\.?\d*x/g,"").replace(/[+-]?\d*\.?\d*y/g,""))||0);return [ax,ay,-c]}
$("#solve2").onclick=()=>{let [a,b,c]=parseEq($("#eq1").value),[d,e,f]=parseEq($("#eq2").value),D=a*e-b*d;$("#eqOut").textContent=Math.abs(D)<1e-12?"No unique solution":`x = ${(c*e-b*f)/D}\ny = ${(a*f-c*d)/D}`};

/* ---------- Graph ---------- */
const gc=$("#graphCanvas"),ctx=gc.getContext("2d");
function plot(){
  let w=gc.width=gc.clientWidth*devicePixelRatio,h=gc.height=320*devicePixelRatio;
  ctx.clearRect(0,0,w,h);
  let xmin=+$("#xmin").value,xmax=+$("#xmax").value,scale=w/(xmax-xmin);
  ctx.strokeStyle=getComputedStyle(document.body).getPropertyValue("--border");ctx.lineWidth=devicePixelRatio;
  let yscale=scale;ctx.beginPath();ctx.moveTo((0-xmin)*scale,0);ctx.lineTo((0-xmin)*scale,h);ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();
  [1,2].forEach((_,idx)=>{
    let f=$("#f"+(idx+1)).value.trim();if(!f)return;
    ctx.beginPath();let on=false;
    for(let px=0;px<w;px++){let x=xmin+px/scale,y=evalExpr(f,x),py=h/2-y*yscale;if(!Number.isFinite(y)||Math.abs(py)>h*3){on=false;continue}if(!on)ctx.moveTo(px,py);else ctx.lineTo(px,py);on=true}
    ctx.strokeStyle=idx===0?"#2f5ce8":"#e07b39";ctx.lineWidth=2*devicePixelRatio;ctx.stroke();
  });
}
$("#plot").onclick=plot;
$("#resetGraph").onclick=()=>{$("#f1").value="";$("#f2").value="";plot()};

/* ---------- Matrix ---------- */
let n=2;
function buildMatrix(){
  n=+$("#msize").value;let g=$("#matrixGrid");
  let basis=`calc(${100/n}% - ${6*(n-1)/n}px)`;
  g.innerHTML=Array(n*n).fill(0).map((_,i)=>`<input data-mi="${i}" style="flex:0 0 ${basis}" value="${i%(n+1)===0?1:0}">`).join("")
}
$("#msize").onchange=buildMatrix;
function mat(){return Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>+document.querySelector(`[data-mi="${r*n+c}"]`).value||0))}
function detM(a){if(a.length===1)return a[0][0];let z=0;for(let c=0;c<a.length;c++){let sub=a.slice(1).map(row=>row.filter((_,j)=>j!==c));z+=(c%2?-1:1)*a[0][c]*detM(sub)}return z}
$("#det").onclick=()=>$("#matrixOut").textContent=`det(A) = ${detM(mat())}`;
$("#trace").onclick=()=>$("#matrixOut").textContent=`trace(A) = ${mat().reduce((s,r,i)=>s+r[i],0)}`;
$("#transpose").onclick=()=>{let a=mat();$("#matrixOut").textContent=a[0].map((_,c)=>a.map(r=>r[c].toFixed(4)).join("  ")).join("\n")};
$("#inverse").onclick=()=>{
  let a=mat(),d=detM(a);if(!d){$("#matrixOut").textContent="Singular matrix — no inverse exists.";return}
  let m=a.map((r,i)=>r.map(v=>v).concat(Array.from({length:n},(_,k)=>k===i?1:0)));
  for(let i=0;i<n;i++){let p=i;for(let r=i+1;r<n;r++)if(Math.abs(m[r][i])>Math.abs(m[p][i]))p=r;[m[i],m[p]]=[m[p],m[i]];let q=m[i][i];m[i]=m[i].map(v=>v/q);for(let r=0;r<n;r++)if(r!==i){q=m[r][i];m[r]=m[r].map((v,c)=>v-q*m[i][c])}}
  $("#matrixOut").textContent=m.map(r=>r.slice(n).map(v=>v.toFixed(5)).join("  ")).join("\n");
};

/* ---------- Stats ---------- */
$("#statsCalc").onclick=()=>{
  let a=$("#data").value.split(/[,;\s]+/).map(Number).filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length){$("#statsOut").textContent="Enter at least one number.";return}
  let N=a.length,mean=a.reduce((s,x)=>s+x,0)/N,med=a[Math.floor((N-1)/2)],variance=a.reduce((s,x)=>s+(x-mean)**2,0)/N;
  $("#statsOut").textContent=`n = ${N}\nMean = ${mean}\nMedian = ${med}\nMin = ${a[0]}\nMax = ${a[N-1]}\nStd Dev = ${Math.sqrt(variance)}\nVariance = ${variance}`;
};
$("#regress").onclick=()=>{
  let x=$("#xs").value.split(/[,;\s]+/).map(Number),y=$("#ys").value.split(/[,;\s]+/).map(Number),N=Math.min(x.length,y.length);
  if(N<2){$("#regOut").textContent="Enter at least two paired values.";return}
  let mx=x.slice(0,N).reduce((a,b)=>a+b,0)/N,my=y.slice(0,N).reduce((a,b)=>a+b,0)/N,num=0,den=0;
  for(let i=0;i<N;i++){num+=(x[i]-mx)*(y[i]-my);den+=(x[i]-mx)**2}
  let a=num/den,b=my-a*mx,r=num/Math.sqrt(den*y.slice(0,N).reduce((s,v)=>s+(v-my)**2,0));
  $("#regOut").textContent=`y = ${a}x + ${b}\nR = ${r}\nR² = ${r*r}`;
};

/* ---------- Toolbox (all inline forms — no prompt() dialogs) ---------- */
$("#gcdBtn").onclick=()=>{
  let a=Math.trunc(+$("#gcdA").value),c=Math.trunc(+$("#gcdB").value);
  let g=(x,y)=>y?g(y,x%y):Math.abs(x);let G=g(a,c)||1;
  $("#gcdOut").textContent=`GCD = ${G}\nLCM = ${Math.abs(a*c)/G}`;
};
$("#combBtn").onclick=()=>{
  let nn=Math.trunc(+$("#combN").value),r=Math.trunc(+$("#combR").value);
  if(r<0||r>nn){$("#combOut").textContent="r must be between 0 and n.";return}
  let p=factorial(nn)/factorial(nn-r);
  $("#combOut").textContent=`nPr = ${p}\nnCr = ${p/factorial(r)}`;
};
$("#pctBtn").onclick=()=>{
  let a=+$("#pctValue").value,p=+$("#pctPercent").value;
  $("#pctOut").textContent=`${p}% of ${a} = ${a*p/100}`;
};
$("#ciBtn").onclick=()=>{
  let P=+$("#ciPrincipal").value,r=(+$("#ciRate").value)/100,t=+$("#ciYears").value,nn=+$("#ciCompounds").value;
  let fv=P*(1+r/nn)**(nn*t);
  $("#ciOut").textContent=`Future value = ${fv.toFixed(2)}\nInterest earned = ${(fv-P).toFixed(2)}`;
};
$("#quadBtn").onclick=()=>{
  let a=+$("#quadA").value,b=+$("#quadB").value,c=+$("#quadC").value;
  if(a===0){$("#quadOut").textContent="a cannot be 0 for a quadratic.";return}
  let d=b*b-4*a*c;
  $("#quadOut").textContent=d>=0?`x₁ = ${(-b+Math.sqrt(d))/(2*a)}\nx₂ = ${(-b-Math.sqrt(d))/(2*a)}`:`Complex roots\nx = ${(-b/(2*a)).toFixed(6)} ± ${(Math.sqrt(-d)/(2*a)).toFixed(6)}i`;
};
$("#physBtn").onclick=()=>{
  $("#physOut").textContent="c = 299792458 m/s\nG = 6.67430×10⁻¹¹ m³ kg⁻¹ s⁻²\nh = 6.62607015×10⁻³⁴ J·s\nkB = 1.380649×10⁻²³ J/K\nNA = 6.02214076×10²³ mol⁻¹";
};
$("#saveNote").onclick=()=>{
  if($("#note").value.trim()){notes.push($("#note").value.trim());localStorage.ncNotes=JSON.stringify(notes);$("#note").value="";renderNotes();toast("Note saved")}
};

/* ---------- Pro: fractions ---------- */
function gcdN(a,b){a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b]}return a||1}
function parseFrac(s){s=String(s).trim();if(s.includes("/")){let [a,b]=s.split("/").map(Number);return [a,b]}let nn=Number(s);return [nn,1]}
function normFrac(a,b){if(b<0){a=-a;b=-b}let g=gcdN(a,b);return [a/g,b/g]}
function fracOp(op){
  let [a,b]=parseFrac($("#fracA").value),[c,d]=parseFrac($("#fracB").value),num,den;
  if(op==="add"){num=a*d+c*b;den=b*d}else if(op==="sub"){num=a*d-c*b;den=b*d}else if(op==="mul"){num=a*c;den=b*d}else{num=a*d;den=b*c}
  if(!den)return $("#fracOut").textContent="Division by zero";
  [num,den]=normFrac(num,den); $("#fracOut").textContent=`Exact = ${num}/${den}\nDecimal = ${num/den}`;
}
["Add","Sub","Mul","Div"].forEach(x=>$("#frac"+x).onclick=()=>fracOp(x.toLowerCase()));

/* ---------- Pro: polynomial workbench ---------- */
function polyCoeffs(s){
  s=s.toLowerCase().replace(/\s/g,"").replace(/-/g,"+-").replace(/^\+/,"");
  let terms=s.split("+").filter(Boolean), c={};
  for(let t of terms){
    let m=t.match(/^([+-]?(?:\d+(?:\.\d+)?)?)?x(?:\^(\d+))?$/);
    if(m){let a=m[1]===""||m[1]===undefined?1:(m[1]==="-"?-1:Number(m[1]));let p=Number(m[2]||1);c[p]=(c[p]||0)+a}
    else if(/^[+-]?\d/.test(t)){let v=Number(t);c[0]=(c[0]||0)+v}
  }
  let max=Math.max(...Object.keys(c).map(Number));return Array.from({length:max+1},(_,i)=>c[i]||0).reverse()
}
$("#polyAnalyze").onclick=()=>{try{let c=polyCoeffs($("#poly").value),degv=c.length-1;$("#polyOut").textContent=`Degree: ${degv}\nCoefficients: [${c.join(", ")}]\nLeading coefficient: ${c[0]}\n\nFor degree 2 use Roots in CAS, or the Quadratic Solver in Tools.`}catch(e){$("#polyOut").textContent="Invalid polynomial."}};
$("#polyEval").onclick=()=>{let x=Number($("#polyX").value);let c=polyCoeffs($("#poly").value),v=c.reduce((s,a)=>s*x+a,0);$("#polyOut").textContent=`P(${x}) = ${v}`};

/* ---------- Pro: eigenvalues ---------- */
$("#eigen").onclick=()=>{
  let a=+$("#e11").value,b=+$("#e12").value,c=+$("#e21").value,d=+$("#e22").value,tr=a+d,det=a*d-b*c,D=tr*tr-4*det;
  $("#eigenOut").textContent=D>=0?`λ₁ = ${(tr+Math.sqrt(D))/2}\nλ₂ = ${(tr-Math.sqrt(D))/2}`:`λ = ${tr/2} ± ${(Math.sqrt(-D)/2).toFixed(8)}i`;
};

/* ---------- Pro: 3D surface ---------- */
function surfEval(s,x,y){return evalExpr(s.replace(/\by\b/g,`(${y})`),x)}
$("#plot3d").onclick=()=>{
  let cv=$("#surfaceCanvas"),sctx=cv.getContext("2d"),d=devicePixelRatio||1,w=cv.clientWidth*d,h=320*d;
  cv.width=w;cv.height=h;sctx.clearRect(0,0,w,h);
  let R=+$("#range3d").value||6,N=35,pts=[];
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){let x=-R+2*R*i/(N-1),y=-R+2*R*j/(N-1),z=surfEval($("#surface").value,x,y);pts.push({x,y,z})}
  let zmax=Math.max(...pts.map(p=>Math.abs(p.z)).filter(Number.isFinite),1);
  function P(p){let sx=w/2+(p.x-p.y)*w/(4*R),sy=h*.68-(p.x+p.y)*h/(8*R)-p.z/zmax*h*.35;return[sx,sy]}
  sctx.strokeStyle="#2f5ce8";sctx.lineWidth=d;
  for(let j=0;j<N;j++){sctx.beginPath();for(let i=0;i<N;i++){let p=P(pts[j*N+i]);i?sctx.lineTo(...p):sctx.moveTo(...p)}sctx.stroke()}
  for(let i=0;i<N;i++){sctx.beginPath();for(let j=0;j<N;j++){let p=P(pts[j*N+i]);j?sctx.lineTo(...p):sctx.moveTo(...p)}sctx.stroke()}
};

/* ---------- Pro: constants ---------- */
const CONSTS=[
["c","Speed of light","299792458 m/s"],["G","Gravitational constant","6.67430×10⁻¹¹ m³·kg⁻¹·s⁻²"],
["h","Planck constant","6.62607015×10⁻³⁴ J·s"],["ħ","Reduced Planck constant","1.054571817×10⁻³⁴ J·s"],
["kB","Boltzmann constant","1.380649×10⁻²³ J/K"],["NA","Avogadro constant","6.02214076×10²³ mol⁻¹"],
["e","Elementary charge","1.602176634×10⁻¹⁹ C"],["me","Electron mass","9.1093837139×10⁻³¹ kg"],
["mp","Proton mass","1.67262192595×10⁻²⁷ kg"],["R","Molar gas constant","8.314462618 J·mol⁻¹·K⁻¹"],
["α","Fine-structure constant","7.2973525643×10⁻³"],["g₀","Standard gravity","9.80665 m/s²"]
];
function renderConsts(){let q=$("#constantSearch").value.toLowerCase();$("#constants").innerHTML=CONSTS.filter(x=>x.join(" ").toLowerCase().includes(q)).map(x=>`<div class="history-row"><b>${x[0]}</b> — ${x[1]}<small>${x[2]}</small></div>`).join("")||"<div class=\"empty\">No matching constants.</div>"}
$("#constantSearch").oninput=renderConsts;

/* ---------- Lab: numerical root finder ---------- */
function numericRoot(fn,a,b){
  let fa=evalExpr(fn,a),fb=evalExpr(fn,b);
  if(!Number.isFinite(fa)||!Number.isFinite(fb)) return NaN;
  if(fa*fb>0){
    let x=(a+b)/2;
    for(let i=0;i<80;i++){let h=1e-6,fx=evalExpr(fn,x),df=(evalExpr(fn,x+h)-evalExpr(fn,x-h))/(2*h);if(!Number.isFinite(df)||Math.abs(df)<1e-14)break;let nx=x-fx/df;if(!Number.isFinite(nx)||nx<a||nx>b)break;if(Math.abs(nx-x)<1e-12)return nx;x=nx}
    return x;
  }
  for(let i=0;i<100;i++){let m=(a+b)/2,fm=evalExpr(fn,m);if(Math.abs(fm)<1e-12||Math.abs(b-a)<1e-12)return m;if(fa*fm<=0){b=m;fb=fm}else{a=m;fa=fm}}return (a+b)/2;
}
$("#findRoot").onclick=()=>{let r=numericRoot($("#rootFn").value,+$("#rootA").value,+$("#rootB").value);$("#rootOut").textContent=Number.isFinite(r)?`Root ≈ ${r}\nf(root) ≈ ${evalExpr($("#rootFn").value,r)}`:"Could not find a root in the selected interval."};

/* ---------- Lab: numerical integration ---------- */
$("#integrateNum").onclick=()=>{
  let f=$("#intFn").value,a=+$("#intA").value,b=+$("#intB").value,nn=Math.max(2,Math.min(100000,+$("#intN").value||1000));if(nn%2)nn++;
  let h=(b-a)/nn,s=evalExpr(f,a)+evalExpr(f,b);for(let i=1;i<nn;i++)s+=(i%2?4:2)*evalExpr(f,a+i*h);
  $("#intOut").textContent=`Simpson's rule\nIntegral ≈ ${(s*h/3)}`;
};

/* ---------- Lab: vectors ---------- */
function vec(id){return $("#"+id).value.split(/[,;\s]+/).map(Number).filter(Number.isFinite)}
$("#dot").onclick=()=>{let a=vec("v1"),b=vec("v2");$("#vectorOut").textContent=`A · B = ${a.reduce((s,x,i)=>s+x*(b[i]||0),0)}`};
$("#cross").onclick=()=>{let a=vec("v1"),b=vec("v2");if(a.length<3||b.length<3)return $("#vectorOut").textContent="Cross product needs 3D vectors.";$("#vectorOut").textContent=`A × B = [${a[1]*b[2]-a[2]*b[1]}, ${a[2]*b[0]-a[0]*b[2]}, ${a[0]*b[1]-a[1]*b[0]}]`};
$("#vsum").onclick=()=>{let a=vec("v1"),b=vec("v2");$("#vectorOut").textContent=`A + B = [${a.map((x,i)=>x+(b[i]||0)).join(", ")}]`};
$("#vnorm").onclick=()=>{let a=vec("v1"),b=vec("v2"),norm=x=>Math.sqrt(x.reduce((s,v)=>s+v*v,0));$("#vectorOut").textContent=`|A| = ${norm(a)}\n|B| = ${norm(b)}`};

/* ---------- Lab: probability ---------- */
function choose(nn,k){if(k<0||k>nn)return 0;k=Math.min(k,nn-k);let r=1;for(let i=1;i<=k;i++)r=r*(nn-k+i)/i;return r}
function binomP(nn,k,p){return choose(nn,k)*p**k*(1-p)**(nn-k)}
$("#binom").onclick=()=>{let nn=+$("#probN").value,k=+$("#probK").value,p=+$("#probP").value;$("#probOut").textContent=`P(X=${k}) = ${binomP(nn,k,p)}`};
$("#atMost").onclick=()=>{let nn=+$("#probN").value,k=+$("#probK").value,p=+$("#probP").value,s=0;for(let i=0;i<=k;i++)s+=binomP(nn,i,p);$("#probOut").textContent=`P(X≤${k}) = ${s}`};

/* ---------- Lab: data transformer ---------- */
function nums2(){return $("#data2").value.split(/[,;\s]+/).map(Number).filter(Number.isFinite)}
$("#sortData").onclick=()=>$("#dataOut").textContent=nums2().sort((a,b)=>a-b).join(", ");
$("#zscore").onclick=()=>{let a=nums2(),m=a.reduce((s,x)=>s+x,0)/a.length,sd=Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/a.length);$("#dataOut").textContent=a.map(x=>((x-m)/sd).toFixed(6)).join(", ")};
$("#normalize").onclick=()=>{let a=nums2(),mi=Math.min(...a),ma=Math.max(...a);$("#dataOut").textContent=a.map(x=>((x-mi)/(ma-mi)).toFixed(6)).join(", ")};
$("#five").onclick=()=>{let a=nums2().sort((a,b)=>a-b),q=p=>{let z=(a.length-1)*p,i=Math.floor(z),f=z-i;return a[i]+(a[i+1]-a[i])*f};$("#dataOut").textContent=`Min: ${a[0]}\nQ1: ${q(.25)}\nMedian: ${q(.5)}\nQ3: ${q(.75)}\nMax: ${a.at(-1)}`};

/* ---------- Lab: expression inspector ---------- */
$("#inspectBtn").onclick=()=>{
  let s=$("#inspect").value.trim(),tokens=s.match(/[A-Za-z_]\w*|\d+(?:\.\d+)?|[()+\-*/^!,]/g)||[];
  let funcs=tokens.filter(x=>/^[A-Za-z_]/.test(x));
  $("#inspectOut").textContent=`Tokens: ${tokens.length}\nFunctions / identifiers: ${[...new Set(funcs)].join(", ")||"none"}\nOperators: ${tokens.filter(x=>/[+\-*/^!,]/.test(x)).join(" ")||"none"}\nParentheses balanced: ${(tokens.filter(x=>x==="(").length===tokens.filter(x=>x===")").length)?"Yes":"No"}`;
};

/* ---------- Init ---------- */
renderHistory();renderNotes();buildMatrix();renderConsts();plot();
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
