import { supabase } from "./supabase.js";

const root=document.getElementById("tg-root");
let names=[];
let user=null,profile={},store=null,mode="customer",selected={customer:"classic",store:"classic"},previewId=null;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const key=(kind)=>"zune_template_"+kind+":"+user.id;
function loadChoices(){try{selected.customer=user.user_metadata?.zune_template_customer||localStorage.getItem(key("customer"))||"classic";selected.store=store?.storefront_template||localStorage.getItem(key("store"))||"classic";}catch(e){console.warn("Template preferences unavailable",e);}}
function mini(id){const n=names.find(x=>x.id===id)||names[0];return '<div class="tg-mini layout-'+(names.indexOf(n)+1)+'"><div class="tg-mini-top"><span>ⓏⓊⓃⒺ</span><span>⌕　♡　▣</span></div><div class="tg-mini-search"></div><div class="tg-mini-hero"></div><div class="tg-mini-tiles"><i></i><i></i><i></i><i></i></div><div class="tg-mini-products"><i></i><i></i><i></i></div><div class="tg-mini-footer"></div></div>';}
function render(){
 const current=selected[mode],isSeller=profile.role==="vendor";
 root.innerHTML='<section class="tg-intro"><span class="tg-kicker">ZUNE PERSONALIZATION</span><h2>Chagua template yako</h2><p>Chagua muundo unaoupenda, angalia mfano wake kisha uutumie. Unaweza kubadilisha uchaguzi wako wakati wowote.</p></section>'+
 '<div class="tg-tabs" role="tablist"><button class="tg-tab '+(mode==="customer"?"active":"")+'" data-mode="customer" role="tab" aria-selected="'+(mode==="customer")+'">Marketplace</button><button class="tg-tab '+(mode==="store"?"active":"")+'" data-mode="store" role="tab" aria-selected="'+(mode==="store")+'">Duka langu</button></div>'+
 '<div class="tg-current"><span>Template inayotumika</span><strong>'+esc((names.find(x=>x.id===current)||names[0]).name)+'</strong><span>✓ Imechaguliwa</span></div>'+
 (mode==="store"&&!isSeller?'<div class="tg-empty">Templates za duka zitapatikana baada ya akaunti yako kuidhinishwa kuwa Seller. Unaweza kuchagua template ya Marketplace kwa sasa.</div>':'')+
 '<section class="tg-grid">'+names.map((n,i)=>'<article class="tg-card '+(current===n.id?"selected":"")+'"><div class="tg-preview">'+mini(n.id)+'</div><div class="tg-card-copy"><div class="tg-card-head"><h3>'+esc(n.name)+'</h3><span class="tg-number">0'+(i+1)+'</span></div><p>'+esc(n.desc)+'</p><div class="tg-card-actions"><button class="tg-btn" data-preview="'+n.id+'">Preview</button><button class="tg-btn primary" data-apply="'+n.id+'" '+(mode==="store"&&!isSeller?"disabled":"")+'>'+(current===n.id?"Inatumika":"Tumia template")+'</button></div></div></article>').join("")+'</section>'+
 '<p class="tg-note">Uchaguzi wa Marketplace na Duka huhifadhiwa tofauti. Kubadilisha template hakufuti wala kubadilisha bidhaa, oda, taarifa za akaunti au taarifa za duka.</p>';
 root.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{mode=b.dataset.mode;render();}));
 root.querySelectorAll("[data-preview]").forEach(b=>b.addEventListener("click",()=>openPreview(b.dataset.preview)));
 root.querySelectorAll("[data-apply]").forEach(b=>b.addEventListener("click",()=>applyTemplate(b.dataset.apply)));
}
function openPreview(id){const n=names.find(x=>x.id===id);if(!n)return;previewId=id;const modal=document.getElementById("tg-modal");modal.querySelector(".tg-modal-head h2").textContent=n.name;modal.querySelector(".tg-large-preview").innerHTML=mini(id);modal.querySelector(".tg-modal-desc").textContent=n.desc;modal.querySelector("[data-modal-apply]").textContent=selected[mode]===id?"Template inatumika":"Tumia template hii";modal.classList.add("open");modal.setAttribute("aria-hidden","false");}
function closePreview(){const m=document.getElementById("tg-modal");m.classList.remove("open");m.setAttribute("aria-hidden","true");}
async function applyTemplate(id){
 if(mode==="store"&&profile.role!=="vendor")return;
 const previous=selected[mode]||"classic",msg=document.getElementById("tg-toast");
 selected[mode]=id;
 try{
  localStorage.setItem(key(mode),id);
  if(mode==="customer"){
   const {error}=await supabase.auth.updateUser({data:{...(user.user_metadata||{}),zune_template_customer:id}});
   if(error)throw error;
  }else{
   const {data,error}=await supabase.from("stores").update({storefront_template:id}).eq("owner_id",user.id).select("owner_id,storefront_template").maybeSingle();
   if(error)throw error;
   if(!data)throw new Error("Taarifa za duka hazikupatikana au huna ruhusa ya kuzibadilisha.");
   store={...(store||{}),storefront_template:data.storefront_template};
  }
 }catch(e){
  console.error("ZUNE template save:",e);
  selected[mode]=previous;
  try{localStorage.setItem(key(mode),previous);}catch(_){}
  msg.textContent="Imeshindikana kuhifadhi template. Tafadhali jaribu tena.";
  msg.classList.add("show");render();return;
 }
 if(mode==="customer")window.ZUNE_APPLY_CUSTOMER_TEMPLATE?.();
 closePreview();render();
 msg.innerHTML=mode==="store"?'Template ya duka imehifadhiwa. <a href="./index.html" style="color:#ffd08a;text-decoration:underline;margin-left:8px;pointer-events:auto">Angalia duka →</a>':'Template imehifadhiwa. <a href="./index.html" style="color:#ffd08a;text-decoration:underline;margin-left:8px;pointer-events:auto">Angalia Marketplace →</a>';
 msg.style.pointerEvents="auto";msg.classList.add("show");setTimeout(()=>msg.classList.remove("show"),5000);
}
document.getElementById("tg-modal").addEventListener("click",e=>{if(e.target.id==="tg-modal"||e.target.closest("[data-close-modal]"))closePreview();});
document.querySelector("[data-modal-apply]").addEventListener("click",()=>{if(previewId)applyTemplate(previewId);});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closePreview();});
async function init(){
 const {data:{session},error}=await supabase.auth.getSession();if(error)throw error;
 if(!session?.user){root.innerHTML='<div class="tg-empty">Ingia kwenye akaunti yako kwanza ili kuchagua template. <a href="./index.html">Rudi ZUNE</a></div>';return;}
 user=session.user;
 const {data,error:profileError}=await supabase.from("profiles").select("id,role").eq("id",user.id).maybeSingle();if(profileError)throw profileError;profile=profile||data||{};
 profile=data||{};
 if(profile.role==="vendor"){const {data:storeData,error:storeError}=await supabase.from("stores").select("id,storefront_template").eq("owner_id",user.id).maybeSingle();if(storeError)throw storeError;store=storeData||null;}
 const {data:themeAssets,error:themeError}=await supabase.from("zune_theme_assets").select("id,title,description,config,layout,is_featured,created_at").eq("asset_kind","theme").eq("status","published").in("scope",["official","community"]).order("is_featured",{ascending:false}).order("created_at",{ascending:false});
 if(themeError)throw themeError;
 names=(themeAssets||[]).map(asset=>({id:asset.config?.template_id||asset.layout?.template_id,name:asset.title,desc:asset.description,assetId:asset.id})).filter(asset=>asset.id);
 if(!names.length)throw new Error("Marketplace theme catalog is empty.");
 loadChoices();render();
}
init().catch(e=>{console.error("ZUNE templates:",e);root.innerHTML='<div class="tg-empty">Imeshindikana kupakia templates. Tafadhali jaribu tena.</div>';});
