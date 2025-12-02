import { callLLM } from './openrouter';

// Agent 1: Classifier
export async function classifyAgent(message: string, profile?: any){
  const prompt = `Classify the following student question. Reply JSON with subject (math/science/history/business/other), level (elementary/middle/highschool/university), intent (explanation/homework_help/practice/review). Question: "${message}"`;
  const out = await callLLM(prompt);
  try { const parsed = JSON.parse(out); return parsed; } catch(e){
    // best-effort parse
    return { subject: 'other', level: 'highschool', intent: 'explanation', raw: out };
  }
}

// Agent 2: Resource Retrieval (Wikipedia)
export async function resourceAgent(message: string){
  const q = encodeURIComponent(message.slice(0,200));
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${q}&limit=3&namespace=0&format=json&origin=*`;
  const r = await fetch(url);
  const arr = await r.json();
  const titles = arr?.[1] || [];
  const references = [];
  let curated = '';
  for(const t of titles){
    const titleEnc = encodeURIComponent(t);
    const s = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${titleEnc}`);
    const j = await s.json();
    references.push({ title: j.title, url: j.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${titleEnc}` });
    curated += `\n\n${j.title}: ${j.extract}`;
  }
  return { curated_context: curated, references };
}

// Agent 3: Pedagogy / Explanation
export async function pedagogyAgent(question: string, subject: string, level: string, intent: string, curated_context: string){
  const prompt = `You are a tutor for students. Produce a ${level} appropriate ${intent} for the question: "${question}". Use the context: ${curated_context}. If subject is math, include step-by-step derivations when relevant.`;
  const explanation = await callLLM(prompt);
  return explanation;
}

// Agent 4: Assessment / Practice
export async function assessmentAgent(question: string, subject: string){
  const prompt = `Generate 3 practice questions (short) with their correct answers for the topic: ${question} (subject: ${subject}). Reply JSON array: [{question, answer}]`;
  const out = await callLLM(prompt);
  try { return JSON.parse(out); } catch(e){
    // fall back: naive split
    return [{ question: question + ' (practice)', answer: 'Answer placeholder' }];
  }
}
