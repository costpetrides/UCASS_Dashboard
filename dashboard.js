var plotCatalog = window.PLOT_CATALOG || { campaigns: [], labels: {}, plots: {}, availability: {} };
var compareQueue = [];
var lastDateSlug = null;
var lastTabKind = 'overview';
var TAB_KINDS = ['overview', 'combined', 'scatter', 'wind'];

function campaignLabel(folderName) {
  if (plotCatalog.labels && plotCatalog.labels[folderName]) {
    return plotCatalog.labels[folderName];
  }
  return folderName;
}

function tabKindFromTarget(target) {
  if (!target) return 'overview';
  for (var i = 0; i < TAB_KINDS.length; i++) {
    var kind = TAB_KINDS[i];
    if (target.indexOf(kind + '-') === 0) return kind;
  }
  return 'overview';
}

function activateTabForPanel(panel, kind) {
  if (!panel) return;
  var tabs = panel.querySelectorAll('.tab-btn');
  var tabPanels = panel.querySelectorAll('.tab-panel');
  var matched = null;

  tabs.forEach(function(btn) {
    if (tabKindFromTarget(btn.getAttribute('data-target')) === kind) {
      matched = btn;
    }
  });
  if (!matched && tabs.length) matched = tabs[0];

  tabs.forEach(function(b) { b.classList.remove('active'); });
  tabPanels.forEach(function(p) { p.classList.remove('active'); });

  if (!matched) return;

  matched.classList.add('active');
  var id = matched.getAttribute('data-target');
  var el = panel.querySelector('#' + id);
  if (el) el.classList.add('active');
}

function updateComparisonTab() {
  var tab = document.getElementById('comparison-tab');
  if (!tab) return;
  tab.classList.toggle('has-items', compareQueue.length > 0);
  tab.textContent = compareQueue.length
    ? 'Comparison (' + compareQueue.length + ')'
    : 'Comparison';
}

function activateView(slug) {
  var isCompare = slug === 'compare';
  if (!isCompare) lastDateSlug = slug;

  document.querySelectorAll('.campaign-btn').forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('data-slug') === slug);
  });
  document.querySelectorAll('.campaign-panel').forEach(function(p) {
    p.classList.toggle('active', !isCompare && p.id === 'campaign-' + slug);
  });

  var comparePanel = document.getElementById('compare-panel');
  if (comparePanel) comparePanel.classList.toggle('active', isCompare);
  if (isCompare) renderComparisonFromQueue();
  if (!isCompare) {
    activateTabForPanel(document.getElementById('campaign-' + slug), lastTabKind);
  }
  syncQueuedCards();
}

function activateCampaign(slug) {
  activateView(slug);
}

document.querySelectorAll('.campaign-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    activateView(btn.getAttribute('data-slug'));
  });
});

document.querySelectorAll('.campaign-panel').forEach(function(panel) {
  var tabs = panel.querySelectorAll('.tab-btn');
  var tabPanels = panel.querySelectorAll('.tab-panel');
  tabs.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = btn.getAttribute('data-target');
      lastTabKind = tabKindFromTarget(id);
      tabs.forEach(function(b) { b.classList.remove('active'); });
      tabPanels.forEach(function(p) { p.classList.remove('active'); });
      btn.classList.add('active');
      var el = panel.querySelector('#' + id);
      if (el) el.classList.add('active');
    });
  });
});

var firstCampaign = document.querySelector('.campaign-btn:not(.comparison-tab)');
if (firstCampaign) {
  lastDateSlug = firstCampaign.getAttribute('data-slug');
  activateView(lastDateSlug);
}

var lightbox = document.getElementById('plot-lightbox');
var lightboxImg = lightbox ? lightbox.querySelector('img') : null;
var lightboxCaption = lightbox ? lightbox.querySelector('.lightbox-caption') : null;
var lightboxPrev = lightbox ? lightbox.querySelector('.lightbox-prev') : null;
var lightboxNext = lightbox ? lightbox.querySelector('.lightbox-next') : null;
var lightboxItems = [];
var lightboxIndex = -1;

function isLightboxOpen() {
  return !!(lightbox && lightbox.classList.contains('active'));
}

function updateLightboxNav() {
  var multi = lightboxItems.length > 1;
  if (lightboxPrev) {
    lightboxPrev.hidden = false;
    lightboxPrev.disabled = !multi;
  }
  if (lightboxNext) {
    lightboxNext.hidden = false;
    lightboxNext.disabled = !multi;
  }
}

function showLightboxAt(index) {
  if (!lightbox || !lightboxImg || !lightboxItems.length) return;
  var n = lightboxItems.length;
  lightboxIndex = ((index % n) + n) % n;
  var item = lightboxItems[lightboxIndex];
  lightboxImg.src = item.src;
  lightboxImg.alt = item.caption;
  if (lightboxCaption) {
    var counter = n > 1 ? ' (' + (lightboxIndex + 1) + '/' + n + ')' : '';
    lightboxCaption.textContent = (item.caption || '') + counter;
  }
  updateLightboxNav();
}

function openLightbox(src, caption, gallery) {
  if (!lightbox || !lightboxImg) return;
  lightboxItems = Array.isArray(gallery) && gallery.length
    ? gallery.slice()
    : [{ src: src, caption: caption || '' }];
  var idx = lightboxItems.findIndex(function(item) { return item.src === src; });
  if (idx < 0) {
    lightboxItems.unshift({ src: src, caption: caption || '' });
    idx = 0;
  }
  showLightboxAt(idx);
  lightbox.classList.add('active');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('lightbox-open');
}

function closeLightbox() {
  if (!lightbox || !lightboxImg) return;
  lightbox.classList.remove('active');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxImg.removeAttribute('src');
  document.body.classList.remove('lightbox-open');
  lightboxItems = [];
  lightboxIndex = -1;
  if (lightboxPrev) lightboxPrev.hidden = true;
  if (lightboxNext) lightboxNext.hidden = true;
}

function lightboxStep(delta) {
  if (!isLightboxOpen() || lightboxItems.length < 2) return;
  showLightboxAt(lightboxIndex + delta);
}

function compareGalleryFromGrid() {
  var imgs = document.querySelectorAll('#compare-grid .figure');
  var gallery = [];
  imgs.forEach(function(img) {
    gallery.push({ src: img.src, caption: img.alt || '' });
  });
  return gallery;
}

function isComparePanelActive() {
  var panel = document.getElementById('compare-panel');
  return !!(panel && panel.classList.contains('active'));
}

function openCompareLightboxAt(index) {
  var gallery = compareGalleryFromGrid();
  if (!gallery.length) return;
  var n = gallery.length;
  var idx = ((index % n) + n) % n;
  openLightbox(gallery[idx].src, gallery[idx].caption, gallery);
}

function compareStep(delta) {
  var gallery = compareGalleryFromGrid();
  if (gallery.length < 2) return;
  if (!isLightboxOpen()) {
    openCompareLightboxAt(delta > 0 ? 0 : gallery.length - 1);
    return;
  }
  lightboxStep(delta);
}

document.addEventListener('click', function(e) {
  var img = e.target.closest('.figure');
  if (!img || e.target.closest('.compare-remove-btn')) return;
  if (img.closest('.compare-card')) {
    e.stopPropagation();
    openLightbox(img.src, img.alt || '', compareGalleryFromGrid());
    return;
  }
  if (img.closest('.plot-card')) {
    e.stopPropagation();
    openLightbox(img.src, img.alt || '');
  }
});

if (lightbox) {
  var lightboxClose = lightbox.querySelector('.lightbox-close');
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener('click', function(e) {
    e.stopPropagation();
    lightboxStep(-1);
  });
  if (lightboxNext) lightboxNext.addEventListener('click', function(e) {
    e.stopPropagation();
    lightboxStep(1);
  });
  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox) closeLightbox();
  });
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (isLightboxOpen()) closeLightbox();
    return;
  }
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  var delta = e.key === 'ArrowLeft' ? -1 : 1;
  if (isLightboxOpen()) {
    e.preventDefault();
    lightboxStep(delta);
    return;
  }
  if (isComparePanelActive() && compareGalleryFromGrid().length > 1) {
    e.preventDefault();
    compareStep(delta);
  }
});

function queueKey(item) {
  return item.plotPath + '::' + item.dateLabel;
}

function syncQueuedCards() {
  if (!compareQueue) compareQueue = [];
  document.querySelectorAll('.plot-card').forEach(function(card) {
    var path = card.getAttribute('data-plot-path');
    var date = card.getAttribute('data-campaign-date');
    var btn = card.querySelector('.compare-plot-btn');
    var inQueue = compareQueue.some(function(item) {
      return item.plotPath === path && item.dateLabel === date;
    });
    card.classList.toggle('compare-queued', inQueue);
    if (btn) btn.classList.toggle('queued', inQueue);
  });
}

function closeCompareView() {
  if (lastDateSlug) {
    activateView(lastDateSlug);
  } else {
    var first = document.querySelector('.campaign-btn:not(.comparison-tab)');
    if (first) activateView(first.getAttribute('data-slug'));
  }
}

function updateCompareBar() {
  updateComparisonTab();
}

function removeFromCompareQueue(plotPath, dateLabel) {
  var key = plotPath + '::' + dateLabel;
  compareQueue = compareQueue.filter(function(item) {
    return queueKey(item) !== key;
  });
  syncQueuedCards();
  updateCompareBar();
  if (compareQueue.length > 0) {
    openCompareFromQueue();
  } else {
    closeCompareView();
  }
}

function toggleCompareQueue(plotPath, dateLabel) {
  var key = plotPath + '::' + dateLabel;
  var idx = compareQueue.findIndex(function(item) {
    return queueKey(item) === key;
  });
  if (idx >= 0) {
    compareQueue.splice(idx, 1);
  } else {
    compareQueue.push({ plotPath: plotPath, dateLabel: dateLabel });
  }
  syncQueuedCards();
  updateCompareBar();
  if (compareQueue.length > 0) {
    openCompareFromQueue();
  } else {
    closeCompareView();
  }
}

function clearCompareQueue() {
  compareQueue = [];
  syncQueuedCards();
  updateCompareBar();
  closeCompareView();
}

function renderComparisonFromQueue() {
  var container = document.getElementById('compare-grid');
  var empty = document.getElementById('compare-empty');
  if (!container) return;
  container.innerHTML = '';

  if (!compareQueue.length) {
    if (empty) {
      empty.style.display = 'block';
      empty.textContent = 'No plots selected. Use Compare on any plot to start.';
    }
    return;
  }

  compareQueue.forEach(function(item) {
    var relPath = item.plotPath;
    var label = item.dateLabel;
    var title = plotCatalog.plots[relPath] || relPath;
    var badge = campaignLabel(label);
    var src = label + '/figures/' + relPath;
    var card = document.createElement('div');
    card.className = 'compare-card';
    card.innerHTML =
      '<button type="button" class="compare-remove-btn" data-plot-path="' + relPath +
      '" data-campaign-date="' + label + '">Remove</button>' +
      '<span class="date-badge">' + badge + '</span>' +
      '<h4>' + title + '</h4>' +
      '<img src="' + src + '" alt="' + badge + ' — ' + title + '" class="figure" loading="lazy"/>';
    container.appendChild(card);
  });

  if (empty) empty.style.display = 'none';

  container.querySelectorAll('.compare-remove-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      removeFromCompareQueue(
        btn.getAttribute('data-plot-path'),
        btn.getAttribute('data-campaign-date')
      );
    });
  });

  container.querySelectorAll('.figure').forEach(function(img) {
    img.addEventListener('click', function(e) {
      e.stopPropagation();
      openLightbox(img.src, img.alt || '', compareGalleryFromGrid());
    });
  });
}

function openCompareFromQueue() {
  activateView('compare');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

updateComparisonTab();

document.addEventListener('click', function(e) {
  var btn = e.target.closest('.compare-plot-btn');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  var card = btn.closest('.plot-card');
  if (!card) return;
  toggleCompareQueue(
    btn.getAttribute('data-plot-path'),
    card.getAttribute('data-campaign-date')
  );
});

var comparePageClear = document.getElementById('compare-page-clear');
if (comparePageClear) comparePageClear.addEventListener('click', clearCompareQueue);
updateComparisonTab();
