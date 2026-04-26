(()=>{document.addEventListener("DOMContentLoaded",()=>{let n=document.getElementById("site-nav"),a=document.getElementById("nav-toggle"),l=document.getElementById("nav-links"),u=0;function i(){let c=window.scrollY;c>100?n.classList.add("is-scrolled"):n.classList.remove("is-scrolled"),u=c}window.addEventListener("scroll",i,{passive:!0}),i(),a&&l&&a.addEventListener("click",()=>{let c=l.classList.toggle("is-open");a.setAttribute("aria-expanded",String(c))})});var y="site-theme",L=document.documentElement,h=document.getElementById("theme-toggle"),D=window.matchMedia("(prefers-color-scheme: dark)");function H(){let n=window.localStorage.getItem(y);return n==="light"||n==="dark"?n:D.matches?"dark":"light"}function p(n){if(L.dataset.theme=n,!h)return;let a=n==="dark"?"light":"dark";h.setAttribute("aria-pressed",String(n==="dark")),h.setAttribute("aria-label",`Switch to ${a} mode`)}function N(n){window.localStorage.setItem(y,n),p(n)}p(H());h&&h.addEventListener("click",()=>{let n=L.dataset.theme==="dark"?"light":"dark";N(n)});D.addEventListener("change",n=>{window.localStorage.getItem(y)||p(n.matches?"dark":"light")});document.addEventListener("DOMContentLoaded",()=>{let n=document.getElementById("memo-desk"),a=document.getElementById("date-selector");if(!n||!a)return;let l=document.getElementById("memo-data");if(!l)return;let u={};try{u=JSON.parse(l.textContent)}catch(e){console.error("Failed to parse memo data",e);return}let i=Object.keys(u).sort().reverse();if(i.length===0){E("No memos yet.");return}let c=[{surface:"#FFFFFF",strong:"#F4FAFF",soft:"#EAF6FF",accent:"#53B4E8",ink:"#33424D",muted:"#71828F"},{surface:"#FFFFFF",strong:"#FFF8F1",soft:"#FDEBDD",accent:"#F0AE6B",ink:"#4B4138",muted:"#86776A"},{surface:"#FFFFFF",strong:"#F6FBF7",soft:"#E8F5EA",accent:"#88C590",ink:"#33463A",muted:"#6F8475"},{surface:"#FFFFFF",strong:"#FAF8FF",soft:"#EEE7FB",accent:"#A58CE2",ink:"#3D3950",muted:"#7A748F"}],m=0,o=0;function v(){return i[m]}function F(){return u[v()]||[]}function B(e){return c[e%c.length]}function k(e){let t=B(e);return`--memo-surface:${t.surface};--memo-strong:${t.strong};--memo-soft:${t.soft};--memo-accent:${t.accent};--memo-ink:${t.ink};--memo-muted:${t.muted};`}function I(e){let t=new Date(`${e}T00:00:00`);return{weekday:t.toLocaleDateString("en-US",{weekday:"long"}),shortWeekday:t.toLocaleDateString("en-US",{weekday:"short"}),monthDay:t.toLocaleDateString("en-US",{month:"short",day:"numeric"}),full:t.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}}function S(){a.innerHTML="",a.hidden=!0}function g(){let e=F();if(e.length===0){E("No memos for this day.");return}o=Math.max(0,Math.min(o,e.length-1));let t=I(v()),s=e[o],r=e.slice(o,o+3),w=m<i.length-1,f=m>0;n.innerHTML=`
      <section class="memo-kinetic">
        <div class="memo-kinetic-header">
          <button class="memo-date-btn" id="memo-prev-day" type="button" aria-label="Previous day" ${w?"":"disabled"}>
            &lsaquo;
          </button>
          <div class="memo-date-display">
            <span>${d(t.weekday)},</span>
            <span>${d(t.monthDay)}</span>
          </div>
          <button class="memo-date-btn" id="memo-next-day" type="button" aria-label="Next day" ${f?"":"disabled"}>
            &rsaquo;
          </button>
        </div>

        <p class="memo-scribble memo-scribble--left">&larr; your daily pulse</p>

        <div class="memo-kinetic-stack" id="memo-stack">
          ${r.slice(1).reverse().map((q,$)=>T(q,o+r.length-1-$,e.length,r.length-1-$)).join("")}
          <button class="memo-focus-card is-visible" id="memo-focus-card" type="button" style="${k(o)}" ${o<e.length-1?'data-next="true"':""}>
            <div class="memo-focus-badge">${o===0?"Today's Focus":`Note ${o+1}`}</div>
            <h2 class="memo-focus-title">${d(C(s,o))}</h2>
            <p class="memo-focus-body">${d(M(s))}</p>
            <div class="memo-focus-wave" aria-hidden="true">
              <svg viewBox="0 0 240 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 38C51 38 76 9 118 9C160 9 185 38 232 38" stroke="var(--memo-accent)" stroke-width="3.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="memo-focus-meta">
              <time>${d(s.time)}</time>
              <span>${e.length>1?`${o+1}/${e.length}`:t.shortWeekday}</span>
            </div>
          </button>
        </div>

        <p class="memo-scribble memo-scribble--right">history of wins &rarr;</p>
      </section>
    `,A()}function A(){let e=document.getElementById("memo-prev-day"),t=document.getElementById("memo-next-day"),s=document.getElementById("memo-focus-card");e&&e.addEventListener("click",()=>{m<i.length-1&&(m+=1,o=0,g())}),t&&t.addEventListener("click",()=>{m>0&&(m-=1,o=0,g())}),s&&s.addEventListener("click",()=>{o<F().length-1&&x(o+1)})}function x(e){let t=document.getElementById("memo-focus-card"),s=document.getElementById("memo-stack");if(!t||!s){o=e,g();return}t.classList.remove("is-visible"),t.classList.add("is-leaving"),s.classList.add("is-transitioning"),window.setTimeout(()=>{o=e,g();let r=document.getElementById("memo-focus-card");r&&requestAnimationFrame(()=>{r.classList.remove("is-visible"),requestAnimationFrame(()=>{r.classList.add("is-visible")})})},240)}function T(e,t,s,r){return`
      <div class="memo-back-card memo-back-card--depth-${r}" style="${k(t)}" aria-hidden="true">
        <div class="memo-back-card-veil"></div>
      </div>
    `}function C(e,t){if(e.title&&e.title.trim())return e.title.trim();let s=(e.preview||b(e.content||"")).trim();if(!s)return`Memo ${t+1}`;let r=s.replace(/\s+/g," ").trim(),f=r.split(/[.!?]/)[0].trim()||r;return f.length>42?`${f.slice(0,42).trim()}...`:f}function M(e){let t=(e.preview||b(e.content||"")).replace(/\s+/g," ").trim();return t?t.length>96?`${t.slice(0,96).trim()}...`:t:"A quiet note for the day."}function b(e){return e.replace(/<[^>]+>/g," ")}function E(e){n.innerHTML=`
      <div class="memo-empty">
        <p class="memo-empty-title">${d(e)}</p>
        <p class="memo-empty-text">Memos are usually written in the morning. Check back soon.</p>
      </div>
    `}function d(e){return e?e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}S(),g()});})();
