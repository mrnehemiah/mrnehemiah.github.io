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
  style.textContent = [
    '.z-reels-page{max-width:900px;margin:0 auto;padding:10px 12px 100px;background:#070b09;color:#fff;min-height:calc(100vh - 70px)}',
    '.z-reels-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 2px 14px}',
    '.z-reels-brand{font:900 18px Manrope,Arial,sans-serif;letter-spacing:1px}.z-reels-brand small{display:block;font:700 9px Arial,sans-serif;letter-spacing:2px;color:#9db8aa;margin-top:2px}',
    '.z-reels-head-actions{display:flex;gap:8px}.z-reels-head-actions button,.z-reels-search{border:1px solid #ffffff20;background:#ffffff0c;color:#fff;border-radius:12px;padding:10px 12px}',
    '.z-reels-search{display:block;width:100%;margin:0 0 12px}.z-reels-search input{width:100%;border:0;outline:0;background:transparent;color:#fff;font-size:13px}',
    '.z-reels-tabs{display:flex;gap:7px;overflow:auto;padding:0 0 12px;scrollbar-width:none}.z-reels-tabs button{flex:none;border:1px solid #ffffff20;border-radius:999px;background:#ffffff0b;color:#c7d3cc;padding:8px 13px;font-size:11px;font-weight:800}.z-reels-tabs button.active{background:#0a8b60;border-color:#0a8b60;color:#fff}',
    '.z-reels-feed{display:flex;flex-direction:column;gap:14px}.z-reel-card{position:relative;height:min(760px,calc(100svh - 190px));min-height:510px;max-width:520px;width:100%;margin:0 auto;border-radius:23px;overflow:hidden;background:#101713;isolation:isolate;box-shadow:0 16px 40px #0006}',
    '.z-reel-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#101713}.z-reel-shade{position:absolute;inset:0;background:linear-gradient(180deg,#0007 0%,transparent 26%,transparent 50%,#000b 100%);pointer-events:none}',
    '.z-reel-top{position:absolute;top:14px;left:14px;right:14px;display:flex;align-items:center;gap:9px;z-index:2}.z-reel-avatar{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#e5efe9;color:#07563c;font-weight:900;border:2px solid #ffffffa0;overflow:hidden}.z-reel-creator{min-width:0;flex:1;text-shadow:0 1px 4px #000}.z-reel-creator strong{display:flex;align-items:center;gap:5px;font-size:12px}.z-reel-creator small{display:block;font-size:10px;color:#e0e9e3;margin-top:3px}.z-reel-badge{display:inline-flex;align-items:center;gap:3px;color:#8ed0ff;font-size:10px;font-weight:900}.z-reel-follow{border:1px solid #fff9;border-radius:999px;background:#ffffff18;color:#fff;padding:8px 12px;font-size:10px;font-weight:900;backdrop-filter:blur(8px)}.z-reel-follow.following{background:#087c57;border-color:#087c57}',
    '.z-reel-actions{position:absolute;right:11px;bottom:132px;z-index:3;display:flex;flex-direction:column;align-items:center;gap:14px}.z-reel-action{display:flex;flex-direction:column;align-items:center;gap:4px;border:0;background:transparent;color:#fff;text-shadow:0 1px 5px #000;padding:0;min-width:43px;font-size:10px;font-weight:800}.z-reel-action .glyph{width:42px;height:42px;display:grid;place-items:center;border-radius:50%;background:#07130db0;border:1px solid #ffffff35;font-size:20px;backdrop-filter:blur(8px)}.z-reel-action.active .glyph{color:#ff5b78}.z-reel-action.saved .glyph{color:#f4d477}',
    '.z-reel-copy{position:absolute;left:15px;right:70px;bottom:16px;z-index:2;text-shadow:0 1px 5px #000}.z-reel-caption{font-size:12px;line-height:1.5;margin:7px 0;color:#fff}.z-reel-tags{font-size:10px;color:#d8eee2}.z-reel-audio{font-size:10px;color:#d9e7df;margin-top:7px;display:flex;align-items:center;gap:5px}',
    '.z-reel-product{display:flex;align-items:center;gap:9px;margin-top:10px;padding:8px;border:1px solid #ffffff45;border-radius:14px;background:#06120dcc;backdrop-filter:blur(10px);color:#fff;text-align:left;width:100%}.z-reel-product img{width:42px;height:42px;border-radius:9px;object-fit:cover;background:#fff}.z-reel-product span{min-width:0;flex:1}.z-reel-product strong{display:block;font-size:11px}.z-reel-product small{display:block;color:#d5e4da;font-size:10px;margin-top:3px}.z-reel-product b{font-size:11px;color:#a9edcf}',
    '.z-reels-empty{max-width:520px;margin:30px auto;padding:35px 22px;border:1px solid #ffffff1b;border-radius:22px;background:linear-gradient(145deg,#102c21,#0b1510);text-align:center}.z-reels-empty .mark{font-size:38px}.z-reels-empty h2{font:800 20px Manrope;margin:12px 0}.z-reels-empty p{color:#a9bbb0;font-size:12px;line-height:1.7}.z-reels-empty button{border:0;border-radius:12px;padding:12px 17px;background:#0b8a60;color:#fff;font-weight:900;margin-top:12px}',
    '.z-reel-comments-backdrop{position:fixed;inset:0;z-index:1000;background:#000a;display:flex;align-items:flex-end;justify-content:center}.z-reel-comments{width:min(100%,560px);max-height:78vh;background:#101b15;color:#fff;border:1px solid #ffffff24;border-radius:22px 22px 0 0;padding:16px;display:flex;flex-direction:column;gap:12px}.z-reel-comments-head{display:flex;justify-content:space-between;align-items:center}.z-reel-comments-head button{border:0;background:transparent;color:#fff;font-size:22px}.z-reel-comments-list{overflow:auto;min-height:100px;display:flex;flex-direction:column;gap:12px}.z-reel-comment{font-size:12px;line-height:1.5}.z-reel-comment strong{color:#9de3c2;margin-right:6px}.z-reel-comment time{display:block;color:#91a398;font-size:9px;margin-top:3px}.z-reel-comment-form{display:flex;gap:8px}.z-reel-comment-form input{min-width:0;flex:1;border:1px solid #ffffff28;border-radius:12px;background:#ffffff0c;color:#fff;padding:12px}.z-reel-comment-form button{border:0;border-radius:12px;background:#0b8a60;color:#fff;padding:0 15px;font-weight:900}',
    '.z-reels-toast{position:fixed;left:50%;bottom:95px;transform:translate(-50%,15px);opacity:0;pointer-events:none;z-index:1200;padding:11px 16px;border-radius:999px;background:#e8f5ee;color:#124b35;font-size:12px;font-weight:800;transition:.2s}.z-reels-toast.show{opacity:1;transform:translate(-50%,0)}',
    '@media(max-width:520px){.z-reels-page{padding:8px 0 95px}.z-reel-card{height:calc(100svh - 175px);min-height:480px;border-radius:16px}.z-reels-tabs{padding-left:10px}.z-reels-head{padding-left:12px;padding-right:12px}.z-reels-search{width:calc(100% - 24px);margin-left:12px}.z-reel-actions{right:8px;bottom:120px;gap:12px}.z-reel-copy{left:12px;bottom:12px}.z-reel-product{max-width:100%}}',
    '@media(prefers-reduced-motion:reduce){.z-reels-toast{transition:none}}'
  ].join('');
  document.head.appendChild(style);
}
function icon(name) {
  return ({heart:'♡',comment:'▢',share:'➤',save:'▣',sound:'♫',store:'▤',play:'▶'})[name] || '•';
}
function cardHTML(reel) {
  const creator = reel.creator || {};
  const role = String(creator.role || '').toLowerCase();
  const official = role === 'admin';
  const verified = official || (role === 'vendor' && creator.is_verified === true);
  const creatorName = official ? 'ZUNE Official' : (creator.full_name || reel.creator_display_name || 'ZUNE Seller');
  const product = reel.product || null;
  const sound = reel.sound || null;
  const video = publicUrl(state.context.db, reel.video_path);
  const thumb = reel.thumbnail_path ? publicUrl(state.context.db, reel.thumbnail_path) : '';
  const liked = state.liked.has(reel.id);
  const following = state.following.has(reel.creator_id);
  const saved = state.saved.has(reel.id);
  const tags = Array.isArray(reel.hashtags) ? reel.hashtags.map(x => '#' + String(x).replace(/^#/, '')).join(' ') : '';
  const productHtml = product ? '<button type="button" class="z-reel-product" data-reel-product="' + esc(reel.id) + '">' +
    (product.image_url ? '<img src="' + esc(product.image_url) + '" alt="" loading="lazy">' : '<img src="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 40 40%27%3E%3Crect width=%2740%27 height=%2740%27 fill=%27%23e9eee9%27/%3E%3C/svg%3E" alt="">' ) +
    '<span><strong>' + esc(product.title) + '</strong><small>TSh ' + Number(product.price || 0).toLocaleString('en-TZ') + '</small></span><b>Nunua ↗</b></button>' : '';
  return '<article class="z-reel-card" data-reel-card="' + esc(reel.id) + '">' +
    '<video class="z-reel-video" data-reel-video="' + esc(reel.id) + '" src="' + esc(video) + '" poster="' + esc(thumb) + '" playsinline loop muted preload="metadata"></video><div class="z-reel-shade"></div>' +
    '<div class="z-reel-top"><div class="z-reel-avatar">' + esc(initials(creatorName)) + '</div><div class="z-reel-creator"><strong>' + esc(creatorName) + (verified ? '<span class="z-reel-badge">✦ ' + (official ? 'OFFICIAL' : 'VERIFIED') + '</span>' : '') + '</strong><small>' + (official ? 'Akaunti rasmi ya ZUNE' : 'ZUNE Seller') + '</small></div>' +
    (state.context.user && !official && creator.id !== state.context.user.id ? '<button type="button" class="z-reel-follow ' + (following ? 'following' : '') + '" data-reel-follow="' + esc(reel.id) + '">' + (following ? 'Following' : 'Follow') + '</button>' : '') + '</div>' +
    '<div class="z-reel-actions">' +
    '<button type="button" class="z-reel-action ' + (liked ? 'active' : '') + '" data-reel-like="' + esc(reel.id) + '"><span class="glyph">' + icon('heart') + '</span><span data-like-count="' + esc(reel.id) + '">' + Number(reel.likes_count || 0).toLocaleString() + '</span></button>' +
    '<button type="button" class="z-reel-action" data-reel-comments="' + esc(reel.id) + '"><span class="glyph">' + icon('comment') + '</span><span>' + Number(reel.comments_count || 0).toLocaleString() + '</span></button>' +
    '<button type="button" class="z-reel-action" data-reel-share="' + esc(reel.id) + '"><span class="glyph">' + icon('share') + '</span><span data-share-count="' + esc(reel.id) + '">' + Number(reel.shares_count || 0).toLocaleString() + '</span></button>' +
    '<button type="button" class="z-reel-action ' + (saved ? 'saved' : '') + '" data-reel-save="' + esc(reel.id) + '"><span class="glyph">' + icon('save') + '</span><span>' + (saved ? 'Saved' : 'Save') + '</span></button>' +
    '<button type="button" class="z-reel-action" data-reel-audio="' + esc(reel.id) + '"><span class="glyph">' + icon('sound') + '</span><span>Sound</span></button>' +
    '<button type="button" class="z-reel-action" data-reel-report="' + esc(reel.id) + '" aria-label="Ripoti Reel"><span class="glyph">⚑</span><span>Report</span></button>' +
    '</div><div class="z-reel-copy"><div class="z-reel-tags">' + esc(tags) + '</div><p class="z-reel-caption">' + esc(reel.caption || '') + '</p><div class="z-reel-audio">♫ Original audio · Video sound</div>' + productHtml + '</div></article>';
}
function visibleReels() {
  let list = state.reels.slice();
  if (state.tab === 'following') list = list.filter(r => state.following.has(r.creator_id));
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
function observeVideos() {
  if (state.observer) state.observer.disconnect();
  const videos = Array.from(state.root.querySelectorAll('[data-reel-video]'));
  if (!('IntersectionObserver' in window)) {
    videos[0]?.play().catch(() => {});
    if (videos[0]) recordView(videos[0].dataset.reelVideo);
    return;
  }
  state.observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
        videos.forEach(other => { if (other !== video) other.pause(); });
        if (state.audioPlayer) { state.audioPlayer.pause(); state.audioPlayer = null; }
        video.play().catch(() => {});
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
    const productIds = [...new Set(reels.map(x => x.product_id).filter(Boolean))];
    const optionalResults = await Promise.all([
      ids.length ? ctx.db.from('zune_reel_likes').select('reel_id').in('reel_id',ids) : Promise.resolve({data:[]}),
      ids.length ? ctx.db.from('zune_reel_comments').select('reel_id').in('reel_id',ids) : Promise.resolve({data:[]}),
      creators.length ? ctx.db.from('zune_reel_follows').select('creator_id').in('creator_id',creators) : Promise.resolve({data:[]}),
      productIds.length ? ctx.db.from('products').select('id,title,price,image_url,stock_quantity,vendor_id').in('id',productIds) : Promise.resolve({data:[]}),
      ctx.user?.id && ids.length ? ctx.db.from('zune_reel_likes').select('reel_id').eq('user_id',ctx.user.id).in('reel_id',ids) : Promise.resolve({data:[]}),
      ctx.user?.id && creators.length ? ctx.db.from('zune_reel_follows').select('creator_id').eq('follower_id',ctx.user.id).in('creator_id',creators) : Promise.resolve({data:[]})
    ]);
    const [likesRes,commentsRes,followsRes,productsRes,userLikesRes,userFollowsRes] = optionalResults;
    const optionalErrors = optionalResults.filter(r => r && r.error);
    optionalErrors.forEach(r => console.warn('ZUNE Reels optional data unavailable:',r.error.message || r.error));

    const countBy = (rows,key) => (rows || []).reduce((map,row) => { map[row[key]] = (map[row[key]] || 0) + 1; return map; },{});
    const likeCounts = countBy(likesRes?.data,'reel_id');
    const commentCounts = countBy(commentsRes?.data,'reel_id');
    const followCounts = countBy(followsRes?.data,'creator_id');
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
    state.reels = reels.map(r => Object.assign({},r,{
      product: state.products.get(r.product_id) || null,
      sound: soundMap.get(r.sound_id) || null,
      likes_count: likeCounts[r.id] || 0,
      comments_count: commentCounts[r.id] || 0,
      followers_count: followCounts[r.creator_id] || 0
    }));
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
    .select('id,reel_id,user_id,body,created_at,author:profiles!zune_reel_comments_user_id_fkey(full_name,role,is_verified)')
    .eq('reel_id',reelId).order('created_at',{ascending:true}).limit(100);
  if (error) { toast(error.message || 'Maoni hayajapakia.'); return; }
  const comments = data || [];
  const backdrop = document.createElement('div');
  backdrop.className = 'z-reel-comments-backdrop';
  backdrop.innerHTML = '<section class="z-reel-comments"><div class="z-reel-comments-head"><strong>Maoni (' + comments.length + ')</strong><button type="button" data-close-comments aria-label="Funga">×</button></div><div class="z-reel-comments-list">' +
    (comments.length ? comments.map(c => '<div class="z-reel-comment"><strong>' + esc(c.author?.full_name || 'Mtumiaji') + (c.author?.is_verified ? ' ✓' : '') + '</strong>' + esc(c.body) + '<time>' + new Date(c.created_at).toLocaleString('sw-TZ') + '</time></div>').join('') : '<p class="z-reels-empty">Bado hakuna maoni. Anza mazungumzo.</p>') +
    '</div><form class="z-reel-comment-form"><input name="body" maxlength="1000" placeholder="Andika maoni yako..." required><button type="submit">Tuma</button></form></section>';
  state.root.appendChild(backdrop);
  backdrop.querySelector('[data-close-comments]').onclick = () => backdrop.remove();
  backdrop.addEventListener('click',e => { if (e.target === backdrop) backdrop.remove(); });
  backdrop.querySelector('form').addEventListener('submit',async e => {
    e.preventDefault();
    if (!requireUser()) return;
    const input = e.currentTarget.elements.body, body = input.value.trim();
    if (!body) return;
    const send = e.currentTarget.querySelector('button'); send.disabled = true;
    try {
      const {error:insertError} = await db.from('zune_reel_comments').insert({reel_id:reelId,user_id:state.context.user.id,body});
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
  root.querySelector('[data-open-cart]')?.addEventListener('click',state.context.onCart);
  root.querySelector('#z-reels-search')?.addEventListener('input',e => { state.search = e.target.value; renderFeed(); });
  root.querySelectorAll('[data-reels-tab]').forEach(button => button.addEventListener('click',() => {
    state.tab = button.dataset.reelsTab;
    root.querySelectorAll('[data-reels-tab]').forEach(x => x.classList.toggle('active',x === button));
    renderFeed();
  }));
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
      const reel = state.reels.find(x => x.id === product.dataset.reelProduct);
      const row = reel && state.products.get(reel.product_id);
      if (row) state.context.onOpenProduct(row);
    }
  });
}
export function renderZuneReelsPage() {
  installStyles();
  const sw = state.context?.language !== 'en';
  return '<section class="z-home"><header class="z-home-header"><div class="z-home-top"><div class="z-home-brand"><div class="zune-logo">ⓏⓊⓃⒺ</div></div><div class="z-home-actions"><button type="button" class="z-icon-button" data-open-cart aria-label="Kikapu">🛒</button></div></div></header>' +
    '<main class="z-reels-page"><div class="z-reels-head"><div class="z-reels-brand">ZUNE REELS<small>SHOP · WATCH · DISCOVER</small></div><div class="z-reels-head-actions"><button type="button" data-reels-explore>Explore</button></div></div>' +
    '<label class="z-reels-search"><input id="z-reels-search" type="search" placeholder="' + (sw ? 'Tafuta video, duka au bidhaa...' : 'Search videos, stores or products...') + '"></label>' +
    '<nav class="z-reels-tabs"><button class="active" type="button" data-reels-tab="for-you">For You</button><button type="button" data-reels-tab="following">Following</button><button type="button" data-reels-tab="trending">Trending</button><button type="button" data-reels-tab="new">New</button><button type="button" data-reels-tab="products">Products</button></nav><div class="z-reels-feed" id="z-reels-feed"><div class="z-reels-empty"><div class="mark">◌</div><h2>Inapakia Reels...</h2></div></div></main></section>';
}
export async function bindZuneReelsPage(context) {
  state.context = context;
  state.root = context.root;
  installStyles();
  bindEvents();
  await loadFeed();
}
