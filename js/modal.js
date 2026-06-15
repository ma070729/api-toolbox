// modal.js — API 使用弹窗
(function () {
  'use strict';

  var overlay = document.getElementById('modalOverlay');
  var currentApi = null;

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // 打开使用弹窗（自动模式）
  function open(api) {
    currentApi = api;
    document.getElementById('modalTitle').textContent = api.title;
    document.getElementById('modalSource').innerHTML =
      '<span class="tag-' + api.source + '">' + (api.source === 'kuleu' ? '酷乐' : 'FreeAPI') + '</span>'
      + ' <span class="modal-method">' + (api.method || 'GET') + '</span>';

    var respArea = document.getElementById('modalResponse');

    // 如果有 use_url，直接跳转
    if (api.use_url) {
      respArea.innerHTML =
        '<div class="use-redirect">'
        + '<p>正在打开源站使用页面...</p>'
        + '<a class="btn-use-direct" href="' + escapeHtml(api.use_url) + '" target="_blank" rel="noopener">如果未跳转，点此直接打开</a>'
        + '</div>';
      window.open(api.use_url, '_blank');
    } else {
      // kuleu API，走代理自动请求
      respArea.innerHTML = '<div class="response-loading">正在请求...</div>';
      autoSend(api);
    }

    // 参数区（折叠）
    var paramsHtml = '';
    if (api.params && api.params.length > 0) {
      api.params.forEach(function (p) {
        paramsHtml += '<div class="param-row">'
          + '<label>' + escapeHtml(p.name) + (p.required ? ' <span class="required">*</span>' : '') + '</label>'
          + '<input type="text" class="param-input" data-param="' + escapeHtml(p.name) + '" placeholder="' + escapeHtml(p.desc || '') + '">'
          + '</div>';
      });
    } else {
      paramsHtml = '<div class="param-empty">无参数，直接点击发送即可</div>';
    }
    paramsHtml += '<button id="modalSend" class="btn-send">手动发送请求</button>';
    document.getElementById('modalParams').innerHTML = paramsHtml;

    var docLink = document.getElementById('modalDoc');
    if (api.doc_url) {
      docLink.href = api.doc_url;
      docLink.hidden = false;
    } else {
      docLink.hidden = true;
    }

    overlay.hidden = false;
  }

  function close() {
    overlay.hidden = true;
    currentApi = null;
  }

  function buildUrl(api) {
    var baseUrl = '';
    if (api.source === 'kuleu' && api.alias) {
      baseUrl = 'https://api.kuleu.com/api/' + api.alias;
    } else if (api.use_url) {
      baseUrl = api.use_url.replace('/use/', '/api/');
    }
    if (!baseUrl && api.doc_url) {
      baseUrl = api.doc_url.replace('/doc/', '/api/').replace('.html', '');
    }
    if (!baseUrl) return null;

    var rawInput = document.getElementById('paramRaw');
    if (rawInput && rawInput.value.trim()) {
      return baseUrl + rawInput.value.trim();
    }

    var params = [];
    var inputs = document.querySelectorAll('.param-input[data-param]');
    inputs.forEach(function (input) {
      var val = input.value.trim();
      if (val) {
        params.push(encodeURIComponent(input.getAttribute('data-param')) + '=' + encodeURIComponent(val));
      }
    });
    return params.length ? baseUrl + '?' + params.join('&') : baseUrl;
  }

  function autoSend(api) {
    var respArea = document.getElementById('modalResponse');
    var targetUrl = buildUrl(api);
    if (!targetUrl) {
      respArea.innerHTML = '<div class="response-error">无法构造请求 URL</div>';
      return;
    }
    var proxyUrl = '/api/proxy?url=' + encodeURIComponent(targetUrl);

    fetch(proxyUrl)
      .then(function (r) {
        if (!r.ok) {
          return r.json().then(function (d) { throw new Error(d.error || 'HTTP ' + r.status); });
        }
        var ct = r.headers.get('content-type') || '';
        if (ct.indexOf('application/json') !== -1) {
          return r.json().then(function (data) { return JSON.stringify(data, null, 2); });
        }
        return r.text();
      })
      .then(function (body) {
        try { body = JSON.stringify(JSON.parse(body), null, 2); } catch (e) {}
        respArea.innerHTML = '<pre class="response-body">' + escapeHtml(body) + '</pre>';
        var idx = window.ApiData.state.apis.indexOf(currentApi);
        if (idx >= 0) window.ApiData.updateHealth(idx, 'ok', null);
      })
      .catch(function (err) {
        respArea.innerHTML = '<div class="response-error">请求失败: ' + escapeHtml(err.message) + '</div>';
      });
  }

  function manualSend() {
    var respArea = document.getElementById('modalResponse');
    respArea.innerHTML = '<div class="response-loading">请求中...</div>';
    autoSend(currentApi);
  }

  // 事件
  document.getElementById('modalClose').addEventListener('click', close);
  document.getElementById('modalParams').addEventListener('click', function (e) {
    if (e.target.id === 'modalSend') manualSend();
  });
  document.getElementById('modalCopy').addEventListener('click', function () {
    var pre = document.querySelector('.response-body');
    if (pre) {
      navigator.clipboard.writeText(pre.textContent).then(function () {
        var btn = document.getElementById('modalCopy');
        btn.textContent = '已复制!';
        setTimeout(function () { btn.textContent = '复制响应'; }, 2000);
      });
    }
  });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) close();
  });

  window.Modal = { open: open, close: close };
})();
