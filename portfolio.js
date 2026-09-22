/* =========================================================
   Portfolio (alternative "Ваши мечты" page).
   Reads the same projectsData as projects.html, so a house added
   once in script.js shows up in both versions.
   ========================================================= */
(function () {
    const grid = document.getElementById('pfGrid');
    if (!grid || typeof projectsData === 'undefined') return;

    const CATEGORY_NAMES = { new: 'Новый дом', reconstruction: 'Реконструкция', industrial: 'Промышленный объект' };
    const categoryOf = p => p.category || 'new';

    function plural(n, one, few, many) {
        const m10 = n % 10, m100 = n % 100;
        if (m10 === 1 && m100 !== 11) return one;
        if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
        return many;
    }

    // what to call the two sides of the comparison
    function labelsFor(p) {
        if (p.noTags) return null;
        if (categoryOf(p) === 'reconstruction') return ['Было', 'Стало'];
        const bothRenders = /render/.test(p.imgBefore) && /render/.test(p.imgAfter);
        return bothRenders ? null : ['Проект', 'Реальность'];
    }

    /* ---------- stats ---------- */
    const counts = { new: 0, reconstruction: 0, industrial: 0 };
    projectsData.forEach(p => { counts[categoryOf(p)]++; });
    const stats = document.getElementById('pfStats');
    if (stats) {
        stats.innerHTML = [
            [counts.new, plural(counts.new, 'новый дом', 'новых дома', 'новых домов')],
            [counts.reconstruction, plural(counts.reconstruction, 'реконструкция', 'реконструкции', 'реконструкций')],
            [counts.industrial, plural(counts.industrial, 'промышленный объект', 'промышленных объекта', 'промышленных объектов')],
        ].filter(([n]) => n > 0)
         .map(([n, label]) => `<div class="pf-stat"><span class="pf-stat-value">${n}</span><span class="pf-stat-label">${label}</span></div>`)
         .join('');
    }

    /* ---------- cards ---------- */
    function cardFor(p, index, order) {
        const card = document.createElement('button');
        card.className = 'pf-card';
        card.dataset.category = categoryOf(p);
        card.style.setProperty('--delay', (order * 0.06) + 's');
        const labels = labelsFor(p);
        card.innerHTML = `
            <span class="pf-card-media">
                <span class="pf-card-img pf-card-after" style="background-image:url('${p.imgAfter}')"></span>
                <span class="pf-card-img pf-card-before" style="background-image:url('${p.imgBefore}')"></span>
                ${labels ? `<span class="pf-card-hint"><span>${labels[1]}</span><span>${labels[0]}</span></span>` : ''}
            </span>
            <span class="pf-card-info">
                <span class="pf-card-num">${String(index + 1).padStart(2, '0')}</span>
                <span class="pf-card-text">
                    <span class="pf-card-cat">${CATEGORY_NAMES[categoryOf(p)]}${p.location && p.location !== '—' ? ' · ' + p.location : ''}</span>
                    <span class="pf-card-title">${p.title || ''}</span>
                </span>
                <span class="pf-card-arrow" aria-hidden="true">&rarr;</span>
            </span>`;
        card.setAttribute('aria-label', `Открыть проект: ${p.title || ''}`);
        card.addEventListener('click', () => openCase(index));
        return card;
    }

    let visible = [];   // indexes into projectsData for the current filter

    function render(filter) {
        visible = projectsData.map((p, i) => i).filter(i => filter === 'all' || categoryOf(projectsData[i]) === filter);
        grid.replaceChildren(...visible.map((i, order) => cardFor(projectsData[i], i, order)));
        grid.classList.toggle('pf-grid-featured', filter === 'all' || filter === 'new');
    }

    document.querySelectorAll('.pf-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.pf-filter').forEach(b => b.classList.toggle('active', b === btn));
            render(btn.dataset.filter);
        });
    });
    render('all');

    /* ---------- case view ---------- */
    const caseEl = document.getElementById('pfCase');
    const scrollEl = document.getElementById('pfCaseScroll');
    const compare = document.getElementById('pfCompare');
    const beforeEl = document.getElementById('pfBefore');
    const afterEl = document.getElementById('pfAfter');
    const range = document.getElementById('pfRange');
    const labelBefore = document.getElementById('pfLabelBefore');
    const labelAfter = document.getElementById('pfLabelAfter');
    let current = -1;

    function setLayer(el, src, fit, pos) {
        el.style.setProperty('--img', `url('${src}')`);
        el.style.setProperty('--pos', pos || 'center');
        el.classList.toggle('pf-contain', fit === 'contain');
    }

    function setSplit(value) {
        compare.style.setProperty('--split', value + '%');
    }
    range.addEventListener('input', () => setSplit(range.value));

    function fact(label, value) {
        return value && value !== '—' ? `<div><dt>${label}</dt><dd>${value}</dd></div>` : '';
    }

    function openCase(index) {
        const p = projectsData[index];
        if (!p) return;
        current = index;
        if (!visible.includes(index)) {   // opened from a link while filtered — show everything
            document.querySelector('.pf-filter[data-filter="all"]')?.click();
        }

        // a project whose main material is a video: show the player instead of the comparison
        const videoBox = document.getElementById('pfCaseVideo');
        videoBox.hidden = !p.video;
        compare.hidden = !!p.video;
        videoBox.replaceChildren();
        if (p.video) {
            const player = document.createElement('video');
            player.src = p.video;
            player.controls = true;
            player.playsInline = true;
            player.preload = 'metadata';
            videoBox.appendChild(player);
        }

        setLayer(beforeEl, p.imgBefore, p.fitBefore, p.posBefore);
        setLayer(afterEl, p.imgAfter, p.fitAfter, p.posAfter);
        const labels = labelsFor(p);
        labelBefore.textContent = labels ? labels[0] : '';
        labelAfter.textContent = labels ? labels[1] : '';
        compare.classList.toggle('pf-no-labels', !labels);
        range.value = 50;
        setSplit(50);

        document.getElementById('pfCaseCat').textContent = CATEGORY_NAMES[categoryOf(p)];
        document.getElementById('pfCaseTitle').textContent = p.title || '';
        const facts = fact('Место', p.location);
        const factsEl = document.getElementById('pfCaseFacts');
        factsEl.innerHTML = facts;
        factsEl.hidden = !facts;

        const text = document.getElementById('pfCaseText');
        text.replaceChildren(...p.description.split(/\n\s*\n/).map((t, i) => {
            const para = document.createElement('p');
            if (i === 0) para.className = 'pf-case-lead';
            para.textContent = t.trim();
            return para;
        }));
        if (p.link) {
            const a = document.createElement('a');
            a.className = 'gallery-link';
            a.href = p.link.href;
            a.textContent = p.link.text;
            text.appendChild(a);
        }

        const gallery = document.getElementById('pfCaseGallery');
        gallery.replaceChildren(...p.gallery.map((src, i) => {
            const tile = document.createElement('button');
            tile.className = 'pf-tile';
            if (isVideoSrc(src)) {
                tile.classList.add('pf-tile-video');
                tile.innerHTML = `<video src="${src}#t=0.5" muted playsinline preload="metadata"></video><span class="video-play"></span>`;
            } else {
                tile.innerHTML = `<img src="${src}" alt="${CATEGORY_NAMES[categoryOf(p)]}${p.location && p.location !== '—' ? ', ' + p.location : ''} — ${p.title || 'проект Julamore'}, фото ${i + 1}" loading="lazy">`;
            }
            tile.addEventListener('click', () => openLightbox(p.gallery, i));
            return tile;
        }));

        const order = visible.length ? visible : projectsData.map((_, i) => i);
        const pos = order.indexOf(index);
        const nextIndex = order[(pos + 1) % order.length];
        document.getElementById('pfCaseCounter').textContent = `${pos + 1} / ${order.length}`;
        document.getElementById('pfCaseNextBig').innerHTML =
            `<span>Следующий проект</span><strong>${projectsData[nextIndex].title || ''} &rarr;</strong>`;

        caseEl.hidden = false;
        requestAnimationFrame(() => caseEl.classList.add('open'));
        document.body.style.overflow = 'hidden';
        scrollEl.scrollTop = 0;
        history.replaceState(null, '', '#case-' + (index + 1));
    }

    function step(delta) {
        const order = visible.length ? visible : projectsData.map((_, i) => i);
        const pos = order.indexOf(current);
        openCase(order[(pos + delta + order.length) % order.length]);
    }

    function closeCase() {
        caseEl.classList.remove('open');
        document.body.style.overflow = '';
        history.replaceState(null, '', location.pathname + location.search);
        setTimeout(() => { if (!caseEl.classList.contains('open')) caseEl.hidden = true; }, 350);
        caseEl.querySelectorAll('video').forEach(v => v.pause());
    }

    document.getElementById('pfCaseClose').addEventListener('click', closeCase);
    document.getElementById('pfCasePrev').addEventListener('click', () => step(-1));
    document.getElementById('pfCaseNext').addEventListener('click', () => step(1));
    document.getElementById('pfCaseNextBig').addEventListener('click', () => step(1));
    document.addEventListener('keydown', (e) => {
        if (caseEl.hidden || document.getElementById('lightbox')?.classList.contains('active')) return;
        if (e.key === 'Escape') closeCase();
        if (e.key === 'ArrowLeft') step(-1);
        if (e.key === 'ArrowRight') step(1);
    }, true);

    // deep link: portfolio.html#case-3
    const m = location.hash.match(/^#case-(\d+)$/);
    if (m) openCase(Number(m[1]) - 1);
})();
