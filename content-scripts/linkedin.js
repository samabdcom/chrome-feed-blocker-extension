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

  function createStyleElement() {
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'feed-blocker-style';
      document.head.appendChild(styleElement);
    }
    return styleElement;
  }

  function blockFeed() {
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
    if (isBlocking) {
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
    if (isBlocking) {
      blockFeed();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Initial blocking
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateBlocking);
  } else {
    updateBlocking();
  }
})();

