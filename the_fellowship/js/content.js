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
const characterUsageCount = new Map(); // Track how many times each character has been used

// Initialize usage count for all characters
fellowshipNames.forEach(name => {
  characterUsageCount.set(name, 0);
});

// Function to get a randomly selected fellowship name with balanced distribution
function getNextFellowshipName() {
  // Find the minimum usage count
  const minUsage = Math.min(...characterUsageCount.values());
  
  // Get all characters that have the minimum usage count
  const availableCharacters = fellowshipNames.filter(name => 
    characterUsageCount.get(name) === minUsage
  );
  
  // Randomly select from the least-used characters
  const randomIndex = Math.floor(Math.random() * availableCharacters.length);
  const selectedCharacter = availableCharacters[randomIndex];
  
  // Increment the usage count for the selected character
  characterUsageCount.set(selectedCharacter, characterUsageCount.get(selectedCharacter) + 1);
  
  console.log(`[Fellowship] Selected character: ${selectedCharacter} (usage count: ${characterUsageCount.get(selectedCharacter)})`);
  console.log(`[Fellowship] Current usage counts:`, Object.fromEntries(characterUsageCount));
  
  return selectedCharacter;
}

// Function to get consistent replacement for a name
function getReplacementName(originalName) {
  // Normalize the name (trim whitespace, handle case)
  const cleanName = originalName.trim();
  
  // Skip very short names or single letters (likely initials)
  if (cleanName.length < 2) {
    return cleanName;
  }
  
  console.log(`[Fellowship] Getting replacement for: "${originalName}" -> clean: "${cleanName}"`);
  
  // Check if this exact name has been mapped before
  if (nameMap.has(cleanName)) {
    const result = nameMap.get(cleanName);
    console.log(`[Fellowship] Found exact match: ${cleanName} -> ${result}`);
    return result;
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
        console.log(`[Fellowship] Found via part match: ${part} -> ${fullName} -> ${lotrName}, mapping ${cleanName} -> ${lotrName}`);
        return lotrName;
      }
    }
  }
  
  // This is a new name, assign a new Fellowship character
  const fellowshipName = getNextFellowshipName();
  nameMap.set(cleanName, fellowshipName);
  console.log(`[Fellowship] New mapping: ${cleanName} -> ${fellowshipName}`);
  
  // Store individual name parts for future matching
  if (nameParts.length > 1) {
    for (const part of nameParts) {
      if (part.length > 1) { // Skip initials or single letters
        namePartsMap.set(part, cleanName);
        console.log(`[Fellowship] Name part mapping: ${part} -> ${cleanName}`);
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
      const processedNames = new Set(); // Track what we've already processed
      
      // Get all person entities and their text
      people.forEach(person => {
        const nameText = person.text().trim();
        
        // Skip empty, very short strings, or already processed names
        if (!nameText || nameText.length < 2 || processedNames.has(nameText.toLowerCase())) return;
        
        processedNames.add(nameText.toLowerCase());
        
        // Process this name and get replacement
        const replacement = processNameText(nameText);
        
        if (replacement && replacement !== nameText) {
          // Create a regex to find and replace the exact match with word boundaries
          const escapedOriginal = nameText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const nameRegex = new RegExp(`\\b${escapedOriginal}\\b`, 'g');
          
          newText = newText.replace(nameRegex, replacement);
        }
      });
      
      // Additional pass: look for possessive forms and standalone names that might have been missed
      newText = processAdditionalNameForms(newText);
      
      // Update the text node if changes were made
      if (newText !== text) {
        textNode.nodeValue = newText;
      }
    }
  } catch (error) {
    console.error("The Fellowship extension error:", error);
  }
}

// Helper function to process a single name text and return replacement
function processNameText(nameText) {
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
  
  return finalReplacement;
}

// Helper function to handle additional name forms
function processAdditionalNameForms(text) {
  let newText = text;
  
  // Look for possessive forms that might not have been caught by compromise
  // Pattern: Word followed by 's or just ' (for names ending in s)
  const possessivePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'s?\b/g;
  
  newText = newText.replace(possessivePattern, (match, baseName) => {
    // Check if this name (without possessive) has already been mapped
    const mappedName = findMappedName(baseName);
    if (mappedName) {
      // Return the possessive form of the mapped name
      if (match.endsWith("'s")) {
        return mappedName.endsWith('s') ? mappedName + "'" : mappedName + "'s";
      } else if (match.endsWith("'")) {
        return mappedName + "'";
      }
    }
    return match; // Return unchanged if no mapping found
  });
  
  return newText;
}

// Helper function to find if a name has been mapped
function findMappedName(searchName) {
  // First check direct mapping
  if (nameMap.has(searchName)) {
    return nameMap.get(searchName);
  }
  
  // Check if this is part of a longer name that was mapped
  for (const [fullName, lotrName] of nameMap.entries()) {
    const nameParts = fullName.split(/\s+/);
    if (nameParts.includes(searchName)) {
      return lotrName;
    }
  }
  
  return null;
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
  
  // Reset character usage counts to ensure balanced distribution per page
  fellowshipNames.forEach(name => {
    characterUsageCount.set(name, 0);
  });
  
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
  
  // Process each text node to ensure name consistency
  textNodes.forEach(textNode => {
    let text = textNode.nodeValue;
    let modified = false;
    
    // Look for any remaining instances of mapped names (including possessive forms)
    for (const [fullName, lotrCharacter] of nameMap.entries()) {
      const nameParts = fullName.split(/\s+/);
      
      // Process each part of the name
      nameParts.forEach(part => {
        if (part.length > 1) { // Skip initials
          const escapedPart = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          // Look for standalone instances of this name part
          const standaloneRegex = new RegExp(`\\b${escapedPart}\\b(?!'s?)`, 'g');
          
          // Look for possessive instances
          const possessiveRegex = new RegExp(`\\b${escapedPart}'s\\b`, 'g');
          const possessiveOnlyRegex = new RegExp(`\\b${escapedPart}'\\b`, 'g');
          
          // Replace standalone instances
          if (standaloneRegex.test(text)) {
            text = text.replace(standaloneRegex, lotrCharacter);
            modified = true;
          }
          
          // Replace possessive forms
          if (possessiveRegex.test(text)) {
            const lotrPossessive = lotrCharacter.endsWith('s') ? `${lotrCharacter}'` : `${lotrCharacter}'s`;
            text = text.replace(possessiveRegex, lotrPossessive);
            modified = true;
          }
          
          // Handle possessive-only (for names ending in 's')
          if (possessiveOnlyRegex.test(text)) {
            text = text.replace(possessiveOnlyRegex, `${lotrCharacter}'`);
            modified = true;
          }
        }
      });
      
      // Also check for the full name in possessive form
      const escapedFullName = fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const fullNamePossessiveRegex = new RegExp(`\\b${escapedFullName}'s\\b`, 'g');
      const fullNamePossessiveOnlyRegex = new RegExp(`\\b${escapedFullName}'\\b`, 'g');
      
      if (fullNamePossessiveRegex.test(text)) {
        const lotrPossessive = lotrCharacter.endsWith('s') ? `${lotrCharacter}'` : `${lotrCharacter}'s`;
        text = text.replace(fullNamePossessiveRegex, lotrPossessive);
        modified = true;
      }
      
      if (fullNamePossessiveOnlyRegex.test(text)) {
        text = text.replace(fullNamePossessiveOnlyRegex, `${lotrCharacter}'`);
        modified = true;
      }
    }
    
    // Update the text node if changes were made
    if (modified) {
      textNode.nodeValue = text;
    }
  });
}