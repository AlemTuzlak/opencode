import { ModelReasoning } from '@tanstack/ai';
/**
 * Each model's reasoning levels, and whether it takes a token budget, for
 * `chat({ reasoning })`. A model that is not here does not reason.
 */
export type VercelGatewayModelReasoningByName = {
    'alibaba/qwen-3-14b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'alibaba/qwen-3-235b': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'alibaba/qwen-3-30b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'alibaba/qwen-3-32b': {
        levels: 'off' | 'high';
        budget: true;
    };
    'alibaba/qwen-3.6-max-preview': {
        levels: 'off' | 'high';
        budget: true;
    };
    'alibaba/qwen3-235b-a22b-thinking': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'alibaba/qwen3-coder': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'alibaba/qwen3-coder-30b-a3b': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'alibaba/qwen3-coder-next': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'alibaba/qwen3-max-thinking': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'alibaba/qwen3-next-80b-a3b-thinking': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'alibaba/qwen3-vl-thinking': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'alibaba/qwen3.5-flash': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: true;
    };
    'alibaba/qwen3.5-plus': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: true;
    };
    'alibaba/qwen3.6-27b': {
        levels: 'off' | 'high';
        budget: true;
    };
    'alibaba/qwen3.6-plus': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: true;
    };
    'alibaba/qwen3.7-flash': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: true;
    };
    'alibaba/qwen3.7-max': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: true;
    };
    'alibaba/qwen3.7-plus': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: true;
    };
    'alibaba/qwen3.8-2.4t-a95b': {
        levels: 'low' | 'medium' | 'xhigh';
        budget: false;
    };
    'alibaba/qwen3.8-27b': {
        levels: 'off' | 'low' | 'medium' | 'xhigh';
        budget: false;
    };
    'alibaba/qwen3.8-flash': {
        levels: 'off' | 'low' | 'medium' | 'xhigh';
        budget: true;
    };
    'alibaba/qwen3.8-max': {
        levels: 'off' | 'low' | 'medium' | 'xhigh';
        budget: true;
    };
    'alibaba/qwen3.8-max-0902': {
        levels: 'off' | 'low' | 'medium' | 'xhigh';
        budget: true;
    };
    'alibaba/qwen3.8-max-prime': {
        levels: 'off' | 'low' | 'medium' | 'xhigh';
        budget: true;
    };
    'alibaba/qwen3.8-omni-flash': {
        levels: 'off' | 'low' | 'medium' | 'xhigh';
        budget: false;
    };
    'amazon/nova-2-lite': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'anthropic/claude-fable-5': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: true;
    };
    'anthropic/claude-fable-5.1': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: true;
    };
    'anthropic/claude-haiku-4.5': {
        levels: 'off' | 'high';
        budget: true;
    };
    'anthropic/claude-opus-4': {
        levels: 'off' | 'high';
        budget: true;
    };
    'anthropic/claude-opus-4.5': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'anthropic/claude-opus-4.6': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'max';
        budget: true;
    };
    'anthropic/claude-opus-4.7': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: true;
    };
    'anthropic/claude-opus-4.8': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: true;
    };
    'anthropic/claude-opus-4.8-fast': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: true;
    };
    'anthropic/claude-opus-5': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: true;
    };
    'anthropic/claude-opus-5-fast': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: true;
    };
    'anthropic/claude-opus-5.5': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'anthropic/claude-opus-5.5-fast': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'anthropic/claude-sonnet-4': {
        levels: 'off' | 'high';
        budget: true;
    };
    'anthropic/claude-sonnet-4.5': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'anthropic/claude-sonnet-4.6': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'max';
        budget: true;
    };
    'anthropic/claude-sonnet-5': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: true;
    };
    'anthropic/claude-sonnet-5.5': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'arcee-ai/trinity-large-thinking': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'bytedance/seed-1.6': {
        levels: 'off' | 'high';
        budget: false;
    };
    'bytedance/seed-1.8': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'bytedance/seed-2.1-turbo': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'deepseek/deepseek-r1': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'deepseek/deepseek-v3.1': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'deepseek/deepseek-v3.1-terminus': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'deepseek/deepseek-v3.2-thinking': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'deepseek/deepseek-v4-flash': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'deepseek/deepseek-v4-flash-0731': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'deepseek/deepseek-v4-flash-vision-exp': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'deepseek/deepseek-v4-pro': {
        levels: 'off' | 'high' | 'max';
        budget: false;
    };
    'deepseek/deepseek-v4-pro-0813': {
        levels: 'off' | 'high' | 'max';
        budget: false;
    };
    'deepseek/deepseek-v4.1-flash': {
        levels: 'off' | 'high' | 'max';
        budget: false;
    };
    'fireworks/ember-1': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'google/gemini-2.5-flash': {
        levels: 'off' | 'high';
        budget: true;
    };
    'google/gemini-2.5-flash-lite': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'google/gemini-2.5-pro': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'google/gemini-3-flash': {
        levels: 'low' | 'high';
        budget: false;
    };
    'google/gemini-3.1-flash-image': {
        levels: 'low' | 'high';
        budget: false;
    };
    'google/gemini-3.1-flash-image-preview': {
        levels: 'low' | 'high';
        budget: false;
    };
    'google/gemini-3.1-flash-lite': {
        levels: 'low' | 'high';
        budget: false;
    };
    'google/gemini-3.1-flash-lite-image': {
        levels: 'low' | 'high';
        budget: false;
    };
    'google/gemini-3.1-pro-preview': {
        levels: 'low' | 'high';
        budget: false;
    };
    'google/gemini-3.5-flash': {
        levels: 'low' | 'high';
        budget: false;
    };
    'google/gemini-3.5-flash-lite': {
        levels: 'low' | 'high';
        budget: false;
    };
    'google/gemini-3.6-flash': {
        levels: 'low' | 'high';
        budget: false;
    };
    'google/gemini-3.7-flash': {
        levels: 'low' | 'high';
        budget: false;
    };
    'google/gemini-3.8-flash': {
        levels: 'low' | 'high';
        budget: false;
    };
    'google/gemini-omni-flash-preview': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemma-4-26b-a4b-it': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google/gemma-4-31b-it': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'inception/mercury-2': {
        levels: 'low' | 'medium' | 'high';
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
    'inclusionai/ling-3.0-flash-sante': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'inclusionai/ling-3.0-flash-sante-free': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'inclusionai/ling-3.0-flash-vl': {
        levels: 'off' | 'high';
        budget: false;
    };
    'inclusionai/ling-3.1-flash': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'inclusionai/ling-3.1-flash-free': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'interfaze/interfaze-beta': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'meituan/longcat-2.5-preview': {
        levels: 'off' | 'high';
        budget: false;
    };
    'meta/muse-glimmer-30b': {
        levels: 'off' | 'low' | 'medium' | 'high';
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
        levels: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'meta/muse-spark-1.3-contributor': {
        levels: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'minimax/minimax-m2': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'minimax/minimax-m2.1': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'minimax/minimax-m2.1-lightning': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'minimax/minimax-m2.5': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'minimax/minimax-m2.5-highspeed': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'minimax/minimax-m2.7': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'minimax/minimax-m2.7-highspeed': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'minimax/minimax-m3': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'mistral/mistral-medium-3.5': {
        levels: 'off' | 'high';
        budget: false;
    };
    'moonshotai/kimi-k2-thinking': {
        levels: 'off' | 'low' | 'medium' | 'high';
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
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'moonshotai/kimi-k2.7-code-highspeed': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'moonshotai/kimi-k3': {
        levels: 'off' | 'low' | 'high' | 'max';
        budget: false;
    };
    'moonshotai/kimi-k3-fast': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'max';
        budget: false;
    };
    'nvidia/nemotron-3-nano-30b-a3b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'nvidia/nemotron-3-super-120b-a12b': {
        levels: 'off' | 'low' | 'high';
        budget: false;
    };
    'nvidia/nemotron-3-ultra-550b-a55b': {
        levels: 'off' | 'medium' | 'high';
        budget: false;
    };
    'nvidia/nemotron-3.5-lightning': {
        levels: 'off' | 'high';
        budget: true;
    };
    'nvidia/nemotron-nano-12b-v2-vl': {
        levels: 'off' | 'high';
        budget: false;
    };
    'nvidia/nemotron-nano-9b-v2': {
        levels: 'off' | 'high';
        budget: false;
    };
    'openai/gpt-5': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5-codex': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5-fast': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5-mini': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5-mini-fast': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5-nano': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5-pro': {
        levels: 'high';
        budget: false;
    };
    'openai/gpt-5.1-codex': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5.1-codex-max': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5.1-codex-mini': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5.1-thinking': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.1-thinking-fast': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.2': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.2-codex': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-5.2-fast': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.2-pro': {
        levels: 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.3-codex': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.3-codex-fast': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.4': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.4-fast': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.4-mini': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.4-mini-fast': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.4-nano': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.4-pro': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.5': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.5-fast': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.5-pro': {
        levels: 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/gpt-5.6-luna': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-5.6-luna-fast': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-5.6-sol': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-5.6-sol-fast': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-5.6-terra': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-5.6-terra-fast': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-astra': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-astra-fast': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-luna': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-luna-fast': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-sol': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6-sol-fast': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6.1-sol': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-6.1-sol-fast': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'openai/gpt-oss-120b': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-oss-20b': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-oss-safeguard-120b': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-oss-safeguard-20b': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-realtime-2.1': {
        levels: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'openai/o1': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/o3': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/o3-fast': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/o3-mini': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/o3-pro': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/o4-mini': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/o4-mini-fast': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'poolside/laguna-s-2.1': {
        levels: 'off' | 'high';
        budget: false;
    };
    'poolside/laguna-s-2.1-free': {
        levels: 'off' | 'high';
        budget: false;
    };
    'quiverai/arrow-2': {
        levels: 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'quiverai/arrow-2-telos': {
        levels: 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'sakana/fugu-max': {
        levels: 'high' | 'xhigh';
        budget: false;
    };
    'sakana/fugu-ultra': {
        levels: 'high' | 'xhigh';
        budget: false;
    };
    'sakana/fugu-ultra-v2': {
        levels: 'high' | 'xhigh';
        budget: false;
    };
    'sakana/namazu': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'spacexai/grok-4.1-fast-reasoning': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'spacexai/grok-4.20-multi-agent': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'spacexai/grok-4.20-multi-agent-beta': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'spacexai/grok-4.20-reasoning': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'spacexai/grok-4.20-reasoning-beta': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'spacexai/grok-4.3': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'spacexai/grok-4.5': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'spacexai/grok-4.6': {
        levels: 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'spacexai/grok-4.7': {
        levels: 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'spacexai/grok-build-0.1': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'stealth/pixel-canary': {
        levels: 'off' | 'low' | 'medium' | 'xhigh';
        budget: false;
    };
    'stepfun/step-3.5-flash': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'stepfun/step-3.7-flash': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'tencent/hy3': {
        levels: 'off' | 'low' | 'high';
        budget: false;
    };
    'tencent/hy4-preview': {
        levels: 'off' | 'high';
        budget: false;
    };
    'thinkingmachines/inkling': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'thinkingmachines/inkling-small': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
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
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'xiaomi/mimo-v2.6-pro': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'xiaomi/mimo-v2.6-pro-ultraspeed': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'zai/glm-4.5': {
        levels: 'off' | 'high';
        budget: false;
    };
    'zai/glm-4.5-air': {
        levels: 'off' | 'high';
        budget: false;
    };
    'zai/glm-4.5v': {
        levels: 'off' | 'high';
        budget: false;
    };
    'zai/glm-4.6': {
        levels: 'off' | 'high';
        budget: false;
    };
    'zai/glm-4.7': {
        levels: 'off' | 'high';
        budget: false;
    };
    'zai/glm-4.7-flash': {
        levels: 'off' | 'high';
        budget: false;
    };
    'zai/glm-4.7-flashx': {
        levels: 'off' | 'high';
        budget: false;
    };
    'zai/glm-5': {
        levels: 'off' | 'high';
        budget: false;
    };
    'zai/glm-5-turbo': {
        levels: 'off' | 'high';
        budget: false;
    };
    'zai/glm-5.1': {
        levels: 'off' | 'high';
        budget: false;
    };
    'zai/glm-5.2': {
        levels: 'off' | 'high' | 'max';
        budget: false;
    };
    'zai/glm-5.2-fast': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'zai/glm-5.3': {
        levels: 'low' | 'high' | 'max';
        budget: false;
    };
    'zai/glm-5.3-fast': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'zai/glm-5.3-flash': {
        levels: 'low' | 'high' | 'max';
        budget: false;
    };
    'zai/glm-5.3-flashx': {
        levels: 'low' | 'high' | 'max';
        budget: false;
    };
    'zai/glm-5v-turbo': {
        levels: 'off' | 'high';
        budget: false;
    };
};
/** The same data at runtime. `false`: the model does not reason. */
export declare const VERCEL_GATEWAY_MODEL_REASONING: Readonly<Record<string, ModelReasoning>>;
