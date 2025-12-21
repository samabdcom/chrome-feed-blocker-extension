// LinkedIn Feed Blocker
(function() {
  'use strict';

  const FEED_SELECTORS = [
    '.feed-container',
    '[data-test-id="feed-container"]',
    '.scaffold-finite-scroll__content',
    'main[role="main"] > div > div > div[class*="feed"]',
    'div[data-view-name="feed-container"]'
  ];

  let isBlocking = true;
  let styleElement = null;

  function isFeedRoute() {
    const pathname = window.location.pathname;
    // LinkedIn feed is at /feed/ or /feed or root /
    return pathname === '/feed/' || pathname === '/feed' || pathname === '/';
  }

  function createStyleElement() {
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'feed-blocker-style';
      document.head.appendChild(styleElement);
    }
    return styleElement;
  }

  function blockFeed() {
    // Only block on feed route
    if (!isFeedRoute()) {
      return;
    }
    const style = createStyleElement();
    const selectors = FEED_SELECTORS.map(sel => `${sel} { display: none !important; }`).join('\n');
    style.textContent = selectors;
  }

  function unblockFeed() {
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }
  }

  function updateBlocking() {
    if (isBlocking && isFeedRoute()) {
      blockFeed();
    } else {
      unblockFeed();
    }
  }

  // Load initial state
  chrome.storage.local.get(['linkedin'], (result) => {
    isBlocking = result.linkedin !== false;
    updateBlocking();
  });

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.linkedin) {
      isBlocking = changes.linkedin.newValue !== false;
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
    if (isBlocking && isFeedRoute()) {
      blockFeed();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Listen for route changes (LinkedIn uses client-side routing)
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

