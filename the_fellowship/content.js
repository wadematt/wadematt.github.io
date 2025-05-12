(function() {
  const lotrNames = ["Frodo", "Sam", "Gandalf", "Legolas", "Gimli", "Boromir", "Pippin", "Merry", "Aragorn"];
  const nameRegex = /\b([A-Z][a-z]+)\b/g; // Pre-compile the regex
  const processedNodes = new WeakSet(); // Keep track of processed nodes

  function replaceNamesInNode(node) {
    if (processedNodes.has(node)) return; // Skip if already processed
    processedNodes.add(node); // Mark node as processed

    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent;
      let lastIndex = 0;
      let replacedText = "";
      let match;
      while ((match = nameRegex.exec(textContent)) !== null) {
        const matchIndex = match.index;
        replacedText += textContent.substring(lastIndex, matchIndex);
        replacedText += lotrNames[Math.floor(Math.random() * lotrNames.length)];
        lastIndex = nameRegex.lastIndex;
      }
      replacedText += textContent.substring(lastIndex); // Add the rest of the text
      if (replacedText !== textContent) {
        node.textContent = replacedText;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (let child of node.childNodes) {
        replaceNamesInNode(child);
      }
    }
  }

  function processPage() {
    replaceNamesInNode(document.body);

    const observer = new MutationObserver((mutationsList) => {
      let changesMade = false;
      for (let mutation of mutationsList) {
        for (let addedNode of mutation.addedNodes) {
          replaceNamesInNode(addedNode);
          changesMade = true;
        }
      }
      if (changesMade) {
        //observer.disconnect(); //stop observing
        //setTimeout(processPage, 1000);
      }
    });

    observer.observe(document.body, { subtree: true, childList: true });
  }

  // Check if the script has already run
  if (document.body) {
    if (!document.body.hasAttribute('data-lotr-replace')) {
      document.body.setAttribute('data-lotr-replace', 'true'); // Prevent re-running
      processPage();
    }
  } else {
      // If document.body is not available, wait for it to load
      const bodyObserver = new MutationObserver(() => {
        if (document.body) {
          bodyObserver.disconnect();
          if (!document.body.hasAttribute('data-lotr-replace')) {
              document.body.setAttribute('data-lotr-replace', 'true');
              processPage();
          }
        }
      });
      bodyObserver.observe(document.documentElement, { childList: true, subtree: true });
  }
})();