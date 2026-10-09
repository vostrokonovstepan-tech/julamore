/* =========================================================
   Header: solid state on scroll + mobile nav toggle
   ========================================================= */
const header = document.querySelector('.site-header');
const navMenu = document.querySelector('.nav-menu');
const navToggle = document.querySelector('.nav-toggle');

function onScrollHeader(){
    if (!header) return;
    if (window.scrollY > 40) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
}
window.addEventListener('scroll', onScrollHeader);
onScrollHeader();

/* =========================================================
   Hero video: subtle parallax zoom while scrolling past it
   ========================================================= */
const heroVideoEl = document.querySelector('.hero-video');
const heroSection = document.querySelector('.main-hero');
if (heroVideoEl && heroSection){
    let heroTicking = false;
    function updateHeroParallax(){
        const heroHeight = heroSection.offsetHeight || window.innerHeight;
        const progress = Math.min(Math.max(window.scrollY / heroHeight, 0), 1);
        heroVideoEl.style.transform = `scale(${1 + progress * 0.08}) translateY(${progress * -18}px)`;
        heroTicking = false;
    }
    window.addEventListener('scroll', () => {
        if (!heroTicking){
            requestAnimationFrame(updateHeroParallax);
            heroTicking = true;
        }
    }, { passive: true });
    updateHeroParallax();

    function playHeroVideo(){
        const p = heroVideoEl.play();
        if (p && p.catch) p.catch(() => {});
    }
    playHeroVideo();

    // Browsers sometimes ignore the first play() call before enough data
    // has buffered — retry as soon as the video reports it's ready.
    heroVideoEl.addEventListener('loadeddata', playHeroVideo);
    heroVideoEl.addEventListener('canplay', playHeroVideo);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && heroVideoEl.paused) playHeroVideo();
    });
    window.addEventListener('pageshow', (e) => {
        if (e.persisted){
            heroVideoEl.currentTime = 0;
            playHeroVideo();
        } else if (heroVideoEl.paused) {
            playHeroVideo();
        }
    });

    // Last-resort fallback: some browsers / power-saving modes block
    // autoplay outright until the visitor interacts with the page at all —
    // catch the very first interaction anywhere and resume from it.
    const resumeHeroVideo = () => { if (heroVideoEl.paused) playHeroVideo(); };
    ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'].forEach(evt =>
        document.addEventListener(evt, resumeHeroVideo, { once: true, passive: true })
    );
}

if (navToggle && navMenu){
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('open');
        navMenu.classList.toggle('open');
    });
    navMenu.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            navToggle.classList.remove('open');
            navMenu.classList.remove('open');
        });
    });
}

/* =========================================================
   Scroll reveal for .reveal elements + word-by-word headings
   ========================================================= */
function splitIntoWords(el){
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w, i) => `<span class="word-reveal" style="--i:${i}">${w}</span>`).join(' ');
    el.classList.add('text-split');
}
document.querySelectorAll('.section-heading, .hero-caption h1').forEach(splitIntoWords);

const revealItems = document.querySelectorAll('.reveal, .text-split');
if (revealItems.length){
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting){
                entry.target.classList.add('is-visible');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
    revealItems.forEach(el => io.observe(el));

    // Safety net: never let content stay stuck invisible if the observer
    // somehow misses an element (fast scroll, odd browser behaviour, etc.)
    window.addEventListener('load', () => {
        setTimeout(() => {
            revealItems.forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-visible');
            });
        }, 1200);
    });
}

/* =========================================================
   FAQ accordion — each question opens/closes independently
   ========================================================= */
document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;
    question.addEventListener('click', () => {
        const isOpen = item.classList.toggle('open');
        question.setAttribute('aria-expanded', String(isOpen));
    });
});

if (location.hash === '#interview') {
    const target = document.getElementById('interview');
    const item = target?.closest('.faq-item');
    if (item && !item.classList.contains('open')) item.querySelector('.faq-question')?.click();
    setTimeout(() => target?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 650);
}

/* =========================================================
   Photo zoom — any [data-zoom] button opens its image big;
   arrows walk through the other photos of the same group
   ========================================================= */
const photoLightbox = document.getElementById('photoLightbox');
const photoLightboxImage = document.getElementById('photoLightboxImage');

if (photoLightbox && photoLightboxImage){
    let photoGroup = [];
    let photoIndex = 0;

    function showPhoto(){
        const img = photoGroup[photoIndex].querySelector('img');
        photoLightboxImage.src = img.currentSrc || img.src;
        photoLightboxImage.alt = img.alt;
    }
    function stepPhoto(delta){
        photoIndex = (photoIndex + delta + photoGroup.length) % photoGroup.length;
        showPhoto();
    }
    function closePhoto(){ photoLightbox.classList.remove('active'); }

    document.querySelectorAll('[data-zoom]').forEach(btn => {
        btn.addEventListener('click', () => {
            photoGroup = [...document.querySelectorAll(`[data-zoom="${btn.dataset.zoom}"]`)];
            photoIndex = photoGroup.indexOf(btn);
            showPhoto();
            photoLightbox.classList.add('active');
        });
    });
    document.getElementById('photoLightboxClose')?.addEventListener('click', closePhoto);
    document.getElementById('photoLightboxPrev')?.addEventListener('click', () => stepPhoto(-1));
    document.getElementById('photoLightboxNext')?.addEventListener('click', () => stepPhoto(1));
    photoLightbox.addEventListener('click', (e) => { if (e.target === photoLightbox) closePhoto(); });
    document.addEventListener('keydown', (e) => {
        if (!photoLightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closePhoto();
        if (e.key === 'ArrowLeft') stepPhoto(-1);
        if (e.key === 'ArrowRight') stepPhoto(1);
    });
}

/* =========================================================
   Video interviews — the small preview opens a big player with
   our own fullscreen button (works even if the embedded player's
   own fullscreen button is blocked)
   ========================================================= */
const videoLightbox = document.getElementById('videoLightbox');
const videoLightboxFrame = document.getElementById('videoLightboxFrame');
const videoLightboxFs = document.getElementById('videoLightboxFs');
const videoLightboxClose = document.getElementById('videoLightboxClose');

if (videoLightbox && videoLightboxFrame){
    function openVideo(src){
        let player;
        videoStage.style.removeProperty('--ar');
        if (/\.(mp4|webm|mov)(#|\?|$)/i.test(src)) {
            // our own video file: plain <video>, sized to its real proportions (phone videos are vertical)
            player = document.createElement('video');
            player.src = src;
            player.controls = true;
            player.autoplay = true;
            player.playsInline = true;
            player.addEventListener('loadedmetadata', () => {
                if (player.videoWidth && player.videoHeight) {
                    videoStage.style.setProperty('--ar', player.videoWidth / player.videoHeight);
                }
            });
        } else {
            player = document.createElement('iframe');
            player.src = src;
            player.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write; screen-wake-lock';
            player.allowFullscreen = true;
            player.title = 'Видео';
        }
        videoLightboxFrame.replaceChildren(player);
        videoLightbox.classList.add('active');
    }
    const videoStage = videoLightboxFrame.parentElement;

    // Fallback when the browser refuses real fullscreen (some embedded
    // browsers do): stretch the player over the whole window instead.
    function setExpanded(on){
        videoStage.classList.toggle('is-expanded', on);
        if (videoLightboxFs) videoLightboxFs.textContent = on ? 'Свернуть' : 'На весь экран';
    }

    function closeVideo(){
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        setExpanded(false);
        videoLightbox.classList.remove('active');
        // drop the iframe once faded out so playback actually stops
        setTimeout(() => {
            if (!videoLightbox.classList.contains('active')) videoLightboxFrame.replaceChildren();
        }, 350);
    }

    document.querySelectorAll('[data-video-src]').forEach(btn => {
        btn.addEventListener('click', () => openVideo(btn.dataset.videoSrc));
    });
    videoLightboxFs?.addEventListener('click', () => {
        if (videoStage.classList.contains('is-expanded')) { setExpanded(false); return; }
        const el = videoLightboxFrame;
        const request = el.requestFullscreen || el.webkitRequestFullscreen;
        if (!request) { setExpanded(true); return; }
        try {
            const result = request.call(el);
            if (result && result.catch) result.catch(() => setExpanded(true));
        } catch (err) {
            setExpanded(true);
        }
        // some browsers neither grant nor refuse — don't leave the visitor waiting
        setTimeout(() => {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) setExpanded(true);
        }, 500);
    });
    videoLightboxClose?.addEventListener('click', closeVideo);
    videoLightbox.addEventListener('click', (e) => { if (e.target === videoLightbox) closeVideo(); });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || !videoLightbox.classList.contains('active') || document.fullscreenElement) return;
        if (videoStage.classList.contains('is-expanded')) setExpanded(false);
        else closeVideo();
    });
}

/* =========================================================
   Projects data + split slider
   Each project's photos live in the site folder, e.g. projects/dom-1/.
   Fill one object per house:
   { area: "145 кв.м", dimensions: "11 х 13 м", location: "Нижний Новгород", date: "14.05.2024",
     imgBefore: "projects/dom-1/before.jpg", imgAfter: "projects/dom-1/after.jpg",
     gallery: ["projects/dom-1/1.jpg", "projects/dom-1/2.jpg"],
     description: "…" }
   ========================================================= */
const projectsData = [
    { title: "Дом на склоне в Михальчиково",
      area: "—", dimensions: "—", location: "Нижегородская область", date: "—",
      imgBefore: "projects/dom-4/render-1.jpg", imgAfter: "projects/dom-4/photo-1.jpg",
      gallery: ["projects/dom-4/photo-1.jpg", "projects/dom-4/photo-2.jpg", "projects/dom-4/photo-3.jpg",
                "projects/dom-4/render-1.jpg", "projects/dom-4/render-2.jpg",
                "projects/dom-4/render-3.jpg", "projects/dom-4/render-4.jpg"],
      description: `Заказчик долго искал своего проектировщика: когда он пришёл к нам, у него на руках было уже три проекта от разных архитекторов. Строить свой дом он решил именно по нашему проекту — и на фотографиях видно, что дом реализован.

Дом построен в Нижегородской области, в Михальчиково, на участке со склоном. Со стороны дороги он смотрится одноэтажным, а со стороны реки — двухэтажным.

Нижняя, цокольная часть выполнена из железобетона, верхняя — из газосиликатного блока. Дом получился по-настоящему интересным, со своим характером.` },
    { title: "Классика в Подмосковье",
      area: "—", dimensions: "—", location: "Московская область", date: "—",
      // before = the project render, after = the finished house
      imgBefore: "projects/dom-2/render-1.jpg", imgAfter: "projects/dom-2/photo-1.jpg",
      fitAfter: "contain",
      gallery: ["projects/dom-2/photo-1.jpg", "projects/dom-2/render-1.jpg", "projects/dom-2/render-2.jpg"],
      description: `Дом в классическом стиле. Мы захотели показать его вам, потому что с такими запросами к нам обращаются очень редко.

Сравните проект и уже построенный дом: даже если сыграть в игру «найди 10 отличий», вы практически не найдёте ни одного.

Дом очень «кудрявый», с арками — классика в чистом виде. Множество деталей сразу привлекает к себе внимание.

Дом построен в Московской области и спроектирован под запрос заказчиков — людей в возрасте, которым близка вся эта история с романтизмом: барокко, рококо… В итоге получился по-настоящему нарядный дом.` },
    { title: "Дом для тех, кто любит горы",
      area: "—", dimensions: "—", location: "Нижегородская область", date: "—",
      imgBefore: "projects/dom-3/render-1.jpg", imgAfter: "projects/dom-3/photo-1.jpg",
      gallery: ["projects/dom-3/photo-1.jpg", "projects/dom-3/photo-2.jpg", "projects/dom-3/photo-3.jpg",
                "projects/dom-3/photo-4.jpg", "projects/dom-3/render-1.jpg", "projects/dom-3/render-2.jpg"],
      description: `Заказчики — очень подвижные люди, которые любят ходить в горы. Им нужен был максимально уютный дом, но такой, чтобы на фасаде были натуральные материалы, напоминающие о любимых местах и горах.

Дом построен в ТИЗ «Надежда» Нижегородской области. Он максимально уютный, с простой и понятной планировкой. Внутреннюю отделку заказчики делали сами — и тем самым ещё больше прониклись своим домом и создали уют в своём гнёздышке.

Дом выполнен из газосиликатного блока, кровля — мягкая черепица. Фасад отделан штукатуркой и плиткой под натуральный камень.` },
    { title: "Хай-тек с консолью на Новопокровской",
      noTags: true,                      // оба кадра — виды проекта, подписи «до/после» тут не нужны
      area: "—", dimensions: "—", location: "Нижний Новгород", date: "—",
      imgBefore: "projects/dom-1/photo-1.jpg", imgAfter: "projects/dom-1/photo-2.jpg",
      gallery: ["projects/dom-1/photo-1.jpg", "projects/dom-1/photo-2.jpg",
                "projects/dom-1/photo-3.jpg", "projects/dom-1/photo-4.jpg",
                "projects/dom-1/photo-5.jpg", "projects/dom-1/photo-stroyka.jpg"],
      // paragraphs are separated by an empty line
      description: `Дом в современном стиле хай-тек в Нижнем Новгороде, на Новопокровской. Заказчик хотел построить дом не такой, как у всех, и доверил нам прежде всего не внешний вид, а конструктивные особенности.

Дом решён в двух объёмах: первый этаж сильно смещён относительно второго, и второй этаж выносится консолью длиной 3 метра. Это решение приняли исходя из общей площади дома и возможных конструктивных решений по выносу второго этажа.

Высота первого этажа — 4 метра, второго — 3,2 метра. Благодаря этому получились очень высокие окна и большое внутреннее пространство — ощущение свободы, лёгкости и «много места». Этого мы и добивались. Объёмно-планировочное и дизайнерское решения разрабатывались сразу вместе.

Несущие стены выполнены из силикатного кирпича, перекрытие и покрытие — монолитные. Фасад отделан керамогранитом, рейкой и кликфальцем — материалы прекрасно сочетаются друг с другом.

Особая история этого дома: заказчик строит дома премиум-класса на продажу. Сначала он сам живёт в доме, понимает, что удобно, а что нет, вносит коррективы — и только потом находит дому хозяина. Испробовать всё на себе, довести до совершенства и передать в другие руки.` },
    { title: "Дом с бассейном у Бурцево",
      area: "—", dimensions: "—", location: "Нижегородская область", date: "—",
      imgBefore: "projects/dom-5/render-1.jpg", imgAfter: "projects/dom-5/photo-1.jpg",
      fitBefore: "contain",
      gallery: ["projects/dom-5/photo-1.jpg", "projects/dom-5/photo-4.jpg", "projects/dom-5/photo-5.jpg",
                "projects/dom-5/photo-2.jpg", "projects/dom-5/photo-3.jpg", "projects/dom-5/render-1.jpg",
                "projects/dom-5/render-2.jpg", "projects/dom-5/render-3.jpg", "projects/dom-5/render-4.jpg"],
      description: `Дом построен в Нижегородской области, рядом с деревней Бурцево. Этот проект был очень интересным: заказчица прорабатывала его вместе с нами очень дотошно — до каждого миллиметра, замечая в проекте любые изменения.

Благодаря её щепетильности и нашему индивидуальному подходу к каждому заказчику дом приобрёл такой симпатичный вид.

В доме есть бассейн, спортивный зал и много других помещений, которых нет в домах со стандартным набором комнат.` },
    { title: "Дом, с которого началась улица",
      area: "—", dimensions: "—", location: "Нижегородская область", date: "—",
      imgBefore: "projects/dom-6/render-1.jpg", imgAfter: "projects/dom-6/photo-3.jpg",
      fitAfter: "contain", posAfter: "right center",
      gallery: ["projects/dom-6/photo-3.jpg", "projects/dom-6/photo-2.jpg",
                "projects/dom-6/photo-winter.jpg", "projects/dom-6/render-1.jpg",
                "projects/dom-6/render-2.jpg", "projects/dom-6/render-3.jpg"],
      description: `Дом построен в деревне Скипино Нижегородской области. Заказчик пришёл с запросом построить красивый дом в местности, которая только начинала застраиваться: вокруг — деревенька с простыми деревенскими домами.

После него к нам пришли все его друзья и соседи — это ещё пять проектов на соседних участках.

Благодарим за доверие всех, кто к нам приходит!` },
    { title: "Дом из нашего интервью",
      area: "—", dimensions: "—", location: "—", date: "—",
      imgBefore: "projects/dom-7/render-1.jpg", imgAfter: "projects/dom-7/photo-3.jpg",
      gallery: ["projects/dom-7/photo-1.jpg", "projects/dom-7/photo-2.jpg", "projects/dom-7/photo-3.jpg",
                "projects/dom-7/photo-4.jpg", "projects/dom-7/photo-5.jpg",
                "projects/dom-7/video-1.mp4", "projects/dom-7/video-2.mp4", "projects/dom-7/render-1.jpg"],
      description: `Об этом доме Юлия подробно рассказывает во втором видеоинтервью — как рождался проект и каким получился дом.`,
      link: { href: "about.html#interview", text: "Смотреть интервью" } },
    { title: "Высокий цоколь в Буревестнике",
      area: "—", dimensions: "—", location: "Буревестник", date: "—",
      imgBefore: "projects/dom-8/render-1.jpg", imgAfter: "projects/dom-8/photo-1.jpg",
      fitBefore: "contain", fitAfter: "contain",
      gallery: ["projects/dom-8/photo-1.jpg", "projects/dom-8/photo-2.jpg", "projects/dom-8/render-1.jpg",
                "projects/dom-8/render-2.jpg", "projects/dom-8/render-3.jpg",
                "projects/dom-8/render-4.jpg", "projects/dom-8/render-5.jpg"],
      description: `Этот дом мы показываем, чтобы было видно: мы проектируем и строим самые разные дома.

Основной запрос заказчицы звучал так: «Я никогда не жила в частном доме — всегда на высоких этажах. Поэтому мне важно, чтобы в окна я не видела проходящих мимо людей».

Поэтому в этом доме мы сделали высокий цоколь: 8 ступенек крыльца и ещё 900 мм от пола до окон. Даже самый высокий человек, проходящий мимо дома, не будет заметен.

Для нас важны не только комфорт и уют наших заказчиков, но и их спокойствие.` },
    { title: "Дом на две семьи в Новинках",
      area: "—", dimensions: "—", location: "Богородский район, п. Новинки", date: "—",
      imgBefore: "projects/dom-balakhna/render-1.jpg", imgAfter: "projects/dom-balakhna/photo-1.jpg",
      gallery: ["projects/dom-balakhna/photo-1.jpg", "projects/dom-balakhna/photo-2.jpg",
                "projects/dom-balakhna/render-1.jpg", "projects/dom-balakhna/render-2.jpg",
                "projects/dom-balakhna/render-3.jpg", "projects/dom-balakhna/render-4.jpg"],
      description: `Дом построен в посёлке Новинки Богородского района Нижегородской области. Изначально он задумывался с лёгким намёком на восточный стиль — об этом говорят входная группа, круглое окошко и арочные проёмы.

Главная история этого дома — он на две семьи: для мамы и семьи сына. У них совершенно разные предпочтения и разный вкус, но нам удалось объединить в одном доме пожелания каждого.

Дом строился на потенциально подтопляемой территории, поэтому стоит на возвышенности — её мы сделали специально на случай, если наша большая река Волга выйдет из берегов.` },
    { title: "Дом с плоской кровлей в «Надежде»",
      area: "—", dimensions: "—", location: "ТИЗ «Надежда»", date: "—",
      imgBefore: "projects/dom-nadezhda/render-1.jpg", imgAfter: "projects/dom-nadezhda/photo-1.jpg",
      fitAfter: "contain",
      gallery: ["projects/dom-nadezhda/photo-1.jpg", "projects/dom-nadezhda/photo-2.jpg",
                "projects/dom-nadezhda/render-1.jpg", "projects/dom-nadezhda/render-2.jpg"],
      description: `Один из первых домов в нашей истории. Заказчики пришли и сказали, что хотят дом с плоскими кровлями, — для того времени это было началом начал: до этого все хотели многоскатные и двускатные крыши. Поэтому для нас это был своего рода пробный вариант.

В итоге всё получилось так, как задумано. Особенно интересным вышел балкон — его хорошо видно и на фото, и на 3D-модели. Мы решили все задачи с водоотведением, участвовали в каждом этапе стройки и вели авторский надзор.

Заказчики вернулись к нам за проектом бани и привели с собой нескольких друзей — для них мы тоже выполнили интересные проекты.` },

    { title: "Дом с авторским надзором",
      area: "—", dimensions: "—", location: "ул. Вербная, Нижний Новгород", date: "—",
      imgBefore: "projects/verbnaya/render-1.jpg", imgAfter: "projects/verbnaya/photo-2.jpg",
      gallery: ["projects/verbnaya/render-1.jpg", "projects/verbnaya/render-2.jpg",
                "projects/verbnaya/render-3.jpg", "projects/verbnaya/plan-1.jpg",
                "projects/verbnaya/stroyka-1.jpg", "projects/verbnaya/stroyka-2.jpg",
                "projects/verbnaya/stroyka-3.jpg", "projects/verbnaya/stroyka-4.jpg",
                "projects/verbnaya/photo-2.jpg"],
      description: `Начали мы с фундамента и на данный момент завершаем… Нет, начали с проекта, потом вышли на стройплощадку, залили фундамент и не успели заметить, как в данный момент идут крайние работы по фасаду.

Итоговое фото впереди: стройка в разгаре.` },

    /* ---------- Реконструкции ---------- */
    { title: "Вторая жизнь дома с башней",
      category: "reconstruction",
      area: "—", dimensions: "—", location: "—", date: "—",
      imgBefore: "projects/rekon-1/before-4.jpg", imgAfter: "projects/rekon-1/after-3.jpg",
      gallery: ["projects/rekon-1/after-3.jpg", "projects/rekon-1/after-2.jpg", "projects/rekon-1/after-4.jpg",
                "projects/rekon-1/after-1.jpg", "projects/rekon-1/before-4.jpg", "projects/rekon-1/before-1.jpg",
                "projects/rekon-1/before-2.jpg", "projects/rekon-1/before-3.jpg"],
      description: `Реконструкция жилого дома: каким он был — и каким стал.` },
    { title: "Дом в фальцевом фасаде",
      area: "—", dimensions: "—", location: "—", date: "—",
      imgBefore: "projects/rekon-3/stage-1.jpg", imgAfter: "projects/rekon-3/stage-2.jpg",
      gallery: ["projects/rekon-3/stage-1.jpg", "projects/rekon-3/stage-2.jpg",
                "projects/rekon-3/stage-3.jpg", "projects/rekon-3/stage-4.jpg"],
      description: `Работа на объекте: кирпичные стены и стропильная система — и тот же дом уже в фальцевом фасаде.

Иногда в качестве заказчиков приходят профессионалы в смежных направлениях. В данном случае заказчицей выступала дизайнер Любовь Раковская. На основании её дизайн-проекта был реализован проект на конструкции такого великолепного двухэтажного шале.` },
    { title: "Дом из бревна",
      category: "wood", noTags: true,
      area: "—", dimensions: "—", location: "—", date: "—",
      imgBefore: "projects/rekon-5/stage-1.jpg", imgAfter: "projects/rekon-5/stage-2.jpg",
      gallery: ["projects/rekon-5/stage-1.jpg", "projects/rekon-5/stage-2.jpg",
                "projects/rekon-5/stage-3.jpg", "projects/rekon-5/stage-4.jpg",
                "projects/rekon-5/stage-5.jpg"],
      description: `Работа на объекте: дом из бревна. Мы работаем и с живым материалом — рубленый сруб требует своих решений и своего отношения.` },
    { title: "Реконструкция",
      category: "reconstruction", noTags: true,
      area: "—", dimensions: "—", location: "—", date: "—",
      // the main material here is the video itself
      video: "projects/rekon-6/video-1.mp4",
      // frames taken from the video — the object has no separate photos
      imgBefore: "projects/rekon-6/frame-1.jpg", imgAfter: "projects/rekon-6/frame-2.jpg",
      fitBefore: "contain", fitAfter: "contain", posBefore: "22% center", posAfter: "78% center",
      gallery: ["projects/rekon-6/video-1.mp4", "projects/rekon-6/frame-1.jpg", "projects/rekon-6/frame-2.jpg",
                "projects/rekon-2/render-1.jpg", "projects/rekon-2/render-2.jpg",
                "projects/rekon-2/before-1.jpg", "projects/rekon-2/before-2.jpg"],
      description: `Реконструкция помещений, усиление перекрытий. Здесь же — проект реконструкции жилого дома с эркером: каким дом был и каким он станет.

Дом не обязательно строить с нуля. Можно перепланировать помещения, усилить перекрытия, надстроить этаж или пристроить новый объём, поменять фасад — и получить другой дом на том же месте. С такими задачами тоже приходите к нам.` },



    /* ---------- Промышленные здания ---------- */
    { title: "Промышленный комплекс",
      category: "industrial", noTags: true,
      area: "—", dimensions: "—", location: "—", date: "—",
      imgBefore: "projects/prom-1/photo-3.jpg", imgAfter: "projects/prom-1/photo-2.jpg",
      gallery: ["projects/prom-1/photo-3.jpg", "projects/prom-1/photo-2.jpg",
                "projects/prom-1/photo-1.jpg", "projects/prom-1/photo-4.jpg"],
      description: `Мы проектируем не только частные дома — промышленными зданиями мы тоже занимаемся.` },

    { title: "А что ещё мы делали",
      category: "other", noTags: true, galleryOnly: true,
      area: "—", dimensions: "—", location: "—", date: "—",
      imgBefore: "projects/more/render-34.jpg", imgAfter: "projects/more/render-34.jpg",
      gallery: ["projects/more/render-41.jpg", "projects/more/render-42.jpg", "projects/more/render-34.jpg", "projects/more/render-35.jpg", "projects/more/render-36.jpg", "projects/more/render-37.jpg", "projects/more/render-38.jpg", "projects/more/render-39.jpg", "projects/more/render-40.jpg",
                "projects/more/render-01.jpg", "projects/more/render-02.jpg",
                "projects/more/render-03.jpg", "projects/more/render-04.jpg",
                "projects/more/render-05.jpg", "projects/more/render-06.jpg", "projects/more/render-08.jpg",
                "projects/more/render-09.jpg", "projects/more/render-10.jpg",
                "projects/more/render-11.jpg", "projects/more/render-12.jpg",
                "projects/more/render-13.jpg", "projects/more/render-14.jpg",
                "projects/more/render-15.jpg", "projects/more/render-16.jpg", "projects/more/render-18.jpg",
                "projects/more/render-19.jpg", "projects/more/render-20.jpg",
                "projects/more/render-21.jpg", "projects/more/render-22.jpg",
                "projects/more/render-23.jpg", "projects/more/render-24.jpg",
                "projects/more/render-25.jpg", "projects/more/render-26.jpg",
                "projects/more/render-27.jpg", "projects/more/render-28.jpg",
                "projects/more/render-29.jpg", "projects/more/render-30.jpg",
                "projects/more/render-31.jpg", "projects/more/render-32.jpg",
                "projects/more/render-33.jpg"],
      description: `По каждому из этих домов мы могли бы сделать отдельную страницу с «до» и «после». Но оставляем карусель — чтобы не утомлять вас рассказами.` }
];

let currentProjectIndex = 0;
const dotsContainer = document.getElementById('dotsContainer');

if (dotsContainer && !projectsData.length) {
    document.querySelector('.projects-page')?.classList.add('is-empty');
} else if (dotsContainer) {
    const bgBefore = document.getElementById('bgBefore');
    const bgAfter = document.getElementById('bgAfter');
    const valArea = document.getElementById('valArea');
    const valDimensions = document.getElementById('valDimensions');
    const valLocation = document.getElementById('valLocation');
    const valDate = document.getElementById('valDate');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const detailsOverlay = document.querySelector('.project-details-overlay');
    const gallerySection = document.querySelector('.project-gallery-section');
    const galleryRow = document.getElementById('galleryRow');
    const galleryDescription = document.getElementById('galleryDescription');

    function renderGallery(project) {
        if (!galleryRow) return;
        galleryRow.innerHTML = '';
        project.gallery.forEach((photoSrc, i) => {
            const thumb = document.createElement('div');
            thumb.className = 'gallery-thumb img-reveal';
            thumb.style.animationDelay = (i * 0.08) + 's';
            if (isVideoSrc(photoSrc)) {
                thumb.classList.add('gallery-thumb-video');
                const video = document.createElement('video');
                video.src = photoSrc + '#t=0.5';
                video.muted = true;
                video.playsInline = true;
                video.preload = 'metadata';
                const play = document.createElement('span');
                play.className = 'video-play';
                thumb.append(video, play);
            } else {
                const img = document.createElement('img');
                img.src = photoSrc;
                img.alt = `${project.title || 'Проект Julamore'} — фото ${i + 1}`;
                img.loading = 'lazy';
                thumb.appendChild(img);
            }
            thumb.addEventListener('click', () => openLightbox(project.gallery, i));
            galleryRow.appendChild(thumb);
        });
        if (galleryDescription) {
            galleryDescription.replaceChildren(...project.description.split(/\n\s*\n/).map(text => {
                const para = document.createElement('p');
                para.textContent = text.trim();
                return para;
            }));
            if (project.link) {
                const a = document.createElement('a');
                a.className = 'gallery-link';
                a.href = project.link.href;
                a.textContent = project.link.text;
                galleryDescription.appendChild(a);
            }
        }
    }

    // two collections share one slider: new houses and reconstructions (category: "reconstruction")
    const sliderWrapper = document.querySelector('.split-slider-wrapper');
    let activeList = [];

    function updateProject(index) {
        currentProjectIndex = index;
        const project = activeList[index];
        sliderWrapper?.classList.toggle('no-tags', !!project.noTags);

        [detailsOverlay, gallerySection].forEach(el => { if (el) el.style.opacity = 0; });

        bgBefore.style.backgroundImage = `url('${project.imgBefore}')`;
        bgAfter.style.backgroundImage = `url('${project.imgAfter}')`;
        // optional per-photo framing, e.g. posAfter: "left center" when the house sits left in the shot
        bgBefore.style.backgroundPosition = project.posBefore || '';
        bgAfter.style.backgroundPosition = project.posAfter || '';
        // small photos: show whole (not stretched) over a blurred copy of themselves
        [[bgBefore, project.imgBefore, project.fitBefore], [bgAfter, project.imgAfter, project.fitAfter]].forEach(([el, src, fit]) => {
            el.classList.toggle('photo-bg-contain', fit === 'contain');
            el.style.setProperty('--img', `url('${src}')`);
            el.style.setProperty('--pos', el === bgBefore ? (project.posBefore || 'center') : (project.posAfter || 'center'));
        });

        document.querySelectorAll('.dot').forEach((dot, idx) => {
            dot.classList.toggle('active', idx === index);
        });

        setTimeout(() => {
            valArea.textContent = project.area;
            valDimensions.textContent = project.dimensions;
            valLocation.textContent = project.location;
            valDate.textContent = project.date;
            renderGallery(project);
            [detailsOverlay, gallerySection].forEach(el => { if (el) el.style.opacity = 1; });
        }, 180);
    }

    function showCategory(category) {
        activeList = projectsData.filter(p => (p.category || 'new') === category);
        document.querySelectorAll('.projects-tab').forEach(tab => {
            const on = tab.dataset.category === category;
            tab.classList.toggle('active', on);
            tab.setAttribute('aria-selected', String(on));
        });
        dotsContainer.innerHTML = '';
        activeList.forEach((_, idx) => {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            dot.textContent = idx + 1;
            dot.addEventListener('click', () => updateProject(idx));
            dotsContainer.appendChild(dot);
        });
        const empty = !activeList.length;
        sliderWrapper?.classList.toggle('is-category-empty', empty);
        if (gallerySection) gallerySection.hidden = empty;
        if (!empty) updateProject(0);
    }

    document.querySelectorAll('.projects-tab').forEach(tab => {
        tab.addEventListener('click', () => showCategory(tab.dataset.category));
    });

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            let index = currentProjectIndex - 1;
            if (index < 0) index = activeList.length - 1;
            updateProject(index);
        });
        nextBtn.addEventListener('click', () => {
            let index = currentProjectIndex + 1;
            if (index >= activeList.length) index = 0;
            updateProject(index);
        });
    }

    document.addEventListener('keydown', (e) => {
        if (lightbox?.classList.contains('active') || !activeList.length) return;
        if (e.key === 'ArrowLeft') prevBtn?.click();
        if (e.key === 'ArrowRight') nextBtn?.click();
    });

    const hashCategory = location.hash.slice(1);
    showCategory(['reconstruction', 'industrial'].includes(hashCategory) ? hashCategory : 'new');
}

/* =========================================================
   Project gallery lightbox
   ========================================================= */
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
let lightboxGallery = [];
let lightboxIndex = 0;

function isVideoSrc(src){ return /\.(mp4|webm|mov)$/i.test(src); }
let lightboxVideo = null;
function showLightboxImage() {
    const src = lightboxGallery[lightboxIndex];
    lightboxVideo?.remove();
    lightboxVideo = null;
    if (isVideoSrc(src)) {
        lightboxVideo = document.createElement('video');
        lightboxVideo.className = 'lightbox-image lightbox-video';
        lightboxVideo.src = src;
        lightboxVideo.controls = true;
        lightboxVideo.autoplay = true;
        lightboxVideo.playsInline = true;
        lightboxImage?.after(lightboxVideo);
        if (lightboxImage) lightboxImage.hidden = true;
    } else if (lightboxImage) {
        lightboxImage.hidden = false;
        lightboxImage.src = src;
    }
}
function openLightbox(gallery, index) {
    // a single photo or video needs no arrows
    [lightboxPrev, lightboxNext].forEach(btn => { if (btn) btn.hidden = gallery.length < 2; });
    lightboxGallery = gallery;
    lightboxIndex = index;
    showLightboxImage();
    lightbox?.classList.add('active');
}
function closeLightbox() {
    lightbox?.classList.remove('active');
    lightboxVideo?.pause();
}
lightboxClose?.addEventListener('click', closeLightbox);
// "how a project looks" video: small preview, big player on click
document.querySelectorAll('[data-album]').forEach(btn => {
    btn.addEventListener('click', () => openLightbox([btn.dataset.album], 0));
});
lightbox?.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
lightboxPrev?.addEventListener('click', () => {
    lightboxIndex = (lightboxIndex - 1 + lightboxGallery.length) % lightboxGallery.length;
    showLightboxImage();
});
lightboxNext?.addEventListener('click', () => {
    lightboxIndex = (lightboxIndex + 1) % lightboxGallery.length;
    showLightboxImage();
});
document.addEventListener('keydown', (e) => {
    if (!lightbox?.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lightboxPrev?.click();
    if (e.key === 'ArrowRight') lightboxNext?.click();
});

/* =========================================================
   Lead form + modal
   ========================================================= */
const modal = document.getElementById('contactModal');
const closeModalBtn = document.getElementById('closeModal');
const openModalHeader = document.getElementById('openModalHeader');
const openModalHero = document.getElementById('openModalHero');
const openModalAbout = document.getElementById('openModalAbout');
const openModalFooter = document.getElementById('openModalFooter');
const openModalFloat = document.getElementById('openModalFloat');

function openModal(e) {
    e.preventDefault();
    window.__leadFormShown = Date.now();   // чтобы отличить человека от бота по скорости заполнения
    if (modal) modal.classList.add('active');
}
function closeModal() {
    if (modal) modal.classList.remove('active');
}

[openModalHeader, openModalHero, openModalAbout, openModalFooter, openModalFloat, ...document.querySelectorAll('[data-open-modal]')].forEach(btn => {
    if (btn) btn.addEventListener('click', openModal);
});

if (openModalFloat) {
    function updateFloatCta(){
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const threshold = Math.min(300, Math.max(maxScroll * 0.3, 1));
        openModalFloat.classList.toggle('is-visible', window.scrollY > threshold);
    }
    window.addEventListener('scroll', updateFloatCta, { passive: true });
    window.addEventListener('resize', updateFloatCta);
    updateFloatCta();
}
if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

const leadForm = document.getElementById('leadForm');

if (leadForm) {
    leadForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        const descriptionField = document.getElementById('projectDescription');
        const description = descriptionField ? (descriptionField.value || 'Не указано') : 'Не указано';
        const consentBox = document.getElementById('leadConsent');
        if (consentBox && !consentBox.checked) {
            alert('Пожалуйста, подтвердите согласие на обработку персональных данных.');
            return;
        }

        // block double clicks while the lead is on its way
        const submitBtn = leadForm.querySelector('button[type="submit"]');
        if (submitBtn?.disabled) return;
        const submitText = submitBtn?.textContent;
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Отправляем…'; }

        const trap = document.getElementById('leadWebsite');
        const lead = {
            firstName, lastName, phone, email, description,
            website: trap ? trap.value : '',                  // ловушка: люди её не видят
            elapsed: Date.now() - (window.__leadFormShown || 0),
            consent: !!consentBox?.checked,       // what the visitor agreed to, for our records
            consentText: consentBox ? consentBox.closest('.form-consent')?.innerText.trim() : '',
            page: location.pathname
        };

        // На GitHub Pages сервера нет: заявка сохраняется в этом же браузере,
        // чтобы её можно было показать на странице /leads.html. На своём сервере
        // этот код не работает — заявка уходит как обычно.
        const send = window.JULAMORE_DEMO
            ? Promise.resolve().then(() => {
                const key = 'julamore-demo-leads';
                let saved = [];
                try { saved = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
                saved.push({ time: new Date().toISOString(), demo: true, ...lead });
                try { localStorage.setItem(key, JSON.stringify(saved.slice(-200))); } catch {}
                return { ok: true, json: () => Promise.resolve({ ok: true, demo: true }) };
            })
            : fetch('/api/send-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lead)
            });

        send
        .then(response => {
            if (!response.ok) throw new Error('Ошибка отправки заявки');
            return response.json();
        })
        .then(data => {
            console.log('Успешно отправлено:', data);
            const fieldsBlock = document.getElementById('formFields');
            const successBlock = document.getElementById('successMessage');
            if (fieldsBlock) fieldsBlock.style.display = 'none';
            if (successBlock) successBlock.style.display = 'block';

            setTimeout(() => {
                closeModal();
                if (fieldsBlock) fieldsBlock.style.display = 'block';
                if (successBlock) successBlock.style.display = 'none';
                leadForm.reset();
            }, 4000);
        })
        .catch(error => {
            console.error(error);
            alert('Произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже.');
        })
        .finally(() => {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitText; }
        });
    });
}
