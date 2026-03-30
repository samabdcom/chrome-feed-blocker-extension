// LinkedIn Feed Blocker
(function() {
  'use strict';

  const FEED_SELECTORS = [
    '.scaffold-finite-scroll',
    '.scaffold-finite-scroll__content',
    'div.scaffold-finite-scroll',
    'main.scaffold-layout__main .scaffold-finite-scroll',
    '.feed-container',
    '[data-test-id="feed-container"]',
    'main[role="main"] > div > div > div[class*="feed"]',
    'div[data-view-name="feed-container"]',
    'div.core-rail > div.feed-shared-update-v2',
    'div[data-finite-scroll-hotkey-context="FEED"]'
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
    const selectorRules = FEED_SELECTORS.map(sel => `${sel} { display: none !important; }`).join('\n');
    // Also hide feed posts directly via attribute and class patterns
    const extraRules = [
      'div.feed-shared-update-v2 { display: none !important; }',
      'div[data-id^="urn:li:activity"] { display: none !important; }',
      'div.occludable-update { display: none !important; }',
      'main.scaffold-layout__main div[data-view-name] { display: none !important; }'
    ].join('\n');
    style.textContent = selectorRules + '\n' + extraRules;

    // Direct DOM hiding as fallback for dynamically-named containers
    hideFeedElements();
  }

  function hideFeedElements() {
    // Find the main element and hide scroll-based feed containers within it
    const main = document.querySelector('main') || document.querySelector('[role="main"]');
    if (!main) return;

    // Look for infinite scroll containers within main
    const scrollContainers = main.querySelectorAll('[class*="scaffold-finite-scroll"], [class*="feed"]');
    scrollContainers.forEach(el => {
      el.style.setProperty('display', 'none', 'important');
    });

    // Also target feed update items directly
    const feedItems = main.querySelectorAll('[class*="feed-shared-update"], [class*="occludable-update"], [data-id^="urn:li:activity"]');
    feedItems.forEach(el => {
      el.style.setProperty('display', 'none', 'important');
    });
  }

  function unblockFeed() {
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }
    // Restore directly hidden elements
    const main = document.querySelector('main') || document.querySelector('[role="main"]');
    if (!main) return;
    const hidden = main.querySelectorAll('[style*="display: none"]');
    hidden.forEach(el => {
      el.style.removeProperty('display');
    });
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

