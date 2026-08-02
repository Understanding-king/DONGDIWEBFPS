const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';
const GLM_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const GLM_TRANSCRIPTION_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/audio/transcriptions';

async function requestJson(url, apiKey, body) {
  if (!apiKey) throw new Error('缺少 API Key');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error('模型请求失败（' + response.status + '）：' + detail.slice(0, 240));
  }
  return response.json();
}

export async function analyzeTextWithDeepSeek(apiKey, prompt) {
  const data = await requestJson(DEEPSEEK_ENDPOINT, apiKey, {
    model: 'deepseek-v4-pro',
    messages: [
      { role: 'system', content: '你是一名严谨的学生经历档案整理助手。只使用输入中的事实，不确定内容必须明确标注。请输出结构化 JSON。' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2
  });
  return data.choices?.[0]?.message?.content || '';
}

export async function chatWithDeepSeek(apiKey, messages, records, notes = []) {
  const recordContext = (records || []).map((record) => ({
    id: record.id,
    title: record.title,
    category: record.category,
    date: record.date,
    summary: record.aiDescription || record.description,
    keywords: record.keywords || []
  }));
  const noteContext = (notes || []).map((note) => ({
    id: note.id,
    date: note.date,
    createdAt: note.createdAt,
    content: note.content
  }));
  const data = await requestJson(DEEPSEEK_ENDPOINT, apiKey, {
    model: 'deepseek-v4-pro',
    messages: [
      {
        role: 'system',
        content: '你是学生的长期经历助手。你可以同时参考用户的正式事件经历和随手记来理解用户，但只有用户明确需要筛选、回顾或改写经历时才推荐正式事件记录。不要把随手记编造成正式事件，也不要为随手记返回 recordId。需求不清楚时，一次只追问一个最有帮助的问题。请输出 JSON：{"reply":"给用户看的自然语言回复","intent":"chat|retrieve|rewrite","recordIds":["匹配的正式事件 id"]}。正式事件经历如下：' + JSON.stringify(recordContext) + '。用户随手记如下：' + JSON.stringify(noteContext)
      },
      ...messages.slice(-12)
    ],
    response_format: { type: 'json_object' },
    temperature: 0.55
  });
  return data.choices?.[0]?.message?.content || '';
}

export async function synthesizeEventForRetrieval(apiKey, event, analyses = []) {
  const prompt = [
    '请把以下学生事件资料整理为供经历库检索和后续对话理解使用的结构化摘要。',
    '输出 JSON，字段必须为：title、category、date、aiDescription、keywords、uncertainties。',
    'aiDescription 要求：',
    '1. 用第三人称客观复述事件本身，写清时间、地点、参与对象、发生了什么、学生做了什么、结果、感受和后续意向；',
    '2. 只写资料中能确认的事实，原文中的“可能、应该、记不清”等不确定性必须保留；',
    '3. 适合未来按人物、活动、物品、行为、主题、情绪和目标检索；',
    '4. 不评价学生，不使用“体现了、展现了、说明了……能力、这段经历可以”等评语或建议；',
    '5. 不要求用户补充信息，缺失项放进 uncertainties；正文控制在 120 至 350 个汉字。',
    '可选分类：' + event.categories.join('、'),
    '事件基本信息：' + JSON.stringify({ title:event.title, category:event.category, date:event.date, description:event.description }),
    '各输入项的独立分析：' + JSON.stringify(analyses)
  ].join('\n');
  return analyzeTextWithDeepSeek(apiKey, prompt);
}

export async function analyzeMediaWithGlm(apiKey, input) {
  if (input.mediaType === 'audio') throw new Error('音频必须使用专用语音转写接口');
  const content = [{ type: 'text', text: input.prompt }];
  if (input.dataUrl) content.push({ type: 'image_url', image_url: { url: input.dataUrl } });
  const data = await requestJson(GLM_ENDPOINT, apiKey, {
    model: 'glm-5v-turbo',
    messages: [{ role: 'user', content }],
    temperature: 0.1
  });
  return data.choices?.[0]?.message?.content || '';
}

export async function transcribeAudioWithGlm(apiKey, audioBlob, filename = 'experience-recording.wav') {
  if (!apiKey) throw new Error('缺少 GLM API Key');
  const form = new FormData();
  form.append('model', 'glm-asr-2512');
  form.append('file', audioBlob, filename);
  const response = await fetch(GLM_TRANSCRIPTION_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey },
    body: form
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error('语音转写请求失败（' + response.status + '）：' + detail.slice(0, 240));
  }
  const data = await response.json();
  const transcript = data.text || data.result || data.transcript || data.choices?.[0]?.message?.content;
  if (!transcript) throw new Error('接口没有返回转写文字');
  return transcript;
}

// Media requests are intentionally awaited one by one so the same key is never
// used for concurrent analysis. The final synthesis runs only after they finish.
export async function analyzeEventSequentially(event, keys) {
  const analyses = [];
  if (event.description) {
    analyses.push({ type: 'text', result: await analyzeTextWithDeepSeek(keys.deepseek, '分析以下活动原始记录：\n' + event.description) });
  }
  for (const document of event.documents || []) {
    analyses.push({ type: 'document', name: document.name, result: await analyzeMediaWithGlm(keys.glm, { prompt: '读取这份活动文档，提取活动名称、日期、参与者行动和可核实结果。', dataUrl: document.dataUrl }) });
  }
  for (const photo of event.photos || []) {
    analyses.push({ type: 'photo', name: photo.name, result: await analyzeMediaWithGlm(keys.glm, { prompt: '分析这张活动照片。描述可见事实，并指出不能确认的信息。', dataUrl: photo.dataUrl }) });
  }
  if (event.transcript) {
    analyses.push({ type: 'voice', result: await analyzeMediaWithGlm(keys.glm, { prompt: '整理这段语音转写，提取事件事实、学生行动和个人感受。\n' + event.transcript }) });
  }
  const synthesisPrompt = '根据以下分项分析生成事件标题、活动分类、活动时间、详细描述和待补充信息。只输出 JSON：\n' + JSON.stringify(analyses);
  return analyzeTextWithDeepSeek(keys.deepseek, synthesisPrompt);
}
