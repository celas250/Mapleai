export async function callLLM(prompt: string, system = 'You are a helpful tutor.'){
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '';
  const model = process.env.OPENROUTER_MODEL || 'gpt-4o-mini';
  if(!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const body = {
    model,
    input: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
  };

  const res = await fetch('https://api.openrouter.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if(!res.ok){
    const txt = await res.text();
    throw new Error(`LLM error: ${res.status} ${txt}`);
  }
  const data = await res.json();
  // A few providers return different shapes; attempt to normalize
  const message = data?.output?.[0]?.content?.[0]?.text || data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message || data?.result || JSON.stringify(data);
  return String(message);
}
