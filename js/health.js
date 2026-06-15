// health.js — 前端健康检测 + 预计算相似度自动替换
(function () {
  'use strict';

  var CHECK_INTERVAL = 60 * 60 * 1000;
  var running = false;

  function shouldCheck() {
    var health = window.ApiData.loadHealthCache();
    var keys = Object.keys(health);
    if (keys.length === 0) return true;
    var oldest = Infinity;
    keys.forEach(function (k) {
      var t = health[k].last_check ? new Date(health[k].last_check).getTime() : 0;
      if (t < oldest) oldest = t;
    });
    return Date.now() - oldest > CHECK_INTERVAL;
  }

  function testApi(api, index) {
    return new Promise(function (resolve) {
      var url = '';
      if (api.source === 'kuleu' && api.alias) {
        url = 'https://api.kuleu.com/api/' + api.alias;
      }
      if (!url) {
        resolve({ index: index, health: api.health || 'unknown', replacedBy: null });
        return;
      }

      var proxyUrl = '/api/proxy?url=' + encodeURIComponent(url);
      var timeout = new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error('timeout')); }, 8000);
      });
      var fetchPromise = fetch(proxyUrl).then(function (r) {
        return r.ok ? 'ok' : 'fail';
      });

      Promise.race([fetchPromise, timeout])
        .then(function () {
          resolve({ index: index, health: 'ok', replacedBy: null });
        })
        .catch(function () {
          resolve({ index: index, health: 'fail', replacedBy: null });
        });
    });
  }

  function findReplacement(apiIndex) {
    var simMap = window.ApiData.state.similarityMap || {};
    var candidates = simMap[String(apiIndex)] || [];
    var apis = window.ApiData.state.apis;
    for (var i = 0; i < candidates.length; i++) {
      var candidate = apis[candidates[i].index];
      if (candidate && (candidate.health === 'ok' || candidate.health === 'unknown')) {
        return candidate.title;
      }
    }
    return null;
  }

  function runCheck(apis) {
    if (running) return Promise.resolve(null);
    running = true;
    var toTest = [];
    apis.forEach(function (api, i) {
      if (api.source === 'kuleu' && api.alias) {
        toTest.push({ api: api, index: i });
      }
    });
    var events = { failed: [], replaced: [], pending: [] };

    function processBatch(start) {
      var batch = toTest.slice(start, start + 5);
      if (batch.length === 0) {
        running = false;
        return Promise.resolve(events);
      }
      return Promise.all(batch.map(function (item) {
        return testApi(item.api, item.index);
      })).then(function (results) {
        results.forEach(function (r) {
          if (r.health === 'fail') {
            var replacement = findReplacement(r.index);
            if (replacement) {
              window.ApiData.updateHealth(r.index, 'replaced', replacement);
              events.replaced.push({ api: apis[r.index], replacement: replacement });
            } else {
              window.ApiData.updateHealth(r.index, 'fail', null);
              events.failed.push(apis[r.index]);
            }
          } else if (r.health === 'ok') {
            window.ApiData.updateHealth(r.index, 'ok', null);
          }
        });
        return processBatch(start + 5);
      });
    }

    return processBatch(0);
  }

  window.Health = { shouldCheck: shouldCheck, runCheck: runCheck };
})();
