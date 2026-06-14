// theme.js — 日出日落自动切换明暗主题
(function () {
  'use strict';

  var STORAGE_KEY = 'api-toolbox-theme';

  function solarDeclination(dayOfYear) {
    return 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  }

  function calcSunTimes(lat, lon, date) {
    var start = new Date(date.getFullYear(), 0, 0);
    var dayOfYear = Math.floor((date - start) / 86400000);
    var decl = solarDeclination(dayOfYear);
    var latRad = (lat * Math.PI) / 180;
    var ha = Math.acos(
      Math.max(-1, Math.min(1,
        -Math.sin((-0.833 * Math.PI) / 180) / Math.cos(latRad) -
        Math.tan(latRad) * Math.tan((decl * Math.PI) / 180)
      ))
    );
    var haHours = (ha * 180) / Math.PI / 15;
    var solarNoon = 12 - lon / 15;
    var sunrise = solarNoon - haHours;
    var sunset = solarNoon + haHours;
    return { sunrise: sunrise, sunset: sunset };
  }

  function isDaytime() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved === 'light';
    }
    var lat = 39.9, lon = 116.4;
    var tzOffset = new Date().getTimezoneOffset();
    lat = 35 - Math.abs(tzOffset) / 20;
    if (tzOffset < -420) lon = 121;
    var times = calcSunTimes(lat, lon, new Date());
    var now = new Date().getHours() + new Date().getMinutes() / 60;
    return now >= times.sunrise && now < times.sunset;
  }

  function applyTheme() {
    var daytime = isDaytime();
    document.documentElement.setAttribute('data-theme', daytime ? 'light' : 'dark');
  }

  applyTheme();

  setInterval(function () {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== 'light' && saved !== 'dark') {
      applyTheme();
    }
  }, 3600000);

  window.setTheme = function (mode) {
    localStorage.setItem(STORAGE_KEY, mode);
    document.documentElement.setAttribute('data-theme', mode);
  };

  window.resetTheme = function () {
    localStorage.removeItem(STORAGE_KEY);
    applyTheme();
  };
})();
