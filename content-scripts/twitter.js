// Twitter/X Feed Blocker
(function() {
  'use strict';

  const FEED_SELECTORS = [
    'section[aria-labelledby="accessible-list-1"]',
    'div[aria-label="Timeline: Your Home Timeline"]'
  ];

  let isBlocking = true;
  let styleElement = null;
  let whatsHappeningStyleElement = null;

  function isHomeRoute() {
    const pathname = window.location.pathname;
    // Match /home or /home/ exactly
    return pathname === '/home' || pathname === '/home/' || pathname.startsWith('/home?');
  }

  function createStyleElement() {
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'feed-blocker-style';
      document.head.appendChild(styleElement);
    }
    return styleElement;
  }

  function createWhatsHappeningStyleElement() {
    if (!whatsHappeningStyleElement) {
      whatsHappeningStyleElement = document.createElement('style');
      whatsHappeningStyleElement.id = 'whats-happening-blocker-style';
      document.head.appendChild(whatsHappeningStyleElement);
    }
    return whatsHappeningStyleElement;
  }

  function blockWhatsHappening() {
    if (!isHomeRoute()) {
      return;
    }
    const style = createWhatsHappeningStyleElement();
    // Target the "Trending now" / "What's happening" section
    style.textContent = 'section[aria-labelledby="accessible-list-0"] { opacity: 0.01 !important; }';
  }

  function blockFeed() {
    if (!isHomeRoute()) {
      return;
    }
    const style = createStyleElement();
    const selectors = FEED_SELECTORS.map(sel => `${sel} { opacity: 0.01 !important; }`).join('\n');
    style.textContent = selectors;
  }

  function unblockFeed() {
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }
  }

  function updateBlocking() {
    if (isBlocking && isHomeRoute()) {
      blockFeed();
    } else {
      unblockFeed();
    }
    // Always block "What's happening" section on home route
    blockWhatsHappening();
  }

  // Load initial state
  chrome.storage.local.get(['twitter'], (result) => {
    isBlocking = result.twitter !== false;
    updateBlocking();
  });

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.twitter) {
      isBlocking = changes.twitter.newValue !== false;
      updateBlocking();
    }
  });

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggle') {
      isBlocking = request.enabled;
      updateBlocking();
    }
  });

  // Handle dynamic content loading
  const observer = new MutationObserver(() => {
    if (isBlocking && isHomeRoute()) {
      blockFeed();
    }
    // Always block "What's happening" section on home route
    if (isHomeRoute()) {
      blockWhatsHappening();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Listen for route changes (Twitter/X uses client-side routing)
  let lastPathname = window.location.pathname;
  
  // Listen to popstate for browser back/forward
  window.addEventListener('popstate', () => {
    if (window.location.pathname !== lastPathname) {
      lastPathname = window.location.pathname;
      updateBlocking();
    }
  });

  // Monitor pathname changes via MutationObserver (for pushState navigation)
  const routeObserver = new MutationObserver(() => {
    const currentPathname = window.location.pathname;
    if (currentPathname !== lastPathname) {
      lastPathname = currentPathname;
      updateBlocking();
    }
  });

  routeObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Override pushState/replaceState to catch programmatic navigation
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    setTimeout(() => {
      if (window.location.pathname !== lastPathname) {
        lastPathname = window.location.pathname;
        updateBlocking();
      }
    }, 0);
  };
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    setTimeout(() => {
      if (window.location.pathname !== lastPathname) {
        lastPathname = window.location.pathname;
        updateBlocking();
      }
    }, 0);
  };

  // Initial blocking
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateBlocking);
  } else {
    updateBlocking();
  }
})();

