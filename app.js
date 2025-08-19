// app.js — исправленная версия: разделение логики index/result, защита от null DOM, стабильный рендер результата
(() => {
  const LISTS = ['/data/list1.json','/data/list2.json','/data/list3.json'];
  const DEFAULT_CORNER = {
    corner: "Terminal F — Рекомендация",
    slogan: "Универсальный выбор для любого настроения",
    image: "https://picsum.photos/seed/default/1080/1920",
    color: "#414141"
  };

  const QUESTIONS = [
    {
      id:1, title: "Настроение конца лета",
      opts: [
        {id:1, title:"Морской бриз", desc:"Лёгко и освежающе", img: "https://picsum.photos/seed/marine/320/480"},
        {id:2, title:"Пряности", desc:"Насыщенно и ароматно", img: "https://picsum.photos/seed/spice/320/480"},
        {id:3, title:"Уют", desc:"Тёплая, домашняя атмосфера", img: "https://picsum.photos/seed/cozy/320/480"}
      ]
    },
    {
      id:2, title: "С кем идёшь",
      opts: [
        {id:1, title:"Соло", desc:"Никаких обязательств", img: "https://picsum.photos/seed/solo/320/480"},
        {id:2, title:"С парой", desc:"Романтика или общие планы", img: "https://picsum.photos/seed/couple/320/480"},
        {id:3, title:"Компания", desc:"Хочется делиться", img: "https://picsum.photos/seed/group/320/480"}
      ]
    },
    {
      id:3, title: "Формат",
      opts: [
        {id:1, title:"Быстрый перекус", desc:"На ходу", img: "https://picsum.photos/seed/fast/320/480"},
        {id:2, title:"Долгие посиделки", desc:"С комфортом", img: "https://picsum.photos/seed/slow/320/480"},
        {id:3, title:"Сладкий момент", desc:"Десерты и кофе", img: "https://picsum.photos/seed/sweet/320/480"}
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

  // Определяем страницу
  const isQuiz = document.body.classList.contains('page-quiz');
  const isResult = document.body.classList.contains('page-result');

  if (isQuiz) initQuizPage();
  if (isResult) initResultPage();

  // ---------------- Quiz page ----------------
  function initQuizPage(){
    // Получаем элементы — делаем это локально в функции, чтобы не обращаться к несуществующим узлам на result.html
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
      console.error('[quiz] Required DOM nodes not found — aborting quiz init');
      return;
    }

    let chosenListUrl = null;
    let chosenListData = null;
    let answers = [null,null,null,null];
    let current = 0;

    // Start
    btnStart.addEventListener('click', async () => {
      // choose random list
      const idx = Math.floor(Math.random()*LISTS.length);
      chosenListUrl = LISTS[idx];

      // UI swap
      if (screenStart) screenStart.classList.remove('show');
      if (screenLoading) screenLoading.classList.add('show');

      try {
        const resp = await fetch(chosenListUrl);
        if (!resp.ok) throw new Error('fetch failed ' + resp.status);
        chosenListData = await resp.json();
        console.log('[quiz] Selected list:', chosenListUrl, 'items:', Array.isArray(chosenListData) ? chosenListData.length : 0);
      } catch (err) {
        console.warn('[quiz] Error fetching list, continuing with empty data', err);
        chosenListData = [];
      } finally {
        if (screenLoading) screenLoading.classList.remove('show');
      }

      // show quiz
      if (screenQuiz) screenQuiz.classList.add('show');
      renderQuestion(0);
    });

    function renderQuestion(i){
      current = i;
      progressStep.textContent = String(i+1);
      // progress: fraction of completed steps (0..100)
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
        if (answers[i] === opt.id) btn.classList.add('active');

        const thumb = document.createElement('div');
        thumb.className = 'option-thumb';
        if (opt.img) {
          const img = document.createElement('img');
          img.src = opt.img;
          img.alt = opt.title || '';
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

        btn.addEventListener('click', () => {
          answers[i] = opt.id;
          Array.from(opts.children).forEach(c => c.classList.remove('active'));
          btn.classList.add('active');
        });

        opts.appendChild(btn);
      });

      panel.appendChild(opts);

      // replace content with animation-friendly swap
      questionHolder.innerHTML = '';
      questionHolder.appendChild(panel);

      btnBack.disabled = (i === 0);
      btnNext.textContent = (i === QUESTIONS.length - 1) ? 'Показать результат' : 'Далее';
    }

    btnBack.addEventListener('click', () => {
      if (current > 0) renderQuestion(current - 1);
    });

    btnNext.addEventListener('click', async () => {
      if (!answers[current]) {
        alert('Пожалуйста, выберите вариант ответа.');
        return;
      }

      if (current < QUESTIONS.length - 1) {
        renderQuestion(current + 1);
        return;
      }

      // submit
      if (screenQuiz) screenQuiz.classList.remove('show');
      if (screenLoading) screenLoading.classList.add('show');

      // small UX delay
      await new Promise(r => setTimeout(r, 300));

      const key = `${answers[0]}-${answers[1]}-${answers[2]}`;
      const found = Array.isArray(chosenListData) ? chosenListData.find(x => x.key === key) : null;
      const corner = found || DEFAULT_CORNER;

      let tail = '';
      const q4 = answers[3];
      if (q4 === 1) tail = ' — загляни днём';
      if (q4 === 2) tail = ' — идеально на вечер';
      if (q4 === 3) tail = ' — сохрани для выходных';

      const payload = {
        answers,
        chosenList: chosenListUrl,
        key,
        result: corner,
        sloganWithTail: (corner.slogan || '') + (found ? tail : '')
      };

      console.log('[quiz] Answers:', answers);
      console.log('[quiz] Selected list:', chosenListUrl);
      console.log('[quiz] Lookup key:', key);
      console.log('[quiz] Corner chosen:', corner.corner || corner);

      try {
        sessionStorage.setItem('quizResult', JSON.stringify(payload));
      } catch (e) {
        console.warn('[quiz] sessionStorage set error', e);
      }

      // navigate
      window.location.href = 'result.html';
    });
  }

  // ---------------- Result page ----------------
  function initResultPage(){
    // Wait until DOM loaded to be safe
    if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
      document.addEventListener('DOMContentLoaded', renderResult);
    } else {
      renderResult();
    }

    function renderResult(){
      const resultArea = document.getElementById('resultArea');
      const btnDownload = document.getElementById('downloadBtn');
      const btnAgain = document.getElementById('againBtn');

      if (!resultArea) {
        console.error('[result] resultArea not found');
        return;
      }

      let raw = null;
      try { raw = sessionStorage.getItem('quizResult'); } catch(e) { console.warn('[result] sessionStorage read failed', e); }

      if (!raw) {
        console.warn('[result] No quizResult in sessionStorage, redirecting to index');
        // friendly message instead of immediate crash/redirect
        resultArea.innerHTML = '<div style="padding:20px;color:#414141">Результат не найден. <button id="goBackBtn" class="btn primary">Вернуться к квизу</button></div>';
        const goBack = document.getElementById('goBackBtn');
        if (goBack) goBack.addEventListener('click', () => window.location.href = 'index.html');
        return;
      }

      let payload;
      try { payload = JSON.parse(raw); } catch(e) {
        console.error('[result] parse error', e);
        window.location.href = 'index.html';
        return;
      }

      const res = payload.result || DEFAULT_CORNER;
      const sloganWithTail = payload.sloganWithTail || res.slogan || '';

      // build card
      resultArea.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'result-card';
      card.style.background = res.color || DEFAULT_CORNER.color;

      const cover = document.createElement('div');
      cover.className = 'result-cover';
      // safe image
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

      const bottom = document.createElement('div');
      bottom.style.display = 'flex';
      bottom.style.justifyContent = 'flex-end';
      bottom.style.opacity = '0.95';
      bottom.textContent = 'Terminal F';
      content.appendChild(bottom);

      card.appendChild(content);
      resultArea.appendChild(card);

      // animate in
      requestAnimationFrame(()=> card.classList.add('show'));

      // download
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
    } // end renderResult
  }

  // small helper to escape text to avoid accidental HTML injection in texts
  function escapeHtml(s){
    if (typeof s !== 'string') return s;
    return s.replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
  }

})();