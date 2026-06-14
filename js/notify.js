// notify.js — 通知横幅卡片
(function () {
  'use strict';

  function show(events) {
    var area = document.getElementById('notifyArea');
    var cards = document.getElementById('notifyCards');
    var total = events.failed.length + events.replaced.length + events.pending.length;
    if (total === 0) {
      area.hidden = true;
      return;
    }
    area.hidden = false;
    var html = '';

    if (events.failed.length > 0) {
      var names = events.failed.map(function (a) { return a.title; }).join('、');
      html += '<div class="notify-card notify-card--fail">'
        + '<div class="notify-card-head"><span class="notify-icon">&#9888;&#65039;</span>'
        + '<span class="notify-title">' + events.failed.length + ' 个 API 已失效</span></div>'
        + '<div class="notify-card-body">' + names + '</div>'
        + '</div>';
    }

    if (events.replaced.length > 0) {
      var items = events.replaced.map(function (r) {
        return r.api.title + ' &rarr; ' + r.replacement;
      }).join('<br>');
      html += '<div class="notify-card notify-card--replaced">'
        + '<div class="notify-card-head"><span class="notify-icon">&#128260;</span>'
        + '<span class="notify-title">' + events.replaced.length + ' 个已自动替换</span></div>'
        + '<div class="notify-card-body">' + items + '</div>'
        + '</div>';
    }

    if (events.pending.length > 0) {
      var pnames = events.pending.map(function (a) { return a.title; }).join('、');
      html += '<div class="notify-card notify-card--pending">'
        + '<div class="notify-card-head"><span class="notify-icon">&#128203;</span>'
        + '<span class="notify-title">' + events.pending.length + ' 个待处理</span></div>'
        + '<div class="notify-card-body">' + pnames + ' — 未找到同类替换，建议手动删除</div>'
        + '</div>';
    }

    cards.innerHTML = html;
  }

  window.Notify = { show: show };
})();
