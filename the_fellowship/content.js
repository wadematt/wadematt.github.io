// Import compromise NLP library
// Note: compromise will be loaded via the manifest.json content_scripts section

// Fellowship character names for replacement
const fellowshipNames = [
  'Frodo', 'Sam', 'Aragorn', 'Gimli', 'Legolas',
  'Gandalf', 'Merry', 'Pippin', 'Boromir'
];

// Maps to store consistent name replacements
const nameMap = new Map(); // Full name to LOTR character mapping
const namePartsMap = new Map(); // First/last name parts to full name mapping
const usedCharacters = new Set(); // Track which characters have been used

// Function to get a non-repeating fellowship name
function getNextFellowshipName() {
  // If all names have been used, reset the tracking
  if (usedCharacters.size >= fellowshipNames.length) {
    usedCharacters.clear();
  }
  
  // Find an unused character
  for (const name of fellowshipNames) {
    if (!usedCharacters.has(name)) {
      usedCharacters.add(name);
      return name;
    }
  }
  
  // Fallback (should not reach here)
  return fellowshipNames[Math.floor(Math.random() * fellowshipNames.length)];
}

// Function to get consistent replacement for a name
function getReplacementName(originalName) {
  // Strip possessive markers for consistent mapping
  let cleanName = originalName;
  let isPossessive = false;
  let endsWithS = false;
  
  // Handle possessives (name's, names')
  if (cleanName.endsWith("'s")) {
    cleanName = cleanName.slice(0, -2);
    isPossessive = true;
  } else if (cleanName.endsWith("'")) {
    cleanName = cleanName.slice(0, -1);
    isPossessive = true;
    endsWithS = true;
  }
  
  // Check if this name part has been seen before as part of a full name
  if (namePartsMap.has(cleanName)) {
    const fullName = namePartsMap.get(cleanName);
    const lotrName = nameMap.get(fullName);
    
    // Handle possessive forms properly when returning
    if (isPossessive) {
      if (lotrName.endsWith('s')) {
        return lotrName + "'";
      } else {
        return lotrName + "'s";
      }
    }
    return lotrName;
  }
  
  // If not directly in nameMap, check if it's a multi-part name
  const nameParts = cleanName.split(' ');
  
  // If this is a new name that hasn't been mapped yet
  if (!nameMap.has(cleanName)) {
    const fellowshipName = getNextFellowshipName();
    nameMap.set(cleanName, fellowshipName);
    
    // Store individual name parts for future matching
    if (nameParts.length > 1) {
      for (const part of nameParts) {
        if (part.length > 1) { // Skip initials or single letters
          namePartsMap.set(part, cleanName);
        }
      }
    }
  }
  
  const lotrName = nameMap.get(cleanName);
  
  // Return with appropriate possessive form if needed
  if (isPossessive) {
    if (lotrName.endsWith('s')) {
      return lotrName + "'";
    } else {
      return lotrName + "'s";
    }
  }
  
  return lotrName;
}

// Function to process text node and replace names
function processTextNode(textNode) {
  const text = textNode.nodeValue;
  
  try {
    // Use compromise to identify people's names
    const doc = nlp(text);
    const people = doc.people();
    
    if (people.found) {
      let newText = text;
      
      // Get all matches
      const matches = people.out('array');
      
      // Process all matches
      matches.forEach(match => {
        // First check if the name already has a title prefix
        const titlePattern = /^(Mr\.|Mrs\.|Ms\.|Miss|Dr\.|Doctor|President|Professor|Prof\.|Sir|Lady|Lord|Dame|Pope|Queen|King|Prince|Princess)\s+(.+)$/i;
        const titleMatch = match.match(titlePattern);
        
        let nameToReplace;
        let title = '';
        
        if (titleMatch) {
          // If name contains a title, separate it
          title = titleMatch[1] + ' ';
          nameToReplace = titleMatch[2];
        } else {
          // If no title, just use the name
          nameToReplace = match;
        }
        
        const replacement = getReplacementName(nameToReplace.trim());
        
        // Escape special regex characters in the match string
        const escapedMatch = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Look for the name with optional trailing punctuation
        const punctuationPattern = new RegExp(`(${escapedMatch})([,\\.;:!\\?]?)`, 'g');
        
        // Replace while preserving any trailing punctuation
        newText = newText.replace(punctuationPattern, (fullMatch, name, punctuation) => {
          return title + replacement + (punctuation || '');
        });
      });
      
      // Second pass: check for possessive forms that might not have been caught
      // This handles standalone possessives (e.g., "Leo's") where the base name was seen earlier
      for (const [origName, lotrName] of nameMap.entries()) {
        // Check for the possessive form of names
        const possessivePattern = new RegExp(`\\b${origName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'s\\b`, 'g');
        if (possessivePattern.test(newText)) {
          const lotrPossessive = lotrName.endsWith('s') ? `${lotrName}'` : `${lotrName}'s`;
          newText = newText.replace(possessivePattern, lotrPossessive);
        }
      }
      
      // Update the text node with the new text
      textNode.nodeValue = newText;
    }
  } catch (error) {
    console.error("The Fellowship extension error:", error);
  }
}

// Function to traverse DOM and process text nodes
function traverseDOM(node) {
  // Skip script and style elements
  if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE') {
    return;
  }
  
  // Process text nodes
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.nodeValue.trim() !== '') {
      processTextNode(node);
    }
  } else {
    // Recursively process child nodes
    for (let i = 0; i < node.childNodes.length; i++) {
      traverseDOM(node.childNodes[i]);
    }
  }
}

// Function to replace names on the page
function replaceNames() {
  // Clear the maps for consistency across the page
  nameMap.clear();
  namePartsMap.clear();
  usedCharacters.clear();
  
  // Process the entire document body
  traverseDOM(document.body);
  
  // Run additional processing to catch name parts and possessives
  processAdditionalNames();
}

// Check extension state and run if enabled
function checkAndRun() {
  chrome.storage.sync.get(['enabled'], function(result) {
    // Handle case when result is undefined (Firefox compatibility)
    const isEnabled = result && typeof result.enabled !== 'undefined' ? result.enabled : true;
    if (isEnabled) {
      replaceNames();
    }
  });
}

// Listen for messages from popup/background scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "toggle") {
    if (request.enabled) {
      replaceNames();
    } else {
      // Reload the page to restore original names
      window.location.reload();
    }
  }
  sendResponse({status: "processed"});
  return true;
});

// Create a MutationObserver to detect DOM changes
const observer = new MutationObserver(function(mutations) {
  chrome.storage.sync.get(['enabled'], function(result) {
    // Handle case when result is undefined (Firefox compatibility)
    const isEnabled = result && typeof result.enabled !== 'undefined' ? result.enabled : true;
    if (isEnabled) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            traverseDOM(mutation.addedNodes[i]);
          }
          
          // After processing all new nodes, run the additional processing
          processAdditionalNames();
        }
      });
    }
  });
});

// Run the name replacement when the page loads
document.addEventListener('DOMContentLoaded', function() {
  checkAndRun();
  
  // Set up the observer to monitor DOM changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});

// Run initial check for pages that are already loaded
checkAndRun();

// Function to handle additional name forms that might be missed by NLP
function processAdditionalNames() {
  // Create a secondary map for additional replacements
  const additionalReplacements = new Map();
  
  // For each full name that we've already mapped
  for (const [fullName, lotrCharacter] of nameMap.entries()) {
    // Split the name into parts (first, last, etc.)
    const parts = fullName.split(/\s+/);
    
    if (parts.length > 1) {
      // Store individual name parts for direct replacement
      for (const part of parts) {
        if (part.length > 1) { // Skip single letters or initials
          // Map name parts to corresponding parts of the LOTR name
          additionalReplacements.set(part, lotrCharacter);
          
          // Also handle possessive forms
          additionalReplacements.set(part + "'s", 
            lotrCharacter.endsWith('s') ? lotrCharacter + "'" : lotrCharacter + "'s");
        }
      }
    }
  }
  
  // Get all text nodes in the document
  const textNodes = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    { acceptNode: node => node.nodeValue.trim() !== '' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT },
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  
  // Process each text node to replace name parts
  textNodes.forEach(textNode => {
    let text = textNode.nodeValue;
    let modified = false;
    
    // Apply all additional replacements with punctuation preservation
    for (const [original, replacement] of additionalReplacements.entries()) {
      const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match word boundaries and capture trailing punctuation
      const regex = new RegExp(`\\b${escapedOriginal}([,\\.;:!\\?]?)\\b`, 'g');
      
      if (regex.test(text)) {
        text = text.replace(regex, `${replacement}$1`);
        modified = true;
      }
    }
    
    // Update the text node if changes were made
    if (modified) {
      textNode.nodeValue = text;
    }
  });
}