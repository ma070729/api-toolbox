// app.js — 应用入口
(function () {
  'use strict';

  function renderCategories() {
    var cats = window.ApiData.getCategories();
    var container = document.getElementById('categoryTags');
    var html = '<span class="cat-tag cat-tag--active" data-cat="全部">全部 (' + window.ApiData.state.apis.length + ')</span>';
    var sorted = Object.entries(cats).sort(function (a, b) { return b[1] - a[1]; });
    sorted.forEach(function (entry) {
      html += '<span class="cat-tag" data-cat="' + entry[0] + '">' + entry[0] + ' (' + entry[1] + ')</span>';
    });
    container.innerHTML = html;
    container.addEventListener('click', function (e) {
      var tag = e.target.closest('.cat-tag');
      if (!tag) return;
      var cat = tag.getAttribute('data-cat');
      container.querySelectorAll('.cat-tag').forEach(function (t) { t.classList.remove('cat-tag--active'); });
      tag.classList.add('cat-tag--active');
      window.ApiData.setCategory(cat);
      window.Cards.setPage(1);
      refresh();
    });
  }

  function initSearch() {
    var input = document.getElementById('searchInput');
    var clearBtn = document.getElementById('searchClear');
    var timer;
    input.addEventListener('input', function () {
      clearBtn.hidden = !input.value;
      clearTimeout(timer);
      timer = setTimeout(function () {
        window.ApiData.setSearch(input.value.trim());
        window.Cards.setPage(1);
        refresh();
      }, 300);
    });
    clearBtn.addEventListener('click', function () {
      input.value = '';
      clearBtn.hidden = true;
      window.ApiData.setSearch('');
      window.Cards.setPage(1);
      refresh();
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        input.focus();
      }
    });
  }

  function initSort() {
    document.getElementById('sortSelect').addEventListener('change', function () {
      window.ApiData.setSort(this.value);
      window.Cards.setPage(1);
      refresh();
    });
  }

  function initCards() {
    document.getElementById('apiGrid').addEventListener('click', function (e) {
      var btn = e.target.closest('.btn-test');
      if (!btn) return;
      var index = parseInt(btn.getAttribute('data-index'));
      var api = window.ApiData.state.apis[index];
      if (api) window.Modal.open(api);
    });
  }

  function refresh() {
    var filtered = window.ApiData.filterAPIs();
    window.Cards.render(filtered);
  }

  function init() {
    window.ApiData.loadAPIs().then(function () {
      renderCategories();
      window.Cards.initPagination();
      initSearch();
      initSort();
      initCards();
      refresh();
      if (window.Health.shouldCheck()) {
        window.Health.runCheck(window.ApiData.state.apis).then(function (events) {
          if (events) {
            window.Notify.show(events);
            refresh();
          }
        });
      }
    }).catch(function (err) {
      document.getElementById('apiGrid').innerHTML =
        '<div class="api-empty">数据加载失败: ' + err.message + '</div>';
    });
  }

  window.App = { refresh: refresh, init: init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
