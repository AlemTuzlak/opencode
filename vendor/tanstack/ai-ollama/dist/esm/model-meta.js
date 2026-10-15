import { ATHENE_MODELS } from "./meta/model-meta-athene.js";
import { AYA_MODELS } from "./meta/model-meta-aya.js";
import { CODEGEMMA_MODELS } from "./meta/model-meta-codegemma.js";
import { CODELLAMA_MODELS } from "./meta/model-meta-codellama.js";
import { COMMAND_R_MODELS } from "./meta/model-meta-command-r.js";
import { COMMAND_R_PLUS_MODELS } from "./meta/model-meta-command-r-plus.js";
import { COMMAND_R_7b_MODELS } from "./meta/model-meta-command-r7b.js";
import { DEEPSEEK_CODER_V2_MODELS } from "./meta/model-meta-deepseek-coder-v2.js";
import { DEEPSEEK_OCR_MODELS } from "./meta/model-meta-deepseek-ocr.js";
import { DEEPSEEK_R1_MODELS } from "./meta/model-meta-deepseek-r1.js";
import { DEEPSEEK_V3_1_MODELS } from "./meta/model-meta-deepseek-v3.1.js";
import { DEVSTRAL_MODELS } from "./meta/model-meta-devstral.js";
import { DOLPHIN3_MODELS } from "./meta/model-meta-dolphin3.js";
import { EXAONE3_5MODELS } from "./meta/model-meta-exaone3.5.js";
import { FALCON2_MODELS } from "./meta/model-meta-falcon2.js";
import { FALCON3_MODELS } from "./meta/model-meta-falcon3.js";
import { FIREFUNCTION_V2_MODELS } from "./meta/model-meta-firefunction-v2.js";
import { GEMMA_MODELS } from "./meta/model-meta-gemma.js";
import { GEMMA2_MODELS } from "./meta/model-meta-gemma2.js";
import { GEMMA3_MODELS } from "./meta/model-meta-gemma3.js";
import { GPT_OSS_MODELS } from "./meta/model-meta-gpt-oss.js";
import { GRANITE3_DENSE_MODELS } from "./meta/model-meta-granite3-dense.js";
import { GRANITE3_GUARDIAN_MODELS } from "./meta/model-meta-granite3-guardian.js";
import { GRANITE3_MOE_MODELS } from "./meta/model-meta-granite3-moe.js";
import { GRANITE3_1_DENSE_MODELS } from "./meta/model-meta-granite3.1-dense.js";
import { GRANITE3_1_MOE_MODELS } from "./meta/model-meta-granite3.1-moe.js";
import { LLAMA_GUARD3_MODELS } from "./meta/model-meta-llama-guard3.js";
import { LLAMA2_MODELS } from "./meta/model-meta-llama2.js";
import { LLAMA3_MODELS } from "./meta/model-meta-llama3.js";
import { LLAMA3_CHATQA_MODELS } from "./meta/model-meta-llama3-chatqa.js";
import { LLAMA3_GRADIENT_MODELS } from "./meta/model-meta-llama3-gradient.js";
import { LLAMA3_1_MODELS } from "./meta/model-meta-llama3.1.js";
import { LLAMA3_2_MODELS } from "./meta/model-meta-llama3.2.js";
import { LLAMA3_2_VISION_MODELS } from "./meta/model-meta-llama3.2-vision.js";
import { LLAMA3_3_MODELS } from "./meta/model-meta-llama3.3.js";
import { LLAMA4_MODELS } from "./meta/model-meta-llama4.js";
import { LLAVA_MODELS } from "./meta/model-meta-llava.js";
import { LLAVA_LLAMA3_MODELS } from "./meta/model-meta-llava-llama3.js";
import { LLAVA_PHI3_MODELS } from "./meta/model-meta-llava-phi3.js";
import { MARCO_O1_MODELS } from "./meta/model-meta-marco-o1.js";
import { MISTRAL_MODELS } from "./meta/model-meta-mistral.js";
import { MISTRAL_LARGE_MODELS } from "./meta/model-meta-mistral-large.js";
import { MISTRAL_NEMO_MODELS } from "./meta/model-meta-mistral-nemo.js";
import { MISTRAL_SMALL_MODELS } from "./meta/model-meta-mistral-small.js";
import { MIXTRAL_MODELS } from "./meta/model-meta-mixtral.js";
import { MOONDREAM_MODELS } from "./meta/model-meta-moondream.js";
import { NEMOTRON_MODELS } from "./meta/model-meta-nemotron.js";
import { NEMOTRON_MINI_MODELS } from "./meta/model-meta-nemotron-mini.js";
import { OLMO2_MODELS } from "./meta/model-meta-olmo2.js";
import { OPENCODER_MODELS } from "./meta/model-meta-opencoder.js";
import { OPENHERMES_MODELS } from "./meta/model-meta-openhermes.js";
import { PHI3_MODELS } from "./meta/model-meta-phi3.js";
import { PHI4_MODELS } from "./meta/model-meta-phi4.js";
import { QWEN_MODELS } from "./meta/model-meta-qwen.js";
import { QWEN2_MODELS } from "./meta/model-meta-qwen2.js";
import { QWEN2_5_MODELS } from "./meta/model-meta-qwen2.5.js";
import { QWEN2_5_CODER_MODELS } from "./meta/model-meta-qwen2.5-coder.js";
import { QWEN3_MODELS } from "./meta/model-meta-qwen3.js";
import { QWQ_MODELS } from "./meta/model-meta-qwq.js";
import { SAILOR2_MODELS } from "./meta/model-meta-sailor2.js";
import { SHIELDGEMMA_MODELS } from "./meta/model-meta-shieldgemma.js";
import { SMALLTINKER_MODELS } from "./meta/model-meta-smalltinker.js";
import { SMOLLM_MODELS } from "./meta/model-meta-smollm.js";
import { TINYLLAMA_MODELS } from "./meta/model-meta-tinyllama.js";
import { TULU3_MODELS } from "./meta/model-meta-tulu3.js";
//#region src/model-meta.ts
var OLLAMA_TEXT_MODELS = [
	...ATHENE_MODELS,
	...AYA_MODELS,
	...CODEGEMMA_MODELS,
	...CODELLAMA_MODELS,
	...COMMAND_R_PLUS_MODELS,
	...COMMAND_R_MODELS,
	...COMMAND_R_7b_MODELS,
	...DEEPSEEK_CODER_V2_MODELS,
	...DEEPSEEK_OCR_MODELS,
	...DEEPSEEK_R1_MODELS,
	...DEEPSEEK_V3_1_MODELS,
	...DEVSTRAL_MODELS,
	...DOLPHIN3_MODELS,
	...EXAONE3_5MODELS,
	...FALCON2_MODELS,
	...FALCON3_MODELS,
	...FIREFUNCTION_V2_MODELS,
	...GEMMA_MODELS,
	...GEMMA2_MODELS,
	...GEMMA3_MODELS,
	...GPT_OSS_MODELS,
	...GRANITE3_DENSE_MODELS,
	...GRANITE3_GUARDIAN_MODELS,
	...GRANITE3_MOE_MODELS,
	...GRANITE3_1_DENSE_MODELS,
	...GRANITE3_1_MOE_MODELS,
	...LLAMA_GUARD3_MODELS,
	...LLAMA2_MODELS,
	...LLAMA3_CHATQA_MODELS,
	...LLAMA3_GRADIENT_MODELS,
	...LLAMA3_1_MODELS,
	...LLAMA3_2_MODELS,
	...LLAMA3_2_VISION_MODELS,
	...LLAMA3_3_MODELS,
	...LLAMA3_MODELS,
	...LLAMA4_MODELS,
	...LLAVA_LLAMA3_MODELS,
	...LLAVA_PHI3_MODELS,
	...LLAVA_MODELS,
	...MARCO_O1_MODELS,
	...MISTRAL_LARGE_MODELS,
	...MISTRAL_NEMO_MODELS,
	...MISTRAL_SMALL_MODELS,
	...MISTRAL_MODELS,
	...MIXTRAL_MODELS,
	...MOONDREAM_MODELS,
	...NEMOTRON_MINI_MODELS,
	...NEMOTRON_MODELS,
	...OLMO2_MODELS,
	...OPENCODER_MODELS,
	...OPENHERMES_MODELS,
	...PHI3_MODELS,
	...PHI4_MODELS,
	...QWEN_MODELS,
	...QWEN2_5_CODER_MODELS,
	...QWEN2_5_MODELS,
	...QWEN2_MODELS,
	...QWEN3_MODELS,
	...QWQ_MODELS,
	...SAILOR2_MODELS,
	...SHIELDGEMMA_MODELS,
	...SMALLTINKER_MODELS,
	...SMOLLM_MODELS,
	...TINYLLAMA_MODELS,
	...TULU3_MODELS
];
/**
* Common Ollama embedding models.
*
* Note: Ollama models are loaded dynamically, so this is a known subset —
* `OllamaEmbeddingModel` also accepts any string via the `(string & {})`
* escape hatch.
*/
var OLLAMA_EMBEDDING_MODELS = [
	"nomic-embed-text",
	"mxbai-embed-large",
	"all-minilm",
	"snowflake-arctic-embed",
	"bge-m3",
	"embeddinggemma"
];
//#endregion
export { OLLAMA_EMBEDDING_MODELS, OLLAMA_TEXT_MODELS };

//# sourceMappingURL=model-meta.js.map