const emailCache = new Set();
let scanningActive = true;
let processing = false;
const processQueue = [];

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'NEW_EMAILS' && scanningActive) {
    processQueue.push(message.data);
    processEmailsBatch();
    return true;
  }
});

async function processEmailsBatch() {
  if (processing || processQueue.length === 0) return;
  processing = true;

  try {
    const stored = await chrome.storage.local.get({ emails: [] });
    const newEmails = [];
    const batch = processQueue.splice(0, processQueue.length);

    batch.forEach(({ emails, url, timestamp }) => {
      emails.filter(email => 
        !emailCache.has(email) && 
        validateEmail(email) &&
        !isDisposableDomain(email)
      ).forEach(email => {
        newEmails.push({
          address: email,
          source: url,
          timestamp: new Date(timestamp).toISOString()
        });
        emailCache.add(email);
      });
    });

    if (newEmails.length > 0) {
      const updatedEmails = [...stored.emails, ...newEmails];
      await chrome.storage.local.set({ emails: updatedEmails });
      updateBadgeCount(updatedEmails.length);
    }
  } catch (error) {
    console.error('Error processing emails:', error);
  } finally {
    processing = false;
    processEmailsBatch();
  }
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && 
         !email.endsWith('.png') && 
         !email.endsWith('.jpg');
}

function isDisposableDomain(email) {
  const disposableDomains = [
    'tempmail.com', 'mailinator.com', 'guerrillamail.com'
  ];
  const domain = email.split('@')[1];
  return disposableDomains.includes(domain);
}

function updateBadgeCount(count) {
  try {
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

// Inicialização
chrome.storage.local.get({ emails: [] }, (data) => {
  data.emails.forEach(e => emailCache.add(e.address));
  updateBadgeCount(data.emails.length);
});