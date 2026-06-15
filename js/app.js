// app.js — 应用入口 + hash 路由
(function () {
  'use strict';

  var mainEls = {
    hero: document.querySelector('.hero'),
    notify: document.getElementById('notifyArea'),
    apiSection: document.querySelector('.api-section'),
    footer: document.querySelector('.footer')
  };
  var detailPage = document.getElementById('detailPage');

  function showMain() {
    for (var k in mainEls) { mainEls[k].hidden = false; }
    detailPage.hidden = true;
  }

  function showDetail(api) {
    for (var k in mainEls) { mainEls[k].hidden = true; }
    detailPage.hidden = false;
    window.Detail.render(api);
    window.scrollTo(0, 0);
  }

  function route() {
    var hash = location.hash;
    var match = hash.match(/^#\/api\/(\d+)$/);
    if (match) {
      var index = parseInt(match[1]);
      var api = window.ApiData.state.apis[index];
      if (api) {
        showDetail(api);
        return;
      }
    }
    showMain();
    refresh();
  }

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
      var useBtn = e.target.closest('.btn-use');
      if (useBtn) {
        var index = parseInt(useBtn.getAttribute('data-index'));
        location.hash = '#/api/' + index;
      }
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

      // 路由
      route();
      window.addEventListener('hashchange', route);

      // 健康检测（仅主页）
      if (!location.hash.match(/^#\/api\//) && window.Health.shouldCheck()) {
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

  window.App = { refresh: refresh, init: init, route: route };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
