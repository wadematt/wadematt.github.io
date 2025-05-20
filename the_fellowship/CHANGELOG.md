# Changelog for The Fellowship

All notable changes to The Fellowship browser extension will be documented in this file.

## [2.0.0] - 20 May 2025

### Added
- Lord of the Rings (LOTR) themed UI
- Toggle switch to enable/disable the extension without uninstalling
- State persistence using Chrome storage API to remember user preferences
- Consistent name mapping system so the same person always becomes the same LOTR character on a page
- Support for dynamically loaded content via MutationObserver API
- Comprehensive error handling to prevent extension crashes

### Changed
- Completely rewrote name detection logic:
  - Switched from basic RegExp pattern matching to Natural Language Processing (NLP)
  - Integrated the Compromise.js NLP library for vastly improved name recognition
  - Added language processing to detect and properly handle names in context
- Improved title preservation (Mr., Mrs., Dr., Professor, etc.) when replacing names
- Enhanced capitalization preservation to maintain proper text formatting
- Better handling of complex DOM structures for more accurate replacements
- More efficient page processing with reduced performance impact

### Fixed
- Significantly reduced false positives (incorrectly replacing non-names)
- Significantly reduced false negatives (failing to recognize actual names)
- Fixed issues with partial name matches and name fragments
- Addressed problems with names inside quotes and special formatting
- Improved handling of names across different languages and contexts

## [1.0.0] - 12 May 2025

### Initial Release
- Basic name replacement using regular expression pattern matching
- Support for replacing people's names with Lord of the Rings characters