document.addEventListener('DOMContentLoaded', initPopup);

async function initPopup() {
  await loadAndRenderEmails();
  setupEventListeners();
}

async function loadAndRenderEmails(filter = '') {
  const { emails } = await chrome.storage.local.get({ emails: [] });
  const filtered = emails.filter(e => 
    e.address.includes(filter) || 
    e.source.includes(filter)
  );
  
  document.getElementById('email-count').textContent = filtered.length;
  renderEmailList(filtered);
}

function renderEmailList(emails) {
  const container = document.getElementById('email-list');
  container.innerHTML = emails.map(email => `
    <div class="email-item">
      <span>${email.address}</span>
      <span title="${email.source}">${new URL(email.source).hostname}</span>
      <span>${new Date(email.timestamp).toLocaleDateString()}</span>
    </div>
  `).join('');
}

function setupEventListeners() {
  document.getElementById('search').addEventListener('input', async (e) => {
    await loadAndRenderEmails(e.target.value.toLowerCase());
  });

  document.getElementById('copy-all').addEventListener('click', async () => {
    const { emails } = await chrome.storage.local.get({ emails: [] });
    const text = emails.map(e => e.address).join('\n');
    navigator.clipboard.writeText(text);
  });

  document.getElementById('export-csv').addEventListener('click', () => exportData('csv'));
  document.getElementById('export-json').addEventListener('click', () => exportData('json'));
}

function exportData(format) {
  chrome.storage.local.get({ emails: [] }, ({ emails }) => {
    let content, mime, ext;
    
    if (format === 'csv') {
      content = 'Email,Origem,Data\n' +
        emails.map(e => `"${e.address}","${e.source}","${e.timestamp}"`).join('\n');
      mime = 'text/csv';
      ext = 'csv';
    } else {
      content = JSON.stringify(emails, null, 2);
      mime = 'application/json';
      ext = 'json';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: url,
      filename: `emails_${new Date().toISOString().slice(0,10)}.${ext}`
    });
  });
}