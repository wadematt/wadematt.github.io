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
  // Normalize the name (trim whitespace, handle case)
  const cleanName = originalName.trim();
  
  // Skip very short names or single letters (likely initials)
  if (cleanName.length < 2) {
    return cleanName;
  }
  
  // Check if this exact name has been mapped before
  if (nameMap.has(cleanName)) {
    return nameMap.get(cleanName);
  }
  
  // Check if any part of this name has been seen before as part of a full name
  const nameParts = cleanName.split(/\s+/);
  for (const part of nameParts) {
    if (part.length > 1 && namePartsMap.has(part)) {
      const fullName = namePartsMap.get(part);
      const lotrName = nameMap.get(fullName);
      if (lotrName) {
        // If we found a match through name parts, use that character
        nameMap.set(cleanName, lotrName);
        return lotrName;
      }
    }
  }
  
  // This is a new name, assign a new Fellowship character
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
  
  return fellowshipName;
}

// Function to process text node and replace names
function processTextNode(textNode) {
  const text = textNode.nodeValue;
  
  try {
    // Use compromise to identify people's names
    const doc = nlp(text);
    const people = doc.people();
    
    // Check if any people were found
    if (people.length > 0) {
      let newText = text;
      
      // Get all person entities as an array with their text
      people.forEach(person => {
        const nameText = person.text();
        
        // Skip empty or very short strings
        if (!nameText || nameText.length < 2) return;
        
        // Handle possessive forms
        let cleanName = nameText;
        let isPossessive = false;
        let possessiveSuffix = '';
        
        // Check for possessive markers
        if (cleanName.endsWith("'s")) {
          cleanName = cleanName.slice(0, -2);
          isPossessive = true;
          possessiveSuffix = "'s";
        } else if (cleanName.endsWith("'")) {
          cleanName = cleanName.slice(0, -1);
          isPossessive = true;
          possessiveSuffix = "'";
        }
        
        // Check for title prefixes
        const titlePattern = /^(Mr\.|Mrs\.|Ms\.|Miss|Dr\.|Doctor|President|Professor|Prof\.|Sir|Lady|Lord|Dame|Pope|Queen|King|Prince|Princess)\s+(.+)$/i;
        const titleMatch = cleanName.match(titlePattern);
        
        let nameToMap;
        let titlePrefix = '';
        
        if (titleMatch) {
          titlePrefix = titleMatch[1] + ' ';
          nameToMap = titleMatch[2];
        } else {
          nameToMap = cleanName;
        }
        
        // Get the LOTR replacement
        const replacement = getReplacementName(nameToMap.trim());
        
        // Build the final replacement with title and possessive
        let finalReplacement = titlePrefix + replacement;
        if (isPossessive) {
          if (replacement.endsWith('s')) {
            finalReplacement += "'";
          } else {
            finalReplacement += "'s";
          }
        }
        
        // Create a regex to find and replace the exact match
        const escapedOriginal = nameText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameRegex = new RegExp(`\\b${escapedOriginal}\\b`, 'g');
        
        newText = newText.replace(nameRegex, finalReplacement);
      });
      
      // Update the text node if changes were made
      if (newText !== text) {
        textNode.nodeValue = newText;
      }
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
  
  // Run additional processing to catch name parts that compromise might have missed
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
      let hasNewNodes = false;
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
              traverseDOM(node);
              hasNewNodes = true;
            }
          }
        }
      });
      
      // Run additional processing after handling all mutations
      if (hasNewNodes) {
        processAdditionalNames();
      }
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
  // Get all text nodes in the document
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        return node.nodeValue.trim() !== '' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    },
    false
  );
  
  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    // Skip script and style elements
    if (node.parentNode && (node.parentNode.nodeName === 'SCRIPT' || node.parentNode.nodeName === 'STYLE')) {
      continue;
    }
    textNodes.push(node);
  }
  
  // Process each text node to replace name parts that weren't caught by compromise
  textNodes.forEach(textNode => {
    let text = textNode.nodeValue;
    let modified = false;
    
    // For each mapped full name, check if individual parts appear in the text
    for (const [fullName, lotrCharacter] of nameMap.entries()) {
      const nameParts = fullName.split(/\s+/);
      
      // Only process multi-part names
      if (nameParts.length > 1) {
        nameParts.forEach(part => {
          if (part.length > 1) { // Skip initials
            // Create patterns for the name part and its possessive forms
            const escapedPart = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Match standalone name parts (not already replaced)
            const partRegex = new RegExp(`\\b${escapedPart}\\b(?!'[s]?)`, 'g');
            const possessiveRegex = new RegExp(`\\b${escapedPart}'s\\b`, 'g');
            const possessiveOnlyRegex = new RegExp(`\\b${escapedPart}'\\b`, 'g');
            
            // Replace standalone part
            if (partRegex.test(text)) {
              text = text.replace(partRegex, lotrCharacter);
              modified = true;
            }
            
            // Replace possessive forms
            const lotrPossessive = lotrCharacter.endsWith('s') ? `${lotrCharacter}'` : `${lotrCharacter}'s`;
            if (possessiveRegex.test(text)) {
              text = text.replace(possessiveRegex, lotrPossessive);
              modified = true;
            }
            
            // Handle names ending in 's' with just an apostrophe
            if (possessiveOnlyRegex.test(text) && part.endsWith('s')) {
              text = text.replace(possessiveOnlyRegex, `${lotrCharacter}'`);
              modified = true;
            }
          }
        });
      }
    }
    
    // Update the text node if changes were made
    if (modified) {
      textNode.nodeValue = text;
    }
  });
}