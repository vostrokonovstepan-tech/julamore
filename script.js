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
document.querySelectorAll('.section-heading, .about-hero h1').forEach(splitIntoWords);

const revealItems = document.querySelectorAll('.reveal, .text-split');
if (revealItems.length){
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting){
                entry.target.classList.add('is-visible');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    revealItems.forEach(el => io.observe(el));
}

/* =========================================================
   Projects data + split slider
   ========================================================= */
function unsplashUrl(id, width) {
    return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;
}

const galleryPool = [
    "1600585154340-be6161a56a0c", "1600596542815-ffad4c1539a9", "1600607687939-ce8a6c25118c",
    "1600566753376-12c8ab7fb75b", "1613490493576-7fde63acd811", "1512917774080-9991f1c4c750",
    "1600573472591-ee6b68d14c68", "1600210492486-724fe5c67fb0", "1580587771525-78b9dba3b914",
    "1542314831-068cd1dbfeeb", "1513694203232-719a280e022f", "1486406146926-c627a92ad1ab",
    "1497366216548-37526070297c", "1497366811353-6870744d04b2", "1504297050568-910d24c426d3",
    "1512915922686-57c11dde9b6b"
];
function galleryFor(offset) {
    return Array.from({ length: 5 }, (_, i) => galleryPool[(offset + i) % galleryPool.length]);
}

const projectsData = [
    { area: "145 кв.м", dimensions: "11 х 13 м", location: "Подмосковье", date: "14.05.2024",
      imgBefore: unsplashUrl("1600585154340-be6161a56a0c", 1000), imgAfter: unsplashUrl("1600596542815-ffad4c1539a9", 1000),
      gallery: galleryFor(0),
      description: "Двухэтажный дом на лесном участке под Москвой: тёмный вентилируемый фасад, панорамное остекление гостиной и терраса, вписанная между соснами без единой вырубки." },
    { area: "280 кв.м", dimensions: "16 х 18 м", location: "Сочи", date: "22.09.2024",
      imgBefore: unsplashUrl("1600607687939-ce8a6c25118c", 1000), imgAfter: unsplashUrl("1600566753376-12c8ab7fb75b", 1000),
      gallery: galleryFor(3),
      description: "Вилла на склоне с видом на море: светлый известняк, три уровня террас и бассейн, спускающийся к нижней границе участка." },
    { area: "190 кв.м", dimensions: "12 х 15 м", location: "Ленобласть", date: "05.11.2024",
      imgBefore: unsplashUrl("1613490493576-7fde63acd811", 1000), imgAfter: unsplashUrl("1512917774080-9991f1c4c750", 1000),
      gallery: galleryFor(6),
      description: "Семейный дом у озера: деревянный фасад, большие окна в сторону воды и открытая планировка первого этажа для четырёх поколений семьи." },
    { area: "320 кв.м", dimensions: "21 х 17 м", location: "Казань", date: "18.01.2025",
      imgBefore: unsplashUrl("1600573472591-ee6b68d14c68", 1000), imgAfter: unsplashUrl("1600210492486-724fe5c67fb0", 1000),
      gallery: galleryFor(9),
      description: "Дом для большой семьи с двумя жилыми крыльями вокруг внутреннего двора — отдельный вход и терраса для старшего поколения." },
    { area: "98 кв.м", dimensions: "8 х 11 м", location: "Тверь", date: "30.04.2025",
      imgBefore: unsplashUrl("1580587771525-78b9dba3b914", 1000), imgAfter: unsplashUrl("1542314831-068cd1dbfeeb", 1000),
      gallery: galleryFor(12),
      description: "Компактный дом для молодой семьи с продуманной до сантиметра планировкой — каждый квадратный метр работает на бюджет и на комфорт." },
    { area: "450 кв.м", dimensions: "24 х 22 м", location: "Екатеринбург", date: "12.07.2025",
      imgBefore: unsplashUrl("1513694203232-719a280e022f", 1000), imgAfter: unsplashUrl("1486406146926-c627a92ad1ab", 1000),
      gallery: galleryFor(15),
      description: "Загородная резиденция со спа-зоной, гостевым флигелем и гаражом на четыре машины — проект с расчётом на приём больших компаний." },
    { area: "165 кв.м", dimensions: "11 х 14 м", location: "Новосибирск", date: "02.10.2025",
      imgBefore: unsplashUrl("1497366216548-37526070297c", 1000), imgAfter: unsplashUrl("1497366811353-6870744d04b2", 1000),
      gallery: galleryFor(2),
      description: "Дом, спроектированный под суровую сибирскую зиму: усиленное утепление, тёплый тамбур и тёплые натуральные материалы внутри." },
    { area: "215 кв.м", dimensions: "13 х 16 м", location: "Краснодар", date: "15.12.2025",
      imgBefore: unsplashUrl("1504297050568-910d24c426d3", 1000), imgAfter: unsplashUrl("1486406146926-c627a92ad1ab", 1000),
      gallery: galleryFor(5),
      description: "Южный дом с крытой террасой во весь фасад и кухней, развёрнутой к саду — планировка под тёплый климат и жизнь на улице." },
    { area: "260 кв.м", dimensions: "15 х 15 м", location: "Владивосток", date: "26.03.2026",
      imgBefore: unsplashUrl("1512915922686-57c11dde9b6b", 1000), imgAfter: unsplashUrl("1512917774080-9991f1c4c750", 1000),
      gallery: galleryFor(8),
      description: "Дом на склоне сопки в несколько уровней: каждая терраса открывает свой вид на бухту, а гараж встроен в цокольный этаж." },
    { area: "520 кв.м", dimensions: "26 х 25 м", location: "Алтай", date: "11.06.2026",
      imgBefore: unsplashUrl("1600585154340-be6161a56a0c", 1000), imgAfter: unsplashUrl("1600596542815-ffad4c1539a9", 1000),
      gallery: galleryFor(11),
      description: "Горная резиденция из камня и клеёного бруса с панорамными окнами на хребет — дом, который проектировался вокруг вида, а не наоборот." }
];

let currentProjectIndex = 0;
const dotsContainer = document.getElementById('dotsContainer');

if (dotsContainer) {
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

    const thumbObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting){
                entry.target.classList.add('is-visible');
                thumbObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    function renderGallery(project) {
        if (!galleryRow) return;
        galleryRow.innerHTML = '';
        project.gallery.forEach((photoId, i) => {
            const thumb = document.createElement('div');
            thumb.className = 'gallery-thumb img-reveal';
            thumb.style.transitionDelay = (i * 0.08) + 's';
            const img = document.createElement('img');
            img.src = unsplashUrl(photoId, 500);
            img.alt = `Фото проекта — ${project.location}, ${i + 1}`;
            img.loading = 'lazy';
            thumb.appendChild(img);
            thumb.addEventListener('click', () => openLightbox(project.gallery, i));
            galleryRow.appendChild(thumb);
            thumbObserver.observe(thumb);
        });
        if (galleryDescription) galleryDescription.textContent = project.description;
    }

    function updateProject(index) {
        currentProjectIndex = index;
        const project = projectsData[index];

        [detailsOverlay, gallerySection].forEach(el => { if (el) el.style.opacity = 0; });

        bgBefore.style.backgroundImage = `url('${project.imgBefore}')`;
        bgAfter.style.backgroundImage = `url('${project.imgAfter}')`;

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

    projectsData.forEach((_, idx) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        dot.textContent = idx + 1;
        dot.addEventListener('click', () => updateProject(idx));
        dotsContainer.appendChild(dot);
    });

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            let index = currentProjectIndex - 1;
            if (index < 0) index = projectsData.length - 1;
            updateProject(index);
        });
        nextBtn.addEventListener('click', () => {
            let index = currentProjectIndex + 1;
            if (index >= projectsData.length) index = 0;
            updateProject(index);
        });
    }

    document.addEventListener('keydown', (e) => {
        if (lightbox?.classList.contains('active')) return;
        if (e.key === 'ArrowLeft') prevBtn?.click();
        if (e.key === 'ArrowRight') nextBtn?.click();
    });

    updateProject(0);
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

function showLightboxImage() {
    if (lightboxImage) lightboxImage.src = unsplashUrl(lightboxGallery[lightboxIndex], 1600);
}
function openLightbox(gallery, index) {
    lightboxGallery = gallery;
    lightboxIndex = index;
    showLightboxImage();
    lightbox?.classList.add('active');
}
function closeLightbox() {
    lightbox?.classList.remove('active');
}
lightboxClose?.addEventListener('click', closeLightbox);
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
    if (modal) modal.classList.add('active');
}
function closeModal() {
    if (modal) modal.classList.remove('active');
}

[openModalHeader, openModalHero, openModalAbout, openModalFooter, openModalFloat].forEach(btn => {
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

        fetch('/api/send-lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, phone, email, description })
        })
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
        });
    });
}
