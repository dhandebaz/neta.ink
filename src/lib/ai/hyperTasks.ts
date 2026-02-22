import { callHyperbrowserAgent } from "./router";

export async function runCivicResearchTask(task: string): Promise<string> {
  const result = await callHyperbrowserAgent(task);
  return result.text;
}

