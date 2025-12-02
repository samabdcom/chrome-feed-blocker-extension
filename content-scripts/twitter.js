// Twitter/X Feed Blocker
(function() {
  'use strict';

  // Selectors for the actual feed timeline (tweets only)
  // We keep the compose box and "What's happening" section visible
  const FEED_SELECTORS = [
    // Hide the main feed section
    'section[aria-labelledby="accessible-list-0"]',
    // Hide individual tweet articles in the timeline
    // The compose box is not an article, so it stays visible
    'article[data-testid="tweet"]',
    // Hide the scrollable timeline container content (but not the compose area above it)
    '[data-testid="homeTimeline"] > div > div[style*="min-height"]',
    '[data-testid="homeTimeline"] > div[role="group"]',
    // Hide loading spinners and indicators
    '[data-testid="homeTimeline"] [role="progressbar"]',
    '[data-testid="homeTimeline"] svg[viewBox*="24"]',
    '[data-testid="homeTimeline"] svg[aria-label*="Loading"]',
    '[data-testid="homeTimeline"] svg[aria-label*="loading"]',
    '[data-testid="homeTimeline"] [aria-busy="true"]'
  ];

  let isBlocking = true;
  let styleElement = null;

  function isHomePage() {
    const url = window.location.href;
    return url === 'https://x.com/home' || 
           url === 'https://twitter.com/home' ||
           url.startsWith('https://x.com/home?') ||
           url.startsWith('https://twitter.com/home?');
  }

  function createStyleElement() {
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'feed-blocker-style';
      document.head.appendChild(styleElement);
    }
    return styleElement;
  }

  function hideLoadingElements() {
    if (!isHomePage() || !isBlocking) return;
    
    // Find the home timeline container
    const homeTimeline = document.querySelector('[data-testid="homeTimeline"]');
    if (!homeTimeline) return;
    
    // Hide all loading indicators and empty containers
    const loadingSelectors = [
      '[role="progressbar"]',
      'svg[viewBox*="24"]',
      'svg circle[stroke]',
      'svg[aria-label*="Loading"]',
      'svg[aria-label*="loading"]',
      '[aria-busy="true"]'
    ];
    
    loadingSelectors.forEach(selector => {
      const elements = homeTimeline.querySelectorAll(selector);
      elements.forEach(el => {
        // Hide the element and its container
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        const container = el.closest('div[style*="min-height"]') || 
                         el.closest('div[style*="height"]') ||
                         el.parentElement;
        if (container && container !== homeTimeline) {
          container.style.display = 'none';
          container.style.visibility = 'hidden';
        }
      });
    });
    
    // Find all divs within the timeline that might contain loading states
    const timelineDivs = homeTimeline.querySelectorAll('div');
    timelineDivs.forEach(div => {
      // Skip if this div contains actual tweets
      if (div.querySelector('article[data-testid="tweet"]')) {
        return;
      }
      
      // Check if this div contains a loading spinner
      const hasSpinner = div.querySelector('[role="progressbar"]') || 
                        div.querySelector('svg[viewBox*="24"]') ||
                        div.querySelector('circle[cx="12"]') ||
                        div.querySelector('svg circle[stroke]') ||
                        div.querySelector('svg[aria-label*="Loading"]') ||
                        div.querySelector('svg[aria-label*="loading"]') ||
                        div.querySelector('[aria-busy="true"]');
      
      // Check if it's an empty container with min-height (typical loading container)
      const computedStyle = window.getComputedStyle(div);
      const minHeight = parseInt(computedStyle.minHeight) || parseInt(div.style.minHeight) || 0;
      const isEmptyWithHeight = div.children.length === 0 && minHeight > 100;
      
      // Check if it contains only a spinner and no tweets
      const hasOnlySpinner = hasSpinner && !div.querySelector('article[data-testid="tweet"]');
      
      // Check for skeleton loaders (empty divs with background or specific classes)
      const hasSkeletonLoader = div.children.length === 0 && 
                                (computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
                                 div.className.includes('skeleton') ||
                                 div.className.includes('loading'));
      
      // Hide if it matches any loading pattern
      if (hasSpinner || isEmptyWithHeight || hasOnlySpinner || hasSkeletonLoader) {
        div.style.display = 'none';
        div.style.visibility = 'hidden';
      }
    });
    
    // Hide any empty containers that might be placeholders
    const emptyContainers = homeTimeline.querySelectorAll('div:empty');
    emptyContainers.forEach(container => {
      const computedStyle = window.getComputedStyle(container);
      const minHeight = parseInt(computedStyle.minHeight) || parseInt(container.style.minHeight) || 0;
      if (minHeight > 50) {
        container.style.display = 'none';
        container.style.visibility = 'hidden';
      }
    });
  }

  function blockFeed() {
    // Only block on home page
    if (!isHomePage()) {
      unblockFeed();
      return;
    }
    const style = createStyleElement();
    const selectors = FEED_SELECTORS.map(sel => `${sel} { display: none !important; }`).join('\n');
    style.textContent = selectors;
    
    // Also hide loading elements directly
    hideLoadingElements();
  }

  function unblockFeed() {
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }
  }

  function updateBlocking() {
    if (isBlocking && isHomePage()) {
      blockFeed();
    } else {
      unblockFeed();
    }
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
    if (isBlocking) {
      updateBlocking();
      // Also check for loading elements that appear dynamically
      setTimeout(hideLoadingElements, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Handle URL changes (Twitter/X uses client-side routing)
  let lastUrl = window.location.href;
  const urlCheckInterval = setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      updateBlocking();
    }
  }, 500);

  // Periodically check for loading elements (they can appear at any time)
  // More frequent check to catch loading states immediately
  const loadingCheckInterval = setInterval(() => {
    if (isBlocking && isHomePage()) {
      hideLoadingElements();
    }
  }, 100);

  // Also listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', () => {
    updateBlocking();
  });

  // Initial blocking
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateBlocking);
  } else {
    updateBlocking();
  }
})();

