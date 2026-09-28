/* =========================================================
   HajjCall.com — Core Site Interactions
========================================================= */

/* Formspree endpoint that receives the contact + quote form submissions.
   Change this one line if the Formspree form ID ever changes.
   Dashboard: https://formspree.io/forms  */
var FORMSPREE_ENDPOINT = 'https://formspree.io/f/moeqvovj';

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- Preloader ---------- */
  var preloader = document.getElementById('preloader');
  if (preloader) {
    window.addEventListener('load', function () {
      setTimeout(function () { preloader.classList.add('hide'); }, 300);
    });
    setTimeout(function () { preloader.classList.add('hide'); }, 2000);
  }

  /* ---------- Navbar scroll state ---------- */
  var navbar = document.querySelector('.navbar');
  function onScroll() {
    if (!navbar) return;
    if (window.scrollY > 30) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');

    var backTop = document.querySelector('.back-to-top');
    if (backTop) {
      if (window.scrollY > 500) backTop.classList.add('show');
      else backTop.classList.remove('show');
    }
  }
  window.addEventListener('scroll', onScroll);
  onScroll();

  /* ---------- Mobile nav toggle ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      toggle.classList.toggle('open');
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        toggle.classList.remove('open');
        links.classList.remove('open');
      });
    });
  }

  /* ---------- Back to top ---------- */
  var backTop = document.querySelector('.back-to-top');
  if (backTop) {
    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Scroll Reveal ---------- */
  var revealEls = document.querySelectorAll('.reveal, .reveal-zoom, .reveal-left, .reveal-right');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Animated Counters ---------- */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var counted = new WeakSet();
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !counted.has(entry.target)) {
          counted.add(entry.target);
          var el = entry.target;
          var target = parseInt(el.getAttribute('data-count'), 10) || 0;
          var suffix = el.getAttribute('data-suffix') || '';
          var duration = 1600;
          var start = null;
          function step(ts) {
            if (!start) start = ts;
            var progress = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(step);
            else el.textContent = target.toLocaleString() + suffix;
          }
          requestAnimationFrame(step);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- 3D Tilt Cards ---------- */
  document.querySelectorAll('.tilt').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var cx = rect.width / 2, cy = rect.height / 2;
      var rotateX = ((y - cy) / cy) * -6;
      var rotateY = ((x - cx) / cx) * 6;
      card.style.transform = 'perspective(900px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-6px)';
    });
    card.addEventListener('mouseleave', function () {
      card.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateY(0)';
    });
  });

  /* ---------- FAQ Accordion ---------- */
  document.querySelectorAll('.accordion-item').forEach(function (item) {
    var head = item.querySelector('.accordion-head');
    var body = item.querySelector('.accordion-body');
    if (!head || !body) return;
    head.addEventListener('click', function () {
      var isActive = item.classList.contains('active');
      item.closest('.accordion')?.querySelectorAll('.accordion-item').forEach(function (i) {
        i.classList.remove('active');
        var b = i.querySelector('.accordion-body');
        if (b) b.style.maxHeight = null;
      });
      if (!isActive) {
        item.classList.add('active');
        body.style.maxHeight = body.scrollHeight + 40 + 'px';
      }
    });
  });

  /* ---------- Testimonial Slider (simple auto-scroll dots) ---------- */
  var slider = document.querySelector('.testi-slider');
  if (slider) {
    var track = slider.querySelector('.testi-track');
    var slides = slider.querySelectorAll('.testi-slide');
    var dotsWrap = slider.querySelector('.testi-dots');
    var idx = 0;
    if (dotsWrap && slides.length) {
      slides.forEach(function (_, i) {
        var d = document.createElement('button');
        if (i === 0) d.classList.add('active');
        d.addEventListener('click', function () { goTo(i); });
        dotsWrap.appendChild(d);
      });
    }
    function goTo(i) {
      idx = i;
      if (track) track.style.transform = 'translateX(-' + (i * 100) + '%)';
      if (dotsWrap) {
        dotsWrap.querySelectorAll('button').forEach(function (b, bi) {
          b.classList.toggle('active', bi === i);
        });
      }
    }
    var auto = setInterval(function () {
      idx = (idx + 1) % slides.length;
      goTo(idx);
    }, 5000);
    slider.addEventListener('mouseenter', function () { clearInterval(auto); });
  }

  /* ---------- Gallery Lightbox ---------- */
  var lightbox = document.getElementById('lightbox');
  if (lightbox) {
    var lightboxImg = lightbox.querySelector('img');
    document.querySelectorAll('.gallery-item img').forEach(function (img) {
      img.addEventListener('click', function () {
        lightboxImg.src = img.src;
        lightbox.classList.add('open');
      });
    });
    lightbox.addEventListener('click', function () {
      lightbox.classList.remove('open');
    });
  }

  /* ---------- Newsletter form → Formspree ---------- */
  document.querySelectorAll('.newsletter-box').forEach(function (nb) {
    nb.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = nb.querySelector('input');
      if (!input || !input.value) return;

      var data = new FormData();
      data.append('email', input.value);
      data.append('_subject', 'Newsletter signup — HajjCall.com');
      data.append('form', 'Newsletter subscription');

      var btn = nb.querySelector('button');
      if (btn) { btn.disabled = true; btn.textContent = '…'; }

      fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      }).then(function (res) {
        nb.innerHTML = res.ok
          ? '<span style="padding:10px 14px;font-size:13px;color:#e9cd8c;">Thank you! You\'re subscribed. ✓</span>'
          : '<span style="padding:10px 14px;font-size:13px;color:#f6b8b8;">Couldn\'t subscribe right now — please try again later.</span>';
      }).catch(function () {
        nb.innerHTML = '<span style="padding:10px 14px;font-size:13px;color:#f6b8b8;">Couldn\'t subscribe right now — please try again later.</span>';
      });
    });
  });

  /* ---------- Hotel Country Filters ---------- */
  var hotelFilters = document.getElementById('hotelFilters');
  if (hotelFilters) {
    var hotelCards = document.querySelectorAll('.hotel-card');
    hotelFilters.querySelectorAll('.hotel-filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        hotelFilters.querySelectorAll('.hotel-filter-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        var country = btn.getAttribute('data-country');
        hotelCards.forEach(function (card) {
          var show = country === 'all' || card.getAttribute('data-country') === country;
          card.classList.toggle('hotel-hidden', !show);
        });
      });
    });
  }

  /* ---------- Package "Select" buttons ----------
     Clicking Select on a Hajj/Umrah package card should not dump the
     visitor into the generic quote form — it should tell the business
     exactly which package they want. So it opens WhatsApp pre-filled
     with the package name (and price, if given) instead of navigating. */
  var PKG_WHATSAPP_NUMBER = '17326261345';
  document.querySelectorAll('.pkg-select').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var pkg = btn.getAttribute('data-package') || 'a package';
      var sharing = btn.getAttribute('data-sharing');
      var dates = btn.getAttribute('data-dates');
      var price = btn.getAttribute('data-price');
      var hotel = btn.getAttribute('data-hotel');
      var details = [];
      if (sharing) details.push(sharing);
      if (dates) details.push(dates);
      if (price) details.push(price);
      var msg = 'Assalamu Alaikum! I\'m interested in the ' + pkg +
        (details.length ? ' (' + details.join(', ') + ')' : '') +
        '. Could you please share more details and availability?';
      if (hotel) {
        msg += '\n\nHotel/Accommodation: ' + hotel;
      }
      window.open('https://wa.me/' + PKG_WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    });
  });

  /* ---------- Contact Form → Formspree ----------
     Submits by AJAX to Formspree (FORMSPREE_ENDPOINT) so the visitor stays
     on the page. The <form> also has a real action=/method=POST, so if JS
     fails it still works as a normal Formspree submission. WhatsApp is kept
     as a fallback / "chat now" option on the success + error screens. */
  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    var CONTACT_WHATSAPP_NUMBER = '17326261345';
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var fd = new FormData(contactForm);
      function get(name) { var v = fd.get(name); return v && String(v).trim() ? v : '—'; }

      var waUrl = 'https://wa.me/' + CONTACT_WHATSAPP_NUMBER + '?text=' + encodeURIComponent([
        'New Website Inquiry — HajjCall.com', '',
        'Name: ' + get('fullName'),
        'Email: ' + get('email'),
        'Phone: ' + get('phone'),
        'Subject: ' + get('subject'),
        'Message: ' + get('message')
      ].join('\n'));
      document.querySelectorAll('#contactSuccessWhatsapp, #contactErrorWhatsapp').forEach(function (a) { a.href = waUrl; });

      var btn = contactForm.querySelector('button[type="submit"]');
      var btnHtml = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.innerHTML = 'Sending…'; }
      var errEl = document.getElementById('contactError');
      if (errEl) errEl.style.display = 'none';

      fetch(contactForm.action || FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: fd,
        headers: { 'Accept': 'application/json' }
      }).then(function (res) {
        if (!res.ok) throw new Error('bad status ' + res.status);
        contactForm.style.display = 'none';
        var successEl = document.getElementById('contactSuccess');
        if (successEl) successEl.style.display = 'block';
        contactForm.reset();
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.innerHTML = btnHtml; }
        if (errEl) errEl.style.display = 'block';
      });
    });
  }

  /* ---------- Set active nav link based on page ---------- */
  var path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

});
