(()=>{document.addEventListener("DOMContentLoaded",()=>{let e=document.getElementById("site-nav"),a=document.getElementById("nav-toggle"),l=document.getElementById("nav-links"),r=0;function i(){let t=window.scrollY;t>100?e.classList.add("is-scrolled"):e.classList.remove("is-scrolled"),r=t}window.addEventListener("scroll",i,{passive:!0}),i(),a&&l&&a.addEventListener("click",()=>{let t=l.classList.toggle("is-open");a.setAttribute("aria-expanded",String(t))})});var y="site-theme",b=document.documentElement,u=document.getElementById("theme-toggle"),E=window.matchMedia("(prefers-color-scheme: dark)");function w(){let e=window.localStorage.getItem(y);return e==="light"||e==="dark"?e:E.matches?"dark":"light"}function p(e){if(b.dataset.theme=e,!u)return;let a=e==="dark"?"light":"dark";u.setAttribute("aria-pressed",String(e==="dark")),u.setAttribute("aria-label",`Switch to ${a} mode`)}function B(e){window.localStorage.setItem(y,e),p(e)}p(w());u&&u.addEventListener("click",()=>{let e=b.dataset.theme==="dark"?"light":"dark";B(e)});E.addEventListener("change",e=>{window.localStorage.getItem(y)||p(e.matches?"dark":"light")});document.addEventListener("DOMContentLoaded",()=>{let e=document.getElementById("memo-desk");if(!e)return;let a=document.getElementById("memo-data");if(!a)return;let l={};try{l=JSON.parse(a.textContent)}catch(o){console.error("Failed to parse memo data",o);return}let r=Object.keys(l).sort().reverse();if(r.length===0){k("No memos yet.");return}let i=0,t=0;function f(){return r[i]}function h(){return l[f()]||[]}function I(o){return new Date(`${o}T00:00:00`).toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}function g(){let o=h();if(o.length===0){k("No memos for this day.");return}t=t%o.length,t<0&&(t=o.length-1);let n=o[t],d=[];for(let m=0;m<Math.min(3,o.length);m++)d.push(o[(t+m)%o.length]);e.innerHTML=`
      <section class="memo-kinetic">
        <div class="memo-kinetic-header">
          <button class="memo-date-btn" id="memo-prev-day" type="button" aria-label="Previous day" ${i<r.length-1?"":"disabled"}>
            &lsaquo;
          </button>
          <div class="memo-date-display">
            ${I(f())}
          </div>
          <button class="memo-date-btn" id="memo-next-day" type="button" aria-label="Next day" ${i>0?"":"disabled"}>
            &rsaquo;
          </button>
        </div>

        <div class="memo-kinetic-stack" id="memo-stack">
          ${d.slice(1).reverse().map((m,c)=>`
            <div class="memo-back-card memo-back-card--depth-${d.length-1-c}"></div>
          `).join("")}
          
          <div class="memo-focus-card" id="memo-focus-card">
            <div class="memo-card-top-meta">
              <time class="memo-time-top">${n.time}</time>
              <span class="memo-focus-badge">${t===0?"Latest":`Note ${t+1}`}</span>
            </div>
            
            <div class="memo-card-inner-content">
              <h2 class="memo-focus-title">${n.title||""}</h2>
              <div class="memo-focus-body">
                ${n.content}
              </div>
            </div>
            
            <div class="memo-card-actions">
              <button class="memo-expand-btn" id="memo-expand-trigger">Read Full</button>
              <div class="memo-card-footer-minimal">
                <span>${t+1} / ${o.length}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Float Detail Overlay -->
      <div class="memo-detail-overlay" id="memo-detail-overlay">
        <div class="memo-detail-modal">
          <button class="memo-detail-close" id="memo-detail-close">&times;</button>
          <div class="memo-detail-content">
             <div class="memo-card-top-meta">
               <time class="memo-time-top">${n.time}</time>
               <span class="memo-focus-badge">${t===0?"Latest":`Note ${t+1}`}</span>
             </div>
             <h2 class="memo-detail-title">${n.title||""}</h2>
             <div class="memo-detail-body article-body">
               ${n.content}
             </div>
          </div>
        </div>
      </div>
    `,L()}function L(){let o=document.getElementById("memo-prev-day"),n=document.getElementById("memo-next-day"),d=document.getElementById("memo-focus-card"),m=document.getElementById("memo-expand-trigger"),c=document.getElementById("memo-detail-overlay"),v=document.getElementById("memo-detail-close");o&&(o.onclick=s=>{s.stopPropagation(),i++,t=0,g()}),n&&(n.onclick=s=>{s.stopPropagation(),i--,t=0,g()}),d&&(d.onclick=s=>{if(s.target.closest("#memo-expand-trigger"))return;let $=h();d.classList.add("is-leaving"),document.getElementById("memo-stack").classList.add("is-transitioning"),setTimeout(()=>{t=(t+1)%$.length,g()},300)}),m&&(m.onclick=s=>{s.stopPropagation(),c.classList.add("is-active"),document.body.style.overflow="hidden"}),v&&(v.onclick=()=>{c.classList.remove("is-active"),document.body.style.overflow=""}),c&&(c.onclick=s=>{s.target===c&&v.onclick()})}function k(o){e.innerHTML=`<div class="memo-empty">${o}</div>`}g()});})();
