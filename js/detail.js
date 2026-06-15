// detail.js — API 工具页面（智能渲染 + 换一个/查看源码）
(function () {
  'use strict';

  var currentApi = null;
  var currentProxyUrl = '';
  var lastMedia = null;
  var lastRawText = '';
  var showingRaw = false;

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

  function extractMediaUrl(data) {
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { return null; }
    }
    function search(obj, depth) {
      if (!obj || depth > 10) return null;
      if (typeof obj === 'string') {
        var t = obj.trim();
        if (/^https?:\/\/.+\.(mp4|mov|avi|webm|m3u8)(\?.*)?$/i.test(t)) return { type: 'video', url: t };
        if (/^https?:\/\/.+\.(mp3|wav|ogg|aac|m4a)(\?.*)?$/i.test(t)) return { type: 'audio', url: t };
        if (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(t)) return { type: 'image', url: t };
        return null;
      }
      if (Array.isArray(obj)) {
        for (var i = 0; i < obj.length; i++) { var r = search(obj[i], depth + 1); if (r) return r; }
      } else if (typeof obj === 'object') {
        var keys = ['url', 'src', 'video', 'mp4', 'mp4_url', 'play_url', 'cover', 'image', 'img', 'thumb', 'data'];
        for (var j = 0; j < keys.length; j++) {
          if (obj[keys[j]]) { var r = search(obj[keys[j]], depth + 1); if (r) return r; }
        }
        for (var k in obj) {
          if (keys.indexOf(k) >= 0) continue;
          var r = search(obj[k], depth + 1); if (r) return r;
        }
      }
      return null;
    }
    return search(data, 0);
  }

  function formatJson(text) {
    try { return JSON.stringify(JSON.parse(text), null, 2); } catch (e) { return text; }
  }

  function showMedia() {
    showingRaw = false;
    var container = document.getElementById('detailResult');
    var bar = document.getElementById('actionBar');

    var html = '<div class="media-player">';
    if (lastMedia.type === 'video') {
      html += '<video controls autoplay playsinline class="media-video" src="' + escapeHtml(lastMedia.url) + '"></video>';
    } else if (lastMedia.type === 'image') {
      html += '<img class="media-image" src="' + escapeHtml(lastMedia.url) + '" alt="结果">';
    } else if (lastMedia.type === 'audio') {
      html += '<audio controls autoplay class="media-audio" src="' + escapeHtml(lastMedia.url) + '"></audio>';
    }
    html += '<p class="media-url"><a href="' + escapeHtml(lastMedia.url) + '" target="_blank" rel="noopener">源地址</a></p>';
    html += '</div>';
    container.innerHTML = html;

    bar.innerHTML =
      '<button class="btn-action btn-action--primary" onclick="window.Detail.refresh()">换一个</button>'
      + '<button class="btn-action" onclick="window.Detail.showRaw()">查看源码</button>';
  }

  function showRaw() {
    showingRaw = true;
    var container = document.getElementById('detailResult');
    var bar = document.getElementById('actionBar');

    container.innerHTML = '<pre class="response-body">' + escapeHtml(formatJson(lastRawText)) + '</pre>';

    var buttons = '<button class="btn-action" onclick="window.Detail.refresh()">刷新</button>';
    if (lastMedia) {
      buttons = '<button class="btn-action btn-action--primary" onclick="window.Detail.showMedia()">返回媒体</button>'
        + '<button class="btn-action" onclick="window.Detail.refresh()">换一个</button>';
    }
    bar.innerHTML = buttons;
  }

  function showLoading() {
    document.getElementById('detailResult').innerHTML =
      '<div class="detail-loading"><div class="loading-spinner"></div><p>加载中...</p></div>';
    document.getElementById('actionBar').innerHTML = '';
  }

  function showError(msg) {
    document.getElementById('detailResult').innerHTML = '<div class="detail-error">' + escapeHtml(msg) + '</div>';
    document.getElementById('actionBar').innerHTML =
      '<button class="btn-action btn-action--primary" onclick="window.Detail.refresh()">重试</button>';
  }

  function fetchAndRender() {
    if (!currentProxyUrl) {
      showError('无法构造请求 URL');
      return;
    }
    showLoading();

    fetch(currentProxyUrl)
      .then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(t); });
        return r.text();
      })
      .then(function (body) {
        lastRawText = body;
        var parsed = null;
        try { parsed = JSON.parse(body); } catch (e) {}
        lastMedia = extractMediaUrl(parsed || body);
        showingRaw = false;

        if (lastMedia) {
          showMedia();
        } else {
          showRaw();
        }

        var idx = window.ApiData.state.apis.indexOf(currentApi);
        if (idx >= 0) window.ApiData.updateHealth(idx, 'ok', null);
      })
      .catch(function (err) {
        showError('请求失败: ' + err.message);
      });
  }

  function renderKuleu(detailView, api) {
    currentApi = api;
    currentProxyUrl = '/api/proxy?url=' + encodeURIComponent(buildUrl(api));

    detailView.innerHTML =
      '<div class="detail-info">'
      + '<h2>' + escapeHtml(api.title) + '</h2>'
      + '<p class="detail-desc">' + escapeHtml(api.desc || '') + '</p>'
      + '</div>'
      + '<div id="actionBar" class="detail-actions"></div>'
      + '<div id="detailResult" class="detail-result-wrap"></div>';

    fetchAndRender();
  }

  function renderFreeApi(detailView, api) {
    detailView.innerHTML =
      '<div class="detail-info">'
      + '<h2>' + escapeHtml(api.title) + '</h2>'
      + '<p class="detail-desc">' + escapeHtml(api.desc || '') + '</p>'
      + '</div>'
      + '<div class="detail-iframe-wrap">'
      + '<iframe src="' + escapeHtml(api.use_url) + '" '
      + 'class="detail-iframe" '
      + 'sandbox="allow-scripts allow-same-origin allow-forms allow-popups" '
      + 'loading="lazy" '
      + 'title="' + escapeHtml(api.title) + '">'
      + '</iframe>'
      + '</div>';
  }

  function render(api) {
    var header = document.getElementById('detailHeader');
    header.querySelector('.detail-title').textContent = api.title;
    header.querySelector('.detail-source').innerHTML =
      '<span class="card-source tag-' + api.source + '">'
      + (api.source === 'kuleu' ? '酷乐' : 'FreeAPI') + '</span>'
      + ' <span class="detail-method">' + (api.method || 'GET') + '</span>';

    if (api.source === 'kuleu') {
      renderKuleu(document.getElementById('detailView'), api);
    } else {
      renderFreeApi(document.getElementById('detailView'), api);
    }
  }

  window.Detail = {
    render: render,
    refresh: fetchAndRender,
    showRaw: showRaw,
    showMedia: showMedia
  };
})();
