import { supabase } from "./supabase.js";
import { readCart, loadCartProducts, writeCart, syncCartCountBadges } from "./cart.js";

const root=document.getElementById("checkout-app");
const lang=localStorage.getItem("zune_language")==="en"?"en":"sw";
const sw={loading:"Inapakia checkout...",title:"Thibitisha oda yako",subtitle:"Weka taarifa za kupokea bidhaa zako.",address:"Anwani ya kufikishiwa",saved:"Anwani ulizohifadhi",newAddress:"Tumia anwani mpya",recipient:"Jina la mpokeaji",phone:"Namba ya simu",country:"Nchi",region:"Mkoa",district:"Wilaya",ward:"Kata",street:"Mtaa / Kijiji / Barabara",landmark:"Alama ya karibu (hiari)",notes:"Maelekezo ya ziada (hiari)",saveAddress:"Hifadhi anwani hii kwa matumizi yajayo",summary:"Muhtasari wa oda",subtotal:"Jumla ya bidhaa",delivery:"Gharama ya delivery",distance:"Umbali wa makadirio (GPS)",discount:"Punguzo la coupon",coupon:"Coupon code (hiari)",total:"Jumla ya kulipa",quote:"Kokotoa delivery / tumia coupon",place:"Weka oda",quoting:"Inakokotoa...",placing:"Inatuma oda...",payment:"Malipo",paymentNote:"Kwa sasa checkout inarekodi oda na malipo yanabaki Pending. Hakuna malipo ya mtandaoni yanayochakatwa hapa.",cod:"Lipa baada ya kupokea (COD)",empty:"Kikapu chako hakina bidhaa.",back:"Rudi sokoni",quoteNeeded:"Jaza nchi, mkoa na wilaya kisha kokotoa gharama ya delivery.",quoteFail:"Gharama ya delivery haipatikani kwa eneo hili.",success:"Oda yako imepokelewa!",orders:"Angalia oda zangu",error:"Imeshindikana kukamilisha oda."};
const en={loading:"Loading checkout...",title:"Review your order",subtitle:"Enter the details for receiving your items.",address:"Delivery address",saved:"Saved addresses",newAddress:"Use a new address",recipient:"Recipient name",phone:"Phone number",country:"Country",region:"Region",district:"District",ward:"Ward",street:"Street / Village / Road",landmark:"Nearby landmark (optional)",notes:"Delivery instructions (optional)",saveAddress:"Save this address for next time",summary:"Order summary",subtotal:"Items subtotal",delivery:"Delivery fee",distance:"Estimated distance (GPS)",discount:"Coupon discount",coupon:"Coupon code (optional)",total:"Total to pay",quote:"Calculate delivery / apply coupon",quoting:"Calculating...",place:"Place order",placing:"Submitting order...",payment:"Payment",paymentNote:"Checkout records your order; payment remains Pending. No online payment is processed here.",cod:"Cash on delivery (COD)",empty:"Your cart is empty.",back:"Return to marketplace",quoteNeeded:"Enter country, region and district, then calculate delivery.",quoteFail:"Delivery pricing is not configured for this area.",success:"Your order has been received!",orders:"View my orders",error:"Unable to complete your order."};
const t=k=>(lang==="en"?en:sw)[k]||k;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=v=>new Intl.NumberFormat(lang==="en"?"en-TZ":"sw-TZ",{maximumFractionDigits:0}).format(Number(v)||0)+" TSh";
let user=null,cart=[],products=[],addresses=[],quote=null,busy=false;
let key="",signature="";
const fields=["recipient_name","phone","country","region","district","ward","street","landmark","delivery_notes","latitude","longitude"];
function addressValues(a={}){return {recipient_name:a.recipient_name||"",phone:a.phone||"",country:a.country||"Tanzania",region:a.region||"",district:a.district||"",ward:a.ward||"",street:a.street||a.delivery_address||"",landmark:a.landmark||"",delivery_notes:a.delivery_notes||"",latitude:a.latitude??"",longitude:a.longitude??""};}
function formData(){const form=root.querySelector("#zc-form");const fd=new FormData(form);return Object.fromEntries(fields.map(k=>[k,String(fd.get(k)||"").trim()]));}
function validAddress(a){return ["recipient_name","phone","country","region","district","street"].every(k=>a[k]);}
function subtotal(){return cart.reduce((sum,item)=>sum+(Number(products.find(p=>p.id===item.productId)?.price)||0)*item.quantity,0);}
function render(){
 root.setAttribute("aria-busy","false");
 if(!cart.length){root.innerHTML='<section class="zc-empty"><h1>'+t("empty")+'</h1><a href="./index.html">'+t("back")+'</a></section>';return;}
 const selected=addresses.find(a=>a.is_default)||addresses[0]||null;
 const address=addressValues(selected||{});
 root.innerHTML=`<div class="zc-heading"><span>ⓏⓊⓃⒺ MARKETPLACE</span><h1>${t("title")}</h1><p>${t("subtitle")}</p></div><div class="zc-grid"><section class="zc-card"><h2>1. ${t("address")}</h2><label class="zc-field"><span>${t("saved")}</span><select id="zc-address"><option value="new">${t("newAddress")}</option>${addresses.map(a=>'<option value="'+esc(a.id)+'" '+(selected?.id===a.id?"selected":"")+'>'+esc([a.recipient_name,a.street,a.district,a.region].filter(Boolean).join(" · "))+'</option>').join("")}</select></label><a class="zc-address-manage" href="./addresses.html?return=checkout">+ Ongeza au hariri anwani kwa GPS</a><form id="zc-form" class="zc-form">
 ${field("recipient_name",t("recipient"),address.recipient_name)}${field("phone",t("phone"),address.phone,"tel")}${field("country",t("country"),address.country)}${field("region",t("region"),address.region)}${field("district",t("district"),address.district)}${field("ward",t("ward"),address.ward)}${field("street",t("street"),address.street)}${field("landmark",t("landmark"),address.landmark)}<label class="zc-field zc-wide"><span>${t("notes")}</span><textarea name="delivery_notes" rows="2">${esc(address.delivery_notes)}</textarea></label><label class="zc-check zc-wide"><input type="checkbox" name="save_address"> ${t("saveAddress")}</label><input type="hidden" name="latitude" value="${esc(address.latitude)}"><input type="hidden" name="longitude" value="${esc(address.longitude)}"></form>
 <section class="zc-payment"><h2>2. ${t("payment")}</h2><label class="zc-payment-choice"><input type="radio" name="zune-payment-method" value="cash_on_delivery" checked> <span>${t("cod")}<small>${t("paymentNote")}</small></span></label><div class="zc-payment-coming"><strong>Malipo ya simu — yanakuja hivi karibuni</strong><div class="zc-payment-networks"><label><input type="radio" name="zune-payment-method" disabled> M-Pesa</label><label><input type="radio" name="zune-payment-method" disabled> Airtel Money</label><label><input type="radio" name="zune-payment-method" disabled> Mixx by Yas</label><label><input type="radio" name="zune-payment-method" disabled> HaloPesa</label></div><small>Njia hizi zitawezeshwa baada ya kuunganisha na kuthibitisha payment gateway.</small></div></section></section>
 <aside class="zc-card zc-summary"><h2>3. ${t("summary")}</h2><label class="zc-field zc-coupon-field"><span>${t("coupon")}</span><input id="zc-coupon" name="coupon_code" maxlength="80" autocomplete="off" placeholder="ZUNE10"></label><div class="zc-products">${cart.map(item=>{const p=products.find(x=>x.id===item.productId)||{};return '<div class="zc-product"><span>'+esc(p.title||"Product")+' × '+item.quantity+'</span><strong>'+money((Number(p.price)||0)*item.quantity)+'</strong></div>';}).join("")}</div><div class="zc-total-row"><span>${t("subtotal")}</span><strong>${money(subtotal())}</strong></div><div class="zc-total-row"><span>${t("delivery")}</span><strong id="zc-delivery">${quote?money(quote.delivery_total):"—"}</strong></div><p class="zc-hint" id="zc-distance" ${quote?.estimated_distance_km>0?"":"hidden"}>${quote?.estimated_distance_km>0?t("distance")+": "+Number(quote.estimated_distance_km).toFixed(2)+" km":""}</p><div class="zc-total-row" id="zc-discount-row" ${quote?.discount_total>0?"":"hidden"}><span>${t("discount")}</span><strong id="zc-discount">-${quote?money(quote.discount_total):money(0)}</strong></div><div class="zc-grand"><span>${t("total")}</span><strong id="zc-grand">${quote?money(quote.grand_total):money(subtotal())}</strong></div><p class="zc-hint" id="zc-hint">${quote?"":t("quoteNeeded")}</p><button class="zc-secondary" type="button" id="zc-quote">${t("quote")}</button><button class="zc-primary" type="button" id="zc-place" disabled>${t("place")}</button><a class="zc-back" href="./cart.html">← ${t("back")}</a></aside></div>`;
 root.querySelector("#zc-address").addEventListener("change",e=>{const a=addresses.find(x=>x.id===e.target.value);const v=addressValues(a||{});for(const k of fields){const el=root.querySelector('[name="'+k+'"]');if(el)el.value=v[k]||"";}quote=null;updateQuoteUI();});
 root.querySelector("#zc-quote").addEventListener("click",getQuote);
 root.querySelector("#zc-coupon").addEventListener("input",()=>{quote=null;updateQuoteUI();});
 root.querySelector("#zc-place").addEventListener("click",placeOrder);
 root.querySelector("#zc-form").addEventListener("input",e=>{if(!["latitude","longitude"].includes(e.target.name)){const lat=root.querySelector('[name="latitude"]'),lng=root.querySelector('[name="longitude"]');if(lat)lat.value="";if(lng)lng.value="";}quote=null;updateQuoteUI();});
 loadCheckoutSponsoredAds().catch(error=>console.warn("Checkout sponsored ads unavailable:",error));
}
async function loadCheckoutSponsoredAds(){
 if(!user||!root.querySelector(".zc-grid"))return;
 const {data:settings,error:settingsError}=await supabase.rpc("zune_ad_public_settings");
 if(settingsError||!settings?.checkout_ads_enabled)return;
 const now=new Date().toISOString();
 const {data:campaigns,error}=await supabase.from("ad_campaigns").select("id,product_id,title,starts_at,ends_at")
  .eq("status","approved").eq("placement","checkout").not("product_id","is",null).limit(8);
 if(error)throw error;
 const live=(campaigns||[]).filter(c=>(!c.starts_at||c.starts_at<=now)&&(!c.ends_at||c.ends_at>now));
 const maxAds=Math.max(1,Math.min(20,Number(settings.max_ads_per_placement)||3));
 const ids=[...new Set(live.map(c=>c.product_id))].slice(0,maxAds);
 if(!ids.length)return;
 const {data:items,error:productError}=await supabase.from("products").select("id,title,price,image_url").in("id",ids).eq("moderation_status","approved");
 if(productError)throw productError;
 const byId=new Map((items||[]).map(p=>[String(p.id),p]));
 const cards=live.filter(c=>byId.has(String(c.product_id))).map(c=>{
  const p=byId.get(String(c.product_id));
  return '<article class="zc-ad-card" data-ad-campaign="'+esc(c.id)+'"><span>Sponsored</span><img src="'+esc(p.image_url||"")+'" alt="'+esc(p.title)+'" loading="lazy"><strong>'+esc(p.title)+'</strong><small>'+money(p.price)+'</small><a href="./index.html" data-ad-open="'+esc(c.id)+'">Angalia bidhaa</a></article>';
 }).join("");
 if(!cards)return;
 const section=document.createElement("section");section.className="zc-sponsored";section.innerHTML='<h2>Sponsored recommendations</h2><div>'+cards+'</div>';
 const style=document.createElement("style");style.textContent=".zc-sponsored{margin:18px 0;padding:16px;border:1px solid #e6ece8;border-radius:16px;background:#fff}.zc-sponsored h2{font-size:15px;margin:0 0 12px}.zc-sponsored>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.zc-ad-card{display:grid;gap:6px;min-width:0;font-size:12px}.zc-ad-card img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:10px;background:#f1f4f2}.zc-ad-card span{font-size:9px;font-weight:800;color:#9a570c}.zc-ad-card a{color:#087a55;font-weight:700}@media(max-width:520px){.zc-sponsored>div{grid-template-columns:repeat(2,minmax(0,1fr))}}";
 section.append(style);root.querySelector(".zc-grid").after(section);
 const visitorKey=(()=>{try{let k=localStorage.getItem("zune_ads_visitor_key");if(!k){k=crypto.randomUUID();localStorage.setItem("zune_ads_visitor_key",k);}return k;}catch(_){return crypto.randomUUID();}})();
 section.querySelectorAll("[data-ad-campaign]").forEach(card=>{
  const campaignId=card.dataset.adCampaign;
  const send=eventType=>supabase.from("ad_events").insert({campaign_id:campaignId,event_type:eventType,event_key:crypto.randomUUID(),visitor_key:visitorKey,placement:"checkout",metadata:{source:"checkout"}}).then(({error})=>{if(error)console.warn("Checkout ad event:",error.message);});
  send("impression");
  card.querySelector("[data-ad-open]")?.addEventListener("click",()=>send("click"),{once:true});
 });
}
function field(name,label,value,type="text"){return '<label class="zc-field"><span>'+label+'</span><input name="'+name+'" type="'+type+'" maxlength="180" required value="'+esc(value)+'"></label>';}
function updateQuoteUI(){const button=root.querySelector("#zc-place");const hint=root.querySelector("#zc-hint");const delivery=root.querySelector("#zc-delivery");const grand=root.querySelector("#zc-grand");const discountRow=root.querySelector("#zc-discount-row");const discount=root.querySelector("#zc-discount");const distance=root.querySelector("#zc-distance");if(button)button.disabled=busy;if(hint)hint.textContent=quote?"":t("quoteNeeded");if(delivery)delivery.textContent=quote?money(quote.delivery_total):"—";if(grand)grand.textContent=quote?money(quote.grand_total):money(subtotal());if(distance){distance.hidden=!(quote&&Number(quote.estimated_distance_km)>0);distance.textContent=quote&&Number(quote.estimated_distance_km)>0?t("distance")+": "+Number(quote.estimated_distance_km).toFixed(2)+" km":"";}if(discountRow)discountRow.hidden=!(quote&&Number(quote.discount_total)>0);if(discount)discount.textContent=quote?"-"+money(quote.discount_total):"-"+money(0);}
async function getQuote(){
 if(busy)return;const address=formData();const hint=root.querySelector("#zc-hint");
 if(!validAddress(address)){hint.textContent=t("quoteNeeded");return;}
 const button=root.querySelector("#zc-quote");button.disabled=true;button.textContent=t("quoting");
 try{const {data,error}=await supabase.rpc("zune_quote_checkout",{p_items:cart.map(x=>({product_id:x.productId,quantity:x.quantity})),p_address:address,p_coupon_code:String(root.querySelector("#zc-coupon")?.value||"").trim()||null});if(error)throw error;quote=data;if(!quote?.ready){hint.textContent=quote?.message||t("quoteFail");quote=null;}else hint.textContent="";updateQuoteUI();}
 catch(e){hint.textContent=e.message||t("quoteFail");quote=null;updateQuoteUI();}
 finally{button.disabled=false;button.textContent=t("quote");}
}
async function placeOrder(){
 if(busy)return;const address=formData();address.save_address=!!root.querySelector('[name="save_address"]')?.checked;if(!validAddress(address)){root.querySelector("#zc-hint").textContent=t("quoteNeeded");return;}
 busy=true;const button=root.querySelector("#zc-place");button.disabled=true;button.textContent=t("placing");
 try{
  const couponCode=String(root.querySelector("#zc-coupon")?.value||"").trim()||null;
  const {data:latestQuote,error:quoteError}=await supabase.rpc("zune_quote_checkout",{p_items:cart.map(x=>({product_id:x.productId,quantity:x.quantity})),p_address:address,p_coupon_code:couponCode});
  if(quoteError)throw quoteError;
  if(!latestQuote?.ready)throw new Error(latestQuote?.message||t("quoteFail"));
  quote=latestQuote;updateQuoteUI();
  const {data,error}=await supabase.rpc("zune_create_checkout",{p_items:cart.map(x=>({product_id:x.productId,quantity:x.quantity})),p_address:address,p_idempotency_key:key,p_coupon_code:couponCode});
  if(error)throw error;
  if(address.save_address){const {error:saveError}=await supabase.from("delivery_addresses").insert({user_id:user.id,recipient_name:address.recipient_name,phone:address.phone,country:address.country,region:address.region,district:address.district,ward:address.ward||'',street:address.street,landmark:address.landmark||null,delivery_notes:address.delivery_notes||null,latitude:address.latitude?Number(address.latitude):null,longitude:address.longitude?Number(address.longitude):null,is_default:addresses.length===0});if(saveError)console.warn("Address was not saved:",saveError.message);}
  writeCart([],user.id);syncCartCountBadges([]);sessionStorage.removeItem("zune_checkout_key:"+user.id);
  const {data:createdOrderRefs}=await supabase.from("orders").select("public_order_id,order_number").eq("checkout_id",data.checkout_id);
  const visibleOrderRefs=[...new Set((createdOrderRefs||[]).map(x=>x.public_order_id||x.order_number).filter(Boolean))];
  const orderReferenceText=visibleOrderRefs.length?visibleOrderRefs.join(" · "):data.checkout_id;
  root.innerHTML='<section class="zc-success"><div class="zc-success-icon">✓</div><h1>'+t("success")+'</h1><p>Order ID: '+esc(orderReferenceText)+'</p><p>'+money(data.grand_total)+'</p><a class="zc-primary" href="./orders.html">'+t("orders")+'</a><a class="zc-back" href="./index.html">'+t("back")+'</a></section>';
 }catch(e){busy=false;button.disabled=false;button.textContent=t("place");root.querySelector("#zc-hint").textContent=e.message||t("error");}
}
async function start(){
 const {data:{user:u},error}=await supabase.auth.getUser();if(error)throw error;if(!u){root.innerHTML='<section class="zc-empty"><h1>Ingia kwenye akaunti kwanza</h1><a href="./index.html">Rudi sokoni kuingia</a></section>';return;}user=u;
 cart=readCart(user.id);if(!cart.length){render();return;}
 const [p,a]=await Promise.all([loadCartProducts(cart),supabase.from("delivery_addresses").select("*").eq("user_id",user.id).order("is_default",{ascending:false}).order("created_at",{ascending:false})]);
 products=p.filter(x=>x.moderation_status==="approved"&&!x.removed_at);addresses=a.data||[];
 if(a.error)throw a.error;
 if(products.length!==cart.length||cart.some(x=>!products.some(p=>p.id===x.productId)))throw new Error("Baadhi ya bidhaa hazipatikani tena. Rudi kikapuni uondoe bidhaa hizo.");
 for(const item of cart){const p=products.find(x=>x.id===item.productId);if(Number(p.stock_quantity)<item.quantity)throw new Error("Stock haitoshi kwa "+p.title);}
 signature=JSON.stringify(cart.map(x=>[x.productId,x.quantity]).sort());
 const storageKey="zune_checkout_key:"+user.id;let saved={};try{saved=JSON.parse(sessionStorage.getItem(storageKey)||"{}");}catch{}
 if(saved.signature===signature&&saved.key)key=saved.key;else{key=crypto.randomUUID();sessionStorage.setItem(storageKey,JSON.stringify({signature,key}));}
 render();
}
start().catch(e=>{console.error("ZUNE checkout:",e);root.setAttribute("aria-busy","false");root.innerHTML='<section class="zc-error"><h1>'+t("error")+'</h1><p>'+esc(e.message)+'</p><a href="./cart.html">Rudi kikapuni</a></section>';});
