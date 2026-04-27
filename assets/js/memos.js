document.addEventListener('DOMContentLoaded', () => {
  const desk = document.getElementById('memo-desk');
  if (!desk) return;

  const memoDataEl = document.getElementById('memo-data');
  if (!memoDataEl) return;

  let memosByDate = {};
  try {
    memosByDate = JSON.parse(memoDataEl.textContent);
  } catch (e) {
    console.error('Failed to parse memo data', e);
    return;
  }

  const dates = Object.keys(memosByDate).sort().reverse();
  if (dates.length === 0) {
    renderEmpty('No memos yet.');
    return;
  }

  let dayIndex = 0;
  let memoIndex = 0;

  function getCurrentDate() {
    return dates[dayIndex];
  }

  function getCurrentItems() {
    return memosByDate[getCurrentDate()] || [];
  }

  function formatDate(date) {
    const d = new Date(`${date}T00:00:00`);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  function renderDesk() {
    const items = getCurrentItems();
    if (items.length === 0) {
      renderEmpty('No memos for this day.');
      return;
    }

    // Ensure memoIndex is always within bounds (looping logic)
    memoIndex = memoIndex % items.length;
    if (memoIndex < 0) memoIndex = items.length - 1;

    const currentItem = items[memoIndex];
    
    // For the stacking visual effect, we get the next items in a loop
    const stackedItems = [];
    for (let i = 0; i < Math.min(3, items.length); i++) {
      stackedItems.push(items[(memoIndex + i) % items.length]);
    }

    desk.innerHTML = `
      <section class="memo-kinetic">
        <div class="memo-kinetic-header">
          <button class="memo-date-btn" id="memo-prev-day" type="button" aria-label="Previous day" ${dayIndex < dates.length - 1 ? '' : 'disabled'}>
            &lsaquo;
          </button>
          <div class="memo-date-display">
            ${formatDate(getCurrentDate())}
          </div>
          <button class="memo-date-btn" id="memo-next-day" type="button" aria-label="Next day" ${dayIndex > 0 ? '' : 'disabled'}>
            &rsaquo;
          </button>
        </div>

        <div class="memo-kinetic-stack" id="memo-stack">
          ${stackedItems.slice(1).reverse().map((item, offset) => `
            <div class="memo-back-card memo-back-card--depth-${stackedItems.length - 1 - offset}"></div>
          `).join('')}
          
          <div class="memo-focus-card" id="memo-focus-card">
            <div class="memo-card-top-meta">
              <time class="memo-time-top">${currentItem.time}</time>
              <span class="memo-focus-badge">${memoIndex === 0 ? "Latest" : `Note ${memoIndex + 1}`}</span>
            </div>
            
            <div class="memo-card-inner-content">
              <h2 class="memo-focus-title">${currentItem.title || ''}</h2>
              <div class="memo-focus-body">
                ${currentItem.content}
              </div>
            </div>
            
            <div class="memo-card-actions">
              <button class="memo-expand-btn" id="memo-expand-trigger">Read Full</button>
              <div class="memo-card-footer-minimal">
                <span>${memoIndex + 1} / ${items.length}</span>
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
               <time class="memo-time-top">${currentItem.time}</time>
               <span class="memo-focus-badge">${memoIndex === 0 ? "Latest" : `Note ${memoIndex + 1}`}</span>
             </div>
             <h2 class="memo-detail-title">${currentItem.title || ''}</h2>
             <div class="memo-detail-body article-body">
               ${currentItem.content}
             </div>
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    const prevDay = document.getElementById('memo-prev-day');
    const nextDay = document.getElementById('memo-next-day');
    const focusCard = document.getElementById('memo-focus-card');
    const expandBtn = document.getElementById('memo-expand-trigger');
    const overlay = document.getElementById('memo-detail-overlay');
    const closeBtn = document.getElementById('memo-detail-close');

    if (prevDay) {
      prevDay.onclick = (e) => {
        e.stopPropagation();
        dayIndex++;
        memoIndex = 0;
        renderDesk();
      };
    }

    if (nextDay) {
      nextDay.onclick = (e) => {
        e.stopPropagation();
        dayIndex--;
        memoIndex = 0;
        renderDesk();
      };
    }

    if (focusCard) {
      focusCard.onclick = (e) => {
        // Prevent click if clicking the expand button
        if (e.target.closest('#memo-expand-trigger')) return;
        
        // Loop back to start if it's the last one, or just go to next
        const items = getCurrentItems();
        
        focusCard.classList.add('is-leaving');
        const stack = document.getElementById('memo-stack');
        stack.classList.add('is-transitioning');
        
        setTimeout(() => {
          memoIndex = (memoIndex + 1) % items.length;
          renderDesk();
        }, 300);
      };
    }

    if (expandBtn) {
      expandBtn.onclick = (e) => {
        e.stopPropagation();
        overlay.classList.add('is-active');
        document.body.style.overflow = 'hidden';
      };
    }

    if (closeBtn) {
      closeBtn.onclick = () => {
        overlay.classList.remove('is-active');
        document.body.style.overflow = '';
      };
    }

    if (overlay) {
      overlay.onclick = (e) => {
        if (e.target === overlay) closeBtn.onclick();
      };
    }
  }

  function renderEmpty(message) {
    desk.innerHTML = `<div class="memo-empty">${message}</div>`;
  }

  renderDesk();
});
