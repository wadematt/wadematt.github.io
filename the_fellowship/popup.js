document.addEventListener('DOMContentLoaded', function() {
  const toggleSwitch = document.getElementById('toggleSwitch');
  
  // Load the current state from storage
  chrome.storage.sync.get(['enabled'], function(result) {
    // Default to enabled if not set
    toggleSwitch.checked = result.enabled !== false;
  });
  
  // Save the state when the toggle is clicked
  toggleSwitch.addEventListener('change', function() {
    const enabled = toggleSwitch.checked;
    
    // Save the state to storage
    chrome.storage.sync.set({enabled: enabled}, function() {
      console.log('The Fellowship extension is ' + (enabled ? 'enabled' : 'disabled'));
      
      // Send message to content script and background script
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "toggle",
            enabled: enabled
          });
        }
      });
    });
  });
});