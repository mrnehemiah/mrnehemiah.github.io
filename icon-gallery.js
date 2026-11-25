import { supabase } from "./supabase.js";
function nativePreview(choice){
const art={
default:'<path d="M24 38h60l-7 48H31z" fill="url(#a)"/><path d="M35 39V28a19 19 0 0 1 38 0v11" fill="none" stroke="#D1FAE5" stroke-width="7" stroke-linecap="round"/><path d="M30 48h49" stroke="#A7F3D0" stroke-width="5"/>',
emerald:'<path d="M24 42h60l-7 45H31z" fill="url(#a)"/><path d="M36 43V29a18 18 0 0 1 36 0v14" fill="none" stroke="#D1FAE5" stroke-width="7" stroke-linecap="round"/><path d="M32 54h44M39 61v18m15-18v18m15-18v18" stroke="#065F46" stroke-width="5"/>',
sunset:'<path d="M31 38V28a23 23 0 0 1 46 0v10" fill="none" stroke="#FED7AA" stroke-width="7"/><path d="M20 37h68l-6 52H26z" fill="url(#a)"/><path d="M26 49h56l-4 7H30z" fill="#FDBA74"/>',
midnight:'<path d="M54 17 88 39 54 59 20 39z" fill="#60A5FA"/><path d="M20 39 54 59v36L20 74z" fill="#1D4ED8"/><path d="M88 39 54 59v36l34-21z" fill="#1E40AF"/><path d="M49 23h10v69H49z" fill="#BAE6FD"/>',
aurora:'<path d="M18 43 54 21 90 43 54 65z" fill="#67E8F9"/><path d="M18 43 54 65v29L18 72z" fill="#0891B2"/><path d="M90 43 54 65v29l36-22z" fill="#0F766E"/><path d="m15 51 39 24 39-24v8L54 84 15 59z" fill="#FDE68A"/>',
royal:'<path d="M54 12 91 42 76 84 54 97 32 84 17 42z" fill="url(#a)"/><path d="M54 12 54 97 32 84 17 42z" fill="#6D28D9"/><path d="M54 12 91 42 54 50z" fill="#DDD6FE"/><path d="M17 42 54 50v47L32 84z" fill="#7C3AED"/>',
rose:'<path d="M32 39V28a22 22 0 0 1 44 0v11" fill="none" stroke="#FBCFE8" stroke-width="7"/><path d="M19 37h70l-7 53H26z" fill="url(#a)"/><path d="M25 49h58l-4 8H29z" fill="#FBCFE8"/>',
graphite:'<path d="M18 39 54 17 90 39 54 60z" fill="#A1A1AA"/><path d="M18 39 54 60v35L18 74z" fill="#52525B"/><path d="M90 39 54 60v35l36-21z" fill="#27272A"/><path d="M54 20v73" stroke="#E4E4E7" stroke-width="5"/>',
arctic:'<path d="M54 12C43 31 23 49 23 68c0 19 13 31 31 31s31-12 31-31C85 49 65 31 54 12z" fill="url(#a)"/><path d="M54 20 45 63 54 78 63 63z" fill="#E0F2FE"/><path d="M31 68c8 7 14 9 23 9s15-2 23-9" fill="none" stroke="#7DD3FC" stroke-width="5"/>',
amber:'<path d="M31 39V27a23 23 0 0 1 46 0v12" fill="none" stroke="#FDE68A" stroke-width="7"/><path d="M17 37h74l-8 54H25z" fill="url(#a)"/><path d="M23 50h62l-4 8H27z" fill="#FEF3C7"/>',
crimson:'<path d="M54 12 88 45 54 96 20 45z" fill="url(#a)"/><path d="M54 12 54 96 20 45z" fill="#BE123C"/><path d="m54 27 16 19-16 34-16-34z" fill="#FDA4AF"/>',
sapphire:'<path d="M54 13 91 43 76 86 54 97 32 86 17 43z" fill="url(#a)"/><path d="M17 43 54 54 54 97 32 86z" fill="#1D4ED8"/><path d="M54 13 91 43 54 54z" fill="#BFDBFE"/>',
jade:'<path d="M54 12C29 30 17 44 22 66c4 18 18 29 32 31 14-2 28-13 32-31 5-22-7-36-32-54z" fill="url(#a)"/><path d="M54 25v58M54 52 35 39m19 30 20-18" stroke="#D1FAE5" stroke-width="6" stroke-linecap="round"/>',
solar:'<circle cx="54" cy="54" r="34" fill="url(#a)"/><path d="M54 8v13m0 62v13M8 54h13m66 0h13M21 21l10 10m46 46 10 10m0-66L77 31M31 77 21 87" stroke="#FDE68A" stroke-width="7" stroke-linecap="round"/><circle cx="54" cy="54" r="15" fill="#FFFBEB"/>',
lavender:'<path d="M54 12 65 39 94 40 72 59 80 88 54 72 28 88 36 59 14 40 43 39z" fill="url(#a)"/><circle cx="54" cy="54" r="13" fill="#F5F3FF"/>',
coral:'<path d="M54 15c9 13 18 17 28 19-7 11-7 21 0 31-14 1-22 7-28 22-6-15-14-21-28-22 7-10 7-20 0-31 10-2 19-6 28-19z" fill="url(#a)"/><circle cx="54" cy="54" r="12" fill="#FFF1F2"/>',
glacier:'<path d="M54 10 88 35 76 82 54 98 32 82 20 35z" fill="url(#a)"/><path d="m54 10 0 88-22-16-12-47z" fill="#0EA5E9"/><path d="m54 27 19 28-19 28-19-28z" fill="#E0F2FE"/>',
copper:'<path d="M54 12 91 34 91 74 54 96 17 74 17 34z" fill="url(#a)"/><path d="M54 12v84M17 34l74 40M91 34 17 74" stroke="#FED7AA" stroke-width="5"/><circle cx="54" cy="54" r="13" fill="#7C2D12"/>',
neon:'<path d="M22 20h64v64H22z" rx="16" fill="url(#a)"/><path d="m30 65 16-28 10 19 9-14 13 23" fill="none" stroke="#ECFEFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="76" cy="32" r="5" fill="#F0FDFA"/>',
obsidian:'<path d="M54 13 86 31 86 70 54 94 22 70 22 31z" fill="url(#a)"/><path d="m54 13 0 81-32-24V31z" fill="#0E7490"/><path d="m54 13 32 18v39L54 94z" fill="#164E63"/><path d="m54 29 17 25-17 25-17-25z" fill="#A5F3FC"/><path d="m54 39 8 15-8 15-8-15z" fill="#F0FDFA"/>'
};
const artSvg=art[choice.key]||art.default;
return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="'+choice.bg+'"/><stop offset="1" stop-color="#111827"/></linearGradient><linearGradient id="a" x2="1" y2="1"><stop stop-color="'+choice.accent+'"/><stop offset="1" stop-color="'+choice.bg+'"/></linearGradient><filter id="s"><feGaussianBlur stdDeviation="3"/></filter></defs><rect width="108" height="108" rx="24" fill="url(#b)"/><ellipse cx="54" cy="92" rx="31" ry="5" fill="#000" opacity=".25" filter="url(#s)"/>'+artSvg+'<path d="M12 22Q18 8 37 8" stroke="#fff" stroke-width="3" opacity=".25" fill="none" stroke-linecap="round"/></svg>');
}
const $=s=>document.querySelector(s);
const grid=$("#icon-grid"),themeGrid=$("#theme-grid"),status=$("#gallery-status");
let admin=false,user=null,icons=[],themes=[],activeTab="themes",previewAsset=null;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const say=(message,bad=false)=>{status.textContent=message;status.style.color=bad?"#fca5a5":"#a7f3d0";};
$("#back").onclick=()=>location.assign("./account.html");
function templateId(asset){return asset?.config?.template_id||asset?.layout?.template_id||"";}
function selectedThemeId(){return localStorage.getItem("zune_template_customer:"+user.id)||user.user_metadata?.zune_template_customer||"classic";}
function selectedIcon(){
 const selectedId=localStorage.getItem("zune_selected_app_icon");
 const nativeKey=localStorage.getItem("zune_native_icon");
 return icons.find(x=>x.id===selectedId)||(nativeKey?icons.find(x=>x.config?.native_key===nativeKey):null)||null;
}
function mini(id){
 const index=["classic","editorial","hero","compact","boutique","catalog","stories","minimal","deals","showcase"].indexOf(id);
 return '<div class="ig-theme-mini layout-'+(index>=0?index+1:1)+'"><div class="ig-mini-top"><b>ⓏⓊⓃⒺ</b><span>⌕　♡　▣</span></div><div class="ig-mini-search"></div><div class="ig-mini-hero"></div><div class="ig-mini-tiles"><i></i><i></i><i></i><i></i></div><div class="ig-mini-products"><i></i><i></i><i></i></div><div class="ig-mini-footer"></div></div>';
}
function setTab(tab){
 activeTab=tab;
 document.querySelectorAll("[data-studio-tab]").forEach(button=>{const active=button.dataset.studioTab===tab;button.classList.toggle("active",active);button.setAttribute("aria-selected",String(active));});
 $("#themes-panel").hidden=tab!=="themes";$("#icons-panel").hidden=tab!=="icons";$("#mine-panel").hidden=tab!=="mine";
 if(tab==="mine")renderMySelection();
}
document.querySelectorAll("[data-studio-tab]").forEach(button=>button.addEventListener("click",()=>setTab(button.dataset.studioTab)));
function openPreview(asset){
 previewAsset=asset;
 const modal=$("#icon-preview-modal"),art=$("#icon-preview-art"),title=$("#icon-preview-title"),desc=$("#icon-preview-description"),apply=$("#icon-preview-apply");
 title.textContent=asset.title||"ZUNE Marketplace";
 desc.textContent=asset.description||"";
 if(asset.asset_kind==="theme")art.innerHTML=mini(templateId(asset));
 else if(asset.config?.native_key)art.innerHTML='<img alt="" src="'+nativePreview({key:asset.config.native_key,bg:asset.config.background,accent:asset.config.accent})+'">';
 else art.innerHTML='<img alt="" src="'+esc(asset.preview_url||"")+'">';
 apply.textContent=asset.asset_kind==="theme"?"Tumia Theme":"Apply Icon";
 modal.classList.add("open");modal.setAttribute("aria-hidden","false");
}
function closePreview(){const modal=$("#icon-preview-modal");modal.classList.remove("open");modal.setAttribute("aria-hidden","true");previewAsset=null;}
$("#icon-preview-close").addEventListener("click",closePreview);
$("#icon-preview-modal").addEventListener("click",event=>{if(event.target.id==="icon-preview-modal")closePreview();});
document.addEventListener("keydown",event=>{if(event.key==="Escape")closePreview();});
$("#icon-preview-apply").addEventListener("click",async()=>{if(!previewAsset)return;if(previewAsset.asset_kind==="theme")await applyTheme(previewAsset);else await applyIcon(previewAsset);closePreview();});
function renderThemes(){
 themeGrid.replaceChildren();
 if(!themes.length){const p=document.createElement("p");p.className="ig-empty";p.textContent="Hakuna Marketplace Themes zilizochapishwa kwa sasa.";themeGrid.append(p);return;}
 for(const asset of themes){
  const id=templateId(asset),selected=id===selectedThemeId();
  const card=document.createElement("article");card.className="icon-tile theme-tile"+(selected?" selected":"");
  const preview=document.createElement("div");preview.className="ig-theme-preview";preview.innerHTML=mini(id);
  const title=document.createElement("strong");title.textContent=asset.title;
  const desc=document.createElement("small");desc.textContent=asset.description||"Marketplace Theme";
  const current=document.createElement("small");current.className="ig-current-label";current.textContent=selected?"Theme inayotumika":"Official Marketplace Theme";
  const view=document.createElement("button");view.type="button";view.textContent="Preview";view.onclick=()=>openPreview(asset);
  const apply=document.createElement("button");apply.type="button";apply.textContent=selected?"Inatumika":"Apply Theme";apply.disabled=selected;apply.onclick=()=>applyTheme(asset);
  card.append(preview,title,desc,current,view,apply);
  if(admin)addAdminActions(card,asset);
  themeGrid.append(card);
 }
}
function renderIcons(){
 grid.replaceChildren();
 if(!icons.length){const p=document.createElement("p");p.className="ig-empty";p.textContent="Hakuna Marketplace Icon Collections zilizochapishwa kwa sasa.";grid.append(p);return;}
 for(const asset of icons){
  const nativeKey=asset.config?.native_key||"",selected=asset.id===localStorage.getItem("zune_selected_app_icon")||(nativeKey&&nativeKey===localStorage.getItem("zune_native_icon"));
  const card=document.createElement("article");card.className="icon-tile marketplace-icon-tile"+(selected?" selected":"");
  const img=document.createElement("img");img.alt=asset.title;img.loading="lazy";
  img.src=nativeKey?nativePreview({key:nativeKey,bg:asset.config?.background,accent:asset.config?.accent}):(asset.preview_url||"");
  img.onerror=()=>{img.style.display="none";};
  const title=document.createElement("strong");title.textContent=asset.title;
  const desc=document.createElement("small");desc.textContent=selected?"My Icon · Imechaguliwa":(nativeKey?"Built-in 3D Android icon":"Marketplace 3D icon");
  const preview=document.createElement("button");preview.type="button";preview.textContent="Preview";preview.onclick=()=>openPreview(asset);
  const apply=document.createElement("button");apply.type="button";apply.textContent=selected?"Imechaguliwa":"Apply Icon";apply.disabled=!!selected;apply.onclick=()=>applyIcon(asset);
  card.append(img,title,desc,preview,apply);
  if(admin)addAdminActions(card,asset);
  grid.append(card);
 }
}
function addAdminActions(card,asset){
 const visibility=document.createElement("button");visibility.type="button";
 visibility.textContent=asset.status==="published"?"Ficha kwa wateja":"Chapisha kwa wateja";
 visibility.onclick=()=>setAssetVisibility(asset);
 const del=document.createElement("button");del.type="button";del.className="delete-icon";del.textContent="Futa";
 del.setAttribute("aria-label","Futa "+asset.title);del.onclick=()=>removeAsset(asset);
 card.append(visibility,del);
}
function renderMySelection(){
 const root=$("#my-selection"),themeId=selectedThemeId(),theme=themes.find(x=>templateId(x)===themeId)||themes[0],icon=selectedIcon();
 root.replaceChildren();
 const cards=document.createElement("div");cards.className="ig-my-grid";
 const themeCard=document.createElement("article");themeCard.className="icon-tile ig-my-card";
 const themePreview=document.createElement("div");themePreview.className="ig-theme-preview";themePreview.innerHTML=mini(templateId(theme)||"classic");
 const themeTitle=document.createElement("strong");themeTitle.textContent="My Theme";
 const themeName=document.createElement("small");themeName.textContent=theme?.title||"ZUNE Classic";
 const themeButton=document.createElement("button");themeButton.type="button";themeButton.textContent="Badilisha Theme";themeButton.onclick=()=>setTab("themes");
 themeCard.append(themePreview,themeTitle,themeName,themeButton);
 const iconCard=document.createElement("article");iconCard.className="icon-tile ig-my-card";
 const iconImg=document.createElement("img");iconImg.alt=icon?.title||"My Icon";
 iconImg.src=icon?(icon.config?.native_key?nativePreview({key:icon.config.native_key,bg:icon.config.background,accent:icon.config.accent}):(icon.preview_url||"")):"";
 if(!icon)iconImg.style.display="none";
 const iconTitle=document.createElement("strong");iconTitle.textContent="My Icon";
 const iconName=document.createElement("small");iconName.textContent=icon?.title||"Hakuna icon iliyochaguliwa";
 const iconButton=document.createElement("button");iconButton.type="button";iconButton.textContent="Chagua Icon";iconButton.onclick=()=>setTab("icons");
 iconCard.append(iconImg,iconTitle,iconName,iconButton);
 cards.append(themeCard,iconCard);root.append(cards);
}
async function applyTheme(asset){
 const id=templateId(asset);if(!id){say("Theme hii haina template configuration inayotumika.",true);return;}
 const previous=user.user_metadata||{};
 const {data,error}=await supabase.auth.updateUser({data:{...previous,zune_template_customer:id}});
 if(error){say("Imeshindikana kuhifadhi Theme: "+error.message,true);return;}
 user=data.user||user;localStorage.setItem("zune_template_customer:"+user.id,id);
 say("Theme ya "+asset.title+" imehifadhiwa kwenye akaunti yako.");
 renderThemes();if(activeTab==="mine")renderMySelection();
}
async function applyIcon(asset){
 const nativeKey=asset.config?.native_key||"";
 const imageUrl=nativeKey?nativePreview({key:nativeKey,bg:asset.config?.background,accent:asset.config?.accent}):(asset.preview_url||"");
 if(nativeKey&&window.AndroidZuneIcon&&typeof window.AndroidZuneIcon.setLauncherIcon==="function"){
  const ok=window.AndroidZuneIcon.setLauncherIcon(nativeKey);
  if(!ok){say("Android haikuweza kubadilisha launcher icon.",true);return;}
  localStorage.setItem("zune_native_icon",nativeKey);
 }else if(nativeKey){
  localStorage.setItem("zune_native_icon",nativeKey);
 }else{
  localStorage.setItem("zune_native_icon","");
 }
 localStorage.setItem("zune_selected_app_icon",asset.id);
 localStorage.setItem("zune_selected_app_icon_url",imageUrl);
 document.dispatchEvent(new CustomEvent("zune:app-icon-changed",{detail:{id:asset.id,url:imageUrl,name:asset.title}}));
 say(nativeKey?"Icon imechaguliwa. Launcher halisi itabadilika kwenye Android app inayounga mkono icon switching.":"Icon imechaguliwa kwenye Icon Studio.");
 renderIcons();if(activeTab==="mine")renderMySelection();
}
async function load(){
 let query=supabase.from("zune_theme_assets").select("id,title,description,preview_url,asset_kind,scope,status,config,is_featured,published_at,created_at").in("asset_kind",["theme","app_icon"]).order("is_featured",{ascending:false}).order("created_at",{ascending:false});
 if(!admin)query=query.eq("status","published").in("scope",["official","community"]);
 const {data,error}=await query;
 if(error){say("Imeshindikana kupakia Marketplace catalog: "+error.message,true);return;}
 themes=(data||[]).filter(x=>x.asset_kind==="theme"&&templateId(x));
 icons=(data||[]).filter(x=>x.asset_kind==="app_icon");
 renderThemes();renderIcons();if(activeTab==="mine")renderMySelection();
}
async function setAssetVisibility(asset){
 if(!admin)return;
 const next=asset.status==="published"?"hidden":"published";
 const {data:allowed,error:authError}=await supabase.rpc("is_admin");
 if(authError||allowed!==true){say("Ruhusa ya Admin haijathibitishwa.",true);return;}
 const {error}=await supabase.from("zune_theme_assets").update({status:next,published_at:next==="published"?(asset.published_at||new Date().toISOString()):asset.published_at}).eq("id",asset.id);
 if(error){say("Imeshindikana kubadilisha hali ya asset: "+error.message,true);return;}
 await load();say(next==="published"?"Asset imechapishwa kwa wateja.":"Asset imefichwa kwa wateja.");
}
async function removeAsset(asset){
 if(!admin){say("Admin pekee anaweza kufuta Marketplace asset.",true);return;}
 if(!confirm("Una uhakika unataka kufuta "+asset.title+"? Kitendo hiki hakiwezi kutenduliwa."))return;
 const {data:allowed,error:authError}=await supabase.rpc("is_admin");
 if(authError||allowed!==true){say("Ruhusa ya Admin haijathibitishwa. Asset haijafutwa.",true);return;}
 const {error}=await supabase.from("zune_theme_assets").delete().eq("id",asset.id);
 if(error){say("Imeshindikana kufuta asset: "+error.message,true);return;}
 const path=asset.config?.storage_path;
 const storageResult=path?await supabase.storage.from(asset.config?.storage_bucket||"zune-app-icons").remove([path]):{error:null};
 if(localStorage.getItem("zune_selected_app_icon")===asset.id){localStorage.removeItem("zune_selected_app_icon");localStorage.removeItem("zune_selected_app_icon_url");localStorage.removeItem("zune_native_icon");}
 await load();
 if(storageResult.error)say("Asset imefutwa, lakini faili haikuondolewa Storage: "+storageResult.error.message,true);
 else say("Marketplace asset imefutwa.");
}
async function init(){
 const {data:{user:sessionUser},error:sessionError}=await supabase.auth.getUser();
 if(sessionError)throw sessionError;
 if(!sessionUser){location.replace("./login.html?redirect=icon-gallery.html");return;}
 user=sessionUser;
 const {data:allowed,error:roleError}=await supabase.rpc("is_admin");admin=!roleError&&allowed===true;
 const panel=$("#admin-tools");
 if(admin&&panel){panel.hidden=false;panel.removeAttribute("aria-hidden");}
 else if(panel){panel.remove();panel.setAttribute("aria-hidden","true");}
 await load();setTab("themes");
}
$("#icon-form")?.addEventListener("submit",async event=>{
 event.preventDefault();const form=event.currentTarget,file=form.image.files[0],title=form.name.value.trim();
 if(!file||!title)return;
 if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>2097152){$("#upload-status").textContent="Chagua PNG, JPG au WebP isiyozidi 2MB.";return;}
 const {data:{user:currentUser}}=await supabase.auth.getUser();
 const {data:allowed,error:roleError}=await supabase.rpc("is_admin");
 if(!currentUser||roleError||allowed!==true){$("#admin-tools")?.remove();say("Admin pekee ndiye anayeruhusiwa kuongeza icons.",true);return;}
 const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg",path="marketplace/app-icons/"+crypto.randomUUID()+"."+ext;
 $("#upload-status").textContent="Inapakia...";
 const upload=await supabase.storage.from("zune-app-icons").upload(path,file,{contentType:file.type,upsert:false,cacheControl:"3600"});
 if(upload.error){$("#upload-status").textContent=upload.error.message;return;}
 const previewUrl=supabase.storage.from("zune-app-icons").getPublicUrl(path).data.publicUrl,published=form.active.checked;
 const inserted=await supabase.from("zune_theme_assets").insert({
  owner_id:null,asset_kind:"app_icon",scope:"official",status:published?"published":"hidden",
  title,description:"ZUNE Marketplace 3D app icon",preview_url:previewUrl,
  config:{storage_bucket:"zune-app-icons",storage_path:path,presentation:"3d"},
  layout:{presentation:"3d-icon"},component_code:{renderer:"image"},version:1,
  is_featured:false,published_at:published?new Date().toISOString():null
 });
 if(inserted.error){await supabase.storage.from("zune-app-icons").remove([path]);$("#upload-status").textContent=inserted.error.message;return;}
 form.reset();$("#upload-status").textContent="Icon imeongezwa kwenye Marketplace Assets.";await load();
});
init().catch(error=>say(error.message,true));