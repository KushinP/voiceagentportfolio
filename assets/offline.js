/**
 * Answer the page's fetch() out of the exported snapshot instead of the network.
 *
 * Loaded in <head>, after assets/snapshot.js, so it replaces window.fetch before any page script
 * runs and has the data ready when it does.
 *
 * It reads an in-memory object rather than fetching api/*.json because Chromium treats every
 * file:// document as an opaque origin and refuses fetch() against file:// entirely. Fetching the
 * snapshot failed silently on every page — each one fell through to empty data and rendered an
 * empty board that looked, at a glance, like a working export.
 */
(function () {
  var real = window.fetch.bind(window);
  var SNAP = window.__DEMO_SNAPSHOT || {};

  // Must match snapKey() in scripts/demo/export-static.js exactly.
  function snapKey(rawUrl) {
    var u = new URL(rawUrl, location.href);
    var p = u.pathname.replace(/^.*\/demo\/?/, '').replace(/\.json$/, '') || 'index';
    var hotel = u.searchParams.get('hotelId') || '';
    return p.replace(/[^a-zA-Z0-9._-]/g, '~') + (hotel ? '__' + hotel : '') + '.json';
  }

  function json(body) {
    return Promise.resolve(new Response(JSON.stringify(body), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
  }

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if (url.indexOf('/demo') === -1) return real(input, init);

    // Writes are refused rather than faked. A copy that appears to save a status change and then
    // loses it is worse than one that says plainly there is nothing behind it.
    if (method !== 'GET') {
      return json({ ok: false, error: 'Static export — there is no server here, so nothing was saved.' });
    }

    var key = snapKey(url);
    var bare = key.replace(/__[^.]*(?=\.json$)/, '');   // fall back to the unscoped snapshot
    var hit = SNAP[key] !== undefined ? SNAP[key] : SNAP[bare];
    return json(hit !== undefined && hit !== null ? hit : { ok: true, data: [], items: [] });
  };
})();
