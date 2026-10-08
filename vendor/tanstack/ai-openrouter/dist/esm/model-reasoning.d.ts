import { ModelReasoning } from '@tanstack/ai';
/**
 * Each model's reasoning levels, and whether it takes a token budget, for
 * `chat({ reasoning })`. A model that is not here does not reason.
 */
export type OpenRouterModelReasoningByName = {
    '~anthropic/claude-fable-latest': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    '~anthropic/claude-haiku-latest': {
        levels: 'off' | 'high';
        budget: false;
    };
    '~anthropic/claude-opus-latest': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    '~anthropic/claude-sonnet-latest': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    '~deepseek/deepseek-flash-latest': {
        levels: 'off' | 'low' | 'high' | 'max';
        budget: false;
    };
    '~deepseek/deepseek-pro-latest': {
        levels: 'off' | 'low' | 'high' | 'max';
        budget: false;
    };
    '~deepseek/deepseek-v4-flash-latest': {
        levels: 'off' | 'low' | 'high' | 'max';
        budget: false;
    };
    '~google/gemini-flash-latest': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    '~google/gemini-pro-latest': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    '~moonshotai/kimi-latest': {
        levels: 'off' | 'low' | 'high' | 'max';
        budget: false;
    };
    '~openai/gpt-astra-latest': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    '~openai/gpt-luna-latest': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    '~openai/gpt-mini-latest': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    '~openai/gpt-sol-latest': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    '~openai/gpt-terra-latest': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    '~x-ai/grok-latest': {
        levels: 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    '~z-ai/glm-flash-latest': {
        levels: 'low' | 'high' | 'max';
        budget: false;
    };
    '~z-ai/glm-latest': {
        levels: 'low' | 'high' | 'max';
        budget: false;
    };
    'aion-labs/aion-2.0': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'aion-labs/aion-3.0': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'aion-labs/aion-3.0-mini': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'aion-labs/aion-3.5': {
        levels: 'low' | 'high' | 'max';
        budget: false;
    };
    'aion-labs/aion-3.5-mini': {
        levels: 'low' | 'high' | 'max';
        budget: false;
    };
    'amazon/nova-2-lite-v1': {
        levels: 'off' | 'high';
        budget: false;
    };
    'anthropic/claude-fable-5': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'anthropic/claude-fable-5:batch': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'anthropic/claude-fable-5.1': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'anthropic/claude-fable-5.1:batch': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'anthropic/claude-haiku-4.5': {
        levels: 'off' | 'high';
        budget: false;
    };
    'anthropic/claude-haiku-4.5:batch': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'anthropic/claude-opus-4.1': {
        levels: 'off' | 'high';
        budget: false;
    };
    'anthropic/claude-opus-4.1:batch': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'anthropic/claude-opus-4.5': {
        levels: 'off' | 'high';
        budget: false;
    };
    'anthropic/claude-opus-4.5:batch': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'anthropic/claude-opus-4.6': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'max';
        budget: true;
    };
    'anthropic/claude-opus-4.6:batch': {
        levels: 'low' | 'medium' | 'high' | 'max';
        budget: false;
    };
    'anthropic/claude-opus-4.7': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'anthropic/claude-opus-4.7:batch': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'anthropic/claude-opus-4.8': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'anthropic/claude-opus-4.8:batch': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'anthropic/claude-opus-5': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'anthropic/claude-opus-5:batch': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'anthropic/claude-opus-5.5': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'anthropic/claude-opus-5.5:batch': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'anthropic/claude-sonnet-4': {
        levels: 'off' | 'high';
        budget: false;
    };
    'anthropic/claude-sonnet-4.5': {
        levels: 'off' | 'high';
        budget: false;
    };
    'anthropic/claude-sonnet-4.5:batch': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'anthropic/claude-sonnet-4.6': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'max';
        budget: false;
    };
    'anthropic/claude-sonnet-4.6:batch': {
        levels: 'low' | 'medium' | 'high' | 'max';
        budget: false;
    };
    'anthropic/claude-sonnet-5': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'anthropic/claude-sonnet-5:batch': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'anthropic/claude-sonnet-5.5': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'anthropic/claude-sonnet-5.5:batch': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'arcee-ai/trinity-large-thinking': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'baidu/ernie-4.5-vl-424b-a47b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'bytedance-seed/seed-1.6': {
        levels: 'off' | 'high';
        budget: false;
    };
    'bytedance-seed/seed-1.6-flash': {
        levels: 'off' | 'high';
        budget: false;
    };
    'bytedance-seed/seed-2-1-turbo': {
        levels: 'off' | 'high';
        budget: false;
    };
    'bytedance-seed/seed-2.0-code': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'bytedance-seed/seed-2.0-lite': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'bytedance-seed/seed-2.0-mini': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'cohere/command-a-plus': {
        levels: 'off' | 'high';
        budget: false;
    };
    'cohere/north-mini-code:free': {
        levels: 'off' | 'high';
        budget: false;
    };
    'deepseek/deepseek-chat-v3.1': {
        levels: 'off' | 'high';
        budget: false;
    };
    'deepseek/deepseek-r1': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'deepseek/deepseek-r1-0528': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'deepseek/deepseek-v3.1-terminus': {
        levels: 'off' | 'high';
        budget: false;
    };
    'deepseek/deepseek-v3.2': {
        levels: 'off' | 'high';
        budget: false;
    };
    'deepseek/deepseek-v3.2-exp': {
        levels: 'off' | 'high';
        budget: false;
    };
    'deepseek/deepseek-v4-flash': {
        levels: 'off' | 'high' | 'xhigh';
        budget: false;
    };
    'deepseek/deepseek-v4-flash-0731': {
        levels: 'off' | 'low' | 'high' | 'max';
        budget: false;
    };
    'deepseek/deepseek-v4-flash-vision-exp': {
        levels: 'off' | 'low' | 'high' | 'max';
        budget: false;
    };
    'deepseek/deepseek-v4-pro': {
        levels: 'off' | 'high' | 'xhigh';
        budget: false;
    };
    'deepseek/deepseek-v4-pro-0813': {
        levels: 'off' | 'low' | 'high' | 'max';
        budget: false;
    };
    'deepseek/deepseek-v4.1-flash': {
        levels: 'off' | 'low' | 'high' | 'max';
        budget: false;
    };
    'deepseek/deepseek-v4.1-flash:batch': {
        levels: 'low' | 'high' | 'max';
        budget: false;
    };
    'dots-studio/dots-3-note-preview:free': {
        levels: 'off' | 'high';
        budget: false;
    };
    'fireworks/ember-1': {
        levels: 'off' | 'low' | 'high' | 'max';
        budget: false;
    };
    'google/gemini-2.5-flash': {
        levels: 'off' | 'high';
        budget: false;
    };
    'google/gemini-2.5-flash-lite': {
        levels: 'off' | 'high';
        budget: false;
    };
    'google/gemini-2.5-flash-lite:batch': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-2.5-flash:batch': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-2.5-pro': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'google/gemini-2.5-pro-preview': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'google/gemini-2.5-pro:batch': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3-flash-preview': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3-flash-preview:batch': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3-pro-image': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3-pro-image-preview': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3.1-flash-image': {
        levels: 'off' | 'minimal' | 'high';
        budget: false;
    };
    'google/gemini-3.1-flash-image-preview': {
        levels: 'off' | 'minimal' | 'high';
        budget: false;
    };
    'google/gemini-3.1-flash-lite': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3.1-flash-lite-image': {
        levels: 'off' | 'minimal' | 'high';
        budget: false;
    };
    'google/gemini-3.1-flash-lite-preview': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3.1-flash-lite:batch': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3.1-pro-preview': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3.1-pro-preview-customtools': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3.1-pro-preview:batch': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3.5-flash': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3.5-flash-lite': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3.5-flash-lite:batch': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3.5-flash:batch': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3.6-flash': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3.6-flash:batch': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3.7-flash': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3.7-flash:batch': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3.8-flash': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemini-3.8-flash:batch': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemma-4-26b-a4b-it': {
        levels: 'off' | 'high';
        budget: false;
    };
    'google/gemma-4-26b-a4b-it:free': {
        levels: 'off' | 'high';
        budget: false;
    };
    'google/gemma-4-31b-it': {
        levels: 'off' | 'high';
        budget: false;
    };
    'google/gemma-4-31b-it:free': {
        levels: 'off' | 'high';
        budget: false;
    };
    'ibm-granite/granite-4.2-8b': {
        levels: 'off' | 'low' | 'high';
        budget: false;
    };
    'inception/mercury-2': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'inception/mercury-2.5': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'inclusionai/ling-3.0-flash': {
        levels: 'off' | 'high';
        budget: false;
    };
    'inclusionai/ling-3.0-flash-fin': {
        levels: 'off' | 'high';
        budget: false;
    };
    'inclusionai/ling-3.0-flash-sante:free': {
        levels: 'off' | 'high';
        budget: false;
    };
    'inclusionai/ling-3.0-flash-vl': {
        levels: 'off' | 'high';
        budget: false;
    };
    'liquid/lfm-2.5-2.6b:free': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'meituan/longcat-2.0': {
        levels: 'off' | 'high';
        budget: true;
    };
    'meta/muse-glimmer-30b': {
        levels: 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'meta/muse-spark-1.1': {
        levels: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'meta/muse-spark-1.2': {
        levels: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'meta/muse-spark-1.2-contributor': {
        levels: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'meta/muse-spark-1.3': {
        levels: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'meta/muse-spark-1.3-contributor': {
        levels: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'minimax/minimax-m1': {
        levels: 'off' | 'high';
        budget: false;
    };
    'minimax/minimax-m2': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'minimax/minimax-m2.1': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'minimax/minimax-m2.5': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'minimax/minimax-m2.7': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'minimax/minimax-m3': {
        levels: 'off' | 'high';
        budget: false;
    };
    'mistralai/mistral-medium-3-5': {
        levels: 'off' | 'high';
        budget: false;
    };
    'mistralai/mistral-medium-3-5:batch': {
        levels: 'off' | 'high';
        budget: false;
    };
    'mistralai/mistral-small-2603': {
        levels: 'off' | 'high';
        budget: false;
    };
    'mistralai/mistral-small-2603:batch': {
        levels: 'off' | 'high';
        budget: false;
    };
    'moonshotai/kimi-k2-thinking': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'moonshotai/kimi-k2.5': {
        levels: 'off' | 'high';
        budget: false;
    };
    'moonshotai/kimi-k2.6': {
        levels: 'off' | 'high';
        budget: false;
    };
    'moonshotai/kimi-k2.7-code': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'moonshotai/kimi-k3': {
        levels: 'off' | 'low' | 'high' | 'max';
        budget: false;
    };
    'moonshotai/kimi-k3:batch': {
        levels: 'low' | 'high' | 'max';
        budget: false;
    };
    'nex-agi/nex-n2.5-mini': {
        levels: 'off' | 'medium' | 'high';
        budget: false;
    };
    'nex-agi/nex-n2.5-pro': {
        levels: 'off' | 'medium' | 'high';
        budget: false;
    };
    'nousresearch/hermes-4-405b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'nvidia/nemotron-3-nano-30b-a3b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free': {
        levels: 'off' | 'high';
        budget: true;
    };
    'nvidia/nemotron-3-super-120b-a12b': {
        levels: 'off' | 'low' | 'medium';
        budget: true;
    };
    'nvidia/nemotron-3-super-120b-a12b:free': {
        levels: 'off' | 'low' | 'medium';
        budget: true;
    };
    'nvidia/nemotron-3-ultra-550b-a55b': {
        levels: 'off' | 'medium' | 'high';
        budget: true;
    };
    'nvidia/nemotron-3-ultra-550b-a55b:free': {
        levels: 'off' | 'medium' | 'high';
        budget: true;
    };
    'nvidia/nemotron-3.5-content-safety': {
        levels: 'off' | 'high';
        budget: false;
    };
    'nvidia/nemotron-3.5-content-safety:free': {
        levels: 'off' | 'high';
        budget: false;
    };
    'nvidia/nemotron-3.5-lightning': {
        levels: 'off' | 'high';
        budget: false;
    };
    'nvidia/nemotron-3.5-lightning:free': {
        levels: 'off' | 'high';
        budget: false;
    };
    'openai/gpt-5': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5-image': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5-image-mini': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5-mini': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5-mini:batch': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5-nano': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5-nano:batch': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5-pro': {
        levels: 'high';
        budget: false;
    };
    'openai/gpt-5-pro:batch': {
        levels: 'high';
        budget: false;
    };
    'openai/gpt-5:batch': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5.1': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5.1-codex': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5.1-codex-max': {
        levels: 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.1-codex-mini': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5.1:batch': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5.2': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.2-codex': {
        levels: 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.2-pro': {
        levels: 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.2-pro:batch': {
        levels: 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.2:batch': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.3-codex': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.4': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.4-image-2': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.4-mini': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.4-mini:batch': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.4-nano': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.4-nano:batch': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.4-pro': {
        levels: 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.4-pro:batch': {
        levels: 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.4:batch': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.5': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.5-pro': {
        levels: 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.5-pro:batch': {
        levels: 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.5:batch': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.6-luna': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-5.6-luna-pro': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-5.6-luna-pro:batch': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-5.6-luna:batch': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-5.6-sol': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-5.6-sol-pro': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-5.6-sol-pro:batch': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-5.6-sol:batch': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-5.6-terra': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-5.6-terra-pro': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-5.6-terra-pro:batch': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-5.6-terra:batch': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-astra': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-astra-pro': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-astra-pro:batch': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-astra:batch': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-luna': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-luna-pro': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-luna-pro:batch': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-luna:batch': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-sol': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-sol-pro': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-sol-pro:batch': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-sol:batch': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6.1-sol': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6.1-sol-pro': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6.1-sol-pro:batch': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6.1-sol:batch': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-oss-120b': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-oss-120b:batch': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-oss-20b': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-oss-20b:batch': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-oss-safeguard-20b': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/o1': {
        levels: 'off' | 'high';
        budget: false;
    };
    'openai/o1-pro': {
        levels: 'off' | 'high';
        budget: false;
    };
    'openai/o3': {
        levels: 'off' | 'high';
        budget: false;
    };
    'openai/o3-mini': {
        levels: 'off' | 'high';
        budget: false;
    };
    'openai/o3-mini-high': {
        levels: 'high';
        budget: false;
    };
    'openai/o3-mini:batch': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/o3-pro': {
        levels: 'off' | 'high';
        budget: false;
    };
    'openai/o3:batch': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/o4-mini': {
        levels: 'off' | 'high';
        budget: false;
    };
    'openai/o4-mini-high': {
        levels: 'high';
        budget: false;
    };
    'openai/o4-mini:batch': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'perceptron/perceptron-mk1': {
        levels: 'off' | 'high';
        budget: false;
    };
    'perceptron/perceptron-mk1.5': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'perplexity/sonar-deep-research': {
        levels: 'off' | 'high';
        budget: false;
    };
    'perplexity/sonar-pro-search': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'perplexity/sonar-reasoning-pro': {
        levels: 'off' | 'high';
        budget: false;
    };
    'poolside/laguna-s-2.1': {
        levels: 'off' | 'high';
        budget: false;
    };
    'poolside/laguna-s-2.1:free': {
        levels: 'off' | 'high';
        budget: false;
    };
    'poolside/laguna-xs-2.1': {
        levels: 'off' | 'high';
        budget: false;
    };
    'poolside/laguna-xs-2.1:free': {
        levels: 'off' | 'high';
        budget: false;
    };
    'prism-ml/ternary-bonsai-2-27b': {
        levels: 'off' | 'medium' | 'xhigh';
        budget: false;
    };
    'qwen/qwen3-14b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3-235b-a22b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3-235b-a22b-thinking-2507': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'qwen/qwen3-30b-a3b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3-30b-a3b-thinking-2507': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'qwen/qwen3-32b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3-8b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3-max-thinking': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3-next-80b-a3b-thinking': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'qwen/qwen3-vl-235b-a22b-thinking': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'qwen/qwen3-vl-30b-a3b-thinking': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'qwen/qwen3-vl-8b-thinking': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'qwen/qwen3.5-122b-a10b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3.5-27b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3.5-35b-a3b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3.5-397b-a17b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3.5-9b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3.5-flash-02-23': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3.5-plus-02-15': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3.5-plus-20260420': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3.6-27b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3.6-35b-a3b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3.6-flash': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3.6-max-preview': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3.6-plus': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3.7-flash': {
        levels: 'off' | 'high';
        budget: true;
    };
    'qwen/qwen3.7-max': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3.7-plus': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen/qwen3.8-2.4t-a95b': {
        levels: 'low' | 'medium' | 'xhigh';
        budget: false;
    };
    'qwen/qwen3.8-27b': {
        levels: 'off' | 'low' | 'medium' | 'xhigh';
        budget: false;
    };
    'qwen/qwen3.8-27b:free': {
        levels: 'off' | 'low' | 'medium' | 'xhigh';
        budget: false;
    };
    'qwen/qwen3.8-flash': {
        levels: 'off' | 'high';
        budget: true;
    };
    'qwen/qwen3.8-max-0902': {
        levels: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'qwen/qwen3.8-max-prime': {
        levels: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'qwen/qwen3.8-omni-flash': {
        levels: 'off' | 'high';
        budget: true;
    };
    'rekaai/reka-flash-3': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'sakana/fugu-max': {
        levels: 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'sakana/fugu-ultra': {
        levels: 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'sakana/fugu-ultra-v2': {
        levels: 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'sakana/sakana-namazu': {
        levels: 'off' | 'high';
        budget: false;
    };
    'stealth/space-bunny-alpha': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'stepfun/step-3.5-flash': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'stepfun/step-3.7-flash': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'tencent/hunyuan-a13b-instruct': {
        levels: 'off' | 'high';
        budget: false;
    };
    'tencent/hy3': {
        levels: 'off' | 'low' | 'high';
        budget: false;
    };
    'tencent/hy3-preview': {
        levels: 'off' | 'low' | 'high';
        budget: false;
    };
    'tencent/hy4-preview': {
        levels: 'off' | 'low' | 'high';
        budget: false;
    };
    'thinkingmachines/inkling': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'max';
        budget: false;
    };
    'thinkingmachines/inkling-small': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'max';
        budget: false;
    };
    'thinkingmachines/inkling-small:free': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'max';
        budget: false;
    };
    'thinkingmachines/inkling:free': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'max';
        budget: false;
    };
    'upstage/solar-mini4': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'upstage/solar-pro-3': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'upstage/solar-pro4': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'x-ai/grok-4.20': {
        levels: 'off' | 'high';
        budget: false;
    };
    'x-ai/grok-4.20-multi-agent': {
        levels: 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'x-ai/grok-4.3': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'x-ai/grok-4.3:batch': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'x-ai/grok-4.5': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'x-ai/grok-4.6': {
        levels: 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'x-ai/grok-4.7': {
        levels: 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'x-ai/grok-build-0.1': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'xiaomi/mimo-v2.5': {
        levels: 'off' | 'high';
        budget: false;
    };
    'xiaomi/mimo-v2.5-pro': {
        levels: 'off' | 'high';
        budget: false;
    };
    'xiaomi/mimo-v2.6-flash': {
        levels: 'off' | 'high';
        budget: false;
    };
    'xiaomi/mimo-v2.6-pro': {
        levels: 'off' | 'high';
        budget: false;
    };
    'xiaomi/mimo-v2.6-pro-ultraspeed': {
        levels: 'off' | 'high';
        budget: false;
    };
    'z-ai/glm-4.5': {
        levels: 'off' | 'high';
        budget: false;
    };
    'z-ai/glm-4.5-air': {
        levels: 'off' | 'high';
        budget: false;
    };
    'z-ai/glm-4.5v': {
        levels: 'off' | 'high';
        budget: false;
    };
    'z-ai/glm-4.6': {
        levels: 'off' | 'high';
        budget: false;
    };
    'z-ai/glm-4.6v': {
        levels: 'off' | 'high';
        budget: false;
    };
    'z-ai/glm-4.7': {
        levels: 'off' | 'high';
        budget: false;
    };
    'z-ai/glm-4.7-flash': {
        levels: 'off' | 'high';
        budget: false;
    };
    'z-ai/glm-5': {
        levels: 'off' | 'high';
        budget: false;
    };
    'z-ai/glm-5-turbo': {
        levels: 'off' | 'high';
        budget: false;
    };
    'z-ai/glm-5.1': {
        levels: 'off' | 'high';
        budget: false;
    };
    'z-ai/glm-5.2': {
        levels: 'off' | 'high' | 'xhigh';
        budget: false;
    };
    'z-ai/glm-5.3': {
        levels: 'low' | 'high' | 'max';
        budget: false;
    };
    'z-ai/glm-5.3-flash': {
        levels: 'low' | 'high' | 'max';
        budget: false;
    };
    'z-ai/glm-5.3-flash:batch': {
        levels: 'low' | 'high' | 'max';
        budget: false;
    };
    'z-ai/glm-5.3-flashx': {
        levels: 'low' | 'high' | 'max';
        budget: false;
    };
    'z-ai/glm-5.3-prime': {
        levels: 'low' | 'high' | 'max';
        budget: false;
    };
    'z-ai/glm-5.3:batch': {
        levels: 'low' | 'high' | 'max';
        budget: false;
    };
    'z-ai/glm-5v-turbo': {
        levels: 'off' | 'high';
        budget: false;
    };
    'openrouter/auto': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
};
/** The same data at runtime. `false`: the model does not reason. */
export declare const OPENROUTER_MODEL_REASONING: Readonly<Record<string, ModelReasoning>>;
