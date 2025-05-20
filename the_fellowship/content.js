// Import compromise NLP library
// Note: compromise will be loaded via the manifest.json content_scripts section

// Fellowship character names for replacement
const fellowshipNames = [
  'Frodo', 'Sam', 'Aragorn', 'Gimli', 'Legolas',
  'Gandalf', 'Merry', 'Pippin', 'Boromir'
];

// Map to store consistent name replacements
const nameMap = new Map();

// Function to get a random fellowship name
function getRandomFellowshipName() {
  const randomIndex = Math.floor(Math.random() * fellowshipNames.length);
  return fellowshipNames[randomIndex];
}

// Function to get consistent replacement for a name
function getReplacementName(originalName) {
  if (!nameMap.has(originalName)) {
    nameMap.set(originalName, getRandomFellowshipName());
  }
  return nameMap.get(originalName);
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
      const matches = people.out('array');      // Replace each name with a fellowship name
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
        
        // Simple replacement preserving the title if it exists
        newText = newText.replace(new RegExp(escapedMatch, 'g'), title + replacement);
      });
      
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
  // Clear the name map for consistency across the page
  nameMap.clear();
  
  // Process the entire document body
  traverseDOM(document.body);
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