# Changelog for The Fellowship

All notable changes to The Fellowship browser extension will be documented in this file.

## [2.2.0] - 1 June 2025

### Enhanced
- Better utilization of Compromise.js NLP library resulting in more accurate name detection
- Name-to-LOTR character mappings now consistently persist throughout the entire page

### Technical Improvements
- Replaced simple character cycling with sophisticated usage tracking using Map data structure
- Added comprehensive character usage counting to ensure balanced distribution
- Optimized performance with better data structure management
- Enhanced debugging capabilities with detailed usage statistics logging

## [2.1.0] - 25 May 2025

### Enhanced
- Advanced name consistency throughout documents:
  - Improved partial name detection (first/last names are now tracked and replaced consistently)
  - Enhanced possessive form handling (e.g., "Leo's" → "Frodo's" when "Pope Leo" → "Pope Frodo")
  - Better punctuation preservation for names with trailing commas, periods, etc.
- Optimized LOTR character assignment:
  - Implemented cycling through all Fellowship characters before reusing any names
  - More equitable distribution of character names across detected people

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