function decode(value){
 const s=String(value||"").replace(/-/g,"+").replace(/_/g,"/");
 const padded=s+"=".repeat((4-s.length%4)%4);
 return Uint8Array.from(atob(padded),c=>c.charCodeAt(0));
}
function encode(buffer){
 const bytes=new Uint8Array(buffer);let binary="";
 bytes.forEach(b=>binary+=String.fromCharCode(b));
 return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function serializeCredential(credential,kind){
 const response=credential.response;
 const out={
  id:credential.id,rawId:encode(credential.rawId),type:credential.type,
  response:{clientDataJSON:encode(response.clientDataJSON)}
 };
 if(kind==="register"){
  out.response.attestationObject=encode(response.attestationObject);
  out.response.transports=response.getTransports?.()||[];
 }else{
  out.response.authenticatorData=encode(response.authenticatorData);
  out.response.signature=encode(response.signature);
  out.response.userHandle=response.userHandle?encode(response.userHandle):null;
 }
 if(credential.authenticatorAttachment)out.authenticatorAttachment=credential.authenticatorAttachment;
 return out;
}
async function invoke(supabase,body){
 const {data,error}=await supabase.functions.invoke("zune-wallet-passkeys",{body});
 if(error)throw error;
 if(data?.error)throw new Error(data.error);
 return data;
}
export async function registerWalletBiometrics(supabase){
 if(!window.PublicKeyCredential||!navigator.credentials?.create)throw new Error("Kifaa au browser hii haiungi mkono biometrics/passkeys.");
 const start=await invoke(supabase,{action:"register-options"});
 const options=start.options;
 const publicKey={...options,challenge:decode(options.challenge),user:{...options.user,id:decode(options.user.id)},
  excludeCredentials:(options.excludeCredentials||[]).map(c=>({...c,id:decode(c.id)}))};
 const credential=await navigator.credentials.create({publicKey});
 if(!credential)throw new Error("Usajili wa biometrics umeghairiwa.");
 return await invoke(supabase,{action:"register-verify",challenge_id:start.challenge_id,credential:serializeCredential(credential,"register")});
}
export async function authenticateWalletBiometrics(supabase,purpose){
 if(!window.PublicKeyCredential||!navigator.credentials?.get)throw new Error("Kifaa au browser hii haiungi mkono biometrics/passkeys.");
 if(!["withdraw","payment"].includes(purpose))throw new Error("Invalid Wallet security purpose.");
 const start=await invoke(supabase,{action:"authentication-options",purpose});
 const options=start.options;
 const publicKey={...options,challenge:decode(options.challenge),
  allowCredentials:(options.allowCredentials||[]).map(c=>({...c,id:decode(c.id)}))};
 const credential=await navigator.credentials.get({publicKey});
 if(!credential)throw new Error("Uthibitisho wa biometrics umeghairiwa.");
 return await invoke(supabase,{action:"authentication-verify",purpose,challenge_id:start.challenge_id,credential:serializeCredential(credential,"authenticate")});
}
