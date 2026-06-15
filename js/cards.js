// cards.js — 卡片渲染、分页
(function () {
  'use strict';

  var PAGE_SIZE = 20;
  var currentPage = 1;

  var healthLabels = {
    ok: '正常',
    fail: '失效',
    unknown: '待检测',
    replaced: '已替换'
  };

  var healthColors = {
    ok: '#2ecc71',
    fail: '#e74c3c',
    unknown: '#adb5bd',
    replaced: '#f39c12'
  };

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderCard(api, index) {
    var health = api.health || 'unknown';
    var timeStr = api.last_check
      ? '检测于 ' + new Date(api.last_check).toLocaleString('zh-CN')
      : '未检测';
    var replacedHtml = '';
    if (health === 'replaced' && api.replaced_by) {
      replacedHtml = '<div class="card-replaced">已替换为: ' + escapeHtml(api.replaced_by) + '</div>';
    }
    return '<div class="api-card' + (health === 'fail' ? ' api-card--fail' : '') + '" data-index="' + index + '">'
      + '<div class="card-header">'
      + '<span class="card-title">' + escapeHtml(api.title) + '</span>'
      + '<span class="card-source tag-' + api.source + '">' + (api.source === 'kuleu' ? '酷乐' : 'FreeAPI') + '</span>'
      + '</div>'
      + '<div class="card-desc">' + escapeHtml(api.desc || '暂无描述').substring(0, 60) + '</div>'
      + '<div class="card-footer">'
      + '<span class="card-health">'
      + '<span class="health-dot" style="background:' + healthColors[health] + '"></span>'
      + '<span class="health-text" style="color:' + healthColors[health] + '">' + healthLabels[health] + '</span>'
      + '<span class="health-time">' + timeStr + '</span>'
      + '</span>'
      + '<button class="btn-use" data-index="' + index + '">使用</button>'
      + '</div>'
      + replacedHtml
      + '</div>';
  }

  function renderPagination(total) {
    var totalPages = Math.ceil(total / PAGE_SIZE);
    if (totalPages <= 1) return '';
    var html = '<div class="paginator">';
    html += '<button class="page-btn" data-page="prev"' + (currentPage <= 1 ? ' disabled' : '') + '>上一页</button>';
    for (var i = 1; i <= totalPages; i++) {
      if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - currentPage) > 1) {
        if (i === 3 || i === totalPages - 2) {
          html += '<span class="page-ellipsis">...</span>';
        }
        continue;
      }
      html += '<button class="page-btn' + (i === currentPage ? ' page-btn--active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    html += '<button class="page-btn" data-page="next"' + (currentPage >= totalPages ? ' disabled' : '') + '>下一页</button>';
    html += '</div>';
    return html;
  }

  function render(apis) {
    var grid = document.getElementById('apiGrid');
    var pagination = document.getElementById('pagination');
    var count = document.getElementById('apiCount');
    var total = apis.length;
    var start = (currentPage - 1) * PAGE_SIZE;
    var pageApis = apis.slice(start, start + PAGE_SIZE);
    grid.innerHTML = pageApis.map(function (api) {
      var realIndex = window.ApiData.state.apis.indexOf(api);
      return renderCard(api, realIndex);
    }).join('');
    count.textContent = '共 ' + total + ' 个接口';
    pagination.innerHTML = renderPagination(total);
  }

  function initPagination() {
    document.getElementById('pagination').addEventListener('click', function (e) {
      var btn = e.target.closest('.page-btn');
      if (!btn || btn.disabled) return;
      var page = btn.getAttribute('data-page');
      if (page === 'prev') currentPage = Math.max(1, currentPage - 1);
      else if (page === 'next') currentPage = Math.min(999, currentPage + 1);
      else currentPage = parseInt(page) || 1;
      window.App.refresh();
      var grid = document.getElementById('apiGrid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  window.Cards = {
    render: render,
    initPagination: initPagination,
    getPage: function () { return currentPage; },
    setPage: function (p) { currentPage = p; }
  };
})();
