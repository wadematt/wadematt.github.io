# The Fellowship Browser Extension

This browser extension detects and replaces people's names on webpages with characters from The Lord of the Rings.

## Features

- Replaces detected people's names with characters from The Fellowship: Frodo, Sam, Aragorn, Gimli, Legolas, Gandalf, Merry, Pippin, or Boromir
- Preserves titles like President, Mr., Ms., Doctor, etc.
- Consistently replaces the same name with the same character throughout a page
- Uses a local copy of the Compromise NLP library for accurate name detection
- Simple LOTR themed UI with toggle to enable/disable the extension

## Browser Compatibility

This extension is designed to work on Chrome, Edge, and Firefox. Due to differences in how browsers implement the Manifest V3 standard, we provide two manifest files:

1. **manifest.json** - For Chrome and Edge
2. **manifest-firefox.json** - For Firefox

### Installing on Different Browsers for Development

#### Chrome and Edge
1. Open Chrome/Edge and navigate to `chrome://extensions/` or `edge://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the extension directory
4. Use the default `manifest.json` file

#### Firefox
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select the `manifest-firefox.json` file in the extension directory
   (alternatively, you can temporarily rename `manifest-firefox.json` to `manifest.json`)

### Key Differences Between Manifests

- **Chrome/Edge**: Uses `service_worker` for the background script
- **Firefox**: Uses `scripts` array for the background script and includes Firefox-specific settings

## Usage

1. Click on the extension icon in your browser toolbar
2. Toggle the switch to enable or disable the name replacement
3. Browse the web and enjoy seeing The Fellowship members everywhere!

## Creating a Production Version

When creating the final version of your extension for different stores:

1. For Chrome Web Store / Edge Add-ons:
   - Use the default `manifest.json`

2. For Firefox Add-ons:
   - Use `manifest-firefox.json` (renamed to `manifest.json`)

## How It Works

The extension uses the Compromise NLP library to detect people's names in the page content. When a name is detected, it's replaced with a character from The Fellowship while preserving any titles. The extension maintains a consistent mapping so that the same person is always replaced with the same character within a page.

## Technologies Used

- JavaScript
- Compromise NLP library
- Chrome Extensions API