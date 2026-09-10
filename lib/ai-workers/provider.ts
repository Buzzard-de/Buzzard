import type { AiProviderDefinition, ProviderExecuteInput, ProviderExecuteResult } from "./types";

export interface AiProvider {
  definition: AiProviderDefinition;
  execute(input: ProviderExecuteInput): ProviderExecuteResult;
  validate(): { ok: boolean; errors: string[] };
}
