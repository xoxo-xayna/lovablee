/* Parzon — front-end app. Data saves in this browser (localStorage + IndexedDB for uploads). */
(function () {
  "use strict";

  /* ---------- Icons ---------- */
  var P = {
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    reel: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3 9h18M9 3l3 6M15 3l3 6"/><path d="M10 13.5l4 2.5-4 2.5z" fill="currentColor"/>',
    bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 8H4c0-1 2-2 2-8z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    heart: '<path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z"/>',
    comment: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
    repost: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
    save: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4M12 2v13"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-9 9"/>',
    video: '<rect x="2" y="6" width="14" height="12" rx="3"/><path d="M22 8l-6 4 6 4z"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    vol: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    mute: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/>',
    check: '<path d="M12 2l2.4 2 3.1-.3 1 3 2.7 1.6-.9 3 .9 3-2.7 1.6-1 3-3.1-.3L12 22l-2.4-2-3.1.3-1-3L2.8 15.7l.9-3-.9-3 2.7-1.6 1-3 3.1.3z" fill="currentColor" stroke="none"/><path d="M8.5 12.2l2.3 2.3 4.7-4.8" stroke="#fff"/>',
    bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 14h.01M15 14h.01"/>',
    flame: '<path d="M12 22c4 0 7-3 7-7 0-5-5-6-5-12-3 2-7 5-7 10 0 1 .5 2 1 3-1-.5-1 .5-1 1 0 2.5 2 5 5 5z"/>'
  };
  function ic(n, cls) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"' + (cls ? ' class="' + cls + '"' : '') + '>' + P[n] + '</svg>';
  }

  /* ---------- Helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var uid = function () { return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
  function fmt(n) { return n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e4 ? Math.round(n / 1e3) + "K" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K" : String(n); }
  function ago(t) {
    var s = Math.max(1, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return s + "s"; var m = Math.floor(s / 60); if (m < 60) return m + "m";
    var h = Math.floor(m / 60); if (h < 24) return h + "h"; return Math.floor(h / 24) + "d";
  }
  function rich(t) { return esc(t).replace(/(^|\s)(#[\w]+)/g, '$1<span class="tag">$2</span>'); }
  var toastT;
  function toast(msg) { var el = $("#toast"); el.textContent = msg; el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove("show"); }, 2200); }

  /* ---------- Uploaded media storage (IndexedDB) ---------- */
  var dbp = new Promise(function (res) {
    try {
      var r = indexedDB.open("parzon-media", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("m"); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { res(null); };
    } catch (e) { res(null); }
  });
  function putBlob(key, blob) { return dbp.then(function (db) { if (!db) return; return new Promise(function (r) { var tx = db.transaction("m", "readwrite"); tx.objectStore("m").put(blob, key); tx.oncomplete = r; tx.onerror = r; }); }); }
  function getBlob(key) { return dbp.then(function (db) { if (!db) return null; return new Promise(function (r) { var q = db.transaction("m").objectStore("m").get(key); q.onsuccess = function () { r(q.result || null); }; q.onerror = function () { r(null); }; }); }); }
  var urlCache = {};
  function resolveMedia(list) {
    return Promise.all(list.map(function (p) {
      if (!p.media || !p.media.key) return;
      return getBlob(p.media.key).then(function (b) { if (b) { urlCache[p.media.key] = URL.createObjectURL(b); } });
    }));
  }
  function mediaSrc(m) { return m.key ? (urlCache[m.key] || "") : m.src; }

  /* ---------- Seed data ---------- */
  var NOW = Date.now(), MIN = 60000, HR = 3600000;
  function seed() {
    var users = {
      me: { id: "me", name: "You", handle: "you", h: 38, bio: "New on Parzon. Posting soon.", me: true },
      ada: { id: "ada", name: "Ada Okafor", handle: "adaeats", h: 45, bio: "Food, markets and the best jollof debate. Lagos.", verified: true },
      tunde: { id: "tunde", name: "Tunde Bakare", handle: "tundeflips", h: 250, bio: "Skater. Sunsets over concrete.", verified: false },
      zee: { id: "zee", name: "Zee Mensah", handle: "zeeonroof", h: 320, bio: "Rooftops, friends and golden hour.", verified: true },
      mika: { id: "mika", name: "Mika Tan", handle: "nightmarket", h: 200, bio: "Street music and neon nights.", verified: false },
      bot: { id: "bot", name: "Parzon Bot", handle: "parzonbot", h: 10, bio: "Automated demo account. I post something new every so often so the feed never feels empty.", verified: true, bot: true }
    };
    var posts = [
      { id: "p1", user: "ada", text: "Sunday plate. Jollof, plantain, chicken and a little pepper sauce. Yes, the party rice wins. #jollof #sundayfood", media: { type: "image", src: "images/food.jpg" }, time: NOW - 12 * MIN, likes: 842, reposts: 61, comments: [{ u: "zee", t: "Okay I am coming over right now." }, { u: "mika", t: "That plantain is perfect." }] },
      { id: "p2", user: "zee", text: "Golden hour with the best people. Nobody check the time. #rooftop #goldenhour", media: { type: "image", src: "images/rooftop.jpg" }, time: NOW - 1.4 * HR, likes: 1290, reposts: 88, comments: [{ u: "ada", t: "Take me back to this night." }] },
      { id: "p3", user: "bot", text: "Hello from Parzon Bot. I am an automated account. Follow me and I will drop a fresh post every little while. #welcome", time: NOW - 2 * HR, likes: 203, reposts: 12, comments: [] },
      { id: "p4", user: "tunde", text: "Finally landed it after forty tries. Pain is temporary, clips are forever. #skate", media: { type: "image", src: "images/skate.jpg" }, time: NOW - 5 * HR, likes: 3011, reposts: 240, comments: [{ u: "mika", t: "Clean!!" }, { u: "ada", t: "Please wear a helmet." }] },
      { id: "p5", user: "mika", text: "Heard this guy play for an hour tonight and forgot to go home.", time: NOW - 8 * HR, likes: 410, reposts: 22, comments: [] }
    ];
    var reels = [
      { id: "r1", user: "mika", text: "Night market sounds. Wait for the second verse. #livemusic", media: { type: "image", src: "images/street.jpg" }, audio: "Original audio · nightmarket", time: NOW - 3 * HR, likes: 5400, reposts: 310, comments: [{ u: "zee", t: "Goosebumps." }] },
      { id: "r2", user: "tunde", text: "Sunset session. Forty tries, one landing. #skate #reels", media: { type: "image", src: "images/skate.jpg" }, audio: "Original audio · tundeflips", time: NOW - 6 * HR, likes: 12800, reposts: 900, comments: [{ u: "ada", t: "Helmet!!" }] },
      { id: "r3", user: "zee", text: "Rooftop golden hour, no filter. #rooftop", media: { type: "image", src: "images/rooftop.jpg" }, audio: "Golden Hour · Parzon Sounds", time: NOW - 9 * HR, likes: 2200, reposts: 120, comments: [] }
    ];
    var stories = [
      { user: "ada", slides: [{ img: "images/food.jpg" }, { text: "Who wants leftovers?" }], seen: false },
      { user: "zee", slides: [{ img: "images/rooftop.jpg" }], seen: false },
      { user: "tunde", slides: [{ img: "images/skate.jpg" }, { text: "Day 41 of the same trick." }], seen: false },
      { user: "mika", slides: [{ img: "images/street.jpg" }], seen: false },
      { user: "bot", slides: [{ text: "Welcome to Parzon. Tap, like, follow." }], seen: false }
    ];
    var followers = { ada: 12400, tunde: 8800, zee: 5300, mika: 2100, bot: 999, me: 0 };
    var notifs = [
      { id: "n1", type: "follow", from: "bot", time: NOW - 30 * MIN, unread: true, text: "started following you" },
      { id: "n2", type: "like", from: "ada", time: NOW - 50 * MIN, unread: true, text: "liked your profile" }
    ];
    return { users: users, posts: posts, reels: reels, stories: stories, following: ["ada"], followers: followers, notifs: notifs, saved: [], liked: [], reposted: [], v: 1 };
  }

  var S;
  var ME = window.PARZON_USER || null;
  var KEY = ME ? "parzon-state-" + ME.uid : "parzon-state";
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) { S = JSON.parse(raw); if (S.v === 1) return; } } catch (e) {}
    S = seed();
    if (ME && ME.name) S.users.me.name = ME.name;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }
  var isFollowing = function (id) { return S.following.indexOf(id) > -1; };
  var has = function (arr, id) { return arr.indexOf(id) > -1; };
  function toggle(arr, id) { var i = arr.indexOf(id); if (i > -1) { arr.splice(i, 1); return false; } arr.push(id); return true; }
  function findItem(id) { return S.posts.concat(S.reels).filter(function (p) { return p.id === id; })[0]; }
  function userByHandle(h) { for (var k in S.users) if (S.users[k].handle === h) return S.users[k]; }
  function followerCount(id) { return (S.followers[id] || 0) + (id !== "me" && isFollowing(id) ? 1 : 0); }
  function unreadCount() { return S.notifs.filter(function (n) { return n.unread; }).length; }

  /* ---------- Components ---------- */
  function avatar(u, cls) {
    return '<span class="avatar ' + (cls || "") + '" style="--h:' + u.h + '">' + esc(u.name.charAt(0)) + "</span>";
  }
  function nameHtml(u) {
    return esc(u.name) + (u.verified ? ic("check", "verified") : "") + (u.bot ? ' <span style="font-size:11px;font-weight:700;background:var(--ember-soft);color:var(--ember-deep);padding:2px 7px;border-radius:99px;vertical-align:2px">BOT</span>' : "");
  }
  function followBtn(u, cls) {
    if (u.me) return "";
    var on = isFollowing(u.id);
    return '<button class="btn-follow ' + (cls || "") + (on ? " is-following" : "") + '" data-follow="' + u.id + '">' + (on ? "Following" : "Follow") + "</button>";
  }
  function mediaHtml(m, id) {
    var src = mediaSrc(m);
    if (!src) return "";
    if (m.type === "video") return '<div class="media" data-dbl="' + id + '"><video src="' + src + '" controls playsinline preload="metadata"></video></div>';
    return '<div class="media" data-dbl="' + id + '"><img src="' + src + '" alt="" loading="lazy" /></div>';
  }
  function actions(p, kind) {
    var liked = has(S.liked, p.id), rep = has(S.reposted, p.id), sv = has(S.saved, p.id);
    return '<div class="actions">' +
      '<button class="act comment" data-comments="' + p.id + '">' + ic("comment") + "<span>" + fmt(p.comments.length) + "</span></button>" +
      '<button class="act repost' + (rep ? " on" : "") + '" data-repost="' + p.id + '">' + ic("repost") + "<span>" + fmt(p.reposts + (rep ? 1 : 0)) + "</span></button>" +
      '<button class="act like' + (liked ? " on" : "") + '" data-like="' + p.id + '">' + ic("heart") + "<span>" + fmt(p.likes + (liked ? 1 : 0)) + "</span></button>" +
      '<button class="act save' + (sv ? " on" : "") + '" data-save="' + p.id + '">' + ic("save") + "</button>" +
      '<button class="act share" data-share="' + p.id + '">' + ic("share") + "</button></div>";
  }
  function postHtml(p) {
    var u = S.users[p.user];
    return '<article class="card post" id="post-' + p.id + '">' +
      '<div class="post-head"><a href="#/u/' + u.handle + '">' + avatar(u) + '</a><div class="who"><b><a href="#/u/' + u.handle + '">' + nameHtml(u) + "</a></b><small>@" + u.handle + " · " + ago(p.time) + "</small></div>" + followBtn(u, "mini") + "</div>" +
      (p.text ? '<p class="post-text">' + rich(p.text) + "</p>" : "") +
      (p.media ? mediaHtml(p.media, p.id) : "") + actions(p) +
      '<div class="comments" data-cbox="' + p.id + '" hidden></div></article>';
  }
  function commentsHtml(p) {
    return p.comments.map(function (c) {
      var u = S.users[c.u] || S.users.me;
      return '<div class="comment">' + avatar(u, "sm") + '<div class="bubble"><b>' + esc(u.name) + "</b>" + esc(c.t) + "</div></div>";
    }).join("") + '<form class="comment-form" data-cform="' + p.id + '">' + avatar(S.users.me, "sm") + '<input placeholder="Write a comment" maxlength="200" /><button class="icon-btn" aria-label="Send">' + ic("send") + "</button></form>";
  }

  /* ---------- Shell ---------- */
  var NAV = [["home", "home", "Home"], ["explore", "search", "Explore"], ["reels", "reel", "Reels"], ["notifications", "bell", "Alerts"], ["profile", "user", "Profile"]];
  function route() { var h = location.hash.replace(/^#\/?/, ""); return h || "home"; }
  function renderShell() {
    var r = route().split("/")[0];
    var active = r === "u" ? ((route().split("/")[1] === "you") ? "profile" : "") : r;
    var nav = NAV.map(function (n) {
      var href = n[0] === "profile" ? "#/u/you" : "#/" + n[0];
      var badge = n[0] === "notifications" && unreadCount() ? '<span class="badge">' + unreadCount() + "</span>" : "";
      return '<a class="nav-item' + (active === n[0] ? " active" : "") + '" href="' + href + '">' + ic(n[1]) + badge + '<span class="label">' + (n[0] === "notifications" ? "Notifications" : n[2]) + "</span></a>";
    }).join("");
    $("#sidenav").innerHTML = '<a class="logo" href="#/home"><span class="logo-mark">' + ic("flame") + "</span><span class=\"logo-text\">parzon</span></a>" + nav +
      '<button class="btn-create" data-open="compose">' + ic("plus") + "<span>New post</span></button>" +
      '<a class="me-chip" href="#/u/you">' + avatar(S.users.me) + '<span class="who"><b>' + esc(S.users.me.name) + "</b><small>@" + S.users.me.handle + "</small></span></a>" +
      (window.parzonSignOut ? '<button class="signout-btn" data-signout>Sign out</button>' : "");
    $("#bottomnav").innerHTML = NAV.map(function (n, i) {
      if (i === 2) return '<button class="plus" data-open="compose" aria-label="New post">' + ic("plus") + '</button><a href="#/reels" class="' + (active === "reels" ? "active" : "") + '" aria-label="Reels">' + ic("reel") + "</a>";
      if (i === 3) return '<a href="#/notifications" class="' + (active === "notifications" ? "active" : "") + '" aria-label="Alerts">' + ic("bell") + (unreadCount() ? '<span class="badge" style="left:22px">' + unreadCount() + "</span>" : "") + "</a>";
      var href = n[0] === "profile" ? "#/u/you" : "#/" + n[0];
      return '<a href="' + href + '" class="' + (active === n[0] ? "active" : "") + '" aria-label="' + n[2] + '">' + ic(n[1]) + "</a>";
    }).join("");
    renderSide();
  }
  function renderSide() {
    var sug = Object.keys(S.users).map(function (k) { return S.users[k]; }).filter(function (u) { return !u.me && !isFollowing(u.id); }).slice(0, 4);
    var tags = ["#jollof", "#goldenhour", "#skate", "#livemusic", "#welcome"];
    $("#side").innerHTML = '<label class="search">' + ic("search") + '<input id="q" placeholder="Search Parzon" autocomplete="off" /></label>' +
      '<div class="card"><h3>Who to follow</h3>' + (sug.length ? sug.map(function (u) {
        return '<div class="suggest"><a href="#/u/' + u.handle + '">' + avatar(u) + '</a><div class="who"><b>' + nameHtml(u) + "</b><small>@" + u.handle + "</small></div>" + followBtn(u) + "</div>";
      }).join("") : '<small style="color:var(--ink-soft)">You follow everyone here. Nice.</small>') + "</div>" +
      '<div class="card"><h3>Trending</h3>' + tags.map(function (t, i) { return '<a class="trend" href="#/explore?q=' + encodeURIComponent(t) + '"><small>' + (i + 1) + " · Trending</small><b>" + t + "</b><small>" + fmt(900 + i * 777) + " posts</small></a>"; }).join("") + "</div>" +
      '<p class="foot">Parzon · Share moments, reels and stories</p>';
    var q = $("#q");
    q.addEventListener("keydown", function (e) { if (e.key === "Enter" && q.value.trim()) location.hash = "#/explore?q=" + encodeURIComponent(q.value.trim()); });
  }

  /* ---------- Views ---------- */
  function storiesBar() {
    var mine = S.stories.filter(function (s) { return s.user === "me"; })[0];
    var items = ['<button class="story add" data-addstory><span class="ring">' + avatar(S.users.me).replace('class="avatar ', 'class="avatar lg ') + '<span class="plus">' + ic("plus") + '</span></span><span class="label">Your story</span></button>'];
    S.stories.slice().sort(function (a, b) { return (a.seen === b.seen) ? 0 : a.seen ? 1 : -1; }).forEach(function (s) {
      var u = S.users[s.user];
      items.push('<button class="story' + (s.seen ? " seen" : "") + '" data-story="' + s.user + '"><span class="ring">' + avatar(u) + '</span><span class="label">' + (u.me ? "Your story" : esc(u.name.split(" ")[0])) + "</span></button>");
    });
    return '<div class="card stories">' + items.join("") + "</div>";
  }
  function composerHtml() {
    return '<div class="card composer">' + avatar(S.users.me) + '<div class="body"><textarea id="ctext" placeholder="What is happening?" maxlength="280"></textarea><div id="cprev"></div><div class="row"><div class="tools"><button class="icon-btn" data-pick="compose" title="Photo or video">' + ic("image") + '</button><button class="icon-btn" data-pick="compose" title="Video">' + ic("video") + '</button></div><div><span class="count" id="ccount">280</span><button class="btn-primary" id="cpost" disabled>Post</button></div></div></div></div>';
  }
  var pending = null; // {file,type,url}
  function viewHome(el) {
    var tab = S.tab || "foryou";
    var list = S.posts.slice().sort(function (a, b) { return b.time - a.time; });
    if (tab === "following") list = list.filter(function (p) { return isFollowing(p.user) || p.user === "me"; });
    el.innerHTML = '<div class="mobile-top"><a class="logo" href="#/home"><span class="logo-mark">' + ic("flame") + "</span><span class=\"logo-text\">parzon</span></a></div>" +
      storiesBar() + composerHtml() +
      '<div class="tabs"><button data-tab="foryou" class="' + (tab === "foryou" ? "active" : "") + '">For you</button><button data-tab="following" class="' + (tab === "following" ? "active" : "") + '">Following</button></div>' +
      '<div id="feed">' + (list.length ? list.map(postHtml).join("") : '<div class="card empty"><b>Nothing here yet</b>Follow a few people and their posts will land here.</div>') + "</div>";
    bindComposer();
  }
  function bindComposer() {
    var t = $("#ctext"), b = $("#cpost"), c = $("#ccount");
    if (!t) return;
    var upd = function () { c.textContent = 280 - t.value.length; b.disabled = !t.value.trim() && !pending; };
    t.addEventListener("input", upd);
    renderPending();
    b.addEventListener("click", function () { createPost(t.value.trim()); });
  }
  function renderPending() {
    var box = $("#cprev"); if (!box) return;
    if (!pending) { box.innerHTML = ""; return; }
    box.innerHTML = '<div class="preview">' + (pending.type === "video" ? '<video src="' + pending.url + '" controls playsinline></video>' : '<img src="' + pending.url + '" alt="" />') + '<button class="icon-btn remove" data-clearpending aria-label="Remove">' + ic("close") + "</button></div>";
    var b = $("#cpost"); if (b) b.disabled = false;
  }
  function createPost(text, extra) {
    if (!text && !pending) return;
    var p = { id: uid(), user: "me", text: text, time: Date.now(), likes: 0, reposts: 0, comments: [] };
    var done = function () { S.posts.unshift(p); save(); pending = null; renderAll(); toast("Posted"); };
    if (pending) {
      var key = uid(); p.media = { type: pending.type, key: key };
      urlCache[key] = pending.url;
      putBlob(key, pending.file).then(done);
    } else done();
  }

  function viewExplore(el) {
    var qs = location.hash.split("?")[1] || "", q = decodeURIComponent((qs.match(/q=([^&]*)/) || [, ""])[1]).toLowerCase();
    var users = Object.keys(S.users).map(function (k) { return S.users[k]; }).filter(function (u) { return !u.me && (!q || (u.name + u.handle + u.bio).toLowerCase().indexOf(q) > -1); });
    var items = S.posts.concat(S.reels).filter(function (p) { return !q || (p.text + S.users[p.user].name).toLowerCase().indexOf(q) > -1; });
    el.innerHTML = '<div class="mobile-top"><a class="logo" href="#/home"><span class="logo-mark">' + ic("flame") + "</span><span class=\"logo-text\">parzon</span></a></div><h1 class=\"page-title\">Explore</h1>" +
      '<label class="search" style="margin-bottom:16px">' + ic("search") + '<input id="eq" placeholder="Search people, posts, tags" value="' + esc(q) + '" /></label>' +
      (users.length ? '<div class="card people">' + users.map(function (u) { return '<div class="suggest"><a href="#/u/' + u.handle + '">' + avatar(u) + '</a><div class="who"><b>' + nameHtml(u) + "</b><small>@" + u.handle + " · " + fmt(followerCount(u.id)) + " followers</small></div>" + followBtn(u) + "</div>"; }).join("") + "</div>" : "") +
      (items.length ? '<div class="grid">' + items.map(tileHtml).join("") + "</div>" : '<div class="card empty"><b>No results</b>Try a different word.</div>');
    $("#eq").addEventListener("keydown", function (e) { if (e.key === "Enter") location.hash = "#/explore?q=" + encodeURIComponent(e.target.value.trim()); });
  }
  function tileHtml(p) {
    var isReel = S.reels.indexOf(p) > -1;
    var stat = '<div class="tile-stat"><span>' + ic("heart") + fmt(p.likes) + "</span><span>" + ic("comment").replace("<svg", '<svg style="fill:none"') + p.comments.length + "</span></div>";
    if (!p.media) return '<a class="tile text" href="#/home">' + esc(p.text.slice(0, 80)) + stat + "</a>";
    var src = mediaSrc(p.media);
    return '<a class="tile" href="' + (isReel ? "#/reels" : "#/home") + '">' + (p.media.type === "video" ? '<video src="' + src + '" muted preload="metadata"></video>' : '<img src="' + src + '" alt="" loading="lazy"/>') + (isReel ? '<span class="kind">' + ic("reel") + "</span>" : "") + stat + "</a>";
  }

  var muted = true;
  function viewReels(el) {
    var list = S.reels.slice().sort(function (a, b) { return b.time - a.time; });
    el.innerHTML = '<div class="reels-top"><h1 class="page-title">Reels</h1><div><button class="btn-primary" data-pick="reel">' + ic("video").replace("<svg", '<svg style="display:inline;vertical-align:-5px;margin-right:6px;width:20px;height:20px"') + "Upload reel</button></div></div>" +
      '<div class="mobile-top" style="padding-top:4px"><b style="font-family:var(--font-display);font-size:22px">Reels</b><button class="btn-primary" data-pick="reel">Upload</button></div>' +
      '<div class="reels" id="reels">' + list.map(reelHtml).join("") + "</div>";
    var vids = el.querySelectorAll(".reel video");
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { var v = e.target.querySelector("video"); if (!v) return; if (e.isIntersecting) { v.muted = muted; v.play().catch(function () {}); } else v.pause(); }); }, { threshold: 0.6 });
    el.querySelectorAll(".reel").forEach(function (r) { io.observe(r); });
    reelObserver = io;
  }
  var reelObserver;
  function reelHtml(p) {
    var u = S.users[p.user], liked = has(S.liked, p.id), sv = has(S.saved, p.id), src = mediaSrc(p.media);
    return '<section class="reel" id="reel-' + p.id + '"><div class="reel-media" data-dbl="' + p.id + '">' +
      (p.media.type === "video" ? '<video src="' + src + '" loop playsinline ' + (muted ? "muted" : "") + "></video>" : '<img src="' + src + '" alt="" />') + "</div>" +
      (p.media.type === "video" ? '<button class="icon-btn reel-sound" data-sound aria-label="Sound">' + ic(muted ? "mute" : "vol") + "</button>" : "") +
      '<div class="reel-info"><div class="reel-user"><a href="#/u/' + u.handle + '">' + avatar(u, "sm") + '</a><a href="#/u/' + u.handle + '">@' + u.handle + "</a>" + followBtn(u, "mini") + '</div><p class="reel-caption">' + rich(p.text) + '</p><div class="reel-audio">' + ic("music") + "<span>" + esc(p.audio || "Original audio · " + u.handle) + "</span></div></div>" +
      '<div class="reel-rail">' +
      '<button class="rail-btn like' + (liked ? " on" : "") + '" data-like="' + p.id + '"><span class="bubble">' + ic("heart") + "</span><span>" + fmt(p.likes + (liked ? 1 : 0)) + "</span></button>" +
      '<button class="rail-btn" data-rcomments="' + p.id + '"><span class="bubble">' + ic("comment") + "</span><span>" + fmt(p.comments.length) + "</span></button>" +
      '<button class="rail-btn save' + (sv ? " on" : "") + '" data-save="' + p.id + '"><span class="bubble">' + ic("save") + "</span><span>Save</span></button>" +
      '<button class="rail-btn" data-share="' + p.id + '"><span class="bubble">' + ic("share") + "</span><span>Share</span></button></div></section>";
  }

  function viewNotifs(el) {
    var list = S.notifs.slice().sort(function (a, b) { return b.time - a.time; });
    el.innerHTML = '<div class="mobile-top"><a class="logo" href="#/home"><span class="logo-mark">' + ic("flame") + "</span><span class=\"logo-text\">parzon</span></a></div><h1 class=\"page-title\">Notifications</h1>" +
      (list.length ? '<div class="card">' + list.map(function (n) {
        var u = S.users[n.from];
        var kind = { like: "heart", follow: "user", repost: "repost", comment: "comment" }[n.type];
        return '<div class="notif' + (n.unread ? " unread" : "") + '"><span class="ico ' + n.type + '">' + ic(kind) + "</span>" + avatar(u, "sm") + '<div class="txt"><b>' + esc(u.name) + "</b> " + esc(n.text) + "<small>" + ago(n.time) + " ago</small></div>" + (n.type === "follow" ? followBtn(u, "mini") : "") + "</div>";
      }).join("") + "</div>" : '<div class="card empty"><b>All quiet</b>Likes, follows and comments show up here.</div>');
    var changed = false; S.notifs.forEach(function (n) { if (n.unread) { n.unread = false; changed = true; } });
    if (changed) { save(); renderShell(); }
  }

  function viewProfile(el, handle) {
    var u = userByHandle(handle);
    if (!u) { el.innerHTML = '<div class="card empty"><b>Profile not found</b><a href="#/home" class="btn-ghost" style="display:inline-block;margin-top:10px">Back home</a></div>'; return; }
    var tab = S.ptab || "posts";
    var posts = S.posts.filter(function (p) { return p.user === u.id; }).sort(function (a, b) { return b.time - a.time; });
    var reels = S.reels.filter(function (p) { return p.user === u.id; });
    var savedItems = S.saved.map(findItem).filter(Boolean);
    var shown = tab === "reels" ? reels : tab === "saved" ? savedItems : posts;
    el.innerHTML = '<div class="mobile-top"><a class="logo" href="#/home"><span class="logo-mark">' + ic("flame") + "</span><span class=\"logo-text\">parzon</span></a></div>" +
      '<div class="card profile" style="--h:' + u.h + '"><div class="cover"></div><div class="profile-body"><div class="profile-row">' + avatar(u, "xl") + '<div class="btns">' + (u.me ? '<button class="btn-ghost" data-open="edit">Edit profile</button>' + (window.parzonSignOut ? '<button class="btn-ghost" data-signout>Sign out</button>' : "") : followBtn(u)) + "</div></div>" +
      "<h1>" + nameHtml(u) + '</h1><div class="handle">@' + u.handle + '</div><p class="bio">' + esc(u.bio) + '</p><div class="stats"><span><b>' + posts.length + "</b>posts</span><span><b>" + fmt(followerCount(u.id)) + "</b>followers</span><span><b>" + (u.me ? S.following.length : (u.id === "bot" ? 0 : 40)) + "</b>following</span></div></div></div>" +
      '<div class="tabs"><button data-ptab="posts" class="' + (tab === "posts" ? "active" : "") + '">Posts</button><button data-ptab="reels" class="' + (tab === "reels" ? "active" : "") + '">Reels</button>' + (u.me ? '<button data-ptab="saved" class="' + (tab === "saved" ? "active" : "") + '">Saved</button>' : "") + "</div>" +
      (tab === "posts" ? (posts.length ? posts.map(postHtml).join("") : '<div class="card empty"><b>No posts yet</b>' + (u.me ? "Share your first moment from Home." : "Check back soon.") + "</div>")
        : shown.length ? '<div class="grid">' + shown.map(tileHtml).join("") + "</div>" : '<div class="card empty"><b>Nothing here</b>' + (tab === "saved" ? "Tap the bookmark on any post to keep it." : "No reels yet.") + "</div>");
  }

  function renderAll() {
    var r = route(), el = $("#view");
    var parts = r.split("?")[0].split("/");
    renderShell();
    if (parts[0] === "explore") viewExplore(el);
    else if (parts[0] === "reels") viewReels(el);
    else if (parts[0] === "notifications") viewNotifs(el);
    else if (parts[0] === "u") viewProfile(el, parts[1]);
    else viewHome(el);
  }
  function rerenderKeepScroll() { var y = window.scrollY, rs = $("#reels") ? $("#reels").scrollTop : 0; renderAll(); window.scrollTo(0, y); if ($("#reels")) $("#reels").scrollTop = rs; }

  /* ---------- Actions ---------- */
  function addNotif(type, from, text) { S.notifs.unshift({ id: uid(), type: type, from: from, time: Date.now(), unread: true, text: text }); }
  function doLike(id) {
    var on = toggle(S.liked, id); save();
    var p = findItem(id);
    document.querySelectorAll('[data-like="' + id + '"]').forEach(function (b) {
      b.classList.toggle("on", on);
      var sp = b.querySelector("span:last-child"); if (sp) sp.textContent = fmt(p.likes + (on ? 1 : 0));
    });
  }
  function burstAt(el) { var b = document.createElement("div"); b.className = "burst"; b.innerHTML = ic("heart"); el.appendChild(b); setTimeout(function () { b.remove(); }, 850); }
  function openOverlay(html, onClose) { var o = $("#overlay"); o.innerHTML = html; o.hidden = false; o._close = onClose; document.body.style.overflow = "hidden"; }
  function closeOverlay() { var o = $("#overlay"); if (o._close) o._close(); o._close = null; o.hidden = true; o.innerHTML = ""; document.body.style.overflow = ""; }

  /* Stories */
  var storyTimer;
  function openStory(userId) {
    var order = S.stories.filter(function (s) { return true; }).map(function (s) { return s.user; });
    var idx = order.indexOf(userId), si = 0;
    function show() {
      clearTimeout(storyTimer);
      var st = S.stories[idx]; if (!st) return closeOverlay();
      var u = S.users[st.user], sl = st.slides[si];
      st.seen = true;
      openStoryHtml(st, u, sl);
      storyTimer = setTimeout(next, 4500);
    }
    function openStoryHtml(st, u, sl) {
      var src = sl.key ? urlCache[sl.key] : sl.img;
      var o = $("#overlay"); o.hidden = false; document.body.style.overflow = "hidden"; o._close = function () { clearTimeout(storyTimer); save(); renderAll(); };
      o.innerHTML = '<div class="story-view" style="--h:' + u.h + '"><div class="bars">' + st.slides.map(function (_, i) { return "<span><i" + (i < si ? ' style="width:100%"' : "") + "></i></span>"; }).join("") + "</div>" +
        '<div class="slide' + (sl.text ? " text" : "") + '">' + (sl.text ? esc(sl.text) : '<img src="' + src + '" alt="" />') + "</div>" +
        '<div class="story-head">' + avatar(u, "sm") + "<span>" + esc(u.name) + "<small>" + (u.me ? "Just now" : "2h") + '</small></span><button class="icon-btn" data-closeov aria-label="Close">' + ic("close") + "</button></div>" +
        '<button class="tap prev" data-sprev aria-label="Previous"></button><button class="tap next" data-snext aria-label="Next"></button>' +
        (u.me ? "" : '<form class="story-reply" data-sreply><input placeholder="Reply to ' + esc(u.name.split(" ")[0]) + '" /><button class="icon-btn" data-slike aria-label="Like" type="button">' + ic("heart") + '</button></form>') + "</div>";
      var bar = o.querySelectorAll(".bars span i")[si];
      if (bar) { bar.style.transition = "width 4.5s linear"; requestAnimationFrame(function () { requestAnimationFrame(function () { bar.style.width = "100%"; }); }); }
    }
    function next() { var st = S.stories[idx]; if (si < st.slides.length - 1) { si++; show(); } else if (idx < S.stories.length - 1) { idx++; si = 0; show(); } else closeOverlay(); }
    function prev() { if (si > 0) { si--; show(); } else if (idx > 0) { idx--; si = 0; show(); } else show(); }
    openStory._next = next; openStory._prev = prev;
    show();
  }

  /* Modals */
  function openCompose() {
    openOverlay('<div class="modal"><h2>New post</h2><textarea id="mtext" rows="4" maxlength="280" placeholder="What is happening?"></textarea><div id="mprev"></div><div class="row" style="justify-content:space-between"><button class="icon-btn" data-pick="compose">' + ic("image") + '</button><div style="display:flex;gap:10px"><button class="btn-ghost" data-closeov>Cancel</button><button class="btn-primary" id="mpost">Post</button></div></div></div>');
    $("#mtext").focus();
    $("#mpost").addEventListener("click", function () { var t = $("#mtext").value.trim(); if (!t && !pending) return toast("Write something first"); closeOverlay(); createPost(t); location.hash = "#/home"; });
  }
  function openEdit() {
    var m = S.users.me;
    openOverlay('<div class="modal"><h2>Edit profile</h2><label>Name</label><input id="en" maxlength="30" value="' + esc(m.name) + '"/><label>Username</label><input id="eh" maxlength="20" value="' + esc(m.handle) + '"/><label>Bio</label><textarea id="eb" rows="3" maxlength="140">' + esc(m.bio) + '</textarea><div class="row"><button class="btn-ghost" data-closeov>Cancel</button><button class="btn-primary" id="esave">Save</button></div></div>');
    $("#esave").addEventListener("click", function () {
      var h = $("#eh").value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || "you";
      var clash = userByHandle(h); if (clash && clash.id !== "me") return toast("That username is taken");
      m.name = $("#en").value.trim() || "You"; m.handle = h; m.bio = $("#eb").value.trim(); save(); closeOverlay(); location.hash = "#/u/" + h; renderAll(); toast("Profile updated");
    });
  }
  function openReelComments(id) {
    var p = findItem(id);
    openOverlay('<div class="modal"><h2>Comments</h2><div id="rc">' + commentsHtml(p) + '</div><div class="row"><button class="btn-ghost" data-closeov>Close</button></div></div>');
  }

  /* File picking */
  var pickMode = "";
  function pick(mode) { pickMode = mode; var id = mode === "reel" ? "#fileReel" : mode === "story" ? "#fileStory" : "#fileCompose"; var f = $(id); f.value = ""; f.click(); }
  function onFile(e, mode) {
    var f = e.target.files[0]; if (!f) return;
    if (f.size > 80 * 1024 * 1024) return toast("That file is over 80 MB");
    var type = f.type.indexOf("video") === 0 ? "video" : "image";
    var url = URL.createObjectURL(f);
    if (mode === "compose") {
      pending = { file: f, type: type, url: url };
      if ($("#overlay").hidden === false && $("#mprev")) $("#mprev").innerHTML = '<div class="preview">' + (type === "video" ? '<video src="' + url + '" controls playsinline></video>' : '<img src="' + url + '" alt=""/>') + "</div>";
      else renderPending();
    } else if (mode === "reel") {
      var key = uid(); urlCache[key] = url;
      var cap = prompt("Add a caption for your reel (optional)") || "";
      putBlob(key, f).then(function () {
        S.reels.unshift({ id: uid(), user: "me", text: cap, media: { type: type, key: key }, audio: "Original audio · " + S.users.me.handle, time: Date.now(), likes: 0, reposts: 0, comments: [] });
        save(); renderAll(); toast("Reel uploaded");
      });
    } else if (mode === "story") {
      if (type === "video") return toast("Stories take photos only");
      var k = uid(); urlCache[k] = url;
      putBlob(k, f).then(function () {
        var mine = S.stories.filter(function (s) { return s.user === "me"; })[0];
        if (mine) { mine.slides.push({ key: k }); mine.seen = false; } else S.stories.unshift({ user: "me", slides: [{ key: k }], seen: false });
        save(); renderAll(); toast("Added to your story");
      });
    }
  }

  /* ---------- Events ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("button, a, [data-dbl]"); if (!t) return;
    var d = t.dataset;
    if (d.follow) {
      var on = toggle(S.following, d.follow); save(); var u = S.users[d.follow];
      toast(on ? "Following " + u.name : "Unfollowed " + u.name);
      if (on && d.follow === "bot") setTimeout(function () { botPost("Thanks for the follow! Here is something fresh for you."); }, 1800);
      rerenderKeepScroll(); return;
    }
    if (d.like) { doLike(d.like); return; }
    if (d.save) { var s = toggle(S.saved, d.save); save(); toast(s ? "Saved" : "Removed from saved"); rerenderKeepScroll(); return; }
    if (d.repost) { var r = toggle(S.reposted, d.repost); save(); toast(r ? "Reposted to your followers" : "Repost removed"); rerenderKeepScroll(); return; }
    if (d.share) {
      var link = location.href.split("#")[0] + "#/home";
      if (navigator.share) navigator.share({ title: "Parzon", url: link }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { toast("Link copied"); }, function () { toast("Copy not allowed here"); });
      return;
    }
    if (d.comments) { var box = $('[data-cbox="' + d.comments + '"]'); box.hidden = !box.hidden; if (!box.hidden) { box.innerHTML = commentsHtml(findItem(d.comments)); var i = box.querySelector("input"); i && i.focus(); } return; }
    if (d.rcomments) { openReelComments(d.rcomments); return; }
    if (d.tab) { S.tab = d.tab; renderAll(); return; }
    if (d.ptab) { S.ptab = d.ptab; renderAll(); return; }
    if (d.story) { openStory(d.story); return; }
    if (t.hasAttribute("data-addstory")) { pick("story"); return; }
    if (t.hasAttribute("data-signout")) { if (window.parzonSignOut && confirm("Sign out of Parzon?")) window.parzonSignOut(); return; }
    if (d.open === "compose") { openCompose(); return; }
    if (d.open === "edit") { openEdit(); return; }
    if (d.pick) { pick(d.pick); return; }
    if (t.hasAttribute("data-closeov")) { closeOverlay(); return; }
    if (t.hasAttribute("data-clearpending")) { pending = null; renderPending(); var cb = $("#cpost"); if (cb && !$("#ctext").value.trim()) cb.disabled = true; return; }
    if (t.hasAttribute("data-snext")) { openStory._next(); return; }
    if (t.hasAttribute("data-sprev")) { openStory._prev(); return; }
    if (t.hasAttribute("data-slike")) { t.style.color = "var(--like)"; t.querySelector("svg").style.fill = "currentColor"; toast("Liked their story"); return; }
    if (t.hasAttribute("data-sound")) { muted = !muted; document.querySelectorAll(".reel video").forEach(function (v) { v.muted = muted; }); t.innerHTML = ic(muted ? "mute" : "vol"); return; }
  });
  document.addEventListener("dblclick", function (e) {
    var m = e.target.closest("[data-dbl]"); if (!m) return;
    var id = m.dataset.dbl; if (!has(S.liked, id)) doLike(id); burstAt(m);
  });
  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (f.dataset.cform) {
      e.preventDefault(); var inp = f.querySelector("input"), v = inp.value.trim(); if (!v) return;
      var p = findItem(f.dataset.cform); p.comments.push({ u: "me", t: v }); save();
      var box = f.closest("[data-cbox]") || $("#rc"); box.innerHTML = commentsHtml(p);
      document.querySelectorAll('[data-comments="' + p.id + '"] span, [data-rcomments="' + p.id + '"] span:last-child').forEach(function (s) { s.textContent = fmt(p.comments.length); });
    } else if (f.hasAttribute("data-sreply")) {
      e.preventDefault(); if (f.querySelector("input").value.trim()) { toast("Reply sent"); f.querySelector("input").value = ""; }
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("#overlay").hidden) closeOverlay(); if (!$("#overlay").hidden && openStory._next) { if (e.key === "ArrowRight") openStory._next(); if (e.key === "ArrowLeft") openStory._prev(); } });
  $("#overlay").addEventListener("click", function (e) { if (e.target.id === "overlay") closeOverlay(); });
  $("#fileCompose").addEventListener("change", function (e) { onFile(e, "compose"); });
  $("#fileReel").addEventListener("change", function (e) { onFile(e, "reel"); });
  $("#fileStory").addEventListener("change", function (e) { onFile(e, "story"); });
  window.addEventListener("hashchange", function () { if (!$("#overlay").hidden) closeOverlay(); renderAll(); window.scrollTo(0, 0); });

  /* ---------- Parzon Bot: an automated demo account that posts on its own ---------- */
  var BOT_LINES = [
    "Tip of the day: double-tap any photo to like it. #parzontips",
    "Reels now play on tap. Try uploading a short video from the Reels page. #reels",
    "Fun fact: the first ever photo on the internet was posted in 1992. #funfact",
    "Good morning, Parzon! What are you sharing today?",
    "Story time: add a photo from the plus icon next to your face. #stories",
    "Reminder: be kind in the comments. Everyone is somebody's friend. #kindness",
    "Poll of the day: sunrise or sunset? Tell me in the comments. #poll",
    "You can save any post with the bookmark. Find it on your profile under Saved."
  ];
  var botIdx = 0;
  function botPost(text) {
    var line = text || BOT_LINES[botIdx++ % BOT_LINES.length];
    S.posts.unshift({ id: uid(), user: "bot", text: line, time: Date.now(), likes: Math.floor(Math.random() * 60), reposts: 0, comments: [] });
    if (isFollowing("bot")) addNotif("comment", "bot", "posted: " + line.slice(0, 50) + (line.length > 50 ? "…" : ""));
    S.followers.bot += 3;
    save();
    var r = route().split("/")[0];
    if ((r === "home" || r === "") && document.activeElement && document.activeElement.id !== "ctext" && document.activeElement.id !== "mtext" && $("#overlay").hidden) rerenderKeepScroll(); else renderShell();
    toast("Parzon Bot posted something new");
  }
  setInterval(function () { if (!document.hidden) botPost(); }, 45000);

  /* ---------- Boot ---------- */
  load();
  var storyMedia = [];
  S.stories.forEach(function (s) { s.slides.forEach(function (sl) { if (sl.key) storyMedia.push({ media: { key: sl.key } }); }); });
  resolveMedia(S.posts.concat(S.reels, storyMedia)).then(function () {
    if (!location.hash) location.hash = "#/home";
    renderAll();
  });
})();
