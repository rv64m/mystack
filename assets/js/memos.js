document.addEventListener('DOMContentLoaded', () => {
  const desk = document.getElementById('memo-desk');
  const selector = document.getElementById('date-selector');
  if (!desk || !selector) return;

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

  const memoThemes = [
    {
      surface: '#FFFFFF',
      strong: '#F4FAFF',
      soft: '#EAF6FF',
      accent: '#53B4E8',
      ink: '#33424D',
      muted: '#71828F'
    },
    {
      surface: '#FFFFFF',
      strong: '#FFF8F1',
      soft: '#FDEBDD',
      accent: '#F0AE6B',
      ink: '#4B4138',
      muted: '#86776A'
    },
    {
      surface: '#FFFFFF',
      strong: '#F6FBF7',
      soft: '#E8F5EA',
      accent: '#88C590',
      ink: '#33463A',
      muted: '#6F8475'
    },
    {
      surface: '#FFFFFF',
      strong: '#FAF8FF',
      soft: '#EEE7FB',
      accent: '#A58CE2',
      ink: '#3D3950',
      muted: '#7A748F'
    }
  ];

  let dayIndex = 0;
  let memoIndex = 0;

  function getCurrentDate() {
    return dates[dayIndex];
  }

  function getCurrentItems() {
    return memosByDate[getCurrentDate()] || [];
  }

  function getTheme(index) {
    return memoThemes[index % memoThemes.length];
  }

  function themeStyle(index) {
    const theme = getTheme(index);
    return `--memo-surface:${theme.surface};--memo-strong:${theme.strong};--memo-soft:${theme.soft};--memo-accent:${theme.accent};--memo-ink:${theme.ink};--memo-muted:${theme.muted};`;
  }

  function formatDate(date) {
    const d = new Date(`${date}T00:00:00`);
    return {
      weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
      shortWeekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      monthDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      full: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    };
  }

  function renderSelector() {
    selector.innerHTML = '';
    selector.hidden = true;
  }

  function renderDesk() {
    const items = getCurrentItems();

    if (items.length === 0) {
      renderEmpty('No memos for this day.');
      return;
    }

    memoIndex = Math.max(0, Math.min(memoIndex, items.length - 1));

    const currentDate = formatDate(getCurrentDate());
    const currentItem = items[memoIndex];
    const stackedItems = items.slice(memoIndex, memoIndex + 3);
    const hasPrevDay = dayIndex < dates.length - 1;
    const hasNextDay = dayIndex > 0;

    desk.innerHTML = `
      <section class="memo-kinetic">
        <div class="memo-kinetic-header">
          <button class="memo-date-btn" id="memo-prev-day" type="button" aria-label="Previous day" ${hasPrevDay ? '' : 'disabled'}>
            &lsaquo;
          </button>
          <div class="memo-date-display">
            <span>${escapeHtml(currentDate.weekday)},</span>
            <span>${escapeHtml(currentDate.monthDay)}</span>
          </div>
          <button class="memo-date-btn" id="memo-next-day" type="button" aria-label="Next day" ${hasNextDay ? '' : 'disabled'}>
            &rsaquo;
          </button>
        </div>

        <p class="memo-scribble memo-scribble--left">&larr; your daily pulse</p>

        <div class="memo-kinetic-stack" id="memo-stack">
          ${stackedItems.slice(1).reverse().map((item, offset) => renderBackCard(item, memoIndex + stackedItems.length - 1 - offset, items.length, stackedItems.length - 1 - offset)).join('')}
          <button class="memo-focus-card is-visible" id="memo-focus-card" type="button" style="${themeStyle(memoIndex)}" ${memoIndex < items.length - 1 ? 'data-next="true"' : ''}>
            <div class="memo-focus-badge">${memoIndex === 0 ? "Today's Focus" : `Note ${memoIndex + 1}`}</div>
            <h2 class="memo-focus-title">${escapeHtml(getHeadline(currentItem, memoIndex))}</h2>
            <p class="memo-focus-body">${escapeHtml(getBodyCopy(currentItem))}</p>
            <div class="memo-focus-wave" aria-hidden="true">
              <svg viewBox="0 0 240 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 38C51 38 76 9 118 9C160 9 185 38 232 38" stroke="var(--memo-accent)" stroke-width="3.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="memo-focus-meta">
              <time>${escapeHtml(currentItem.time)}</time>
              <span>${items.length > 1 ? `${memoIndex + 1}/${items.length}` : currentDate.shortWeekday}</span>
            </div>
          </button>
        </div>

        <p class="memo-scribble memo-scribble--right">history of wins &rarr;</p>
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    const prevDay = document.getElementById('memo-prev-day');
    const nextDay = document.getElementById('memo-next-day');
    const focusCard = document.getElementById('memo-focus-card');

    if (prevDay) {
      prevDay.addEventListener('click', () => {
        if (dayIndex < dates.length - 1) {
          dayIndex += 1;
          memoIndex = 0;
          renderDesk();
        }
      });
    }

    if (nextDay) {
      nextDay.addEventListener('click', () => {
        if (dayIndex > 0) {
          dayIndex -= 1;
          memoIndex = 0;
          renderDesk();
        }
      });
    }

    if (focusCard) {
      focusCard.addEventListener('click', () => {
        if (memoIndex < getCurrentItems().length - 1) {
          transitionToMemo(memoIndex + 1);
        }
      });
    }
  }

  function transitionToMemo(nextIndex) {
    const card = document.getElementById('memo-focus-card');
    const stack = document.getElementById('memo-stack');
    if (!card || !stack) {
      memoIndex = nextIndex;
      renderDesk();
      return;
    }

    card.classList.remove('is-visible');
    card.classList.add('is-leaving');
    stack.classList.add('is-transitioning');

    window.setTimeout(() => {
      memoIndex = nextIndex;
      renderDesk();

      const incoming = document.getElementById('memo-focus-card');
      if (!incoming) return;

      requestAnimationFrame(() => {
        incoming.classList.remove('is-visible');
        requestAnimationFrame(() => {
          incoming.classList.add('is-visible');
        });
      });
    }, 240);
  }

  function renderBackCard(item, idx, total, depth) {
    return `
      <div class="memo-back-card memo-back-card--depth-${depth}" style="${themeStyle(idx)}" aria-hidden="true">
        <div class="memo-back-card-veil"></div>
      </div>
    `;
  }

  function getHeadline(item, idx) {
    if (item.title && item.title.trim()) return item.title.trim();

    const source = (item.preview || stripHtml(item.content || '')).trim();
    if (!source) return `Memo ${idx + 1}`;

    const cleaned = source.replace(/\s+/g, ' ').trim();
    const sentence = cleaned.split(/[.!?]/)[0].trim();
    const headline = sentence || cleaned;
    return headline.length > 42 ? `${headline.slice(0, 42).trim()}...` : headline;
  }

  function getBodyCopy(item) {
    const source = (item.preview || stripHtml(item.content || '')).replace(/\s+/g, ' ').trim();
    if (!source) return 'A quiet note for the day.';
    return source.length > 96 ? `${source.slice(0, 96).trim()}...` : source;
  }

  function stripHtml(html) {
    return html.replace(/<[^>]+>/g, ' ');
  }

  function renderEmpty(message) {
    desk.innerHTML = `
      <div class="memo-empty">
        <p class="memo-empty-title">${escapeHtml(message)}</p>
        <p class="memo-empty-text">Memos are usually written in the morning. Check back soon.</p>
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  renderSelector();
  renderDesk();
});
