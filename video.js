/*
  Provider-agnostic video interface.
  Implement the exact current API contract of your chosen provider here.
  This keeps provider credentials on the server and makes the frontend provider-neutral.
*/
export async function createVideo({mode,prompt,imageUrl,style,duration=8}){
  if(!process.env.VIDEO_PROVIDER_URL){
    return {
      status:"not_configured",
      provider:null,
      message:"Configure VIDEO_PROVIDER_URL and VIDEO_PROVIDER_KEY to enable video generation."
    };
  }
  const response=await fetch(process.env.VIDEO_PROVIDER_URL,{
    method:"POST",
    headers:{
      "content-type":"application/json",
      ...(process.env.VIDEO_PROVIDER_KEY?{authorization:`Bearer ${process.env.VIDEO_PROVIDER_KEY}`}:{})
    },
    body:JSON.stringify({mode,prompt,imageUrl,style,duration})
  });
  if(!response.ok) throw new Error(`Video provider error: ${response.status}`);
  return response.json();
}
