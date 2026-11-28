import { supabase } from "./supabase.js";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const read=k=>{try{const x=JSON.parse(localStorage.getItem(k)||"[]");return Array.isArray(x)?x:[]}catch{return[]}};
const en=()=>localStorage.getItem("zune_language")==="en";
async function boot(){
 const {data:{user}}=await supabase.auth.getUser();if(!user?.id)return;
 const uid=user.id,cartKey="zune_cart:"+uid,savedKey="zune_cart_saved_later:"+uid,couponKey="zune_cart_coupon:"+uid,addressKey="zune_cart_address:"+uid;
 const mount=async root=>{
  const products=root.querySelector(".z3-products");if(!products||root.dataset.smartCartReady)return;root.dataset.smartCartReady="1";
  root.querySelectorAll(".z3-item:not(.z3-item-missing)").forEach(row=>{
   const key=row.dataset.cartRow,btn=document.createElement("button");btn.type="button";btn.className="z3-save-later";btn.dataset.z3SaveLater=key;btn.textContent=en()?"Save for later":"Hifadhi baadaye";row.append(btn);
   const price=Number((row.querySelector(".z3-price")?.textContent||"").replace(/[^0-9.]/g,""));if(price>0){const w=read("zune_cart_price_watch:"+uid),old=w.find(x=>x.key===key);if(old&&price<old.price){const note=document.createElement("p");note.className="z3-price-alert";note.textContent=en()?"Price dropped since your last visit.":"Bei imeshuka tangu ulipotembelea mara ya mwisho.";products.prepend(note);}if(!old){w.push({key,price});localStorage.setItem("zune_cart_price_watch:"+uid,JSON.stringify(w));}else if(price<old.price){old.price=price;localStorage.setItem("zune_cart_price_watch:"+uid,JSON.stringify(w));}}
  });
  const panel=document.createElement("section");panel.className="z3-smart-extra";
  panel.innerHTML='<div class="z3-smart-panel"><b class="z3-smart-title">✦ '+(en()?"Smart Cart Assistant":"Smart Cart Assistant")+'</b><p>'+(root.querySelector(".z3-item-missing")?(en()?"Remove unavailable products before checkout.":"Ondoa bidhaa zisizopatikana kabla ya Checkout."):root.querySelector(".z3-stock")?(en()?"Review low-stock products.":"Kagua bidhaa zenye stock ndogo."): (en()?"Review quantities and totals before checkout.":"Kagua idadi na jumla kabla ya Checkout."))+'</p></div><div class="z3-tools-grid"><div class="z3-tool-card"><h3>'+(en()?"Coupon & discounts":"Coupon na punguzo")+'</h3><p>'+(en()?"Code is validated at Checkout.":"Code itathibitishwa Checkout.")+'</p><div class="z3-coupon-line"><input id="z3-coupon-code" maxlength="80" placeholder="ZUNE10"><button id="z3-save-coupon">'+(en()?"Save":"Hifadhi")+'</button></div><small id="z3-coupon-feedback"></small></div><div class="z3-tool-card"><h3>'+(en()?"Delivery address":"Anwani ya delivery")+'</h3><p>'+(en()?"Choose your saved delivery address.":"Chagua anwani yako ya delivery.")+'</p><select id="z3-address-select"><option>...</option></select><small>'+(en()?"Exact fee is calculated at Checkout.":"Gharama halisi itakokotolewa Checkout.")+'</small></div><div class="z3-tool-card"><h3>🛡 ZUNE Purchase Protection</h3><p>'+(en()?"Your order is tracked through ZUNE. Review details before payment.":"Oda itafuatiliwa kupitia ZUNE. Kagua taarifa kabla ya kulipa.")+'</p></div><div class="z3-tool-card"><h3>⌁ '+(en()?"Estimated arrival":"Makadirio ya kufika")+'</h3><p>'+(en()?"Delivery estimate appears at Checkout after confirming your location.":"Makadirio yataonekana Checkout baada ya kuthibitisha eneo.")+'</p></div></div>';
  products.after(panel);
  const coupon=panel.querySelector("#z3-coupon-code");coupon.value=sessionStorage.getItem(couponKey)||"";
  panel.querySelector("#z3-save-coupon").onclick=()=>{sessionStorage.setItem(couponKey,coupon.value.trim());panel.querySelector("#z3-coupon-feedback").textContent=en()?"Saved for Checkout validation.":"Imehifadhiwa; itathibitishwa Checkout."};
  const select=panel.querySelector("#z3-address-select"),{data:addresses,error}=await supabase.from("delivery_addresses").select("id,recipient_name,street,district,region,is_default").eq("user_id",uid).order("is_default",{ascending:false}).order("created_at",{ascending:false});
  if(!error){select.innerHTML='<option value="">'+(en()?"Select address":"Chagua anwani")+'</option>'+(addresses||[]).map(a=>'<option value="'+esc(a.id)+'">'+esc([a.recipient_name,a.street,a.district,a.region].filter(Boolean).join(" · "))+'</option>').join("");select.value=sessionStorage.getItem(addressKey)||String((addresses||[]).find(a=>a.is_default)?.id||"");}
  select.onchange=()=>sessionStorage.setItem(addressKey,select.value);
 };
 document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-z3-save-later]");if(!b)return;const key=b.dataset.z3SaveLater,[pid,vid]=key.split("::"),cart=read(cartKey),item=cart.find(x=>String(x.productId)+"::"+String(x.variantId||"")===key);if(!item)return;
  const saved=read(savedKey);if(!saved.some(x=>String(x.productId)+"::"+String(x.variantId||"")===key))saved.push({...item,savedAt:new Date().toISOString()});localStorage.setItem(savedKey,JSON.stringify(saved));
  localStorage.setItem(cartKey,JSON.stringify(cart.filter(x=>String(x.productId)+"::"+String(x.variantId||"")!==key)));
  const del=await supabase.from("cart_items").delete().eq("user_id",uid).eq("product_id",pid);if(del.error)console.warn("Saved item cloud sync:",del.error.message);location.reload();
 });
 const scan=()=>document.querySelectorAll(".z3-cart").forEach(root=>void mount(root));scan();new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>void boot(),{once:true});else void boot();
