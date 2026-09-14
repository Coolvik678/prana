/**
 * Prana - Owner Handover CMS & Razorpay Gateway Integration
 * Handles:
 * 1. Owner Profile & Studio Handover Controls (who is the owner, bio, contact, WhatsApp)
 * 2. Razorpay Payment Provider Setup (replaces manual/whatsapp payment with direct Razorpay checkout)
 * 3. Dynamic site-wide contact & WhatsApp sync
 */

(function() {
  'use strict';

  // --- 1. DEFAULT & SAVED OWNER CONFIGURATION ---
  const STORAGE_KEY = 'prana_owner_profile';
  const RAZORPAY_KEY = 'prana_razorpay_key';

  const defaultOwner = {
    ownerName: 'Acharya Anand Sharma',
    ownerRole: 'Founder & Lead Yogacharya (500-RYT)',
    ownerBio: 'Practicing and teaching traditional Himalayan Hatha, Vinyasa, and sacred Pranayama for over 18 years across Rishikesh and global online masterclasses.',
    studioName: 'Prana — Mindful Sanctuary',
    studioTagline: 'Ancient Himalayan Wisdom for Modern Mindful Living',
    whatsappNumber: '+91 90086 63139',
    supportEmail: 'namaste@pranasanctuary.com',
    studioLocation: 'Rishikesh, Uttarakhand & Global Online Studio',
    razorpayKey: 'rzp_test_1DP5mmOlF5G5ag',
    currency: 'INR'
  };

  function getOwnerData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      const savedRzp = localStorage.getItem(RAZORPAY_KEY);
      return {
        ...defaultOwner,
        ...parsed,
        razorpayKey: savedRzp || parsed.razorpayKey || defaultOwner.razorpayKey
      };
    } catch (e) {
      return defaultOwner;
    }
  }

  function saveOwnerData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      if (data.razorpayKey) {
        localStorage.setItem(RAZORPAY_KEY, data.razorpayKey);
      }
      applyDynamicSiteUpdates();
      showToast('✨ Owner Profile & Razorpay settings saved successfully!');
    } catch (e) {
      console.error('Failed to save owner data:', e);
      showToast('⚠️ Error saving settings. Please try again.');
    }
  }

  // --- 2. TOAST NOTIFICATIONS ---
  function showToast(message) {
    let toast = document.getElementById('prana-custom-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'prana-custom-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: #1F2923;
        color: #FAF8F5;
        padding: 12px 24px;
        border-radius: 9999px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
        border: 1px solid #3B4E41;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        opacity: 0;
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
    }, 3500);
  }

  // --- 3. DYNAMIC SITE-WIDE SYNCHRONIZATION ---
  function applyDynamicSiteUpdates() {
    const owner = getOwnerData();
    const cleanPhone = owner.whatsappNumber.replace(/[^0-9]/g, '');

    // Update WhatsApp links
    document.querySelectorAll('a[href*="wa.me"]').forEach(el => {
      const currentHref = el.getAttribute('href');
      const textParam = currentHref.includes('text=') ? currentHref.split('text=')[1] : 'Namaste%20Prana%20Team';
      el.setAttribute('href', `https://wa.me/${cleanPhone}?text=${textParam}`);
      if (el.textContent.includes('+91') || el.textContent.includes(defaultOwner.whatsappNumber)) {
        el.textContent = el.textContent.replace(/\+91[\s0-9]+/g, owner.whatsappNumber);
      }
    });

    // Update phone spans & buttons
    document.querySelectorAll('#floating-whatsapp-btn, a[href^="tel:"]').forEach(el => {
      if (el.getAttribute('href')?.startsWith('tel:')) {
        el.setAttribute('href', `tel:+${cleanPhone}`);
        if (el.textContent.includes('+91')) {
          el.textContent = owner.whatsappNumber;
        }
      }
    });
  }

  // --- 4. RAZORPAY PAYMENT TRIGGER ---
  function openRazorpayCheckout({ amount, studentName, studentEmail, studentPhone, courseTitle, onSuccess, onCancel }) {
    const owner = getOwnerData();
    const razorpayKey = owner.razorpayKey || 'rzp_test_1DP5mmOlF5G5ag';

    if (typeof window.Razorpay === 'undefined') {
      showToast('⚠️ Loading Razorpay gateway... please try again in 2 seconds.');
      loadRazorpayScript();
      return;
    }

    const options = {
      key: razorpayKey,
      amount: Math.round(amount * 100), // in paise
      currency: owner.currency || 'INR',
      name: owner.studioName || 'Prana Yoga Sanctuary',
      description: courseTitle || 'Online Yoga & Meditation Enrollment',
      image: '/favicon.svg',
      prefill: {
        name: studentName,
        email: studentEmail,
        contact: studentPhone || ''
      },
      theme: {
        color: '#3B4E41'
      },
      notes: {
        platform: 'Prana Online Masterclasses',
        enrollment_type: 'Lifetime Access'
      },
      handler: function(response) {
        showToast('🎉 Payment Successful! Payment ID: ' + response.razorpay_payment_id);
        if (typeof onSuccess === 'function') {
          onSuccess(response);
        }
      },
      modal: {
        ondismiss: function() {
          if (typeof onCancel === 'function') {
            onCancel();
          }
        }
      }
    };

    try {
      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', function(resp) {
        alert('Payment Failed: ' + (resp.error.description || 'Unknown error'));
        if (typeof onCancel === 'function') onCancel();
      });
      rzpInstance.open();
    } catch (err) {
      console.error('Razorpay invocation error:', err);
      alert('Error launching Razorpay: ' + err.message);
      if (typeof onCancel === 'function') onCancel();
    }
  }

  function loadRazorpayScript() {
    if (document.getElementById('razorpay-sdk-script')) return;
    const script = document.createElement('script');
    script.id = 'razorpay-sdk-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.head.appendChild(script);
  }

  // --- 5. CHECKOUT FORM INTERCEPTION ---
  function hookCheckoutModal() {
    const completeBtn = document.getElementById('complete-enrollment-btn');
    if (!completeBtn || completeBtn.dataset.razorpayHooked === 'true') return;

    const form = completeBtn.closest('form');
    if (!form) return;

    completeBtn.dataset.razorpayHooked = 'true';

    // Enhance checkout payment section with Razorpay branding
    const paymentMethodsContainer = form.querySelector('.grid-cols-3');
    if (paymentMethodsContainer && !document.getElementById('razorpay-badge-banner')) {
      const rzpBadge = document.createElement('div');
      rzpBadge.id = 'razorpay-badge-banner';
      rzpBadge.className = 'mt-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-between text-xs text-emerald-200';
      rzpBadge.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">₹</div>
          <div>
            <div class="font-semibold text-emerald-100 flex items-center gap-1.5">
              <span>Razorpay Verified Payment</span>
              <span class="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">Instant Activation</span>
            </div>
            <div class="text-[11px] text-emerald-300/80">UPI (GPay/PhonePe/Paytm), Cards & NetBanking</div>
          </div>
        </div>
        <img src="https://razorpay.com/assets/razorpay-glyph.svg" alt="Razorpay" class="h-5 opacity-90" onerror="this.style.display='none'"/>
      `;
      paymentMethodsContainer.parentNode.insertBefore(rzpBadge, paymentMethodsContainer.nextSibling);
    }

    // Intercept submit
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      e.stopPropagation();

      const nameInput = form.querySelector('input[type="text"][placeholder*="Priya"]') || form.querySelector('input[type="text"][required]');
      const emailInput = form.querySelector('input[type="email"]');
      const phoneInput = form.querySelector('input[type="tel"]');

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const phone = phoneInput ? phoneInput.value.trim() : '';

      if (!name || !email) {
        alert('Please provide your name and email to proceed with enrollment.');
        return;
      }

      // Read course price from button or text
      let amount = 999;
      const textMatch = completeBtn.textContent.match(/₹\s*([0-9,]+)/);
      if (textMatch) {
        amount = Number(textMatch[1].replace(/,/g, '')) || 999;
      }

      openRazorpayCheckout({
        amount: amount,
        studentName: name,
        studentEmail: email,
        studentPhone: phone,
        courseTitle: 'Prana Mindful Yoga Masterclass',
        onSuccess: function(resp) {
          // Trigger the standard form completion logic
          completeBtn.disabled = true;
          completeBtn.innerHTML = `
            <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Payment Verified! Enrolling...</span>
          `;

          // Trigger simulated click or dispatch custom event so React registers enrollment
          setTimeout(() => {
            // Store successful transaction in localStorage
            const history = JSON.parse(localStorage.getItem('prana_payment_history') || '[]');
            history.unshift({
              paymentId: resp.razorpay_payment_id,
              name: name,
              email: email,
              amount: amount,
              date: new Date().toISOString()
            });
            localStorage.setItem('prana_payment_history', JSON.stringify(history));

            // Execute original React submit
            completeBtn.dataset.razorpayHooked = 'done';
            form.requestSubmit();
          }, 800);
        },
        onCancel: function() {
          showToast('Payment cancelled. You can retry whenever ready.');
        }
      });
    }, true);
  }

  // --- 6. OWNER STUDIO CMS INJECTION ---
  function hookOwnerStudio() {
    // Check if we are inside Owner Studio
    const studioTabsContainer = document.querySelector('nav[aria-label="Tabs"]') || document.querySelector('button[title*="Owner Studio"]')?.closest('div')?.parentElement;
    const handoverBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sell-to-Owner') || b.textContent.includes('Handover'));

    // Check if the Handover section is currently mounted in DOM
    const handoverHeading = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('Why this Platform is 100% Ready') || h.textContent.includes('Client & Owner Handover'));

    if (handoverHeading && !document.getElementById('owner-handover-cms-panel')) {
      renderOwnerHandoverCMS(handoverHeading.closest('.bg-stone-900'));
    }
  }

  function renderOwnerHandoverCMS(container) {
    if (!container || document.getElementById('owner-handover-cms-panel')) return;

    const owner = getOwnerData();

    const panel = document.createElement('div');
    panel.id = 'owner-handover-cms-panel';
    panel.className = 'mt-8 border-t border-stone-800 pt-8 space-y-6';
    panel.innerHTML = `
      <div class="bg-stone-950 border border-amber-600/40 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-5">
          <div>
            <div class="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30 mb-2">
              <span>👑 Live Owner Handover CMS & Details</span>
            </div>
            <h3 class="text-xl font-bold text-white flex items-center gap-2">
              <span>Studio Ownership & Razorpay Payment Setup</span>
            </h3>
            <p class="text-xs text-stone-400 mt-1 max-w-2xl leading-relaxed">
              Full administrative power to update the owner identity, instructor bio, WhatsApp contact, and Razorpay gateway keys. When selling or handing over this website, simply fill in the new owner's details below!
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button id="save-owner-cms-top-btn" class="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer">
              <span>💾 Save All Changes</span>
            </button>
          </div>
        </div>

        <!-- TWO COLUMN FORM -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- COLUMN 1: OWNER IDENTITY -->
          <div class="space-y-4">
            <h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>👤 1. Owner & Instructor Details</span>
            </h4>

            <div>
              <label class="block text-xs font-medium text-stone-300 mb-1">Owner / Lead Master Name</label>
              <input type="text" id="owner-name-input" value="${escapeHtml(owner.ownerName)}" class="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 font-medium"/>
            </div>

            <div>
              <label class="block text-xs font-medium text-stone-300 mb-1">Owner Role & Credentials</label>
              <input type="text" id="owner-role-input" value="${escapeHtml(owner.ownerRole)}" class="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 font-medium"/>
            </div>

            <div>
              <label class="block text-xs font-medium text-stone-300 mb-1">Owner Bio & Teaching Philosophy</label>
              <textarea id="owner-bio-input" rows="3" class="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 leading-relaxed font-medium">${escapeHtml(owner.ownerBio)}</textarea>
            </div>

            <div>
              <label class="block text-xs font-medium text-stone-300 mb-1">Studio / Brand Name</label>
              <input type="text" id="studio-name-input" value="${escapeHtml(owner.studioName)}" class="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 font-medium"/>
            </div>
          </div>

          <!-- COLUMN 2: CONTACT & RAZORPAY -->
          <div class="space-y-4">
            <h4 class="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>💳 2. Razorpay Payment Setup (Direct Settlements)</span>
            </h4>

            <div class="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-700/40 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-emerald-200">Razorpay Key ID</span>
                <span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">Live Ready</span>
              </div>
              <input type="text" id="razorpay-key-input" value="${escapeHtml(owner.razorpayKey)}" placeholder="rzp_test_... or rzp_live_..." class="w-full px-3.5 py-2 bg-stone-900 border border-emerald-600/50 rounded-lg text-xs text-white font-mono placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"/>
              <p class="text-[11px] text-stone-400 leading-normal">
                Paste your Razorpay Key ID here. All student enrollments via UPI, GPay, PhonePe, Cards & NetBanking will be deposited straight into your bank account!
              </p>
              <div class="pt-1 flex items-center gap-2">
                <button type="button" id="test-razorpay-btn" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer">
                  <span>⚡ Test Razorpay Popup (₹1)</span>
                </button>
                <span class="text-[10px] text-stone-400">Verifies your key immediately</span>
              </div>
            </div>

            <h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider pt-2 flex items-center gap-1.5">
              <span>📞 3. Official WhatsApp & Contact Handover</span>
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-medium text-stone-300 mb-1">WhatsApp & Helpline Number</label>
                <input type="text" id="whatsapp-number-input" value="${escapeHtml(owner.whatsappNumber)}" placeholder="+91 90086 63139" class="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 font-medium"/>
              </div>
              <div>
                <label class="block text-[11px] font-medium text-stone-300 mb-1">Support Email</label>
                <input type="email" id="support-email-input" value="${escapeHtml(owner.supportEmail)}" placeholder="care@pranayoga.com" class="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 font-medium"/>
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-medium text-stone-300 mb-1">Studio Address / Location</label>
              <input type="text" id="studio-location-input" value="${escapeHtml(owner.studioLocation)}" class="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 font-medium"/>
            </div>
          </div>
        </div>

        <!-- FOOTER SAVE BAR -->
        <div class="pt-5 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="text-xs text-stone-400 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>All details update dynamically across the store, checkout, and WhatsApp helplines instantly.</span>
          </div>
          <button id="save-owner-cms-bottom-btn" class="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer">
            <span>💾 Save Owner Profile & Razorpay Configuration</span>
          </button>
        </div>
      </div>
    `;

    container.appendChild(panel);

    // Event listeners
    const handleSave = () => {
      const updated = {
        ...owner,
        ownerName: document.getElementById('owner-name-input')?.value.trim() || owner.ownerName,
        ownerRole: document.getElementById('owner-role-input')?.value.trim() || owner.ownerRole,
        ownerBio: document.getElementById('owner-bio-input')?.value.trim() || owner.ownerBio,
        studioName: document.getElementById('studio-name-input')?.value.trim() || owner.studioName,
        whatsappNumber: document.getElementById('whatsapp-number-input')?.value.trim() || owner.whatsappNumber,
        supportEmail: document.getElementById('support-email-input')?.value.trim() || owner.supportEmail,
        studioLocation: document.getElementById('studio-location-input')?.value.trim() || owner.studioLocation,
        razorpayKey: document.getElementById('razorpay-key-input')?.value.trim() || owner.razorpayKey
      };
      saveOwnerData(updated);
    };

    document.getElementById('save-owner-cms-top-btn')?.addEventListener('click', handleSave);
    document.getElementById('save-owner-cms-bottom-btn')?.addEventListener('click', handleSave);

    // Test Razorpay button
    document.getElementById('test-razorpay-btn')?.addEventListener('click', () => {
      openRazorpayCheckout({
        amount: 1, // 1 INR test transaction
        studentName: 'Studio Owner Test',
        studentEmail: owner.supportEmail,
        studentPhone: owner.whatsappNumber,
        courseTitle: 'Gateway Test Transaction (₹1)',
        onSuccess: function(resp) {
          alert('🎉 Gateway Verified! Razorpay Payment ID: ' + resp.razorpay_payment_id);
        },
        onCancel: function() {
          showToast('Test transaction closed.');
        }
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- 7. OBSERVER INITIALIZATION ---
  loadRazorpayScript();

  function onDomChange() {
    applyDynamicSiteUpdates();
    hookCheckoutModal();
    hookOwnerStudio();
  }

  const observer = new MutationObserver(() => {
    onDomChange();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
      onDomChange();
    });
  } else {
    observer.observe(document.body, { childList: true, subtree: true });
    onDomChange();
  }

  // Expose global controller
  window.PranaOwner = {
    getOwnerData,
    saveOwnerData,
    openRazorpayCheckout,
    applyDynamicSiteUpdates
  };

})();
