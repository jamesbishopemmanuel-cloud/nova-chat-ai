import OpenAI from "openai";
const client=()=>new OpenAI({apiKey:process.env.OPENAI_API_KEY});

export async function chat(input){
  if(!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  const r=await client().responses.create({
    model:process.env.OPENAI_TEXT_MODEL||"gpt-5.6-luna",
    instructions:"You are Nova, a helpful multimodal assistant inside a private messaging app. Be accurate, concise and transparent.",
    input
  });
  return r.output_text;
}

export async function image(prompt,style){
  if(!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  const r=await client().images.generate({
    model:process.env.OPENAI_IMAGE_MODEL||"gpt-image-2",
    prompt:`${prompt}\nStyle: ${style}.`
  });
  return r.data?.[0] || {};
}

export async function transcribe(file){
  if(!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  const r=await client().audio.transcriptions.create({
    file,
    model:"gpt-transcribe"
  });
  return r.text;
}
