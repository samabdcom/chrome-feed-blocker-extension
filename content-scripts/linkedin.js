// LinkedIn Feed Blocker
(function() {
  'use strict';

  // LinkedIn uses obfuscated class names, so we target structurally:
  // main > div > div has 3 children: left sidebar, feed (middle), right sidebar
  const FEED_CSS = `
    main > div > div > :nth-child(2) { display: none !important; }
  `;

  let isBlocking = true;
  let styleElement = null;

  function isFeedRoute() {
    const pathname = window.location.pathname;
    // LinkedIn feed is at /feed/ or /feed or root /
    return pathname === '/feed/' || pathname === '/feed' || pathname === '/';
  }

  function createStyleElement() {
    if (styleElement && !document.head.contains(styleElement)) {
      styleElement = null;
    }
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'feed-blocker-style';
      document.head.appendChild(styleElement);
    }
    return styleElement;
  }

  function blockFeed() {
    if (!isFeedRoute()) {
      return;
    }
    const style = createStyleElement();
    style.textContent = FEED_CSS;
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

  // Handle dynamic content loading and route changes
  let lastPathname = window.location.pathname;

  const observer = new MutationObserver(() => {
    const currentPathname = window.location.pathname;
    if (currentPathname !== lastPathname) {
      lastPathname = currentPathname;
      updateBlocking();
    } else if (isBlocking && isFeedRoute()) {
      blockFeed();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Listen to popstate for browser back/forward
  window.addEventListener('popstate', () => {
    if (window.location.pathname !== lastPathname) {
      lastPathname = window.location.pathname;
      updateBlocking();
    }
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

