import { supabase } from "./supabase.js";

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = value => "TSh " + Number(value || 0).toLocaleString("en-TZ");
const tr = (sw,en,lang) => lang === "sw" ? sw : en;
let ctx = null;
let catalog = [];
let compareRows = [];
let alertRows = [];
let rewardAccount = null;
let tickets = [];
let disputes = [];
let buyerOrders = [];

function styles(){
 if(document.getElementById("zune-feature-suite-css")) return;
 const s=document.createElement("style");s.id="zune-feature-suite-css";
 s.textContent=`
 .z-feature-page{min-height:100vh;padding:18px 14px 110px;background:radial-gradient(circle at 85% 2%,rgba(31,173,126,.15),transparent 30%),linear-gradient(145deg,#f4faf6,#edf4f0 55%,#f8fbf9);color:#152c23}
 .z-feature-wrap{max-width:1160px;margin:auto}
 .z-feature-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 auto 18px}
 .z-feature-back{border:1px solid #d5e6dc;background:rgba(255,255,255,.8);border-radius:14px;padding:10px 14px;font-weight:800;color:#176044}
 .z-feature-kicker{font-size:10px;letter-spacing:.18em;font-weight:900;color:#16845d}
 .z-feature-hero{position:relative;overflow:hidden;border-radius:28px;padding:24px 20px;background:linear-gradient(125deg,#073b30,#087a56 60%,#21a875);color:white;box-shadow:0 22px 48px rgba(4,65,46,.24);perspective:900px;isolation:isolate}
 .z-feature-hero:before,.z-feature-hero:after{content:"";position:absolute;border-radius:50%;pointer-events:none;z-index:-1}
 .z-feature-hero:before{width:210px;height:210px;right:-50px;top:-80px;background:radial-gradient(circle at 35% 30%,#b5ffe0,#27bb83 38%,#07583e 72%);box-shadow:inset -16px -20px 28px rgba(0,0,0,.22),0 25px 38px rgba(0,0,0,.22);transform:rotateX(22deg) rotateY(-25deg)}
 .z-feature-hero:after{width:120px;height:120px;right:100px;bottom:-72px;background:linear-gradient(145deg,rgba(255,255,255,.42),rgba(255,255,255,.03));transform:rotateX(55deg) rotateZ(-25deg);filter:blur(1px)}
 .z-feature-hero h1{font-size:clamp(27px,6vw,42px);line-height:1.05;margin:9px 0 10px;max-width:600px;letter-spacing:-.04em}
 .z-feature-hero p{max-width:520px;color:#d8f4e8;font-size:13px;line-height:1.65;margin:0}
 .z-feature-hero .z-feature-kicker{color:#b7f5d9}
 .z-feature-orbit{display:flex;gap:7px;flex-wrap:wrap;margin-top:17px}
 .z-feature-orbit span{border:1px solid rgba(255,255,255,.24);background:rgba(255,255,255,.1);backdrop-filter:blur(10px);border-radius:999px;padding:7px 10px;font-size:10px;font-weight:800}
 .z-feature-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin:18px 0 22px}
 .z-feature-tile{position:relative;min-height:130px;text-align:left;border:1px solid rgba(206,225,214,.95);border-radius:20px;padding:15px;background:linear-gradient(145deg,rgba(255,255,255,.98),rgba(241,249,244,.88));box-shadow:0 10px 20px rgba(25,69,48,.07),inset 0 1px 0 white;transform-style:preserve-3d;transition:transform .22s ease,box-shadow .22s ease;cursor:pointer;color:#17372a}
 .z-feature-tile:hover{box-shadow:0 18px 32px rgba(25,69,48,.15),inset 0 1px 0 white}
 .z-feature-tile:active{transform:translateY(1px) scale(.99)}
 .z-feature-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:linear-gradient(145deg,#e2f8eb,#b9e9cf);font-size:21px;box-shadow:inset 0 1px 0 white,0 7px 14px rgba(27,128,81,.12);transform:translateZ(20px)}
 .z-feature-tile strong{display:block;margin:11px 0 4px;font-size:13px;transform:translateZ(12px)}
 .z-feature-tile small{display:block;color:#71877b;font-size:10px;line-height:1.5;transform:translateZ(8px)}
 .z-feature-section{scroll-margin-top:18px;background:rgba(255,255,255,.88);border:1px solid #dceae1;border-radius:22px;padding:17px;margin:15px 0;box-shadow:0 12px 28px rgba(31,70,50,.06);backdrop-filter:blur(14px)}
 .z-feature-section h2{font-size:19px;margin:0 0 5px;letter-spacing:-.03em}
 .z-feature-muted{font-size:12px;line-height:1.6;color:#75887c;margin:0 0 13px}
 .z-feature-form{display:grid;gap:9px}
 .z-feature-form input,.z-feature-form select,.z-feature-form textarea{width:100%;min-width:0;border:1px solid #d9e7de;background:#f9fcfa;border-radius:12px;padding:12px;color:#18372a;font:inherit;font-size:13px;outline:none}
 .z-feature-form textarea{min-height:90px;resize:vertical}
 .z-feature-primary,.z-feature-secondary{border:0;border-radius:12px;padding:12px 15px;font-size:12px;font-weight:900;cursor:pointer}
 .z-feature-primary{background:linear-gradient(135deg,#087b55,#13a16b);color:white;box-shadow:0 8px 18px rgba(9,123,81,.2)}
 .z-feature-secondary{background:#e8f4ed;color:#176044;border:1px solid #d3e8db}
 .z-feature-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
 .z-feature-product-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 .z-feature-product{border:1px solid #e1ece5;border-radius:16px;padding:10px;background:#fff;min-width:0;transform-style:preserve-3d;transition:transform .2s ease}
 .z-feature-product img{width:100%;aspect-ratio:1.1;object-fit:cover;border-radius:11px;background:#edf4ef}
 .z-feature-product strong{display:block;font-size:12px;margin:8px 0 4px;line-height:1.4}
 .z-feature-product small{display:block;color:#708378;font-size:10px}
 .z-feature-product .z-feature-row{margin-top:9px}
 .z-feature-product button{font-size:10px;padding:8px 10px}
 .z-feature-empty{padding:18px;border:1px dashed #cbded1;border-radius:15px;text-align:center;color:#788b7e;font-size:12px;line-height:1.6}
 .z-feature-pill{display:inline-flex;border-radius:999px;padding:5px 9px;background:#e9f7ef;color:#168054;font-size:10px;font-weight:900}
 .z-feature-list{display:grid;gap:9px}
 .z-feature-list-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px;border:1px solid #e3eee7;border-radius:13px;background:#fbfdfb}
 .z-feature-list-item strong{font-size:12px}
 .z-feature-list-item small{display:block;color:#819187;font-size:10px;margin-top:3px}
 .z-feature-table-wrap{overflow:auto}
 .z-feature-compare{border-collapse:separate;border-spacing:8px;min-width:560px;width:100%}
 .z-feature-compare td,.z-feature-compare th{padding:10px;border-radius:12px;background:#f4faf6;text-align:left;font-size:11px;vertical-align:top}
 .z-feature-compare th{background:#e3f4e9;color:#176044}
 .z-feature-balance{display:flex;justify-content:space-between;align-items:center;gap:14px;border-radius:18px;padding:17px;background:linear-gradient(125deg,#073b30,#0d895e);color:white;margin-bottom:12px}
 .z-feature-balance strong{font-size:28px;display:block}
 .z-feature-balance small{font-size:10px;color:#c8f1dd}
 .z-feature-chat{display:grid;gap:10px}
 .z-feature-answer{background:#eff8f2;border-radius:14px;padding:13px;font-size:12px;line-height:1.6;color:#315c45}
 .z-feature-status{font-size:11px;color:#6c8174;min-height:18px}
 .z-feature-review-media{display:flex;gap:8px;flex-wrap:wrap}
 .z-feature-review-media img{width:62px;height:62px;object-fit:cover;border-radius:10px}
 @media(min-width:700px){.z-feature-page{padding:26px 22px 80px}.z-feature-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.z-feature-product-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.z-feature-section{padding:22px}.z-feature-hero{padding:34px}.z-feature-hero:before{width:280px;height:280px;right:60px;top:-110px}}
 @media(prefers-reduced-motion:reduce){.z-feature-tile,.z-feature-product{transition:none;transform:none!important}}
 `;
 document.head.appendChild(s);
}

function productCard(p,actions=""){
 const image=p.image_url || (Array.isArray(p.image_urls)?p.image_urls[0]:"") || "";
 return `<article class="z-feature-product" data-tilt-card><img loading="lazy" src="${esc(image)}" alt="${esc(p.title)}" onerror="this.style.display='none'"><strong>${esc(p.title)}</strong><small>${money(p.price)}</small><div class="z-feature-row">${actions}</div></article>`;
}
function productOptions(){
 return '<option value="">'+tr("Chagua bidhaa","Choose a product",ctx.language)+'</option>'+catalog.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.title)+' — '+money(p.price)+'</option>').join("");
}
function section(id,title,desc,body){
 return '<section class="z-feature-section" id="z-feature-'+id+'"><h2>'+title+'</h2><p class="z-feature-muted">'+desc+'</p>'+body+'</section>';
}
function empty(text){return '<div class="z-feature-empty">'+text+'</div>';}

function render(){
 const lang=ctx.language;
 const tiles=[
  ["♡",tr("Wishlist & Favorites","Wishlist & Favorites",lang),"wishlist",tr("Hifadhi bidhaa unazopenda","Save products you love",lang)],
  ["⇄",tr("Product Comparison","Product Comparison",lang),"compare",tr("Linganisha hadi bidhaa 4","Compare up to 4 products",lang)],
  ["★",tr("Reviews & Ratings","Reviews & Ratings",lang),"reviews",tr("Tathmini za wanunuzi halisi","Verified buyer reviews",lang)],
  ["⌁",tr("Price Drop Alerts","Price Drop Alerts",lang),"alerts",tr("Pata taarifa bei ikishuka","Get notified when prices drop",lang)],
  ["✦",tr("ZUNE AI Assistant","ZUNE AI Assistant",lang),"assistant",tr("Pata mapendekezo ya bidhaa","Find products with smart help",lang)],
  ["◆",tr("ZUNE Rewards","ZUNE Rewards",lang),"rewards",tr("Pata pointi kwa oda","Earn points on completed orders",lang)],
  ["↗",tr("Referral Program","Referral Program",lang),"referrals",tr("Alika rafiki, pata zawadi","Invite friends and earn rewards",lang)],
  ["☏",tr("Support & Disputes","Support & Disputes",lang),"support",tr("Msaada na utatuzi wa changamoto","Get help and resolve order issues",lang)]
 ];
 const cards=tiles.map(t=>'<button type="button" class="z-feature-tile" data-jump="'+t[2]+'" data-tilt-card><span class="z-feature-icon">'+t[0]+'</span><strong>'+t[1]+'</strong><small>'+t[3]+'</small></button>').join("");
 const wishlist=ctx.wishlist.length?'<div class="z-feature-product-grid">'+ctx.wishlist.map(p=>productCard(p,'<button class="z-feature-secondary" data-compare="'+esc(p.id)+'">'+tr("Linganisha","Compare",lang)+'</button>')).join("")+'</div>':empty(tr("Hujahifadhi bidhaa bado. Bonyeza alama ya moyo kwenye bidhaa.","No saved products yet. Tap the heart on a product to save it.",lang));
 const compare=compareRows.length?'<div class="z-feature-table-wrap"><table class="z-feature-compare"><thead><tr><th>'+tr("Kipengele","Feature",lang)+'</th>'+compareRows.map(p=>'<th>'+esc(p.title)+'<button class="z-feature-secondary" data-remove-compare="'+esc(p.id)+'">×</button></th>').join("")+'</tr></thead><tbody>'+[
  [tr("Bei","Price",lang),p=>money(p.price)],
  [tr("Aina","Category",lang),p=>p.category||"—"],
  [tr("Stock","Stock",lang),p=>Number(p.stock_quantity||0)],
  [tr("Muuzaji","Seller",lang),p=>p.vendor_id||"—"]
 ].map(row=>'<tr><th>'+row[0]+'</th>'+compareRows.map(p=>'<td>'+esc(row[1](p))+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>':empty(tr("Ongeza bidhaa ili kuanza kulinganisha.","Add products to start comparing.",lang));
 const alerts=alertRows.length?'<div class="z-feature-list">'+alertRows.map(a=>'<div class="z-feature-list-item"><div><strong>'+esc(a.product?.title||tr("Bidhaa","Product",lang))+'</strong><small>'+(a.target_price?tr("Lengo: ","Target: ",lang)+money(a.target_price):tr("Taarifa kwa kila punguzo","Alert on any price drop",lang))+'</small></div><button class="z-feature-secondary" data-delete-alert="'+esc(a.id)+'">'+tr("Ondoa","Remove",lang)+'</button></div>').join("")+'</div>':empty(tr("Bado huna arifa za kushuka kwa bei.","You have no price alerts yet.",lang));
 const rewards='<div class="z-feature-balance"><div><small>'+tr("SALIO LA POINTI","POINTS BALANCE",lang)+'</small><strong>'+Number(rewardAccount?.points_balance||0).toLocaleString()+'</strong><small>'+tr("Pointi za ZUNE Rewards","ZUNE Rewards points",lang)+'</small></div><span style="font-size:38px">◆</span></div><p class="z-feature-muted">'+tr("Unapata pointi baada ya oda kukamilika. Kiwango cha sasa: pointi 1 kwa kila TSh 1,000 ya oda (kinaweza kubadilishwa na Admin).","Points are credited after an order is completed. Current rate: 1 point per TSh 1,000 (Admin configurable).",lang)+'</p><div id="z-feature-ledger"></div>';
 const referral='<div class="z-feature-row"><div style="flex:1"><label class="z-feature-muted">'+tr("Code yako ya mwaliko","Your referral code",lang)+'</label><input id="z-feature-referral-code" readonly value="'+esc(ctx.referralCode||"")+'"></div><button class="z-feature-primary" id="z-feature-create-code">'+tr("Tengeneza code","Get code",lang)+'</button></div><div class="z-feature-row" style="margin-top:10px"><input id="z-feature-apply-code" placeholder="'+tr("Weka code ya rafiki","Enter a friend's code",lang)+'"><button class="z-feature-secondary" id="z-feature-apply">'+tr("Tumia","Apply",lang)+'</button></div><p class="z-feature-muted">'+tr("Rafiki yako akifanya oda yake ya kwanza ikamilike, nyote wawili mnapata pointi za zawadi.","When your friend completes their first order, both of you receive reward points.",lang)+'</p>';
 const review='<form id="z-feature-review-form" class="z-feature-form"><select name="order_id" required>'+buyerOrders.map(o=>'<option value="'+esc(o.id)+'">'+esc(o.product?.title||"Order")+' · '+esc(o.order_number||o.id.slice(0,8))+'</option>').join("")+'</select><select name="rating" required><option value="5">★★★★★ 5</option><option value="4">★★★★☆ 4</option><option value="3">★★★☆☆ 3</option><option value="2">★★☆☆☆ 2</option><option value="1">★☆☆☆☆ 1</option></select><textarea name="review_text" maxlength="2500" placeholder="'+tr("Andika uzoefu wako wa bidhaa...","Share your experience with this product...",lang)+'" required></textarea><input type="file" name="media" accept="image/jpeg,image/png,image/webp" multiple><button class="z-feature-primary" type="submit">'+tr("Tuma tathmini","Submit review",lang)+'</button><div class="z-feature-status" id="z-feature-review-status"></div></form>';
 const reviews=ctx.reviews.length?'<div class="z-feature-list">'+ctx.reviews.map(r=>'<div class="z-feature-list-item"><div><strong>'+esc(r.product?.title||"Product")+' · '+("★".repeat(r.rating))+'</strong><small>'+esc(r.review_text||"")+'</small></div><span class="z-feature-pill">'+tr("Imethibitishwa","Verified",lang)+'</span></div>').join("")+'</div>':empty(tr("Hakuna tathmini mpya zilizoidhinishwa bado.","No approved reviews to show yet.",lang));
 const support='<form id="z-feature-ticket-form" class="z-feature-form"><select name="category"><option value="order">'+tr("Tatizo la oda","Order issue",lang)+'</option><option value="account">'+tr("Akaunti","Account",lang)+'</option><option value="payment">'+tr("Malipo","Payment",lang)+'</option><option value="delivery">'+tr("Delivery","Delivery",lang)+'</option><option value="other">'+tr("Nyingine","Other",lang)+'</option></select><input name="subject" maxlength="120" placeholder="'+tr("Kichwa cha tatizo","Issue subject",lang)+'" required><textarea name="message" maxlength="5000" placeholder="'+tr("Eleza unachohitaji msaada...","Describe what you need help with...",lang)+'" required></textarea><button class="z-feature-primary">'+tr("Fungua ombi la msaada","Create support ticket",lang)+'</button></form><div class="z-feature-status" id="z-feature-ticket-status"></div><div class="z-feature-list" style="margin-top:12px">'+(tickets.length?tickets.map(t=>'<div class="z-feature-list-item"><div><strong>'+esc(t.category)+' · '+esc(t.message.slice(0,65))+'</strong><small>'+esc(t.status)+' · '+new Date(t.created_at).toLocaleDateString()+'</small></div><button class="z-feature-secondary" data-ticket="'+esc(t.id)+'">'+tr("Fungua","Open",lang)+'</button></div>').join(""):empty(tr("Bado huna maombi ya msaada.","You have no support tickets yet.",lang)))+'</div><div id="z-feature-ticket-thread"></div>';
 const dispute='<form id="z-feature-dispute-form" class="z-feature-form"><select name="order_id" required>'+buyerOrders.map(o=>'<option value="'+esc(o.id)+'">'+esc(o.product?.title||"Order")+' · '+esc(o.order_number||o.id.slice(0,8))+'</option>').join("")+'</select><select name="issue_type"><option value="not_received">'+tr("Sijapokea bidhaa","Item not received",lang)+'</option><option value="damaged">'+tr("Bidhaa imeharibika","Item damaged",lang)+'</option><option value="not_as_described">'+tr("Si kama ilivyoelezwa","Not as described",lang)+'</option><option value="wrong_item">'+tr("Nimepokea bidhaa isiyo sahihi","Wrong item",lang)+'</option><option value="other">'+tr("Nyingine","Other",lang)+'</option></select><textarea name="description" maxlength="5000" required placeholder="'+tr("Eleza tatizo kwa kina...","Describe the issue in detail...",lang)+'"></textarea><button class="z-feature-primary">'+tr("Fungua dispute","Open dispute",lang)+'</button></form><div class="z-feature-status" id="z-feature-dispute-status"></div><div class="z-feature-list" style="margin-top:12px">'+(disputes.length?disputes.map(d=>'<div class="z-feature-list-item"><div><strong>'+esc(d.case_number)+' · '+esc(d.issue_type)+'</strong><small>'+esc(d.status)+' · '+new Date(d.created_at).toLocaleDateString()+'</small></div></div>').join(""):empty(tr("Hakuna dispute zilizo wazi.","No disputes yet.",lang)))+'</div>';
 const assistant='<div class="z-feature-chat"><p class="z-feature-muted">'+tr("Eleza unachotafuta, bajeti au matumizi. Msaidizi atalinganisha maelezo yako na bidhaa halisi zilizopo sokoni.","Describe what you need, your budget or intended use. The assistant matches your request against real marketplace products.",lang)+'</p><form id="z-feature-ai-form" class="z-feature-form"><input name="prompt" maxlength="500" placeholder="'+tr("Mfano: simu yenye kamera nzuri chini ya TSh 500,000","Example: a phone with a good camera under TSh 500,000",lang)+'" required><button class="z-feature-primary">'+tr("Tafuta mapendekezo","Find recommendations",lang)+'</button></form><div id="z-feature-ai-answer" class="z-feature-answer" hidden></div></div>';
 const compareForm='<form id="z-feature-compare-form" class="z-feature-row"><select name="product_id" style="flex:1;min-width:160px">'+productOptions()+'</select><button class="z-feature-primary">'+tr("Ongeza","Add",lang)+'</button></form><div id="z-feature-compare-status" class="z-feature-status"></div><div id="z-feature-compare-table" style="margin-top:12px">'+compare+'</div>';
 const alertForm='<form id="z-feature-alert-form" class="z-feature-form"><select name="product_id" required>'+productOptions()+'</select><input name="target_price" type="number" min="0" step="100" placeholder="'+tr("Bei lengwa (hiari)","Target price (optional)",lang)+'"><button class="z-feature-primary">'+tr("Washa arifa ya bei","Create price alert",lang)+'</button></form><div class="z-feature-status" id="z-feature-alert-status"></div><div id="z-feature-alert-list" style="margin-top:12px">'+alerts+'</div>';
 return `<div class="z-feature-page"><div class="z-feature-wrap">
 <div class="z-feature-top"><button class="z-feature-back" data-features-home>← ${tr("Rudi sokoni","Back to marketplace",lang)}</button><span class="z-feature-kicker">ZUNE MARKET · 3D EXPERIENCE</span></div>
 <header class="z-feature-hero" data-tilt-card><span class="z-feature-kicker">SHOP SMARTER · LIVE BETTER</span><h1>${tr("Ununuzi wenye akili zaidi.","A smarter way to shop.",lang)}</h1><p>${tr("Uzoefu mpya wa ZUNE wenye zana za kulinganisha, kuhifadhi, kupata zawadi na msaada — umeunganishwa na akaunti yako.","Your ZUNE experience with tools to compare, save, earn rewards and get support — connected to your account.",lang)}</p><div class="z-feature-orbit"><span>3D Product Space</span><span>Personalized Tools</span><span>Secure Supabase</span></div></header>
 <div class="z-feature-grid">${cards}</div>
 ${section("wishlist",tr("Wishlist & Favorites","Wishlist & Favorites",lang),tr("Bidhaa ulizohifadhi kwenye akaunti yako.","Products saved to your account.",lang),wishlist)}
 ${section("compare",tr("Product Comparison","Product Comparison",lang),tr("Linganisha vipengele vya bidhaa hadi nne kwa wakati mmoja.","Compare product details side by side, up to four at a time.",lang),compareForm)}
 ${section("reviews",tr("Reviews & Ratings","Reviews & Ratings",lang),tr("Tathmini zinapatikana kwa wanunuzi waliokamilisha oda husika.","Reviews are limited to buyers with completed orders for the product.",lang),review+reviews)}
 ${section("alerts",tr("Price Drop Alerts","Price Drop Alerts",lang),tr("Chagua bidhaa na kiwango cha bei unachotaka kufuatilia.","Choose a product and optional target price to monitor.",lang),alertForm)}
 ${section("assistant",tr("ZUNE AI Shopping Assistant","ZUNE AI Shopping Assistant",lang),tr("Msaidizi wa kutafuta bidhaa kwa mahitaji na bajeti yako.","A shopping assistant that matches your needs and budget to the live catalog.",lang),assistant)}
 ${section("rewards",tr("ZUNE Rewards","ZUNE Rewards",lang),tr("Pointi hutolewa baada ya oda kukamilika, si wakati wa kuweka oda.","Points are awarded only after an order is completed.",lang),rewards)}
 ${section("referrals",tr("Referral Program","Referral Program",lang),tr("Shiriki code yako. Zawadi hutolewa baada ya oda ya kwanza ya rafiki kukamilika.","Share your code. Rewards are issued after your friend's first completed order.",lang),referral)}
 ${section("support",tr("Customer Support & Order Disputes","Customer Support & Order Disputes",lang),tr("Fungua ombi la msaada au dispute kwa oda inayostahili.","Create a support ticket or open a dispute for an eligible order.",lang),support+dispute)}
 </div></div>`;
}

async function loadData(){
 const user=ctx.user;
 const [wishlistQ,compareQ,alertsQ,rewardQ,ledgerQ,referralQ,ticketQ,disputeQ,ordersQ,reviewsQ]=await Promise.all([
  supabase.from("wishlists").select("product_id").eq("user_id",user.id),
  supabase.from("zune_comparison_items").select("product_id").eq("user_id",user.id).order("created_at"),
  supabase.from("price_drop_alerts").select("*").eq("user_id",user.id).eq("active",true).order("created_at",{ascending:false}),
  supabase.from("zune_reward_accounts").select("*").eq("user_id",user.id).maybeSingle(),
  supabase.from("zune_reward_ledger").select("id,points,description,created_at,source_type").eq("user_id",user.id).order("created_at",{ascending:false}).limit(8),
  supabase.from("zune_referral_codes").select("code").eq("user_id",user.id).maybeSingle(),
  supabase.from("support_tickets").select("id,category,message,status,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10),
  supabase.from("transaction_disputes").select("id,case_number,issue_type,status,created_at,order_id").eq("buyer_id",user.id).order("created_at",{ascending:false}).limit(10),
  supabase.from("orders").select("id,product_id,total_price,status,order_number,created_at").eq("buyer_id",user.id).order("created_at",{ascending:false}).limit(40),
  supabase.from("product_reviews").select("id,product_id,rating,review_text,created_at").eq("buyer_id",user.id).order("created_at",{ascending:false}).limit(8)
 ]);
 for(const [name,q] of [["wishlist",wishlistQ],["comparison",compareQ],["alerts",alertsQ],["rewards",rewardQ],["ledger",ledgerQ],["referral",referralQ],["tickets",ticketQ],["disputes",disputeQ],["orders",ordersQ],["reviews",reviewsQ]]) if(q.error) console.warn("ZUNE feature load "+name,q.error.message);
 const productIds=[...(wishlistQ.data||[]).map(x=>x.product_id),...(compareQ.data||[]).map(x=>x.product_id),...(alertsQ.data||[]).map(x=>x.product_id),(ordersQ.data||[]).map(x=>x.product_id),(reviewsQ.data||[]).map(x=>x.product_id)].flat().filter(Boolean);
 const ids=[...new Set(productIds.map(String))];
 const [productsQ,allProductsQ]=await Promise.all([
  ids.length?supabase.from("products").select("id,title,price,category,stock_quantity,image_url,image_urls,vendor_id,description").in("id",ids):Promise.resolve({data:[],error:null}),
  supabase.from("products").select("id,title,price,category,stock_quantity,image_url,image_urls,vendor_id,description").eq("moderation_status","approved").is("removed_at",null).order("created_at",{ascending:false}).limit(100)
 ]);
 if(productsQ.error) console.warn(productsQ.error);
 catalog=allProductsQ.data||[];
 const byId=new Map([...(productsQ.data||[]),...catalog].map(p=>[String(p.id),p]));
 ctx.wishlist=(wishlistQ.data||[]).map(x=>byId.get(String(x.product_id))).filter(Boolean);
 compareRows=(compareQ.data||[]).map(x=>byId.get(String(x.product_id))).filter(Boolean);
 alertRows=(alertsQ.data||[]).map(x=>({...x,product:byId.get(String(x.product_id))}));
 rewardAccount=rewardQ.data||null;
 ctx.ledger=ledgerQ.data||[];
 ctx.referralCode=referralQ.data?.code||"";
 tickets=ticketQ.data||[];
 disputes=disputeQ.data||[];
 buyerOrders=(ordersQ.data||[]).filter(o=>o.status==="completed").map(o=>({...o,product:byId.get(String(o.product_id))})).filter(o=>o.product);
 ctx.reviews=(reviewsQ.data||[]).map(x=>({...x,product:byId.get(String(x.product_id))}));
}

function bindTilt(root){
 if(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !window.matchMedia?.("(hover: hover)").matches) return;
 root.querySelectorAll("[data-tilt-card]").forEach(card=>{
  if(card.dataset.tiltBound) return;card.dataset.tiltBound="1";
  card.addEventListener("pointermove",e=>{
   const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
   card.style.transform="perspective(850px) rotateX("+(-y*7)+"deg) rotateY("+(x*8)+"deg) translateZ(2px)";
  });
  card.addEventListener("pointerleave",()=>card.style.transform="perspective(850px) rotateX(0) rotateY(0)");
 });
}
function status(id,message){const el=ctx.root.querySelector("#"+id);if(el)el.textContent=message;}

async function bind(){
 const root=ctx.root,lang=ctx.language,user=ctx.user;
 root.querySelector("[data-features-home]")?.addEventListener("click",()=>ctx.onHome?.());
 root.querySelectorAll("[data-jump]").forEach(b=>b.addEventListener("click",()=>root.querySelector("#z-feature-"+b.dataset.jump)?.scrollIntoView({behavior:"smooth",block:"start"})));
 root.querySelector("#z-feature-compare-form")?.addEventListener("submit",async e=>{
  e.preventDefault();const id=new FormData(e.currentTarget).get("product_id");if(!id)return;
  const {error}=await supabase.from("zune_comparison_items").insert({user_id:user.id,product_id:id});
  if(error){status("z-feature-compare-status",error.message.includes("check_violation")?tr("Kikomo ni bidhaa nne.","The limit is four products.",lang):error.message);return;}
  await refresh();
 });
 root.querySelectorAll("[data-compare]").forEach(b=>b.addEventListener("click",async()=>{const {error}=await supabase.from("zune_comparison_items").insert({user_id:user.id,product_id:b.dataset.compare});if(error)status("z-feature-compare-status",error.message);else await refresh();}));
 root.querySelectorAll("[data-remove-compare]").forEach(b=>b.addEventListener("click",async()=>{await supabase.from("zune_comparison_items").delete().eq("user_id",user.id).eq("product_id",b.dataset.removeCompare);await refresh();}));
 root.querySelector("#z-feature-alert-form")?.addEventListener("submit",async e=>{
  e.preventDefault();const d=new FormData(e.currentTarget),target=String(d.get("target_price")||"").trim();
  const {error}=await supabase.from("price_drop_alerts").upsert({user_id:user.id,product_id:d.get("product_id"),target_price:target?Number(target):null,active:true},{onConflict:"user_id,product_id"});
  status("z-feature-alert-status",error?error.message:tr("Arifa imewashwa.","Price alert activated.",lang));if(!error)await refresh();
 });
 root.querySelectorAll("[data-delete-alert]").forEach(b=>b.addEventListener("click",async()=>{await supabase.from("price_drop_alerts").delete().eq("id",b.dataset.deleteAlert).eq("user_id",user.id);await refresh();}));
 root.querySelector("#z-feature-create-code")?.addEventListener("click",async()=>{
  const {data,error}=await supabase.rpc("zune_create_referral_code");if(error){status("z-feature-referral-code",error.message);return;}
  const input=root.querySelector("#z-feature-referral-code");if(input)input.value=data||"";
 });
 root.querySelector("#z-feature-apply")?.addEventListener("click",async()=>{
  const code=root.querySelector("#z-feature-apply-code")?.value.trim();if(!code)return;
  const {error}=await supabase.rpc("zune_apply_referral_code",{p_code:code});status("z-feature-apply",error?error.message:tr("Code imetumika.","Referral code applied.",lang));
 });
 root.querySelector("#z-feature-review-form")?.addEventListener("submit",async e=>{
  e.preventDefault();const f=e.currentTarget,d=new FormData(f),order=buyerOrders.find(o=>o.id===d.get("order_id"));if(!order?.product)return;
  const button=f.querySelector("button");button.disabled=true;status("z-feature-review-status",tr("Inatuma tathmini...","Submitting review...",lang));
  try{
   const media=[];
   for(const file of Array.from(f.elements.media.files||[]).slice(0,4)){
    if(file.size>6*1024*1024)throw new Error(tr("Picha isizidi 6MB.","Each image must be under 6MB.",lang));
    const path=user.id+"/"+crypto.randomUUID()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const up=await supabase.storage.from("zune-review-media").upload(path,file,{upsert:false,contentType:file.type});if(up.error)throw up.error;
    const pub=supabase.storage.from("zune-review-media").getPublicUrl(path);media.push(pub.data.publicUrl);
   }
   const {error}=await supabase.from("product_reviews").insert({product_id:order.product_id,buyer_id:user.id,order_id:order.id,rating:Number(d.get("rating")),review_text:String(d.get("review_text")||"").trim(),media_urls:media});
   if(error)throw error;status("z-feature-review-status",tr("Tathmini imetumwa na inasubiri ukaguzi.","Review submitted and awaiting moderation.",lang));f.reset();await refresh();
  }catch(err){status("z-feature-review-status",err.message||"Review failed.");}finally{button.disabled=false;}
 });
 root.querySelector("#z-feature-ticket-form")?.addEventListener("submit",async e=>{
  e.preventDefault();const f=e.currentTarget,d=new FormData(f);const {data,error}=await supabase.from("support_tickets").insert({user_id:user.id,customer_name:user.user_metadata?.full_name||user.email||"ZUNE Customer",category:String(d.get("category")),message:String(d.get("subject")+": "+d.get("message"))}).select("id").single();
  status("z-feature-ticket-status",error?error.message:tr("Ombi la msaada limefunguliwa.","Support ticket created.",lang));if(!error){f.reset();await refresh();}
 });
 root.querySelectorAll("[data-ticket]").forEach(b=>b.addEventListener("click",async()=>{
  const id=b.dataset.ticket;const q=await supabase.from("support_ticket_messages").select("id,sender_id,message,created_at").eq("ticket_id",id).order("created_at");
  const thread=root.querySelector("#z-feature-ticket-thread");if(!thread)return;
  thread.innerHTML='<div class="z-feature-section"><h3>'+tr("Mazungumzo ya ombi","Ticket conversation",lang)+'</h3>'+(q.data||[]).map(m=>'<p class="z-feature-answer">'+esc(m.message)+'</p>').join("")+'<form id="z-feature-reply-form" class="z-feature-form"><textarea name="message" required maxlength="5000" placeholder="'+tr("Andika ujumbe...","Write a message...",lang)+'"></textarea><button class="z-feature-primary">'+tr("Tuma","Send",lang)+'</button></form></div>';
  root.querySelector("#z-feature-reply-form")?.addEventListener("submit",async e=>{e.preventDefault();const message=new FormData(e.currentTarget).get("message");const {error}=await supabase.from("support_ticket_messages").insert({ticket_id:id,sender_id:user.id,message});status("z-feature-ticket-status",error?error.message:tr("Ujumbe umetumwa.","Message sent.",lang));if(!error)b.click();});
 }));
 root.querySelector("#z-feature-dispute-form")?.addEventListener("submit",async e=>{
  e.preventDefault();const f=e.currentTarget,d=new FormData(f),order=buyerOrders.find(o=>o.id===d.get("order_id"));if(!order){status("z-feature-dispute-status",tr("Chagua oda iliyokamilika.","Select a completed order.",lang));return;}
  const prod=order.product;const {error}=await supabase.from("transaction_disputes").insert({order_id:order.id,buyer_id:user.id,seller_id:prod.vendor_id,opened_by:user.id,issue_type:String(d.get("issue_type")),description:String(d.get("description")),amount:Number(order.total_price||0),currency:"TZS"});
  status("z-feature-dispute-status",error?error.message:tr("Dispute imetumwa kwa ukaguzi.","Dispute submitted for review.",lang));if(!error){f.reset();await refresh();}
 });
 root.querySelector("#z-feature-ai-form")?.addEventListener("submit",async e=>{
  e.preventDefault();const prompt=String(new FormData(e.currentTarget).get("prompt")||"").trim();if(!prompt)return;
  const out=root.querySelector("#z-feature-ai-answer");out.hidden=false;out.textContent=tr("Msaidizi anatafuta bidhaa zinazolingana...","Assistant is matching products...",lang);
  try{
   const {data,error}=await supabase.functions.invoke("zune-shopping-assistant",{body:{prompt,language:lang}});
   if(error)throw error;
   out.innerHTML=esc(data?.answer||tr("Hizi ndizo bidhaa zinazokaribiana na mahitaji yako.","Here are products matching your request.",lang))+(Array.isArray(data?.product_ids)?'<div class="z-feature-product-grid">'+data.product_ids.map(id=>catalog.find(p=>String(p.id)===String(id))).filter(Boolean).map(p=>productCard(p)).join("")+'</div>':"")+(data?.mode==="catalog_match"?'<small>'+tr("Matokeo yametokana na kulinganisha katalogi; AI API haijasanidiwa.","Results use catalog matching; an AI API key is not configured.",lang)+'</small>':"");
  }catch(err){
   const words=prompt.toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>2);const found=catalog.map(p=>({p,score:words.reduce((n,w)=>n+Number((p.title+" "+p.category+" "+(p.description||"")).toLowerCase().includes(w)),0)})).filter(x=>x.score).sort((a,b)=>b.score-a.score).slice(0,6).map(x=>x.p);
   out.innerHTML=esc(tr("Nimepata bidhaa hizi kwa kulinganisha maneno ya utafutaji wako:","I found these products by matching your search terms:",lang))+'<div class="z-feature-product-grid">'+found.map(p=>productCard(p)).join("")+'</div><small>'+esc(err.message||"")+'</small>';
  }
 });
 bindTilt(root);
}

async function refresh(){
 await loadData();ctx.root.innerHTML=render();await bind();
 const ledger=ctx.root.querySelector("#z-feature-ledger");
 if(ledger)ledger.innerHTML=ctx.ledger.length?'<div class="z-feature-list">'+ctx.ledger.map(x=>'<div class="z-feature-list-item"><div><strong>'+esc(x.description)+'</strong><small>'+new Date(x.created_at).toLocaleDateString()+'</small></div><span class="z-feature-pill">+'+Number(x.points)+'</span></div>').join("")+'</div>':empty(tr("Bado hakuna pointi zilizopatikana.","No reward points earned yet.",ctx.language));
}

export async function mountMarketplaceFeatures({root,user,language="sw",onHome}){
 styles();
 if(!root)return;
 if(!user?.id){root.innerHTML='<div class="z-feature-page"><div class="z-feature-wrap">'+empty(tr("Ingia kwenye akaunti yako ili kutumia vipengele hivi.","Sign in to use these features.",language))+'</div></div>';return;}
 ctx={root,user,language,onHome,wishlist:[],ledger:[],referralCode:"",reviews:[]};
 root.innerHTML='<div class="z-feature-page"><div class="z-feature-wrap">'+empty(tr("Inapakia zana zako za ununuzi...","Loading your shopping tools...",language))+'</div></div>';
 await loadData();root.innerHTML=render();await bind();
 const ledger=root.querySelector("#z-feature-ledger");
 if(ledger)ledger.innerHTML=ctx.ledger.length?'<div class="z-feature-list">'+ctx.ledger.map(x=>'<div class="z-feature-list-item"><div><strong>'+esc(x.description)+'</strong><small>'+new Date(x.created_at).toLocaleDateString()+'</small></div><span class="z-feature-pill">'+(x.points>0?"+":"")+Number(x.points)+'</span></div>').join("")+'</div>':empty(tr("Bado hakuna pointi zilizopatikana.","No reward points earned yet.",language));
}
