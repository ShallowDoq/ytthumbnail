(() => {
  const form = document.getElementById('thumbnail-form');
  const input = document.getElementById('youtube-url');
  const submitButton = document.getElementById('submit-button');
  const clearButton = document.getElementById('clear-button');
  const message = document.getElementById('form-message');
  const emptyState = document.getElementById('empty-state');
  const grid = document.getElementById('thumbnail-grid');
  const results = document.getElementById('results');
  const videoIdDisplay = document.getElementById('video-id-display');

  const qualities = [
    { name: 'Maximum Resolution', file: 'maxresdefault.jpg' },
    { name: 'High Quality', file: 'hqdefault.jpg' },
    { name: 'Medium Quality', file: 'mqdefault.jpg' },
    { name: 'Standard Quality', file: 'sddefault.jpg' }
  ];

  function getVideoId(value) {
    let url;
    try {
      url = new URL(value.trim().match(/^https?:\/\//i) ? value.trim() : `https://${value.trim()}`);
    } catch {
      return { error: 'invalid' };
    }

    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    let id = '';
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || '';
    else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
      else {
        const parts = url.pathname.split('/').filter(Boolean);
        if (['shorts', 'embed', 'v', 'live'].includes(parts[0])) id = parts[1] || '';
      }
    } else {
      return { error: 'invalid' };
    }

    id = id.split(/[?&#/]/)[0];
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? { id } : { error: 'missing' };
  }

  function setMessage(text = '', type = '') {
    message.textContent = text;
    message.className = `form-message ${type}`.trim();
  }

  function thumbnailUrl(id, file) {
    return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${file}`;
  }

  function imageExists(url) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image.naturalWidth > 120 && image.naturalHeight > 90);
      image.onerror = () => resolve(false);
      image.src = url;
    });
  }

  function createCard(quality, url) {
    const card = document.createElement('article');
    card.className = 'thumbnail-card';
    const preview = document.createElement('img');
    preview.className = 'thumbnail-preview';
    preview.src = url;
    preview.alt = `${quality.name} YouTube video thumbnail`;
    preview.loading = 'lazy';

    const content = document.createElement('div');
    content.className = 'card-content';
    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = quality.name;
    const urlText = document.createElement('p');
    urlText.className = 'image-url';
    urlText.title = url;
    urlText.textContent = url;
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const download = document.createElement('button');
    download.className = 'button button-primary';
    download.type = 'button';
    download.textContent = 'Download';
    download.addEventListener('click', () => downloadImage(url, quality.file));
    const copy = document.createElement('button');
    copy.className = 'button button-secondary button-copy';
    copy.type = 'button';
    copy.textContent = 'Copy URL';
    copy.addEventListener('click', () => copyUrl(url, copy));
    actions.append(download, copy);
    content.append(title, urlText, actions);
    card.append(preview, content);
    return card;
  }

  async function downloadImage(url, filename) {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error('Download unavailable');
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async function copyUrl(url, button) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const helper = document.createElement('textarea');
      helper.value = url;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      helper.remove();
    }
    button.textContent = 'Copied!';
    button.classList.add('copied');
    window.setTimeout(() => {
      button.textContent = 'Copy URL';
      button.classList.remove('copied');
    }, 1600);
  }

  function reset() {
    input.value = '';
    grid.replaceChildren();
    emptyState.hidden = false;
    emptyState.querySelector('p').textContent = 'Paste a YouTube video URL above to see available thumbnail sizes.';
    videoIdDisplay.hidden = true;
    clearButton.hidden = true;
    setMessage();
    input.focus();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return setMessage('Please enter a YouTube URL.', 'error');
    const result = getVideoId(value);
    if (result.error === 'invalid') return setMessage('Please enter a valid YouTube video URL.', 'error');
    if (result.error === 'missing') return setMessage("We couldn't find a YouTube video ID in that URL.", 'error');

    submitButton.disabled = true;
    submitButton.classList.add('is-loading');
    clearButton.hidden = false;
    setMessage('Checking available thumbnail sizes...');
    grid.replaceChildren();
    emptyState.hidden = true;

    const options = qualities.map((quality) => ({ ...quality, url: thumbnailUrl(result.id, quality.file) }));
    const available = await Promise.all(options.map(async (option) => (await imageExists(option.url)) ? option : null));
    available.filter(Boolean).forEach((option) => grid.appendChild(createCard(option, option.url)));

    videoIdDisplay.textContent = `Video ID: ${result.id}`;
    videoIdDisplay.hidden = false;
    if (grid.childElementCount) setMessage(`${grid.childElementCount} thumbnail option${grid.childElementCount === 1 ? '' : 's'} available.`);
    else {
      emptyState.hidden = false;
      emptyState.querySelector('p').textContent = 'No thumbnail images were available for this video.';
      setMessage('We could not find any thumbnail images for this video.', 'error');
    }
    submitButton.disabled = false;
    submitButton.classList.remove('is-loading');
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  clearButton.addEventListener('click', reset);
})();
