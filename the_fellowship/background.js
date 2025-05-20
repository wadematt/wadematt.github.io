// Initialize extension state
chrome.runtime.onInstalled.addListener(function() {
  // Set default state to enabled
  chrome.storage.sync.set({enabled: true}, function() {
    console.log('The Fellowship extension is enabled by default');
  });
});

// Listen for tab updates to refresh content script
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    chrome.storage.sync.get(['enabled'], function(result) {
      if (result.enabled !== false) {
        // Add try-catch to handle potential errors with sending messages
        try {
          chrome.tabs.sendMessage(tabId, {
            action: "toggle",
            enabled: true
          }, function(response) {
            // Handle the case where there's no response but avoid errors
            if (chrome.runtime.lastError) {
              // This prevents the "Could not establish connection" error from being logged
              // It's normal for content scripts to not be loaded in some tabs
              console.log(`Tab ${tabId} not ready: ${chrome.runtime.lastError.message}`);
            }
          });
        } catch (e) {
          console.log('Error sending message to tab', e);
        }
      }
    });
  }
});