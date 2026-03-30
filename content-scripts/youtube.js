// YouTube Feed Blocker
(function() {
  'use strict';

  const FEED_SELECTORS = [
    '#primary #contents',
    '#contents.ytd-rich-grid-renderer',
    'ytd-rich-grid-renderer',
    '#contents ytd-rich-item-renderer',
    '#primary-inner #contents'
  ];

  const VIDEO_PAGE_RECOMMENDATION_SELECTORS = [
    '#related',
    'ytd-watch-next-secondary-results-renderer'
  ];

  let isBlocking = true;
  let styleElement = null;
  let recsStyleElement = null;

  function isFeedRoute() {
    const pathname = window.location.pathname;
    // YouTube feed is only on the homepage (/)
    return pathname === '/' || pathname === '';
  }

  function isVideoPage() {
    return window.location.pathname === '/watch';
  }

  function createStyleElement() {
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'feed-blocker-style';
      document.head.appendChild(styleElement);
    }
    return styleElement;
  }

  function createRecsStyleElement() {
    if (!recsStyleElement) {
      recsStyleElement = document.createElement('style');
      recsStyleElement.id = 'recs-blocker-style';
      document.head.appendChild(recsStyleElement);
    }
    return recsStyleElement;
  }

  function blockFeed() {
    // Only block on homepage feed route
    if (!isFeedRoute()) {
      return;
    }
    const style = createStyleElement();
    // Block the main feed content but keep navigation and sidebar
    const selectors = FEED_SELECTORS.map(sel => `${sel} { display: none !important; }`).join('\n');
    style.textContent = selectors;
  }

  function blockVideoRecommendations() {
    if (!isVideoPage()) {
      return;
    }
    const style = createRecsStyleElement();
    const selectors = VIDEO_PAGE_RECOMMENDATION_SELECTORS.map(sel => `${sel} { display: none !important; }`).join('\n');
    style.textContent = selectors;
  }

  function unblockFeed() {
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }
  }

  function unblockVideoRecommendations() {
    if (recsStyleElement) {
      recsStyleElement.remove();
      recsStyleElement = null;
    }
  }

  function updateBlocking() {
    if (isBlocking && isFeedRoute()) {
      blockFeed();
    } else {
      unblockFeed();
    }
    if (isBlocking && isVideoPage()) {
      blockVideoRecommendations();
    } else {
      unblockVideoRecommendations();
    }
  }

  // Load initial state
  chrome.storage.local.get(['youtube'], (result) => {
    isBlocking = result.youtube !== false;
    updateBlocking();
  });

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.youtube) {
      isBlocking = changes.youtube.newValue !== false;
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
    } else if (isBlocking) {
      if (isFeedRoute()) blockFeed();
      if (isVideoPage()) blockVideoRecommendations();
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

