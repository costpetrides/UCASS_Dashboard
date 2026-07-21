var plotCatalog = window.PLOT_CATALOG || { campaigns: [], plots: {}, availability: {} };
var compareQueue = [];
var lastDateSlug = null;
var lastTabKind = 'overview';
var TAB_KINDS = ['overview', 'combined', 'scatter', 'wind'];

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
  lastTabKind = tabKindFromTarget(id);
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

function openLightbox(src, caption) {
  if (!lightbox || !lightboxImg) return;
  lightboxImg.src = src;
  lightboxImg.alt = caption;
  if (lightboxCaption) lightboxCaption.textContent = caption;
  lightbox.classList.add('active');
  document.body.classList.add('lightbox-open');
}

function closeLightbox() {
  if (!lightbox || !lightboxImg) return;
  lightbox.classList.remove('active');
  lightboxImg.removeAttribute('src');
  document.body.classList.remove('lightbox-open');
}

document.addEventListener('click', function(e) {
  var img = e.target.closest('.figure');
  if (!img || e.target.closest('.compare-remove-btn')) return;
  if (img.closest('.plot-card') || img.closest('.compare-card')) {
    e.stopPropagation();
    openLightbox(img.src, img.alt || '');
  }
});

if (lightbox) {
  var lightboxClose = lightbox.querySelector('.lightbox-close');
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox) closeLightbox();
  });
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeLightbox();
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
    var src = label + '/figures/' + relPath;
    var card = document.createElement('div');
    card.className = 'compare-card';
    card.innerHTML =
      '<button type="button" class="compare-remove-btn" data-plot-path="' + relPath +
      '" data-campaign-date="' + label + '">Remove</button>' +
      '<span class="date-badge">' + label + '</span>' +
      '<h4>' + title + '</h4>' +
      '<img src="' + src + '" alt="' + label + ' — ' + title + '" class="figure" loading="lazy"/>';
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
      openLightbox(img.src, img.alt || '');
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
