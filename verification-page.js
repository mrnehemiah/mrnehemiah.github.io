import { supabase } from "./supabase.js?v=phase6-push-token-ownership-20261128";

const app=document.getElementById("verification-app");
const language=()=>localStorage.getItem("zune_language")==="en"?"en":"sw";
const tr=(sw,en)=>language()==="sw"?sw:en;
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

async function start(){
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user){location.replace("./index.html");return;}

  const [profileResult,requestResult]=await Promise.all([
    supabase.from("profiles").select("full_name,is_verified").eq("id",user.id).maybeSingle(),
    supabase.from("verified_badge_requests").select("id,full_name,business_name,status,rejection_reason,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle()
  ]);
  if(profileResult.error)throw profileResult.error;
  if(requestResult.error)throw requestResult.error;
  render(user,profileResult.data,requestResult.data);
}

function render(user,profile,request){
  const approved=profile?.is_verified===true;
  const pending=request?.status==="pending";
  const rejected=request?.status==="rejected";
  const status=approved
    ?'<div class="zv-status approved">✓ Verified Account — '+tr("Umeidhinishwa","Approved")+'</div>'
    :pending
      ?'<div class="zv-status">'+tr("Ombi lako linasubiri ukaguzi wa Admin Mkuu.","Your request is pending Admin Mkuu review.")+'</div>'
      :rejected
        ?'<div class="zv-status rejected">'+tr("Ombi limekataliwa.","Your request was rejected.")+(request.rejection_reason?" "+esc(request.rejection_reason):"")+'</div>'
        :"";
  app.innerHTML=`<section class="zv-page"><div class="zv-wrap"><div class="zv-card">
    <div class="zv-brand">ⓏⓊⓃⒺ</div>
    <h1>${tr("Profile Badge — Simple Verification","Profile Badge — Simple Verification")}</h1>
    <p class="zv-muted">${tr("Omba beji ya Verified Account. Admin Mkuu atakagua ombi lako. Beji ya rangi ya machungwa itaonekana baada ya kuidhinishwa tu. Hii ni tofauti na Verified Store ya duka.","Request the Verified Account badge. Admin Mkuu will review your request. The orange badge appears only after approval. This is separate from your store's Verified Store badge.")}</p>
    ${status}
    ${approved||pending?"":`<form class="zv-form" id="zv-form">
      <label>${tr("Jina kamili","Full name")}<input name="full_name" maxlength="140" required value="${esc(profile?.full_name||"")}"></label>
      <label>${tr("Jina la biashara/duka (hiari)","Business/store name (optional)")}<input name="business_name" maxlength="140" value="${esc("")}"></label>
      <p class="zv-muted">${tr("Hii ni Simple Verification. Kwa sasa tutaomba taarifa za msingi tu. Usipakie kitambulisho au nyaraka binafsi mpaka tutakapoweka sehemu salama ya ushahidi.","This is Simple Verification. For now, only basic details are requested. Do not upload an ID or private documents until a secure evidence upload is provided.")}</p>
      <button class="zv-btn" type="submit">${tr("Tuma ombi la verification","Submit verification request")}</button>
      <p class="zv-error" id="zv-error" aria-live="polite"></p>
    </form>`}
    <div class="zv-actions"><a class="zv-link" href="./account.html">← ${tr("Rudi kwenye Account","Back to Account")}</a><a class="zv-link" href="./index.html">ZUNE Marketplace</a></div>
  </div></div></section>`;

  document.getElementById("zv-form")?.addEventListener("submit",async event=>{
    event.preventDefault();
    const form=event.currentTarget,button=form.querySelector("button"),errorBox=document.getElementById("zv-error");
    const data=new FormData(form);
    const full_name=String(data.get("full_name")||"").trim();
    const business_name=String(data.get("business_name")||"").trim();
    if(!full_name){errorBox.textContent=tr("Jaza jina kamili.","Enter your full name.");return;}
    button.disabled=true;button.textContent=tr("Inatuma...","Submitting...");
    try{
      const {error}=await supabase.from("verified_badge_requests").insert({
        user_id:user.id,full_name,business_name:business_name||null,verification_type:"customer",status:"pending"
      });
      if(error)throw error;
      await start();
    }catch(err){
      console.error("ZUNE verification submit:",err);
      errorBox.textContent=err.message||tr("Imeshindikana kutuma ombi.","Could not submit request.");
      button.disabled=false;button.textContent=tr("Tuma ombi la verification","Submit verification request");
    }
  });
}

start().catch(error=>{
  console.error("ZUNE verification page:",error);
  app.innerHTML='<section class="zv-page"><div class="zv-wrap"><div class="zv-card"><h1>Imeshindikana kupakia ukurasa</h1><p class="zv-muted">Tafadhali jaribu tena.</p><a class="zv-link" href="./index.html">Rudi ZUNE</a></div></div></section>';
});
