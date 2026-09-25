function formatWhatsappMarkdown(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*(.+?)\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/~(.+?)~/g, '<s>$1</s>');
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.innerHTML = formatWhatsappMarkdown(value);
}

function setHref(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.href = value;
}

function setList(id, items) {
  const el = document.getElementById(id);
  if (!el || !Array.isArray(items) || items.length === 0) return;
  el.innerHTML = items
    .map((item) => `<li>${formatWhatsappMarkdown(item)}</li>`)
    .join('');
}

function setChips(id, items) {
  const el = document.getElementById(id);
  if (!el || !Array.isArray(items) || items.length === 0) return;
  el.innerHTML = items
    .map((item) => `<span class="chip">${formatWhatsappMarkdown(item)}</span>`)
    .join('');
}

function formatEventDate(iso) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

function loadEvent(event) {
  if (!event || !event.dateStart) return;

  const lastDay = new Date(`${event.dateEnd || event.dateStart}T23:59:59`);
  if (Number.isNaN(lastDay.getTime()) || Date.now() > lastDay.getTime()) return;

  setText('event-title', event.title);
  setText('event-theme', event.theme);

  const intro = document.getElementById('event-intro');
  setText('event-intro', event.intro);
  intro.hidden = !event.intro;
  setHref('event-nearest-link', event.nearestEventLink);

  const desc = document.getElementById('event-description');
  desc.textContent = event.description || '';
  desc.hidden = !event.description;

  const map = document.getElementById('event-map');
  if (event.mapEmbed) {
    map.src = event.mapEmbed;
    map.hidden = false;
  }

  const time = event.startTime
    ? `${formatEventDate(event.dateStart)}, ore ${event.startTime}`
    : '';
  [['address', event.address], ['time', time]].forEach(([id, text]) => {
    setText(`event-${id}`, text);
    document.getElementById(`event-${id}-row`).hidden = !text;
  });
  document.getElementById('event-info').hidden = !(event.address || time);

  const articleLink = document.getElementById('event-article-link');
  const linksRow = document.getElementById('event-links');
  if (event.articleLink) {
    articleLink.hidden = false;
    articleLink.href = event.articleLink;
    if (linksRow) linksRow.style.gridTemplateColumns = '';
  } else {
    articleLink.hidden = true;
    if (linksRow) linksRow.style.gridTemplateColumns = '1fr';
  }

  const startLabel = formatEventDate(event.dateStart);
  const endLabel = event.dateEnd && event.dateEnd !== event.dateStart ? formatEventDate(event.dateEnd) : '';
  setText('event-date', endLabel ? `${startLabel} – ${endLabel}` : startLabel);

  const eventCard = document.getElementById('event-card');
  eventCard.hidden = false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(`${event.dateStart}T00:00:00`);
  const daysUntilStart = Math.round((startDate - today) / 86400000);

  if (daysUntilStart <= 7) {
    const studyCard = document.getElementById('study-card');
    if (studyCard && studyCard.parentNode) {
      studyCard.parentNode.insertBefore(eventCard, studyCard);
    }
  }
}

function loadContacts(contacts) {
  const { showTopContacts = true, whatsappNumber, telegramUsername, phoneNumber, phoneDisplay, email } = contacts || {};
  const telegram = (telegramUsername || '').trim().replace(/^@/, '');

  const buttons = [
    { id: 'whatsapp-link', href: whatsappNumber && `https://wa.me/${whatsappNumber}` },
    { id: 'telegram-link', href: telegram && `https://t.me/${telegram}` },
    { id: 'phone-link', href: phoneNumber && `tel:${phoneNumber}`, textId: 'phone-text', text: phoneDisplay || phoneNumber },
    { id: 'email-link', href: email && `mailto:${email}`, textId: 'email-text', text: email },
  ];

  const hasAny = buttons.some((btn) => btn.href);
  document.getElementById('contatti').hidden = !hasAny || !showTopContacts;
  document.getElementById('contact-inline').hidden = !hasAny;

  ['', '-alt'].forEach((suffix) => {
    buttons.forEach(({ id, href, textId, text }) => {
      const el = document.getElementById(id + suffix);
      if (!el) return;
      el.hidden = !href;
      if (!href) return;
      el.href = href;
      if (textId) setText(textId + suffix, text);
    });
  });
}

function loadContent() {
  const data = window.SITE_DATA;
  if (!data) {
    console.warn('data.js non trovato: uso i contenuti di default nell\'HTML.');
    return;
  }

  try {
    setText('hero-name', data.name);
    setText('hero-subtitle', data.heroSubtitle);

    if (data.offer) {
      setText('offer-title', data.offer.title);
      setText('offer-description', data.offer.description);
      setText('offer-subtitle', data.offer.subtitle);
      setText('offer-advice-intro', data.offer.adviceIntro);
      setChips('offer-advice-list', data.offer.adviceTopics);
      setText('offer-questions-intro', data.offer.questionsIntro);
      setList('offer-questions-list', data.offer.questions);
    }

    loadEvent(data.event);

    if (data.video) {
      setText('video-cta-text', data.video.text);
      setHref('video-cta', data.video.link);
    }

    if (data.resource) {
      setText('resource-title', data.resource.title);
      setText('resource-subtitle', data.resource.subtitle);
      setHref('resource-card', data.resource.link);
    }

    loadContacts(data.contacts);
  } catch (err) {
    console.warn('Errore durante l\'applicazione di data.js, uso i contenuti di default.', err);
  }
}

function initAnimations() {
  const targets = Array.from(document.querySelectorAll('[data-animate]'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('in-view'));
    return;
  }

  targets.forEach((el, index) => {
    el.style.animationDelay = `${index * 90}ms`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach((el) => observer.observe(el));
}

loadContent();
initAnimations();
