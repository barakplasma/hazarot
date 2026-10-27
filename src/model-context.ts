// Bound input as well as output. Drop the oldest conversational context first.
// This is a byte ceiling, not a tokenizer-based or dollar spending guarantee.
export function boundedPrompt(input: Record<string, unknown>) {
  const value = { ...input };
  for (const key of ["messages", "memory"]) if (Array.isArray(value[key])) value[key] = [...value[key] as unknown[]];
  const bytes = (text: string) => new TextEncoder().encode(text).length;
  let prompt = JSON.stringify(value);
  for (const key of ["messages", "memory"]) {
    const list = value[key];
    while (bytes(prompt) > 20000 && Array.isArray(list) && list.length) { list.shift(); prompt = JSON.stringify(value); }
  }
  if (bytes(prompt) > 20000) throw new Error("Model context exceeds allowance");
  return prompt;
}
