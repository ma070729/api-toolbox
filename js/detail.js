// detail.js — API 工具页面（智能渲染：视频/图片/音频/文本）
(function () {
  'use strict';

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

  // 从响应 JSON 中提取媒体 URL
  function extractMediaUrl(data) {
    if (typeof data === 'string') {
      // 尝试解析 JSON 字符串
      try { data = JSON.parse(data); } catch (e) { return null; }
    }
    // 递归搜索对象中的 URL
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
        for (var i = 0; i < obj.length; i++) {
          var r = search(obj[i], depth + 1);
          if (r) return r;
        }
      } else if (typeof obj === 'object') {
        // 优先检查常见字段名
        var keys = ['url', 'src', 'video', 'mp4', 'mp4_url', 'play_url', 'cover', 'image', 'img', 'thumb', 'data'];
        for (var j = 0; j < keys.length; j++) {
          if (obj[keys[j]]) {
            var r = search(obj[keys[j]], depth + 1);
            if (r) return r;
          }
        }
        // 再遍历所有字段
        for (var k in obj) {
          if (keys.indexOf(k) >= 0) continue; // 已检查过
          var r = search(obj[k], depth + 1);
          if (r) return r;
        }
      }
      return null;
    }
    return search(data, 0);
  }

  // 智能渲染 API 响应
  function renderResponse(container, data, rawText) {
    // 尝试解析 JSON
    var parsed;
    try { parsed = JSON.parse(rawText); } catch (e) { parsed = null; }
    var obj = parsed || data;

    // 尝试提取媒体
    var media = extractMediaUrl(obj);

    if (media && media.type === 'video') {
      container.innerHTML =
        '<div class="media-player">'
        + '<video controls autoplay playsinline class="media-video" src="' + escapeHtml(media.url) + '">'
        + '您的浏览器不支持视频播放</video>'
        + '<p class="media-url"><a href="' + escapeHtml(media.url) + '" target="_blank" rel="noopener">视频地址</a></p>'
        + '</div>';
      return;
    }

    if (media && media.type === 'image') {
      container.innerHTML =
        '<div class="media-player">'
        + '<img class="media-image" src="' + escapeHtml(media.url) + '" alt="API 返回图片">'
        + '<p class="media-url"><a href="' + escapeHtml(media.url) + '" target="_blank" rel="noopener">原图地址</a></p>'
        + '</div>';
      return;
    }

    if (media && media.type === 'audio') {
      container.innerHTML =
        '<div class="media-player">'
        + '<audio controls autoplay class="media-audio" src="' + escapeHtml(media.url) + '"></audio>'
        + '<p class="media-url"><a href="' + escapeHtml(media.url) + '" target="_blank" rel="noopener">音频地址</a></p>'
        + '</div>';
      return;
    }

    // 文本/数据：格式化显示
    var formatted;
    try {
      formatted = JSON.stringify(parsed || rawText, null, 2);
    } catch (e) {
      formatted = rawText;
    }
    container.innerHTML = '<pre class="response-body">' + escapeHtml(formatted) + '</pre>';
  }

  function renderKuleu(detailView, api) {
    var targetUrl = buildUrl(api);
    var proxyUrl = targetUrl ? '/api/proxy?url=' + encodeURIComponent(targetUrl) : null;

    detailView.innerHTML =
      '<div class="detail-info">'
      + '<h2>' + escapeHtml(api.title) + '</h2>'
      + '<p class="detail-desc">' + escapeHtml(api.desc || '') + '</p>'
      + '</div>'
      + '<div id="detailResult" class="detail-result-wrap">'
      + '<div class="detail-loading">'
      + '<div class="loading-spinner"></div>'
      + '<p>加载中...</p>'
      + '</div>'
      + '</div>';

    if (!proxyUrl) {
      document.getElementById('detailResult').innerHTML =
        '<div class="detail-error">无法构造请求 URL</div>';
      return;
    }

    fetch(proxyUrl)
      .then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(t); });
        return r.text();
      })
      .then(function (body) {
        var container = document.getElementById('detailResult');
        renderResponse(container, null, body);
        var idx = window.ApiData.state.apis.indexOf(api);
        if (idx >= 0) window.ApiData.updateHealth(idx, 'ok', null);
      })
      .catch(function (err) {
        var container = document.getElementById('detailResult');
        if (container) {
          container.innerHTML = '<div class="detail-error">请求失败: ' + escapeHtml(err.message) + '</div>';
        }
      });
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
    var detailView = document.getElementById('detailView');

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
