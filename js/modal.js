// modal.js — API 测试弹窗
(function () {
  'use strict';

  var overlay = document.getElementById('modalOverlay');
  var currentApi = null;

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function open(api) {
    currentApi = api;
    document.getElementById('modalTitle').textContent = api.title;
    document.getElementById('modalSource').textContent = '来源: ' + api.source + ' | 方法: ' + (api.method || 'GET');
    document.getElementById('modalResponse').innerHTML = '<div class="response-placeholder">点击"发送请求"查看响应</div>';

    var paramsHtml = '';
    if (api.params && api.params.length > 0) {
      api.params.forEach(function (p) {
        paramsHtml += '<div class="param-row">'
          + '<label>' + escapeHtml(p.name) + (p.required ? ' <span class="required">*</span>' : '') + '</label>'
          + '<input type="text" class="param-input" data-param="' + escapeHtml(p.name) + '" placeholder="' + escapeHtml(p.desc || '') + '">'
          + '</div>';
      });
    } else {
      paramsHtml = '<div class="param-empty">此接口暂未收录参数信息，可在下方直接输入 URL 参数</div>'
        + '<div class="param-row">'
        + '<input type="text" id="paramRaw" class="param-input" placeholder="例如: ?key=value&city=北京">'
        + '</div>';
    }
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
    if (!baseUrl) {
      baseUrl = api.doc_url ? api.doc_url.replace('/doc/', '/api/').replace('.html', '') : '';
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

  function send() {
    var respArea = document.getElementById('modalResponse');
    respArea.innerHTML = '<div class="response-loading">请求中...</div>';

    var url = buildUrl(currentApi);
    if (!url) {
      respArea.innerHTML = '<div class="response-error">无法构造请求 URL，请检查接口配置</div>';
      return;
    }

    fetch(url, { method: currentApi.method || 'GET' })
      .then(function (r) {
        var ct = r.headers.get('content-type') || '';
        if (ct.indexOf('application/json') !== -1) {
          return r.json().then(function (data) { return JSON.stringify(data, null, 2); });
        }
        return r.text();
      })
      .then(function (body) {
        var formatted = body;
        try {
          formatted = JSON.stringify(JSON.parse(body), null, 2);
        } catch (e) { }
        respArea.innerHTML = '<pre class="response-body">' + escapeHtml(formatted) + '</pre>';
        var idx = window.ApiData.state.apis.indexOf(currentApi);
        if (idx >= 0) {
          window.ApiData.updateHealth(idx, 'ok', null);
        }
      })
      .catch(function (err) {
        respArea.innerHTML = '<div class="response-error">请求失败: ' + escapeHtml(err.message) + '</div>';
      });
  }

  document.getElementById('modalClose').addEventListener('click', close);
  document.getElementById('modalSend').addEventListener('click', send);
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
