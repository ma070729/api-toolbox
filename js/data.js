// data.js — 数据加载、缓存、搜索、过滤
(function () {
  'use strict';

  var state = {
    apis: [],
    similarityMap: {},
    currentCategory: '全部',
    currentSearch: '',
    currentSort: 'default',
    healthData: {}
  };

  function loadHealthCache() {
    try {
      var raw = localStorage.getItem('api-toolbox-health');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveHealthCache(data) {
    try {
      localStorage.setItem('api-toolbox-health', JSON.stringify(data));
    } catch (e) { }
  }

  function loadAPIs() {
    return Promise.all([
      fetch('apis-catalog.json').then(function (r) { return r.json(); }),
      fetch('similarity-map.json').then(function (r) { return r.json(); })
    ]).then(function (results) {
      var apis = results[0];
      var simMap = results[1];
      var health = loadHealthCache();
      apis.forEach(function (api, i) {
        var h = health[i];
        if (h) {
          api.health = h.health;
          api.last_check = h.last_check;
          api.replaced_by = h.replaced_by;
        } else {
          api.health = 'unknown';
          api.last_check = null;
          api.replaced_by = null;
        }
      });
      state.apis = apis;
      state.similarityMap = simMap;
      state.healthData = health;
      return apis;
    });
  }

  function getCategories() {
    var cats = {};
    state.apis.forEach(function (api) {
      var cat = api.category;
      cats[cat] = (cats[cat] || 0) + 1;
    });
    return cats;
  }

  function filterAPIs() {
    var filtered = state.apis.slice();
    if (state.currentCategory !== '全部') {
      filtered = filtered.filter(function (api) {
        return api.category === state.currentCategory;
      });
    }
    if (state.currentSearch) {
      var q = state.currentSearch.toLowerCase();
      filtered = filtered.filter(function (api) {
        return api.title.toLowerCase().indexOf(q) !== -1 ||
               api.desc.toLowerCase().indexOf(q) !== -1;
      });
    }
    if (state.currentSort === 'name') {
      filtered.sort(function (a, b) { return a.title.localeCompare(b.title, 'zh'); });
    } else if (state.currentSort === 'source') {
      filtered.sort(function (a, b) { return a.source.localeCompare(b.source); });
    } else if (state.currentSort === 'health') {
      var order = { fail: 0, unknown: 1, replaced: 2, ok: 3 };
      filtered.sort(function (a, b) { return (order[a.health] || 1) - (order[b.health] || 1); });
    }
    return filtered;
  }

  function setCategory(cat) { state.currentCategory = cat; }
  function setSearch(q) { state.currentSearch = q; }
  function setSort(sort) { state.currentSort = sort; }

  function updateHealth(apiIndex, health, replacedBy) {
    var api = state.apis[apiIndex];
    api.health = health;
    api.last_check = new Date().toISOString();
    if (replacedBy) { api.replaced_by = replacedBy; }
    state.healthData[apiIndex] = {
      health: health,
      last_check: api.last_check,
      replaced_by: replacedBy || null
    };
    saveHealthCache(state.healthData);
  }

  window.ApiData = {
    state: state,
    loadAPIs: loadAPIs,
    getCategories: getCategories,
    filterAPIs: filterAPIs,
    setCategory: setCategory,
    setSearch: setSearch,
    setSort: setSort,
    updateHealth: updateHealth,
    loadHealthCache: loadHealthCache,
    saveHealthCache: saveHealthCache
  };
})();
