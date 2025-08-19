// app.js — обновлён: опции с локальными изображениями, авто-перелистывание после выбора, мобайл-оптимизации поведения
(() => {
  const LISTS = ['/data/list1.json','/data/list2.json','/data/list3.json'];
  const DEFAULT_CORNER = {
    corner: "Terminal F — Рекомендация",
    slogan: "Универсальный выбор для любого настроения",
    image: "/assets/default.png",
    color: "#414141"
  };

  // QUESTIONS: использованы локальные asset-изображения для опций (заменяйте при добавлении файлов)
  const QUESTIONS = [
    {
      id:1, title: "Настроение конца лета",
      opts: [
        {id:1, title:"Морской бриз", desc:"Лёгко и освежающе", img: "/assets/iliva.jpg"},
        {id:2, title:"Пряности", desc:"Насыщенно и ароматно", img: "/assets/karavan.jpg"},
        {id:3, title:"Уют", desc:"Тёплая, домашняя атмосфера", img: "/assets/darama.jpg"}
      ]
    },
    {
      id:2, title: "С кем идёшь",
      opts: [
        {id:1, title:"Соло", desc:"Никаких обязательств", img: "/assets/muk.jpg"},
        {id:2, title:"С парой", desc:"Романтика или общие планы", img: "/assets/gv.jpg"},
        {id:3, title:"Компания", desc:"Хочется делиться", img: "/assets/kotletabar.jpg"}
      ]
    },
    {
      id:3, title: "Формат",
      opts: [
        {id:1, title:"Быстрый перекус", desc:"На ходу", img: "/assets/bebo.jpg"},
        {id:2, title:"Долгие посиделки", desc:"С комфортом", img: "/assets/iliva.jpg"},
        {id:3, title:"Сладкий момент", desc:"Десерты и кофе", img: "/assets/vkusnoblin.jpg"}
      ]
    },
    {
      id:4, title: "Когда планируешь зайти",
      opts: [
        {id:1, title:"Днём"},
        {id:2, title:"Вечером"},
        {id:3, title:"На выходных"}
      ]
    }
  ];

  // Simple cache for prefetched lists
  const listsCache = { loaded: false, data: [] };

  // Prefetch lists into sessionStorage (non-blocking)
  (function prefetch(){
    try {
      const fromSession = sessionStorage.getItem('listsCache_v2');
      if (fromSession) {
        const parsed = JSON.parse(fromSession);
        if (Array.isArray(parsed) && parsed.length === LISTS.length) {
          listsCache.loaded = true;
          listsCache.data = parsed;
          console.log('[prefetch] loaded lists from sessionStorage');
          return;
        }
      }
    } catch(e){ /* ignore */ }

    Promise.all(LISTS.map(u => fetch(u).then(r => r.ok ? r.json() : []).catch(()=>[])))
      .then(arr => {
        listsCache.loaded = true;
        listsCache.data = arr;
        try { sessionStorage.setItem('listsCache_v2', JSON.stringify(arr)); } catch(e){}
        console.log('[prefetch] lists fetched and cached');
      })
      .catch(err => console.warn('[prefetch] failed', err));
  })();

  const $ = (sel, ctx=document) => ctx.querySelector(sel);

  const isQuiz = document.body.classList.contains('page-quiz');
  const isResult = document.body.classList.contains('page-result');

  if (isQuiz) initQuizPage();
  if (isResult) initResultPage();

  async function findKeyInAllLists(key) {
    if (listsCache.loaded && listsCache.data.length === LISTS.length) {
      for (let i=0;i<LISTS.length;i++){
        const arr = listsCache.data[i] || [];
        const found = Array.isArray(arr) ? arr.find(x => x.key === key) : null;
        if (found) return { item: found, listUrl: LISTS[i] };
      }
    }

    for (let i=0;i<LISTS.length;i++){
      try {
        const resp = await fetch(LISTS[i]);
        if (!resp.ok) continue;
        const arr = await resp.json();
        listsCache.data[i] = arr;
        const found = Array.isArray(arr) ? arr.find(x => x.key === key) : null;
        if (found) {
          try { sessionStorage.setItem('listsCache_v2', JSON.stringify(listsCache.data)); } catch(e){}
          return { item: found, listUrl: LISTS[i] };
        }
      } catch (e) {
        console.warn('[findKey] fetch error for', LISTS[i], e);
      }
    }
    return null;
  }

  // ---------------- Quiz page ----------------
  function initQuizPage(){
    const screenStart = document.getElementById('screenStart');
    const screenQuiz = document.getElementById('screenQuiz');
    const screenLoading = document.getElementById('screenLoading');
    const btnStart = document.getElementById('btnStart');
    const btnBack = document.getElementById('btnBack');
    const btnNext = document.getElementById('btnNext');
    const questionHolder = document.getElementById('questionHolder');
    const progressStep = document.getElementById('progressStep');
    const progressBar = document.getElementById('progressBar');

    if (!btnStart || !questionHolder || !btnNext || !btnBack || !progressBar || !progressStep) {
      console.error('[quiz] required DOM not found, aborting initQuizPage');
      return;
    }

    let chosenListUrl = null;
    let chosenListData = null;
    let answers = [null,null,null,null];
    let current = 0;
    let submitting = false;

    // Start handler
    btnStart.addEventListener('click', async () => {
      // pick random list
      const idx = Math.floor(Math.random()*LISTS.length);
      chosenListUrl = LISTS[idx];
      if (screenStart) screenStart.classList.remove('show');
      if (screenLoading) screenLoading.classList.add('show');

      try {
        const resp = await fetch(chosenListUrl);
        if (!resp.ok) throw new Error('fetch failed ' + resp.status);
        chosenListData = await resp.json();
        console.log('[quiz] chosen list loaded:', chosenListUrl, 'items:', Array.isArray(chosenListData) ? chosenListData.length : 0);
      } catch (err) {
        console.warn('[quiz] failed to load chosen list', chosenListUrl, err);
        chosenListData = [];
      } finally {
        if (screenLoading) screenLoading.classList.remove('show');
      }

      if (screenQuiz) screenQuiz.classList.add('show');
      renderQuestion(0);
    });

    // Render question index i
    function renderQuestion(i){
      if (i < 0) i = 0;
      if (i > QUESTIONS.length - 1) i = QUESTIONS.length - 1;
      current = i;
      progressStep.textContent = String(i+1);
      const pct = Math.round(((i) / (QUESTIONS.length - 1)) * 100);
      progressBar.style.width = pct + '%';

      const q = QUESTIONS[i];
      const panel = document.createElement('div');
      panel.className = 'q-panel';

      const title = document.createElement('h3');
      title.className = 'q-title';
      title.textContent = q.title;
      panel.appendChild(title);

      if (q.id !== 4) {
        const sub = document.createElement('div');
        sub.className = 'q-sub';
        sub.textContent = 'Выберите вариант';
        panel.appendChild(sub);
      }

      const opts = document.createElement('div');
      opts.className = 'options';

      q.opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-card';
        btn.dataset.opt = opt.id;
        btn.setAttribute('aria-pressed', (answers[i] === opt.id) ? 'true' : 'false');
        if (answers[i] === opt.id) btn.classList.add('active');

        const thumb = document.createElement('div');
        thumb.className = 'option-thumb';
        if (opt.img) {
          const img = document.createElement('img');
          img.src = opt.img;
          img.alt = opt.title || '';
          img.loading = 'lazy';
          thumb.appendChild(img);
        } else {
          thumb.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 12h4l3 2v3l3 1v-4l4-3-8-5V4L2 12z" fill="#414141"/></svg>';
        }

        const body = document.createElement('div');
        body.className = 'option-body';
        const h = document.createElement('div');
        h.className = 'option-title';
        h.textContent = opt.title;
        body.appendChild(h);
        if (opt.desc) {
          const d = document.createElement('div');
          d.className = 'option-desc';
          d.textContent = opt.desc;
          body.appendChild(d);
        }

        btn.appendChild(thumb);
        btn.appendChild(body);

        // Selection handler: set answer and auto-advance
        btn.addEventListener('click', () => {
          if (submitting) return;
          answers[i] = opt.id;
          Array.from(opts.children).forEach(c => {
            c.classList.remove('active');
            c.setAttribute('aria-pressed','false');
          });
          btn.classList.add('active');
          btn.setAttribute('aria-pressed','true');

          // small visual pause then advance or submit
          const AUTO_DELAY = 200;
          if (i < QUESTIONS.length - 1) {
            setTimeout(() => {
              renderQuestion(i + 1);
            }, AUTO_DELAY);
          } else {
            // last question -> submit automatically
            setTimeout(() => {
              submitQuiz();
            }, AUTO_DELAY);
          }
        });

        opts.appendChild(btn);
      });

      panel.appendChild(opts);
      // replace content (fast)
      questionHolder.innerHTML = '';
      questionHolder.appendChild(panel);

      btnBack.disabled = (i === 0);
      btnNext.textContent = (i === QUESTIONS.length - 1) ? 'Показать результат' : 'Далее';
    }

    btnBack.addEventListener('click', () => {
      if (current > 0) renderQuestion(current - 1);
    });

    btnNext.addEventListener('click', () => {
      // move forward only if answered
      if (!answers[current]) {
        alert('Пожалуйста, выберите вариант ответа.');
        return;
      }
      if (current < QUESTIONS.length - 1) {
        renderQuestion(current + 1);
      } else {
        submitQuiz();
      }
    });

    async function submitQuiz(){
      if (submitting) return;
      submitting = true;

      if (screenQuiz) screenQuiz.classList.remove('show');
      if (screenLoading) screenLoading.classList.add('show');

      await new Promise(r => setTimeout(r, 280)); // UX pause

      const key = `${answers[0]}-${answers[1]}-${answers[2]}`;
      let found = Array.isArray(chosenListData) ? chosenListData.find(x => x.key === key) : null;
      let foundIn = chosenListUrl;

      if (!found) {
        try {
          const res = await findKeyInAllLists(key);
          if (res) {
            found = res.item;
            foundIn = res.listUrl;
          }
        } catch (e) {
          console.warn('[quiz] error searching all lists', e);
        }
      }

      const result = found || DEFAULT_CORNER;

      let tail = '';
      const q4 = answers[3];
      if (q4 === 1) tail = ' — загляни днём';
      if (q4 === 2) tail = ' — идеально на вечер';
      if (q4 === 3) tail = ' — сохрани для выходных';

      const payload = {
        answers,
        chosenList: foundIn || chosenListUrl,
        key,
        result,
        sloganWithTail: (result.slogan || '') + (found ? tail : '')
      };

      console.log('[quiz] Answers:', answers);
      console.log('[quiz] Final chosen list (where match found):', payload.chosenList);
      console.log('[quiz] Lookup key:', key);
      console.log('[quiz] Corner chosen:', result.corner);

      try { sessionStorage.setItem('quizResult', JSON.stringify(payload)); } catch(e){ console.warn('[quiz] sessionStorage write failed', e); }

      // navigate to result page
      window.location.href = 'result.html';
    }
  }

  // ---------------- Result page ----------------
  function initResultPage(){
    if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
      document.addEventListener('DOMContentLoaded', renderResult);
    } else {
      renderResult();
    }

    async function renderResult(){
      const resultArea = document.getElementById('resultArea');
      const btnDownload = document.getElementById('downloadBtn');
      const btnAgain = document.getElementById('againBtn');

      if (!resultArea) {
        console.error('[result] resultArea not found');
        return;
      }

      let raw = null;
      try { raw = sessionStorage.getItem('quizResult'); } catch(e){ console.warn('[result] sessionStorage read failed', e); }

      if (!raw) {
        resultArea.innerHTML = '<div style="padding:20px;color:#414141">Результат не найден. <button id="goBackBtn" class="btn primary">Вернуться к квизу</button></div>';
        const goBack = document.getElementById('goBackBtn');
        if (goBack) goBack.addEventListener('click', () => window.location.href = 'index.html');
        return;
      }

      let payload;
      try { payload = JSON.parse(raw); } catch(e) { console.error('[result] parse error', e); window.location.href='index.html'; return; }

      let res = payload.result || DEFAULT_CORNER;
      let sloganWithTail = payload.sloganWithTail || res.slogan || '';

      if (res === DEFAULT_CORNER || !res.corner || res.corner === DEFAULT_CORNER.corner) {
        try {
          const search = await findKeyInAllLists(payload.key);
          if (search && search.item) {
            res = search.item;
            sloganWithTail = (res.slogan || '') + (payload.answers && payload.answers[3] ? (payload.answers[3]===1?' — загляни днём':payload.answers[3]===2?' — идеально на вечер':' — сохрани для выходных') : '');
            console.log('[result] found key at render-time in', search.listUrl);
          } else {
            console.log('[result] no match found in any list for key', payload.key);
          }
        } catch(e) {
          console.warn('[result] error searching lists at render-time', e);
        }
      }

      // Build card
      resultArea.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'result-card';
      card.style.background = (res.color || DEFAULT_CORNER.color);

      const cover = document.createElement('div');
      cover.className = 'result-cover';
      cover.style.backgroundImage = `url('${res.image || DEFAULT_CORNER.image}')`;
      card.appendChild(cover);

      const content = document.createElement('div');
      content.className = 'result-content';

      const top = document.createElement('div');
      top.innerHTML = `<img src="/assets/logo.png" class="small-logo" alt="Terminal F" onerror="this.onerror=null;this.src='/assets/logo.svg'">`;
      content.appendChild(top);

      const middle = document.createElement('div');
      middle.style.display = 'flex';
      middle.style.flexDirection = 'column';
      middle.style.justifyContent = 'center';
      middle.style.gap = '6px';
      middle.innerHTML = `<h2 class="result-title">${escapeHtml(res.corner)}</h2><p class="result-slogan">${escapeHtml(sloganWithTail)}</p>`;
      content.appendChild(middle);

      // Debug badge: show which list it was found in (hidden on small screens via CSS)
      const debug = document.createElement('div');
      debug.className = 'debug-badge';
      debug.textContent = payload.chosenList ? `Found in: ${payload.chosenList.split('/').pop()}` : '';
      content.appendChild(debug);

      const bottom = document.createElement('div');
      bottom.style.display = 'flex';
      bottom.style.justifyContent = 'flex-end';
      bottom.style.opacity = '0.95';
      bottom.textContent = 'Terminal F';
      content.appendChild(bottom);

      card.appendChild(content);
      resultArea.appendChild(card);

      requestAnimationFrame(()=> card.classList.add('show'));

      if (btnDownload) {
        btnDownload.addEventListener('click', async () => {
          btnDownload.disabled = true;
          const old = btnDownload.textContent;
          btnDownload.textContent = 'Генерируется...';
          try {
            const canvas = await html2canvas(card, {backgroundColor: null, useCORS: true, scale: 2});
            const dataUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataUrl;
            const slug = (res.corner || 'terminalf').replace(/\s+/g,'_').toLowerCase();
            a.download = `${slug}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
          } catch (err) {
            console.error('[result] html2canvas error', err);
            alert('Не удалось сохранить изображение.');
          } finally {
            btnDownload.disabled = false;
            btnDownload.textContent = old;
          }
        });
      }

      if (btnAgain) {
        btnAgain.addEventListener('click', () => {
          try { sessionStorage.removeItem('quizResult'); } catch(e){}
          window.location.href = 'index.html';
        });
      }

      console.log('[result] Rendered from list:', payload.chosenList);
      console.log('[result] Lookup key:', payload.key);
      console.log('[result] Answers:', payload.answers);
      console.log('[result] Corner:', res.corner);
    }
  }

  function escapeHtml(s){
    if (typeof s !== 'string') return s;
    return s.replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
  }

})();