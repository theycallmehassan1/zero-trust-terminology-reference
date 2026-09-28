/* =========================================================
   HajjCall.com — Multi-Step Quotation Form Logic
========================================================= */
document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('quoteForm');
  if (!form) return;

  // Same business number used across the site (WhatsApp float button, chatbot, etc).
  var WHATSAPP_NUMBER = '17326261345';

  var steps = Array.prototype.slice.call(form.querySelectorAll('.quote-step'));
  var progressSteps = Array.prototype.slice.call(document.querySelectorAll('.qp-step'));
  var current = 0;

  function showStep(i) {
    steps.forEach(function (s, idx) { s.classList.toggle('active', idx === i); });
    progressSteps.forEach(function (p, idx) {
      p.classList.toggle('active', idx === i);
      p.classList.toggle('done', idx < i);
    });
    var wrap = document.querySelector('.quote-wrap');
    if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  var msgEl = document.getElementById('quoteFormMsg');

  function showMsg(text) {
    if (!msgEl) { alert(text); return; }
    msgEl.textContent = text;
    msgEl.style.display = 'block';
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function clearMsg() { if (msgEl) msgEl.style.display = 'none'; }

  function validateStep(i) {
    var required = steps[i].querySelectorAll('[required]');
    var firstBad = null;
    required.forEach(function (field) {
      var bad = (field.type === 'checkbox') ? !field.checked : !String(field.value || '').trim();
      var box = field.type === 'checkbox' ? (field.closest('.check-row') || field) : field;
      if (bad) {
        if (!firstBad) firstBad = field;
        box.style.outline = '2px solid #d9534f';
        box.style.outlineOffset = '3px';
        field.addEventListener('input', function () { box.style.outline = ''; clearMsg(); }, { once: true });
        field.addEventListener('change', function () { box.style.outline = ''; clearMsg(); }, { once: true });
      } else {
        box.style.outline = '';
      }
    });
    if (firstBad) {
      showMsg(firstBad.type === 'checkbox'
        ? 'Please tick the box to agree to the Privacy Policy and Terms & Conditions.'
        : 'Please fill in the highlighted required field' + (required.length > 1 ? 's' : '') + '.');
      try { firstBad.focus({ preventScroll: true }); } catch (e) {}
    }
    return !firstBad;
  }

  form.querySelectorAll('.next-step').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!validateStep(current)) return;
      if (current < steps.length - 1) {
        current++;
        showStep(current);
      }
    });
  });

  form.querySelectorAll('.prev-step').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (current > 0) {
        current--;
        showStep(current);
      }
    });
  });

  // Quote requests are sent to Formspree (see FORMSPREE_ENDPOINT in main.js),
  // which emails them to the business. The answers are also formatted into a
  // WhatsApp message that is offered as a fallback if the email send fails
  // and as a "chat now" option on the success screen.
  function buildWhatsAppMessage(fd) {
    function get(name) { var v = fd.get(name); return v && String(v).trim() ? v : '—'; }
    var lines = [
      'New Quote Request — HajjCall.com',
      '',
      'PERSONAL INFO',
      'Name: ' + get('fullName'),
      'Email: ' + get('email'),
      'Phone: ' + get('phone'),
      'WhatsApp: ' + get('whatsapp'),
      'Country: ' + get('country'),
      '',
      'JOURNEY DETAILS',
      'Type: ' + get('journeyType'),
      'Departure: ' + get('depCity') + ', ' + get('depCountry'),
      'Preferred Month: ' + get('prefMonth'),
      'Flexible Dates: ' + get('flexDates'),
      'Travelers: ' + get('adults') + ' adult(s), ' + get('children') + ' child(ren), ' + get('infants') + ' infant(s)',
      '',
      'PACKAGE PREFERENCES',
      'Budget: ' + get('budget'),
      'Hotel Category: ' + get('hotelCategory'),
      'Room Type: ' + get('roomType'),
      'Flight Preference: ' + get('flightPref'),
      'Trip Duration: ' + get('duration'),
      '',
      'ADDITIONAL INFO',
      'Visa Assistance Needed: ' + get('visaAssist'),
      'Special Requirements: ' + get('specialReq'),
      'Notes: ' + get('notes')
    ];
    return lines.join('\n');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearMsg();

    // Re-check every step, not just the visible one, and jump to the first gap.
    for (var s = 0; s < steps.length; s++) {
      var req = steps[s].querySelectorAll('[required]');
      var gap = false;
      req.forEach(function (fld) {
        if (fld.type === 'checkbox' ? !fld.checked : !String(fld.value || '').trim()) gap = true;
      });
      if (gap) {
        if (s !== current) { current = s; showStep(current); }
        validateStep(s);
        return;
      }
    }

    var submitBtn = form.querySelector('.submit-quote');
    var submitHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting…'; }

    var fd = new FormData(form);
    var waUrl = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(buildWhatsAppMessage(fd));
    document.querySelectorAll('#quoteSuccessWhatsapp, #quoteErrorWhatsapp').forEach(function (a) { a.href = waUrl; });

    var errEl = document.getElementById('quoteError');
    if (errEl) errEl.style.display = 'none';

    var endpoint = form.getAttribute('action') ||
      (typeof FORMSPREE_ENDPOINT !== 'undefined' ? FORMSPREE_ENDPOINT : 'https://formspree.io/f/moeqvovj');

    fetch(endpoint, {
      method: 'POST',
      body: fd,
      headers: { 'Accept': 'application/json' }
    }).then(function (res) {
      if (!res.ok) return res.json().catch(function () { return {}; }).then(function (data) {
        var m = data && data.errors ? data.errors.map(function (x) { return x.message; }).join(', ') : ('HTTP ' + res.status);
        throw new Error(m);
      });
      clearMsg();
      form.style.display = 'none';
      var prog = document.querySelector('.quote-progress');
      if (prog) prog.style.display = 'none';
      var success = document.getElementById('quoteSuccess');
      if (success) success.style.display = 'block';
      success && success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }).catch(function (err) {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = submitHtml; }
      if (errEl) { errEl.style.display = 'block'; errEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      if (window.console) console.warn('Quote submit failed:', err);
    });
  });

  /* Radio pill visual state */
  form.querySelectorAll('.radio-pill input').forEach(function (input) {
    input.addEventListener('change', function () {
      var groupName = input.name;
      form.querySelectorAll('input[name="' + groupName + '"]').forEach(function (i) {
        i.closest('.radio-pill').classList.toggle('checked', i.checked);
      });
    });
  });

  showStep(0);
});
