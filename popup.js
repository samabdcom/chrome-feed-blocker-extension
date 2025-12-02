// Default blocking states
const defaultStates = {
  twitter: true,
  linkedin: true,
  youtube: true
};

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Load saved states
  chrome.storage.local.get(['twitter', 'linkedin', 'youtube'], (result) => {
    document.getElementById('twitter-toggle').checked = result.twitter !== false;
    document.getElementById('linkedin-toggle').checked = result.linkedin !== false;
    document.getElementById('youtube-toggle').checked = result.youtube !== false;
  });

  // Handle toggle changes
  document.getElementById('twitter-toggle').addEventListener('change', (e) => {
    chrome.storage.local.set({ twitter: e.target.checked }, () => {
      // Notify content script (storage.onChanged will also trigger, but this provides immediate feedback)
      chrome.tabs.query({ url: ['https://twitter.com/*', 'https://x.com/*'] }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: 'toggle', enabled: e.target.checked }).catch(() => {
            // Ignore errors (tab might not have content script loaded yet)
          });
        });
      });
    });
  });

  document.getElementById('linkedin-toggle').addEventListener('change', (e) => {
    chrome.storage.local.set({ linkedin: e.target.checked }, () => {
      // Notify content script
      chrome.tabs.query({ url: ['https://www.linkedin.com/*'] }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: 'toggle', enabled: e.target.checked }).catch(() => {
            // Ignore errors (tab might not have content script loaded yet)
          });
        });
      });
    });
  });

  document.getElementById('youtube-toggle').addEventListener('change', (e) => {
    chrome.storage.local.set({ youtube: e.target.checked }, () => {
      // Notify content script
      chrome.tabs.query({ url: ['https://www.youtube.com/*'] }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: 'toggle', enabled: e.target.checked }).catch(() => {
            // Ignore errors (tab might not have content script loaded yet)
          });
        });
      });
    });
  });
});

