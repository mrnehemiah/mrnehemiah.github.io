const BUCKET = 'zune-reels';
const state = { reels: [], products: new Map(), liked: new Set(), following: new Set(), saved: new Set(), cloudSaves: false, viewed: new Set(), audioPlayer: null, sessionKey: '', tab: 'for-you', search: '', observer: null, loading: false, root: null, context: null };

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function initials(value) {
  return String(value || 'Z').trim().split(/\s+/).slice(0,2).map(x => x[0] || '').join('').toUpperCase();
}
function publicUrl(db, path) {
  if (!path) return '';
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
function toast(message) {
  let node = document.getElementById('z-reels-toast');
  if (!node) {
    node = document.createElement('div');
    node.id = 'z-reels-toast';
    node.className = 'z-reels-toast';
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.classList.add('show');
  window.clearTimeout(node._hideTimer);
  node._hideTimer = window.setTimeout(() => node.classList.remove('show'), 2400);
}
function installStyles() {
  if (document.getElementById('zuneReelsStyles')) return;
  const style = document.createElement('style');
  style.id = 'zuneReelsStyles';
  style.textContent = `
    :root{--zr-bg:#090D16;--zr-nav:#111827;--zr-purple:#A78BFA;--zr-white:#FFFFFF;--zr-muted:#9CA3AF}
    .z-reels-shell{position:fixed;inset:0 0 74px;z-index:20;min-height:0;overflow:hidden;overscroll-behavior:none;background:var(--zr-bg);color:var(--zr-white);padding:0}
    .z-reels-page{width:100%;height:100%;max-width:520px;margin:0 auto;display:flex;flex-direction:column;min-height:0;overflow:hidden;background:var(--zr-bg);color:var(--zr-white);padding:0}
    .z-reels-head{position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px 10px;background:#090D16f5;border-bottom:1px solid #ffffff12;backdrop-filter:blur(18px)}
    .z-reels-brand{font:900 19px/1.1 Manrope,Arial,sans-serif;letter-spacing:1.1px;color:#fff}
    .z-reels-brand em{font-style:normal;color:var(--zr-purple)}
    .z-reels-brand small{display:block;margin-top:4px;font:600 9px/1 Arial,sans-serif;letter-spacing:2px;color:var(--zr-muted)}
    .z-reels-head-actions{display:flex;gap:9px}
    .z-reels-icon-btn{width:40px;height:40px;border:1px solid #ffffff1c;border-radius:14px;background:#ffffff0b;color:#fff;font-size:20px;display:grid;place-items:center}
    .z-reels-icon-btn:active{transform:scale(.96);background:#A78BFA25}
    .z-reels-search[hidden]{display:none}
    .z-reels-search{display:block;margin:10px 14px 8px;padding:11px 14px;border:1px solid #A78BFA55;border-radius:14px;background:#111827;color:#fff}
    .z-reels-search input{width:100%;border:0;outline:0;background:transparent;color:#fff;font-size:13px}
    .z-reels-search input::placeholder{color:#9CA3AF}
    .z-reels-tabs{position:sticky;top:64px;z-index:25;display:flex;gap:0;padding:0 12px;background:#090D16f5;border-bottom:1px solid #ffffff12;backdrop-filter:blur(18px)}
    .z-reels-tabs button{position:relative;flex:1;border:0;background:transparent;color:#9CA3AF;padding:13px 8px 12px;font-size:12px;font-weight:800;white-space:nowrap}
    .z-reels-tabs button.active{color:#fff}
    .z-reels-tabs button.active:after{content:"";position:absolute;left:25%;right:25%;bottom:0;height:3px;border-radius:5px 5px 0 0;background:#A78BFA;box-shadow:0 0 14px #A78BFA88}
    .z-reels-feed{display:flex;flex:1 1 auto;min-height:0;flex-direction:column;gap:12px;padding:10px 10px 16px;overflow-x:hidden;overflow-y:auto;overscroll-behavior-y:contain;touch-action:pan-y;scroll-snap-type:y mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none}.z-reels-feed::-webkit-scrollbar{display:none}
    .z-reel-card{position:relative;flex:0 0 auto;scroll-snap-align:start;scroll-snap-stop:always;height:min(780px,100%);min-height:500px;width:100%;max-width:500px;margin:0 auto;overflow:hidden;border:1px solid #ffffff16;border-radius:22px;background:#111827;isolation:isolate;box-shadow:0 18px 50px #0008}
    .z-reel-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#111827}
    .z-reel-watermark{position:absolute;left:12px;top:47%;z-index:2;display:flex;align-items:center;gap:7px;max-width:72%;padding:6px 10px;border:1px solid #ffffff55;border-radius:8px;background:#090D1648;color:#fff;opacity:.55;transform:rotate(-12deg);pointer-events:none;user-select:none;text-shadow:0 1px 5px #000;animation:zuneWatermarkDrift 13s ease-in-out infinite alternate}.z-reel-watermark b{font:900 13px Manrope;letter-spacing:2px}.z-reel-watermark span{font-size:10px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}@keyframes zuneWatermarkDrift{0%{left:10px;top:42%}50%{left:24%;top:52%}100%{left:8%;top:61%}}
    .z-reel-shade{position:absolute;inset:0;background:linear-gradient(180deg,#090D1670 0%,transparent 23%,transparent 48%,#090D16ed 100%);pointer-events:none}
    .z-reel-top{position:absolute;top:14px;left:14px;right:14px;z-index:3;display:flex;align-items:center;gap:9px}
    .z-reel-avatar{width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;overflow:hidden;border:2px solid #A78BFA;border-radius:50%;background:#24213a;color:#fff;font-size:12px;font-weight:900}
    .z-reel-creator{min-width:0;flex:1;text-shadow:0 2px 8px #000}
    .z-reel-creator strong{display:flex;align-items:center;gap:5px;font-size:12px;color:#fff}
    .z-reel-creator small{display:block;margin-top:3px;color:#e5e7eb;font-size:10px}
    .z-reel-badge{color:#A78BFA;font-size:10px;font-weight:900}
    .z-reel-follow{border:1px solid #A78BFA;border-radius:999px;background:#A78BFA20;color:#fff;padding:8px 13px;font-size:10px;font-weight:900;backdrop-filter:blur(10px)}
    .z-reel-follow.following{background:#A78BFA;color:#090D16}
    .z-reel-actions{position:absolute;right:10px;bottom:136px;z-index:4;display:flex;flex-direction:column;align-items:center;gap:9px}
    .z-reel-action{min-width:32px;display:flex;flex-direction:column;align-items:center;gap:2px;border:0;background:transparent;color:#fff;padding:2px;text-shadow:0 2px 7px #000;font-size:10px;font-weight:800;line-height:1.1;-webkit-tap-highlight-color:transparent}
    .z-reel-action .glyph{position:relative;width:34px;height:34px;display:grid;place-items:center;overflow:visible;border:0;border-radius:0;background:transparent;color:#fff;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;transform:none;transition:transform .16s ease,color .16s ease}
    .z-reel-action .glyph:before{content:none}
    .z-reel-action .glyph svg{position:relative;z-index:1;width:23px;height:23px;filter:drop-shadow(0 2px 3px #000b)}
    .z-reel-action:active .glyph{transform:scale(.88)}
    .z-reel-action.active .glyph{color:#fb7185}
    .z-reel-action.saved .glyph{color:#c4b5fd}
    .z-reel-action>span:not(.glyph){min-height:10px;color:#fff;font-size:9px;font-weight:800;text-shadow:0 1px 5px #000}
    .z-reel-copy{position:absolute;left:14px;right:64px;bottom:14px;z-index:3;color:#fff;text-shadow:0 2px 8px #000}
    .z-reel-creator-row{display:flex;align-items:center;gap:9px;min-width:0;margin-bottom:7px}
    .z-reel-creator-row .z-reel-avatar{width:36px;height:36px;flex:0 0 36px;border-color:#fff;background:#24213a}
    .z-reel-creator-row .z-reel-creator{min-width:0;flex:1}
    .z-reel-creator-row .z-reel-creator strong{flex-wrap:wrap;font-size:13px}
    .z-reel-creator-row .z-reel-follow{flex:0 0 auto}
    .z-reel-caption{margin:5px 0;color:#fff;font-size:12px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
    .z-reel-tags{color:#ddd6fe;font-size:10px;font-weight:700}
    .z-reel-challenge{display:inline-block;margin:0 0 6px;padding:5px 8px;border:1px solid #A78BFA88;border-radius:999px;background:#A78BFA25;color:#fff;font-size:10px;font-weight:800}
    .z-reel-audio{display:flex;align-items:center;gap:6px;margin-top:7px;color:#e5e7eb;font-size:10px}
    .z-reel-product-list{display:flex;gap:8px;overflow-x:auto;padding:7px 0 2px;scrollbar-width:none}
    .z-reel-product{flex:0 0 min(260px,82%);display:flex;align-items:center;gap:9px;min-width:0;padding:8px;border:1px solid #A78BFA55;border-radius:15px;background:#111827ed;color:#fff;text-align:left;backdrop-filter:blur(14px)}
    .z-reel-product img{width:43px;height:43px;flex:0 0 43px;border-radius:10px;object-fit:cover;background:#fff}
    .z-reel-product span{min-width:0;flex:1}
    .z-reel-product strong{display:block;overflow:hidden;color:#fff;font-size:11px;text-overflow:ellipsis;white-space:nowrap}
    .z-reel-product small{display:block;margin-top:3px;color:#9CA3AF;font-size:10px}
    .z-reel-product b{color:#A78BFA;font-size:10px;white-space:nowrap}
    .z-reel-product-actions{display:flex;gap:7px;margin-top:6px}
    .z-reel-product-actions button{border:1px solid #A78BFA77;border-radius:10px;background:#A78BFA;color:#090D16;padding:7px 10px;font-size:10px;font-weight:900}
    .z-reel-product-actions button.secondary{background:#111827;color:#fff}
    .z-reels-empty{max-width:500px;margin:24px auto;padding:32px 22px;border:1px solid #ffffff18;border-radius:22px;background:linear-gradient(145deg,#151c2e,#0c1220);text-align:center}
    .z-reels-empty .mark{font-size:36px;color:#A78BFA}
    .z-reels-empty h2{margin:12px 0;font:800 19px Manrope,Arial,sans-serif;color:#fff}
    .z-reels-empty p{color:#9CA3AF;font-size:12px;line-height:1.7}
    .z-reels-empty button{margin-top:12px;border:0;border-radius:12px;background:#A78BFA;color:#090D16;padding:12px 17px;font-weight:900}
    .z-reel-comments-backdrop{position:fixed;inset:0;z-index:1000;display:flex;align-items:flex-end;justify-content:center;background:#000b}
    .z-reel-comments{width:min(100%,560px);max-height:82vh;display:flex;flex-direction:column;gap:12px;padding:17px;background:#111827;color:#fff;border:1px solid #ffffff22;border-radius:22px 22px 0 0}
    .z-reel-comments-head{display:flex;align-items:center;justify-content:space-between}
    .z-reel-comments-head strong{font-size:14px}
    .z-reel-comments-head button{border:0;background:transparent;color:#fff;font-size:24px}
    .z-reel-comments-list{display:flex;flex-direction:column;gap:13px;overflow:auto;min-height:100px}
    .z-reel-comment{display:flex;align-items:flex-start;gap:9px;color:#e5e7eb;font-size:12px;line-height:1.5}
    .z-reel-comment-main{min-width:0;flex:1}
    .z-reel-comment strong{color:#fff;margin-right:5px}
    .z-reel-comment time{display:block;margin-top:3px;color:#9CA3AF;font-size:9px}
    .z-reel-comment-like{border:0;background:transparent;color:#9CA3AF;font-size:10px;padding:4px}
    .z-reel-comment-like.active{color:#fb7185}
    .z-reel-comment-form{display:flex;gap:8px}
    .z-reel-comment-form input{min-width:0;flex:1;border:1px solid #ffffff25;border-radius:13px;background:#090D16;color:#fff;padding:12px}
    .z-reel-comment-form button{border:0;border-radius:12px;background:#A78BFA;color:#090D16;padding:0 16px;font-weight:900}
    .z-reels-toast{position:fixed;left:50%;bottom:95px;z-index:1200;transform:translate(-50%,14px);opacity:0;pointer-events:none;padding:11px 16px;border:1px solid #A78BFA55;border-radius:999px;background:#111827;color:#fff;font-size:12px;font-weight:800;transition:.2s}
    .z-reels-toast.show{transform:translate(-50%,0);opacity:1}
    .z-reel-media-error{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:25px;background:#090D16e8;color:#fff;text-align:center}
    .z-reel-media-error small{color:#9CA3AF;line-height:1.6}
    @media(min-width:700px){.z-reels-page{max-width:520px}.z-reel-card{height:min(780px,calc(100svh - 175px))}}
    @media(max-width:520px){.z-reels-shell{padding:0}.z-reels-page{padding:0}.z-reels-feed{gap:0;padding:0}.z-reel-card{flex:0 0 100%;height:100%;min-height:100%;max-height:none;border:0;border-radius:0;max-width:none;touch-action:pan-y}.z-reels-tabs{top:62px}.z-reel-actions{right:9px;bottom:130px;gap:11px}.z-reel-copy{left:13px;bottom:12px;right:62px}.z-reel-product{flex-basis:min(245px,90%)}}
    @media(prefers-reduced-motion:reduce){.z-reels-toast{transition:none}}
  `;
  document.head.appendChild(style);
}
function icon(name) {
  const paths = {
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
    comment:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
    share:'<path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/>',
    save:'<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"/>',
    sound:'<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>',
    report:'<path d="M4 22V4"/><path d="M4 4c6-4 10 4 16 0v11c-6 4-10-4-16 0"/>'
  };
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || paths.heart) + '</g></svg>';
}
function cardHTML(reel) {
  const creator = reel.creator || {};
  const role = String(creator.role || '').toLowerCase();
  const official = role === 'admin';
  const verified = official || (role === 'vendor' && creator.is_verified === true);
  const creatorName = official ? 'ZUNE Official' : (creator.full_name || reel.creator_display_name || 'ZUNE Seller');
  const products = Array.isArray(reel.products) && reel.products.length ? reel.products : (reel.product ? [reel.product] : []);
  const sound = reel.sound || null;
  const video = publicUrl(state.context.db, reel.video_path);
  const thumb = reel.thumbnail_path ? publicUrl(state.context.db, reel.thumbnail_path) : '';
  const liked = state.liked.has(reel.id);
  const following = state.following.has(reel.creator_id);
  const saved = state.saved.has(reel.id);
  const tags = Array.isArray(reel.hashtags) ? reel.hashtags.map(x => '#' + String(x).replace(/^#/, '')).join(' ') : '';
  const challengeHtml = (reel.challenges || []).map(challenge => '<span class="z-reel-challenge">✦ '+esc(challenge.title)+' · #'+esc(challenge.hashtag)+'</span>').join('');
  const productHtml = products.slice(0,10).map(product => {
    const inStock = product.stock_quantity == null || Number(product.stock_quantity) > 0;
    return '<div class="z-reel-product"><img src="' + esc(product.image_url || '') + '" alt="" loading="lazy"><span><strong>' + esc(product.title) + '</strong><small>TSh ' + Number(product.price || 0).toLocaleString('en-TZ') + (inStock ? ' · Inapatikana' : ' · Imeisha') + '</small><div class="z-reel-product-actions"><button type="button" class="secondary" data-reel-product="' + esc(reel.id) + '" data-product-id="' + esc(product.id) + '">Tazama</button><button type="button" data-reel-cart="' + esc(product.id) + '"' + (inStock ? '' : ' disabled') + '>Ongeza Cart</button></div></span></div>';
  }).join('');
  return '<article class="z-reel-card" data-reel-card="' + esc(reel.id) + '">' +
    '<video class="z-reel-video" data-reel-video="' + esc(reel.id) + '" src="' + esc(video) + '" poster="' + esc(thumb) + '" playsinline autoplay loop muted preload="metadata"></video><div class="z-reel-shade"></div>' +
    '<div class="z-reel-actions">' +
    '<button type="button" class="z-reel-action ' + (liked ? 'active' : '') + '" data-reel-like="' + esc(reel.id) + '"><span class="glyph">' + icon('heart') + '</span><span data-like-count="' + esc(reel.id) + '">' + Number(reel.likes_count || 0).toLocaleString() + '</span></button>' +
    '<button type="button" class="z-reel-action" data-reel-comments="' + esc(reel.id) + '"><span class="glyph">' + icon('comment') + '</span><span>' + Number(reel.comments_count || 0).toLocaleString() + '</span></button>' +
    '<button type="button" class="z-reel-action" data-reel-share="' + esc(reel.id) + '"><span class="glyph">' + icon('share') + '</span><span data-share-count="' + esc(reel.id) + '">' + Number(reel.shares_count || 0).toLocaleString() + '</span></button>' +
    '<button type="button" class="z-reel-action ' + (saved ? 'saved' : '') + '" data-reel-save="' + esc(reel.id) + '" aria-label="' + (saved ? 'Ondoa kwenye zilizohifadhiwa' : 'Hifadhi Reel') + '" title="' + (saved ? 'Saved' : 'Save') + '"><span class="glyph">' + icon('save') + '</span></button>' +
    '<button type="button" class="z-reel-action" data-reel-audio="' + esc(reel.id) + '" aria-label="Sauti" title="Sound"><span class="glyph">' + icon('sound') + '</span></button>' +
    '<button type="button" class="z-reel-action" data-reel-report="' + esc(reel.id) + '" aria-label="Ripoti Reel" title="Report"><span class="glyph">' + icon('report') + '</span></button>' +
    '</div><div class="z-reel-copy"><div class="z-reel-creator-row"><div class="z-reel-avatar">' + esc(initials(creatorName)) + '</div><div class="z-reel-creator"><strong>' + esc(creatorName) + (verified ? '<span class="z-reel-badge">✦ ' + (official ? 'OFFICIAL' : 'VERIFIED') + '</span>' : '') + '</strong></div>' + (state.context.user && !official && creator.id !== state.context.user.id ? '<button type="button" class="z-reel-follow ' + (following ? 'following' : '') + '" data-reel-follow="' + esc(reel.id) + '">' + (following ? 'Following' : 'Follow') + '</button>' : '') + '</div>' + (reel.caption ? '<p class="z-reel-caption">' + esc(reel.caption) + '</p>' : '') + (tags ? '<div class="z-reel-tags">' + esc(tags) + '</div>' : '') + challengeHtml + '<div class="z-reel-audio">♫ ' + esc(sound?.title || 'Original audio') + (sound?.artist ? ' · ' + esc(sound.artist) : '') + '</div>' + (productHtml ? '<div class="z-reel-product-list">' + productHtml + '</div>' : '') + '</div></article>';
}
function visibleReels() {
  let list = state.reels.slice();
  if (state.tab === 'following' || state.tab === 'friends') list = list.filter(r => state.following.has(r.creator_id));
  if (state.tab === 'products') list = list.filter(r => !!r.product_id);
  const score = r => {
    const ageHours = Math.max(1,(Date.now()-new Date(r.created_at).getTime())/3600000);
    const engagement = Number(r.likes_count||0)*2 + Number(r.comments_count||0)*3 + Number(r.shares_count||0)*4 + Number(r.views_count||0)*0.05;
    return engagement / Math.pow(ageHours+2,0.62);
  };
  if (state.tab === 'trending' || state.tab === 'for-you') list.sort((a,b) => score(b)-score(a));
  if (state.tab === 'new') list.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  const q = state.search.trim().toLowerCase();
  if (q) list = list.filter(r => [r.caption, r.creator?.full_name, r.creator_display_name, ...(r.hashtags || []), r.product?.title].join(' ').toLowerCase().includes(q));
  return list;
}
function renderFeed() {
  const host = state.root.querySelector('#z-reels-feed');
  if (!host) return;
  const rows = visibleReels();
  if (!rows.length) {
    host.innerHTML = '<section class="z-reels-empty"><div class="mark">▣</div><h2>' + (state.tab === 'following' ? 'Bado hujafuatilia Seller' : 'Reels mpya zinakuja') + '</h2><p>' + (state.tab === 'following' ? 'Fuata maduka ili kuona video zao hapa.' : 'Video za bidhaa na maduka zitaonekana hapa baada ya wauzaji na ZUNE Official kuchapisha Reels.') + '</p><button type="button" data-reels-explore>Gundua bidhaa</button></section>';
    return;
  }
  host.innerHTML = rows.map(cardHTML).join('');
  observeVideos();
}
function startReelVideo(video) {
  if (!video || video.error) return;
  video.muted = true;
  video.playsInline = true;
  const attempt = video.play();
  if (attempt && typeof attempt.catch === 'function') {
    attempt.catch(error => {
      // Mobile browsers may block autoplay; the card tap handler retries
      // playback inside a direct user gesture.
      video.dataset.autoplayBlocked = error?.name || 'playback-blocked';
    });
  }
}
function observeVideos() {
  if (state.observer) state.observer.disconnect();
  const videos = Array.from(state.root.querySelectorAll('[data-reel-video]'));
  if (!('IntersectionObserver' in window)) {
    if (videos[0]) startReelVideo(videos[0]);
    if (videos[0]) recordView(videos[0].dataset.reelVideo);
    return;
  }
  state.observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
        videos.forEach(other => { if (other !== video) other.pause(); });
        if (state.audioPlayer) { state.audioPlayer.pause(); state.audioPlayer = null; }
        startReelVideo(video);
        recordView(video.dataset.reelVideo);
      } else video.pause();
    });
  }, {threshold:[0,0.65,1]});
  videos.forEach(video => {
    video.addEventListener('error',() => {
      const card=video.closest('.z-reel-card');
      if(!card||card.querySelector('.z-reel-media-error'))return;
      video.pause();
      const notice=document.createElement('div');
      notice.className='z-reel-media-error';
      notice.innerHTML='<strong>Video haipatikani kwa sasa</strong><small>Faili linaweza kuwa limeondolewa au link si sahihi. Tafadhali jaribu Reel nyingine.</small>';
      card.appendChild(notice);
    },{once:true});
    state.observer.observe(video);
  });
}
async function loadFeed() {
  const ctx = state.context;
  state.loading = true;
  const host = state.root.querySelector('#z-reels-feed');
  host.innerHTML = '<div class="z-reels-empty"><div class="mark">◌</div><h2>Inapakia Reels...</h2><p>Tunasoma video zilizochapishwa.</p></div>';
  try {
    const {data,error} = await ctx.db.from('zune_reels')
      .select('id,creator_id,video_path,thumbnail_path,caption,hashtags,product_id,status,views_count,created_at,creator_display_name,sound_id,duration_seconds,likes_count,comments_count,shares_count,saves_count,creator:profiles!zune_reels_creator_id_fkey(id,full_name,role,is_verified,avatar_path)')
      .eq('status','published').order('created_at',{ascending:false}).limit(40);
    if (error) throw error;
    let reels = data || [];
    const requestedReel = new URLSearchParams(location.search).get('reel');
    if (requestedReel && !reels.some(x => x.id === requestedReel)) {
      const target = await ctx.db.from('zune_reels').select('id,creator_id,video_path,thumbnail_path,caption,hashtags,product_id,status,views_count,created_at,creator_display_name,sound_id,duration_seconds,likes_count,comments_count,shares_count,saves_count,creator:profiles!zune_reels_creator_id_fkey(id,full_name,role,is_verified,avatar_path)').eq('id',requestedReel).eq('status','published').maybeSingle();
      if (!target.error && target.data) reels = [target.data,...reels];
    }
    const ids = reels.map(x => x.id);
    const creators = [...new Set(reels.map(x => x.creator_id))];
    const optionalResults = await Promise.all([
      ids.length ? ctx.db.from('zune_reel_likes').select('reel_id').in('reel_id',ids) : Promise.resolve({data:[]}),
      ids.length ? ctx.db.from('zune_reel_comments').select('reel_id').in('reel_id',ids) : Promise.resolve({data:[]}),
      creators.length ? ctx.db.from('zune_reel_follows').select('creator_id').in('creator_id',creators) : Promise.resolve({data:[]}),
      ids.length ? ctx.db.from('zune_reel_products').select('reel_id,product_id,created_at').in('reel_id',ids).order('created_at',{ascending:true}) : Promise.resolve({data:[]}),
      ctx.user?.id && ids.length ? ctx.db.from('zune_reel_likes').select('reel_id').eq('user_id',ctx.user.id).in('reel_id',ids) : Promise.resolve({data:[]}),
      ctx.user?.id && creators.length ? ctx.db.from('zune_reel_follows').select('creator_id').eq('follower_id',ctx.user.id).in('creator_id',creators) : Promise.resolve({data:[]}),
      ids.length ? ctx.db.from('zune_reel_challenge_entries').select('reel_id,challenge:zune_reel_challenges!inner(title,hashtag)').eq('status','approved').in('reel_id',ids) : Promise.resolve({data:[]})
    ]);
    const [likesRes,commentsRes,followsRes,reelProductsRes,userLikesRes,userFollowsRes,challengeRes] = optionalResults;
    const tagRows = reelProductsRes?.data || [];
    const productIds = [...new Set([...tagRows.map(x => x.product_id),...reels.map(x => x.product_id).filter(Boolean)])];
    const productsRes = productIds.length
      ? await ctx.db.from('products').select('id,title,price,image_url,stock_quantity,vendor_id,moderation_status,removed_at,seller_archived_at').in('id',productIds)
      : {data:[]};
    const tagsByReel = tagRows.reduce((map,row) => { (map[row.reel_id] ||= []).push(row.product_id); return map; },{});
    const optionalErrors = optionalResults.filter(r => r && r.error);
    optionalErrors.forEach(r => console.warn('ZUNE Reels optional data unavailable:',r.error.message || r.error));

    const countBy = (rows,key) => (rows || []).reduce((map,row) => { map[row[key]] = (map[row[key]] || 0) + 1; return map; },{});
    const likeCounts = countBy(likesRes?.data,'reel_id');
    const commentCounts = countBy(commentsRes?.data,'reel_id');
    const followCounts = countBy(followsRes?.data,'creator_id');
    const challengesByReel = (challengeRes?.data || []).reduce((map,row) => { (map[row.reel_id] ||= []).push(row.challenge); return map; },{});
    state.products = new Map((productsRes?.data || []).map(p => [p.id,p]));
    state.liked = new Set((userLikesRes?.data || []).map(x => x.reel_id));
    state.following = new Set((userFollowsRes?.data || []).map(x => x.creator_id));
    const savedKey = 'zune_reel_saves:' + (ctx.user?.id || 'guest');
    state.cloudSaves = false;
    if (ctx.user?.id && ids.length) {
      const cloud = await ctx.db.from('zune_reel_saves').select('reel_id').eq('user_id',ctx.user.id).in('reel_id',ids);
      if (!cloud.error) { state.saved = new Set((cloud.data || []).map(x => x.reel_id)); state.cloudSaves = true; }
      else { try { state.saved = new Set(JSON.parse(localStorage.getItem(savedKey) || '[]')); } catch (_) { state.saved = new Set(); } }
    } else { try { state.saved = new Set(JSON.parse(localStorage.getItem(savedKey) || '[]')); } catch (_) { state.saved = new Set(); } }
    const soundIds = [...new Set(reels.map(x => x.sound_id).filter(Boolean))];
    let soundMap = new Map();
    if (soundIds.length) {
      const sounds = await ctx.db.from('zune_reel_sounds').select('id,title,artist,audio_path,is_active,commercial_use_allowed').in('id',soundIds);
      if (!sounds.error) {
        for (const sound of (sounds.data || [])) {
          if (!sound.is_active || !sound.commercial_use_allowed) continue;
          const signed = await ctx.db.storage.from('zune-reel-audio').createSignedUrl(sound.audio_path,3600);
          soundMap.set(sound.id,Object.assign({},sound,{url:signed.error ? '' : signed.data?.signedUrl || ''}));
        }
      }
    }
    state.viewed = new Set();
    try { state.sessionKey = sessionStorage.getItem('zune_reel_view_session') || ''; if (!state.sessionKey) { state.sessionKey = crypto.randomUUID(); sessionStorage.setItem('zune_reel_view_session',state.sessionKey); } } catch (_) { state.sessionKey = crypto.randomUUID(); }
    state.reels = reels.map(r => {
      const taggedIds = tagsByReel[r.id]?.length ? tagsByReel[r.id] : (r.product_id ? [r.product_id] : []);
      const taggedProducts = taggedIds.slice(0,10).map(id => state.products.get(id)).filter(p => p && p.moderation_status === 'approved' && !p.removed_at && !p.seller_archived_at);
      return Object.assign({},r,{
      products: taggedProducts,
      product: taggedProducts[0] || null,
      sound: soundMap.get(r.sound_id) || null,
      likes_count: likeCounts[r.id] || 0,
      comments_count: commentCounts[r.id] || 0,
      followers_count: followCounts[r.creator_id] || 0,
      challenges: challengesByReel[r.id] || []
      });
    });
    renderFeed();
    if (requestedReel) state.root.querySelector('[data-reel-card="' + CSS.escape(requestedReel) + '"]')?.scrollIntoView({behavior:'smooth',block:'center'});
  } catch (error) {
    console.error('ZUNE Reels feed:',error);
    host.innerHTML = '<section class="z-reels-empty"><div class="mark">!</div><h2>Reels hazijapakia</h2><p>' + esc(error.message || 'Jaribu tena.') + '</p><button type="button" data-reels-retry>Jaribu tena</button></section>';
  } finally { state.loading = false; }
}
async function recordView(reelId) {
  if (!reelId || state.viewed.has(reelId)) return;
  state.viewed.add(reelId);
  try {
    const {data,error} = await state.context.db.rpc('zune_reel_record_view',{p_reel_id:reelId,p_session_key:state.sessionKey || crypto.randomUUID()});
    if (error || data !== true) { state.viewed.delete(reelId); return; }
    const reel = state.reels.find(x => x.id === reelId);
    if (reel) { reel.views_count = Number(reel.views_count || 0)+1; const label = state.root.querySelector('[data-view-count="' + CSS.escape(reelId) + '"]'); if (label) label.textContent = reel.views_count.toLocaleString() + ' views'; }
  } catch (_) { state.viewed.delete(reelId); }
}
function requireUser() {
  if (state.context.user?.id) return true;
  toast('Ingia kwenye akaunti yako ili kutumia kipengele hiki.');
  return false;
}
async function toggleLike(reelId, button) {
  if (!requireUser()) return;
  const reel = state.reels.find(x => x.id === reelId);
  if (!reel) return;
  const db = state.context.db, userId = state.context.user.id;
  button.disabled = true;
  try {
    if (state.liked.has(reelId)) {
      const {error} = await db.from('zune_reel_likes').delete().eq('reel_id',reelId).eq('user_id',userId);
      if (error) throw error;
      state.liked.delete(reelId); reel.likes_count = Math.max(0,Number(reel.likes_count || 0)-1);
    } else {
      const {error} = await db.from('zune_reel_likes').insert({reel_id:reelId,user_id:userId});
      if (error) throw error;
      state.liked.add(reelId); reel.likes_count = Number(reel.likes_count || 0)+1;
    }
    button.classList.toggle('active',state.liked.has(reelId));
    button.querySelector('[data-like-count]').textContent = reel.likes_count.toLocaleString();
  } catch (error) { toast(error.message || 'Like haijahifadhiwa.'); }
  finally { button.disabled = false; }
}
async function toggleFollow(reelId, button) {
  if (!requireUser()) return;
  const reel = state.reels.find(x => x.id === reelId);
  if (!reel || reel.creator_id === state.context.user.id) return;
  button.disabled = true;
  try {
    if (state.following.has(reel.creator_id)) {
      const {error} = await state.context.db.from('zune_reel_follows').delete().eq('creator_id',reel.creator_id).eq('follower_id',state.context.user.id);
      if (error) throw error;
      state.following.delete(reel.creator_id);
    } else {
      const {error} = await state.context.db.from('zune_reel_follows').insert({creator_id:reel.creator_id,follower_id:state.context.user.id});
      if (error) throw error;
      state.following.add(reel.creator_id);
    }
    button.classList.toggle('following',state.following.has(reel.creator_id));
    button.textContent = state.following.has(reel.creator_id) ? 'Following' : 'Follow';
  } catch (error) { toast(error.message || 'Imeshindikana kufuatilia akaunti.'); }
  finally { button.disabled = false; }
}
async function saveReel(reelId, button) {
  const key = 'zune_reel_saves:' + (state.context.user?.id || 'guest');
  const wasSaved = state.saved.has(reelId);
  if (state.context.user?.id && state.cloudSaves) {
    const result = wasSaved
      ? await state.context.db.from('zune_reel_saves').delete().eq('reel_id',reelId).eq('user_id',state.context.user.id)
      : await state.context.db.from('zune_reel_saves').insert({reel_id:reelId,user_id:state.context.user.id});
    if (result.error) { toast(result.error.message || 'Save haijahifadhiwa.'); return; }
  } else {
    if (wasSaved) state.saved.delete(reelId); else state.saved.add(reelId);
    try { localStorage.setItem(key,JSON.stringify([...state.saved])); } catch (_) {}
  }
  if (wasSaved) state.saved.delete(reelId); else state.saved.add(reelId);
  button.classList.toggle('saved',state.saved.has(reelId));
  button.querySelector('span:last-child').textContent = state.saved.has(reelId) ? 'Saved' : 'Save';
  toast(state.cloudSaves ? (state.saved.has(reelId) ? 'Reel imehifadhiwa kwenye akaunti yako.' : 'Reel imeondolewa kwenye Saved.') : (state.saved.has(reelId) ? 'Reel imehifadhiwa kwenye kifaa hiki.' : 'Reel imeondolewa kwenye Saved.'));
}
async function shareReel(reelId) {
  const url = new URL('./index.html?tab=reels&reel=' + encodeURIComponent(reelId),location.href).href;
  let channel = 'native',shared = false;
  try {
    if (navigator.share) { await navigator.share({title:'ZUNE Reel',text:'Tazama Reel hii kwenye ZUNE Marketplace',url}); shared = true; }
    else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); channel = 'copy'; shared = true; toast('Kiungo cha Reel kimenakiliwa.'); }
    else { window.prompt('Nakili kiungo hiki:',url); channel = 'copy'; shared = true; }
    if (shared && state.context.user?.id) {
      const {error} = await state.context.db.rpc('zune_reel_record_share',{p_reel_id:reelId,p_channel:channel});
      if (!error) { const reel=state.reels.find(x=>x.id===reelId); if(reel){reel.shares_count=Number(reel.shares_count||0)+1;const label=state.root.querySelector('[data-share-count="'+CSS.escape(reelId)+'"]');if(label)label.textContent=reel.shares_count.toLocaleString();} }
    }
  } catch (error) { if (error.name !== 'AbortError') toast('Imeshindikana kushare Reel.'); }
}
async function reportReel(reelId) {
  if (!requireUser()) return;
  const reason = window.prompt('Kwa nini unaripoti Reel hii? Andika sababu kwa ufupi:');
  if (reason === null) return;
  const clean = reason.trim();
  if (clean.length < 5) { toast('Tafadhali eleza sababu kwa angalau herufi 5.'); return; }
  try {
    const {error} = await state.context.db.from('zune_reel_reports').insert({
      reel_id: reelId, reporter_id: state.context.user.id, reason: clean.slice(0,180), details: null
    });
    if (error) throw error;
    toast('Ripoti imetumwa kwa timu ya ZUNE.');
  } catch (error) {
    console.error('ZUNE Reel report:',error);
    toast(error.message || 'Ripoti haikutumwa. Jaribu tena.');
  }
}
async function openComments(reelId) {
  const reel = state.reels.find(x => x.id === reelId);
  if (!reel) return;
  const db = state.context.db;
  const {data,error} = await db.from('zune_reel_comments')
    .select('id,reel_id,user_id,parent_comment_id,body,created_at,author:profiles!zune_reel_comments_user_id_fkey(full_name,role,is_verified)')
    .eq('reel_id',reelId).order('created_at',{ascending:true}).limit(100);
  if (error) { toast(error.message || 'Maoni hayajapakia.'); return; }
  const comments = data || [];
  const ids = comments.map(c => c.id);
  let likeRows = [];
  let likeFeatureAvailable = false;
  if (ids.length) {
    const likes = await db.from('zune_reel_comment_likes').select('comment_id,user_id').in('comment_id',ids);
    if (!likes.error) { likeRows = likes.data || []; likeFeatureAvailable = true; }
    else console.warn('ZUNE comment likes unavailable:', likes.error.message || likes.error);
  }
  const counts = likeRows.reduce((out,row) => { out[row.comment_id]=(out[row.comment_id]||0)+1; return out; },{});
  const liked = new Set(likeRows.filter(row => row.user_id === state.context.user?.id).map(row => row.comment_id));
  const replyTarget = {id:null,name:''};
  const renderComment = c => '<div class="z-reel-comment" data-comment-row="' + esc(c.id) + '"><div class="z-reel-comment-main"><strong>' + esc(c.author?.full_name || 'Mtumiaji') + (c.author?.is_verified ? ' ✓' : '') + '</strong>' + esc(c.body) + '<time>' + new Date(c.created_at).toLocaleString('sw-TZ') + '</time><button type="button" data-reply-comment="' + esc(c.id) + '" style="border:0;background:transparent;color:#A78BFA;padding:5px 0;font-size:10px;font-weight:800">Jibu</button></div>' + (likeFeatureAvailable ? '<button type="button" class="z-reel-comment-like ' + (liked.has(c.id) ? 'active' : '') + '" data-comment-like="' + esc(c.id) + '">' + (liked.has(c.id) ? '♥' : '♡') + ' <span>' + Number(counts[c.id] || 0) + '</span></button>' : '') + '</div>';
  const childrenByParent = comments.reduce((map,c) => { if (c.parent_comment_id) (map[c.parent_comment_id] ||= []).push(c); return map; },{});
  const renderThread = (comment,depth=0) => renderComment(comment) + (childrenByParent[comment.id] || []).map(reply => '<div style="margin-left:' + Math.min(36,depth*12+12) + 'px;border-left:2px solid #A78BFA55;padding-left:10px">' + renderThread(reply,depth+1) + '</div>').join('');
  const rootComments = comments.filter(c => !c.parent_comment_id);
  const commentMarkup = rootComments.map(c => renderThread(c)).join('');
  const backdrop = document.createElement('div');
  backdrop.className = 'z-reel-comments-backdrop';
  backdrop.innerHTML = '<section class="z-reel-comments" role="dialog" aria-modal="true" aria-label="Maoni"><div class="z-reel-comments-head"><strong>Maoni (' + comments.length + ')</strong><button type="button" data-close-comments aria-label="Funga">×</button></div><div class="z-reel-comments-list">' +
    (comments.length ? commentMarkup : '<p class="z-reels-empty">Bado hakuna maoni. Anza mazungumzo.</p>') +
    '</div><form class="z-reel-comment-form"><input name="body" maxlength="1000" placeholder="Andika maoni yako..." required><button type="submit">Tuma</button></form></section>';
  state.root.appendChild(backdrop);
  backdrop.querySelector('[data-close-comments]').onclick = () => backdrop.remove();
  backdrop.addEventListener('click',e => { if (e.target === backdrop) backdrop.remove(); });
  backdrop.addEventListener('click',e => {
    const reply = e.target.closest('[data-reply-comment]');
    if (!reply) return;
    const target = comments.find(c => c.id === reply.dataset.replyComment);
    if (!target) return;
    replyTarget.id = target.id;
    replyTarget.name = target.author?.full_name || 'mtumiaji';
    const input = backdrop.querySelector('input[name="body"]');
    input.placeholder = 'Jibu kwa ' + replyTarget.name + '...';
    input.focus();
  });
  backdrop.addEventListener('click',async e => {
    const button = e.target.closest('[data-comment-like]');
    if (!button || !requireUser()) return;
    const id = button.dataset.commentLike;
    const wasLiked = liked.has(id);
    button.disabled = true;
    try {
      const result = wasLiked
        ? await db.from('zune_reel_comment_likes').delete().eq('comment_id',id).eq('user_id',state.context.user.id)
        : await db.from('zune_reel_comment_likes').insert({comment_id:id,user_id:state.context.user.id});
      if (result.error) throw result.error;
      if (wasLiked) liked.delete(id); else liked.add(id);
      const count = Math.max(0,Number(counts[id] || 0) + (wasLiked ? -1 : 1));
      counts[id] = count;
      button.classList.toggle('active',!wasLiked);
      button.innerHTML = (wasLiked ? '♡' : '♥') + ' <span>' + count + '</span>';
    } catch (err) { toast(err.message || 'Like ya maoni haijahifadhiwa.'); }
    finally { button.disabled = false; }
  });
  backdrop.querySelector('form').addEventListener('submit',async e => {
    e.preventDefault();
    if (!requireUser()) return;
    const input = e.currentTarget.elements.body, body = input.value.trim();
    if (!body) return;
    const send = e.currentTarget.querySelector('button'); send.disabled = true;
    try {
      const {error:insertError} = await db.from('zune_reel_comments').insert({reel_id:reelId,user_id:state.context.user.id,parent_comment_id:replyTarget.id,body});
      if (insertError) throw insertError;
      toast('Maoni yametumwa.');
      backdrop.remove();
      reel.comments_count = Number(reel.comments_count || 0)+1;
      renderFeed();
    } catch (err) { toast(err.message || 'Maoni hayakutumwa.'); send.disabled = false; }
  });
}
function bindEvents() {
  const root = state.root;
  root.querySelector('[data-reels-search-toggle]')?.addEventListener('click',() => {
    const wrap = root.querySelector('#z-reels-search-wrap');
    if (!wrap) return;
    wrap.hidden = !wrap.hidden;
    if (!wrap.hidden) root.querySelector('#z-reels-search')?.focus();
    else { state.search = ''; const input = root.querySelector('#z-reels-search'); if (input) input.value = ''; renderFeed(); }
  });
  root.querySelector('#z-reels-search')?.addEventListener('input',e => { state.search = e.target.value; renderFeed(); });
  root.querySelectorAll('[data-reels-tab]').forEach(button => button.addEventListener('click',() => {
    state.tab = button.dataset.reelsTab;
    root.querySelectorAll('[data-reels-tab]').forEach(x => x.classList.toggle('active',x === button));
    renderFeed();
  }));
  
async function recordReelProductClick(button,productId){
 const card=button.closest('[data-reel-card]'),reelId=card?.dataset.reelCard;
 const reel=state.reels.find(x=>x.id===reelId),viewerId=state.context.user?.id,creatorId=reel?.creator_id||reel?.creator?.id;
 if(!reelId||!viewerId||!creatorId||!state.context.db)return;
 const {error}=await state.context.db.from('zune_reel_product_clicks').insert({reel_id:reelId,product_id:productId,creator_id:creatorId,viewer_id:viewerId});
 if(error)console.warn('Reel product attribution was not recorded:',error.message);
}

root.addEventListener('click',async e => {
    const explore = e.target.closest('[data-reels-explore]');
    const retry = e.target.closest('[data-reels-retry]');
    if (explore) return state.context.onExplore();
    if (retry) return loadFeed();
    const like = e.target.closest('[data-reel-like]');
    const follow = e.target.closest('[data-reel-follow]');
    const comments = e.target.closest('[data-reel-comments]');
    const share = e.target.closest('[data-reel-share]');
    const save = e.target.closest('[data-reel-save]');
    const audio = e.target.closest('[data-reel-audio]');
    const report = e.target.closest('[data-reel-report]');
    const product = e.target.closest('[data-reel-product]');
    const cart = e.target.closest('[data-reel-cart]');
    if (cart) {
      const row = state.products.get(cart.dataset.reelCart);
      if (!row) { toast('Bidhaa haipatikani kwa sasa.'); return; }
      if (Number(row.stock_quantity) <= 0) { toast('Bidhaa hii imeisha stock.'); return; }
      if (!requireUser()) return;
      if (typeof state.context.onAddToCart !== 'function') { toast('Cart haipatikani kwa sasa.'); return; }
      cart.disabled = true;
      try { await recordReelProductClick(cart,row.id); state.context.onAddToCart(row); toast('Bidhaa imeongezwa kwenye Cart.'); }
      catch (err) { toast(err.message || 'Imeshindikana kuongeza bidhaa kwenye Cart.'); }
      finally { cart.disabled = false; }
      return;
    }
    if (like) return toggleLike(like.dataset.reelLike,like);
    if (follow) return toggleFollow(follow.dataset.reelFollow,follow);
    if (comments) return openComments(comments.dataset.reelComments);
    if (share) return shareReel(share.dataset.reelShare);
    if (save) return saveReel(save.dataset.reelSave,save);
    if (report) return reportReel(report.dataset.reelReport);
    if (audio) {
      const reel = state.reels.find(x => x.id === audio.dataset.reelAudio);
      const video = root.querySelector('[data-reel-video="' + CSS.escape(audio.dataset.reelAudio) + '"]');
      if (reel?.sound?.url) {
        if (state.audioPlayer && state.audioPlayer._zuneReelId === reel.id && !state.audioPlayer.paused) { state.audioPlayer.pause(); state.audioPlayer = null; if(video)video.muted=false; audio.querySelector('.glyph').textContent = '♫'; audio.querySelector('span:last-child').textContent = 'Music'; return; }
        if (state.audioPlayer) { state.audioPlayer.pause(); state.audioPlayer = null; }
        state.audioPlayer = new Audio(reel.sound.url); state.audioPlayer._zuneReelId = reel.id; if (video) video.muted = true;
        state.audioPlayer.play().then(() => { audio.querySelector('.glyph').textContent = '🔊'; audio.querySelector('span:last-child').textContent = 'Mute music'; }).catch(() => toast('Gusa tena ili kuruhusu music kucheza.'));
      } else if (video) { video.muted = !video.muted; audio.querySelector('.glyph').textContent = video.muted ? '♫' : '🔊'; audio.querySelector('span:last-child').textContent = video.muted ? 'Sound' : 'Mute'; }
      return;
    }
    if (product) {
      const row = state.products.get(product.dataset.productId);
      if (row) { await recordReelProductClick(product,row.id); state.context.onOpenProduct(row); }
    }
  });
}
export function renderZuneReelsPage() {
  installStyles();
  const sw = state.context?.language !== 'en';
  return '<section class="z-reels-shell"><main class="z-reels-page"><header class="z-reels-head"><h1 class="z-reels-brand">ZUNE <em>REELS</em><small>DISCOVER · CONNECT · SHOP</small></h1><div class="z-reels-head-actions"><button type="button" class="z-reels-icon-btn" data-reels-search-toggle aria-label="Tafuta Reels" title="Tafuta">⌕</button></div></header>' +
    '<label class="z-reels-search" id="z-reels-search-wrap" hidden><input id="z-reels-search" type="search" placeholder="' + (sw ? 'Tafuta video, duka au bidhaa...' : 'Search videos, stores or products...') + '"></label>' +
    '<nav class="z-reels-tabs" aria-label="Reels feed"><button class="active" type="button" data-reels-tab="for-you">For You</button><button type="button" data-reels-tab="following">Following</button><button type="button" data-reels-tab="friends">Friends</button></nav><div class="z-reels-feed" id="z-reels-feed"><div class="z-reels-empty"><div class="mark">◌</div><h2>Inapakia Reels...</h2></div></div></main></section>';
}
export async function bindZuneReelsPage(context) {
  state.context = context;
  state.root = context.root;
  installStyles();
  bindEvents();
  await loadFeed();
}