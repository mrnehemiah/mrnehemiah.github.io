import { supabase } from "./supabase.js";
const $=id=>document.getElementById(id);
const codeBox=$("zqr-code"),idLabel=$("zqr-id"),message=$("zqr-message");
let qrInstance=null,profileUrl="",stream=null,scanLoop=false;
const setMessage=(text,error=false)=>{message.textContent=text;message.style.color=error?"#b42318":"#718078";};
function stopScanner(){scanLoop=false;if(stream){stream.getTracks().forEach(track=>track.stop());stream=null;}$("zqr-video").srcObject=null;$("zqr-scanner-wrap").hidden=true;}
async function init(){
 try{
  const {data:{user},error:authError}=await supabase.auth.getUser();if(authError)throw authError;
  if(!user){location.replace("./index.html");return;}
  const {data:profile,error}=await supabase.from("profiles").select("zune_id,full_name").eq("id",user.id).single();
  if(error)throw error;
  const zuneId=profile?.zune_id;if(!zuneId)throw new Error("ZUNE ID haijapatikana kwenye akaunti yako.");
  const name=profile.full_name||user.user_metadata?.full_name||"Mtumiaji wa ZUNE";
  const publicUrl=new URL("./zune-public-profile.html",location.href);
  publicUrl.searchParams.set("name",name);publicUrl.searchParams.set("zune_id",zuneId);
  profileUrl=publicUrl.toString();idLabel.textContent=zuneId;
  if(typeof window.QRCode!=="function")throw new Error("Huduma ya kutengeneza QR haijapakia. Angalia intaneti kisha refresh.");
  qrInstance=new window.QRCode(codeBox,{text:profileUrl,width:240,height:240,colorDark:"#111111",colorLight:"#ffffff",correctLevel:window.QRCode.CorrectLevel.H});
  $("zqr-download").disabled=false;$("zqr-share").disabled=false;
 }catch(error){console.error("ZUNE QR:",error);codeBox.textContent="QR Code haikuweza kupakiwa";idLabel.textContent="—";setMessage(error.message||"Imeshindikana kupakia QR Code.",true);}
}
function getQrImage(){const canvas=codeBox.querySelector("canvas");if(canvas)return canvas.toDataURL("image/png");const img=codeBox.querySelector("img");return img?.src||"";}
$("zqr-download").addEventListener("click",()=>{const src=getQrImage();if(!src)return;const a=document.createElement("a");a.href=src;a.download="ZUNE-QR-Code.png";document.body.appendChild(a);a.click();a.remove();setMessage("QR Code imepakuliwa.");});
$("zqr-share").addEventListener("click",async()=>{try{const src=getQrImage();if(!src)throw new Error("QR haipo.");if(navigator.share){const blob=await(await fetch(src)).blob();const file=new File([blob],"ZUNE-QR-Code.png",{type:"image/png"});if(navigator.canShare?.({files:[file]}))await navigator.share({title:"ZUNE QR Code",text:"Scan QR Code yangu kufungua wasifu wangu wa ZUNE.",files:[file]});else await navigator.share({title:"ZUNE QR Code",text:"Fungua wasifu wangu wa ZUNE: "+profileUrl,url:profileUrl});}else if(navigator.clipboard){await navigator.clipboard.writeText(profileUrl);setMessage("Kiungo cha QR kimenakiliwa ili ushiriki.");}else setMessage("Kifaa hiki hakiruhusu kushiriki moja kwa moja.",true);}catch(error){if(error.name!=="AbortError")setMessage(error.message||"Imeshindikana kushiriki QR.",true);}});
$("zqr-scan").addEventListener("click",async()=>{const wrap=$("zqr-scanner-wrap");wrap.hidden=false;if(!("BarcodeDetector"in window)){ $("zqr-scan-message").textContent="Kivinjari hiki hakina huduma ya kuscan QR kupitia kamera. Tumia kamera ya simu kuscan QR.";return;}try{const detector=new BarcodeDetector({formats:["qr_code"]});stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});const video=$("zqr-video");video.srcObject=stream;await video.play();scanLoop=true;const scan=async()=>{if(!scanLoop)return;try{const codes=await detector.detect(video);if(codes.length){const value=codes[0].rawValue;const target=new URL(value,location.href);if(target.protocol==="https:"||target.protocol==="http:"){stopScanner();location.assign(target.href);return;}}}catch(e){console.warn("QR scan frame:",e);}if(scanLoop)requestAnimationFrame(scan);};scan();}catch(error){$("zqr-scan-message").textContent=error.message||"Imeshindikana kuwasha kamera. Ruhusu matumizi ya kamera.";}}
);
$("zqr-close-scan").addEventListener("click",stopScanner);
window.addEventListener("pagehide",stopScanner);
const script=document.createElement("script");script.src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";script.onload=init;script.onerror=()=>setMessage("Imeshindikana kupakia huduma ya QR. Angalia intaneti.",true);document.head.appendChild(script);