const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
const DEBOUNCE_DELAY = 500;

let scanTimeout;
let lastScan = 0;

const observer = new MutationObserver(debounceScan);
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  characterData: true
});

debounceScan();

function debounceScan() {
  const now = Date.now();
  const timeSinceLastScan = now - lastScan;
  
  if (timeSinceLastScan > DEBOUNCE_DELAY) {
    performScan();
  } else {
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(performScan, DEBOUNCE_DELAY - timeSinceLastScan);
  }
}

function performScan() {
  lastScan = Date.now();
  const emails = extractEmailsFromAllSources();
  sendEmailsToBackground(emails);
}

function extractEmailsFromAllSources() {
  const emailSet = new Set();

  // Texto visível
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    { acceptNode: node => 
      node.parentElement && isVisible(node.parentElement) ? 
      NodeFilter.FILTER_ACCEPT : 
      NodeFilter.FILTER_REJECT }
  );

  let node;
  while ((node = walker.nextNode())) {
    extractEmailsFromText(node.nodeValue).forEach(email => emailSet.add(email));
  }

  // Elementos ocultos
  const hiddenElements = [
    ...document.querySelectorAll('script, style, meta, link'),
    ...document.styleSheets
  ];

  hiddenElements.forEach(element => {
    try {
      if (element.sheet?.cssRules) {
        element.sheet.cssRules.forEach(rule => {
          extractEmailsFromText(rule.cssText).forEach(email => emailSet.add(email));
        });
      }
      if (element.textContent) {
        extractEmailsFromText(element.textContent).forEach(email => emailSet.add(email));
      }
    } catch (e) {}
  });

  return Array.from(emailSet);
}

function extractEmailsFromText(text) {
  const emails = text.match(EMAIL_REGEX) || [];
  return [...new Set(emails.map(email => email.toLowerCase().trim()))];
}

function isVisible(element) {
  return element.offsetWidth > 0 && 
         element.offsetHeight > 0 && 
         window.getComputedStyle(element).visibility === 'visible';
}

function sendEmailsToBackground(emails) {
  chrome.runtime.sendMessage({
    type: 'NEW_EMAILS',
    data: {
      emails,
      url: window.location.href,
      timestamp: Date.now()
    }
  });
}