/* =========================================================
   HajjCall.com — Built-in AI Assistant (FAQ Knowledge Base)
   No external AI / API required — pure client-side matching.
========================================================= */
(function () {

  var WHATSAPP_NUMBER = '17326261345'; // replace with real WhatsApp number (country code + number, no + or spaces)

  var KB = [
    {
      key: 'hajj-packages',
      label: 'Hajj Packages',
      keywords: ['hajj package', 'hajj packages', 'hajj deal', 'hajj trip', 'hajj plan'],
      answer: 'We offer Economy, Premium, VIP and Royal Hajj packages, all fully guided with 5★/4★ hotels close to Haram, visa, flights, ziyarat tours and 24/7 group leaders. See all packages on our <a href="hajj-packages.html">Hajj Packages page</a>.',
      related: ['prices', 'payment', 'booking', 'visa']
    },
    {
      key: 'umrah-packages',
      label: 'Umrah Packages',
      keywords: ['umrah package', 'umrah packages', 'umrah deal', 'umrah trip', 'ramadan umrah'],
      answer: 'Our Umrah packages include Ramadan Umrah, Family Umrah, Group Umrah and Luxury Umrah — with flexible durations from 7 to 21 nights. Explore all options on our <a href="umrah-packages.html">Umrah Packages page</a>.',
      related: ['prices', 'payment', 'booking', 'dates']
    },
    {
      key: 'visa',
      label: 'Visa Information',
      keywords: ['visa', 'e-visa', 'entry permit', 'visa process', 'visa requirement'],
      answer: 'We handle full Hajj & Umrah visa processing for all our travelers, including the Saudi e-Visa. You just need a valid passport (6+ months validity) and a few documents — our team manages the rest. Visit <a href="services.html">Services</a> for details.',
      related: ['documents', 'booking', 'contact']
    },
    {
      key: 'documents',
      label: 'Required Documents',
      keywords: ['document', 'documents', 'passport', 'photo requirement', 'vaccination', 'meningitis'],
      answer: 'Typical requirements: valid passport (6+ months), recent passport-size photos, vaccination certificate (Meningitis ACYW135), completed booking form, and Mahram details for female pilgrims. Full checklist on our <a href="faq.html">FAQ page</a>.',
      related: ['visa', 'booking', 'contact']
    },
    {
      key: 'prices',
      label: 'Package Prices',
      keywords: ['price', 'prices', 'cost', 'how much', 'fee', 'fees', 'rate'],
      answer: 'Prices vary by sharing type, dates and Shifting/Non-Shifting option. Hajj packages range from $10,395 to $18,495, Umrah from $1,399. Get an exact quote via our <a href="quote.html">Free Quotation Form</a>.',
      related: ['payment', 'booking', 'hajj-packages', 'umrah-packages']
    },
    {
      key: 'payment',
      label: 'Payment Options',
      keywords: ['payment', 'pay', 'installment', 'installments', 'deposit', 'credit card'],
      answer: 'We accept bank transfer, major credit/debit cards, and flexible installment plans with a reservation deposit. Full payment must typically be settled before departure. Contact us for a custom payment schedule.',
      related: ['prices', 'booking', 'cancel']
    },
    {
      key: 'booking',
      label: 'Booking Process',
      keywords: ['booking', 'book', 'how to book', 'reserve', 'reservation'],
      answer: 'Booking is simple: 1) Submit the Free Quote form or contact us, 2) Choose your package, 3) Pay the deposit, 4) We handle visa & documentation, 5) Receive your final itinerary. Start on the <a href="quote.html">Request a Quote page</a>.',
      related: ['payment', 'documents', 'dates']
    },
    {
      key: 'dates',
      label: 'Travel Dates',
      keywords: ['dates', 'date', 'when', 'season', 'departure date', 'schedule'],
      answer: 'We run Umrah groups almost every month year-round, with peak seasons in Ramadan and winter. Hajj dates follow the Islamic lunar calendar (Dhul Hijjah). Tell us your preferred month in the quote form for exact availability.',
      related: ['hajj-packages', 'umrah-packages', 'booking']
    },
    {
      key: 'hotels',
      label: 'Hotel Information',
      keywords: ['hotel', 'hotels', 'accommodation', 'stay', 'room'],
      answer: 'We partner with top-rated hotels in Makkah & Madinah, from 3★ economy to 5★ Haram-view towers (e.g. near Abraj Al-Bait / Anwar Al Madinah). Room types include Quad, Triple, Double and Single Sharing.',
      related: ['prices', 'booking', 'umrah-packages']
    },
    {
      key: 'contact',
      label: 'Contact Support',
      keywords: ['contact', 'support', 'help', 'talk to someone', 'human', 'agent', 'phone number', 'email'],
      answer: 'You can reach our support team 24/7 via WhatsApp, phone, or the <a href="contact.html">Contact page</a>. Tap the green WhatsApp button for the fastest response.',
      related: ['booking', 'visa', 'cancel']
    },
    {
      key: 'flights',
      label: 'Flights',
      keywords: ['flight', 'flights', 'airline', 'ticket', 'airport'],
      answer: 'We arrange direct and connecting flights with trusted airlines from the USA, UK, Canada, Europe, Australia and GCC to Jeddah (JED) or Madinah (MED). Flight class options: Economy, Premium Economy and Business.',
      related: ['prices', 'booking', 'dates']
    },
    {
      key: 'groupleader',
      label: 'Group Leaders & Guides',
      keywords: ['guide', 'group leader', 'scholar', 'imam', 'shepherd'],
      answer: 'Every group travels with an experienced, English-speaking religious guide who leads rituals, ziyarat tours and is available 24/7 throughout your journey.',
      related: ['hajj-packages', 'umrah-packages', 'contact']
    },
    {
      key: 'cancel',
      label: 'Cancellation & Refund',
      keywords: ['cancel', 'cancellation', 'refund', 'reschedule'],
      answer: 'Cancellation & refund terms depend on how close to departure you cancel — please see our <a href="terms.html">Terms & Conditions</a> or contact support for your specific booking.',
      related: ['payment', 'booking', 'contact']
    },
    {
      key: 'insurance',
      label: 'Travel Insurance',
      keywords: ['insurance', 'medical cover', 'travel protection'],
      answer: 'Travel insurance is included in most of our premium packages and can be added to any package on request — covering medical emergencies, trip cancellation and baggage.',
      related: ['prices', 'payment', 'contact']
    }
  ];

  var QUICK_OPTIONS = ['hajj-packages','umrah-packages','visa','documents','prices','payment','booking','dates','hotels','contact'];

  var FALLBACK = 'I couldn\'t find an exact answer to that. Please contact our team on WhatsApp for personalized assistance. 👇';

  function findAnswer(text) {
    var t = text.toLowerCase();
    var best = null, bestScore = 0;
    KB.forEach(function (item) {
      item.keywords.forEach(function (kw) {
        if (t.indexOf(kw) !== -1 && kw.length > bestScore) {
          best = item; bestScore = kw.length;
        }
      });
    });
    return best;
  }

  function buildWidget() {
    var stack = document.querySelector('.float-stack');
    if (!stack) return;

    var chat = document.createElement('div');
    chat.className = 'ai-chat';
    chat.id = 'aiChat';
    chat.innerHTML =
      '<div class="ai-chat-head">' +
        '<div class="avatar">🕋</div>' +
        '<div><b>HajjCall Assistant</b><small>Online &middot; Instant Answers</small></div>' +
        '<div class="ai-chat-close" id="aiChatClose">&times;</div>' +
      '</div>' +
      '<div class="ai-chat-body" id="aiChatBody"></div>' +
      '<div class="ai-quick" id="aiQuick"></div>' +
      '<div class="ai-chat-foot">' +
        '<input type="text" id="aiChatInput" placeholder="Type your question...">' +
        '<button id="aiChatSend" aria-label="Send">➤</button>' +
      '</div>';
    document.body.appendChild(chat);

    var body = chat.querySelector('#aiChatBody');
    var quick = chat.querySelector('#aiQuick');
    var input = chat.querySelector('#aiChatInput');
    var sendBtn = chat.querySelector('#aiChatSend');

    function byKey(key) {
      return KB.find(function (k) { return k.key === key; });
    }

    function renderQuick(keys, heading, allowReset) {
      quick.innerHTML = '';
      if (heading) {
        var h = document.createElement('div');
        h.className = 'ai-quick-heading';
        h.textContent = heading;
        quick.appendChild(h);
      }
      var row = document.createElement('div');
      row.className = 'ai-quick-row';
      keys.forEach(function (key) {
        var item = byKey(key);
        if (!item) return;
        var btn = document.createElement('button');
        btn.textContent = item.label;
        btn.addEventListener('click', function () { handleUserMessage(item.label, item); });
        row.appendChild(btn);
      });
      if (allowReset) {
        var reset = document.createElement('button');
        reset.className = 'ai-quick-reset';
        reset.textContent = '⟲ All Topics';
        reset.addEventListener('click', function () { renderQuick(QUICK_OPTIONS, null, false); });
        row.appendChild(reset);
      }
      quick.appendChild(row);
    }

    function addMsg(text, who) {
      var msg = document.createElement('div');
      msg.className = 'ai-msg ' + who;
      msg.innerHTML = text;
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
    }

    function handleUserMessage(text, matchedItem) {
      addMsg(text, 'user');
      setTimeout(function () {
        var item = matchedItem || findAnswer(text);
        if (item) {
          addMsg(item.answer, 'bot');
          if (item.related && item.related.length) {
            renderQuick(item.related, 'You might also ask:', true);
          } else {
            renderQuick(QUICK_OPTIONS, null, false);
          }
        } else {
          addMsg(FALLBACK, 'bot');
          var fallbackMsg = 'Assalamu Alaikum! I asked your website assistant: "' + text + '" and didn\'t get an answer. Could you please help?';
          var fallbackUrl = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(fallbackMsg);
          addMsg('<a href="' + fallbackUrl + '" target="_blank" rel="noopener" style="color:#0b5c45;font-weight:600;">💬 Chat on WhatsApp →</a>', 'bot');
          renderQuick(QUICK_OPTIONS, null, false);
        }
      }, 450);
    }

    addMsg('Assalamu Alaikum! 👋 I\'m your HajjCall Assistant. Ask me about packages, visas, prices, or tap a quick option below.', 'bot');
    renderQuick(QUICK_OPTIONS, null, false);

    sendBtn.addEventListener('click', send);
    input.addEventListener('keypress', function (e) { if (e.key === 'Enter') send(); });
    function send() {
      var val = input.value.trim();
      if (!val) return;
      handleUserMessage(val, null);
      input.value = '';
    }

    var aiBtn = document.getElementById('aiAssistantBtn');
    var closeBtn = chat.querySelector('#aiChatClose');
    if (aiBtn) {
      aiBtn.addEventListener('click', function () {
        chat.classList.toggle('open');
      });
    }
    closeBtn.addEventListener('click', function () { chat.classList.remove('open'); });
  }

  document.addEventListener('DOMContentLoaded', buildWidget);
})();
