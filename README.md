# Chrome Feed Blocker Extension

A Chrome extension that blocks (hides) main feeds on Twitter/X, LinkedIn, and YouTube. Users can toggle blocking on/off for each site individually.

## Features

- Block main feeds on Twitter/X, LinkedIn, and YouTube
- Hide video recommendations sidebar on YouTube watch pages
- Individual toggle controls for each site
- Persistent settings using Chrome storage
- Real-time blocking/unblocking without page reload

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-feed-blocker-extension` folder
5. The extension icon should appear in your Chrome toolbar

## Usage

1. Click the extension icon in your Chrome toolbar
2. Use the toggle switches to enable/disable feed blocking for each site:
   - Twitter / X
   - LinkedIn
   - YouTube
3. Settings are saved automatically and persist across browser sessions

## Icons

You'll need to add icon files to the `icons/` directory:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

You can create simple icons or use any image editor to generate them. The extension will work without icons, but Chrome may show a default placeholder.

## How It Works

- Content scripts inject CSS to hide feed containers on each site
- Uses Chrome storage API to persist toggle states
- Listens for storage changes to update blocking state dynamically
- Handles dynamic content loading with MutationObserver

