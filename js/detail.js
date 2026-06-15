// detail.js — API 工具页面
(function () {
  'use strict';

  var currentApi = null;

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function buildUrl(api) {
    if (api.source === 'kuleu' && api.alias) {
      return 'https://api.kuleu.com/api/' + api.alias;
    }
    if (api.use_url) {
      return api.use_url.replace('/use/', '/api/');
    }
    if (api.doc_url) {
      return api.doc_url.replace('/doc/', '/api/').replace('.html', '');
    }
    return null;
  }

  function renderKuleu(detailView, api) {
    var targetUrl = buildUrl(api);
    var proxyUrl = targetUrl ? '/api/proxy?url=' + encodeURIComponent(targetUrl) : null;

    detailView.innerHTML =
      '<div class="detail-content detail-kuleu">'
      + '<div class="detail-info">'
      + '<h2>' + escapeHtml(api.title) + '</h2>'
      + '<p class="detail-desc">' + escapeHtml(api.desc || '') + '</p>'
      + '<span class="detail-cat">' + escapeHtml(api.category) + '</span>'
      + '</div>'
      + '<div class="detail-result">'
      + '<div class="detail-result-header">请求结果</div>'
      + '<div id="detailResponse" class="detail-response response-area">'
      + '<div class="response-loading">正在请求 ' + escapeHtml(targetUrl || '') + '...</div>'
      + '</div>'
      + '</div>'
      + '</div>';

    if (proxyUrl) {
      fetch(proxyUrl)
        .then(function (r) {
          if (!r.ok) return r.text().then(function (t) { throw new Error(t); });
          var ct = r.headers.get('content-type') || '';
          if (ct.indexOf('application/json') !== -1) {
            return r.json().then(function (d) { return JSON.stringify(d, null, 2); });
          }
          return r.text();
        })
        .then(function (body) {
          try { body = JSON.stringify(JSON.parse(body), null, 2); } catch (e) {}
          document.getElementById('detailResponse').innerHTML =
            '<pre class="response-body">' + escapeHtml(body) + '</pre>';
          var idx = window.ApiData.state.apis.indexOf(api);
          if (idx >= 0) window.ApiData.updateHealth(idx, 'ok', null);
        })
        .catch(function (err) {
          document.getElementById('detailResponse').innerHTML =
            '<div class="response-error">请求失败: ' + escapeHtml(err.message) + '</div>';
        });
    } else {
      document.getElementById('detailResponse').innerHTML =
        '<div class="response-error">无法构造请求 URL</div>';
    }
  }

  function renderFreeApi(detailView, api) {
    detailView.innerHTML =
      '<div class="detail-content detail-freeapi">'
      + '<div class="detail-info">'
      + '<h2>' + escapeHtml(api.title) + '</h2>'
      + '<p class="detail-desc">' + escapeHtml(api.desc || '') + '</p>'
      + '<span class="detail-cat">' + escapeHtml(api.category) + '</span>'
      + '</div>'
      + '<div class="detail-iframe-wrap">'
      + '<iframe src="' + escapeHtml(api.use_url) + '" '
      + 'class="detail-iframe" '
      + 'sandbox="allow-scripts allow-same-origin allow-forms allow-popups" '
      + 'loading="lazy" '
      + 'title="' + escapeHtml(api.title) + '">'
      + '</iframe>'
      + '</div>'
      + '</div>';
  }

  function render(api) {
    var detailView = document.getElementById('detailView');
    currentApi = api;

    var header = document.getElementById('detailHeader');
    header.querySelector('.detail-title').textContent = api.title;
    header.querySelector('.detail-source').innerHTML =
      '<span class="card-source tag-' + api.source + '">'
      + (api.source === 'kuleu' ? '酷乐' : 'FreeAPI') + '</span>'
      + ' <span class="detail-method">' + (api.method || 'GET') + '</span>';

    if (api.source === 'kuleu') {
      renderKuleu(detailView, api);
    } else {
      renderFreeApi(detailView, api);
    }
  }

  window.Detail = { render: render };
})();
