export interface DictionaryTerm {
  id: string;
  term: string;
  abbreviation?: string;
  definition: string;
  explanation: string;
  relatedTerms?: string[];
  examples?: string[];
}

export interface DictionaryCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  terms: DictionaryTerm[];
}

export const dictionaryCategories: DictionaryCategory[] = [
  {
    id: "foundations",
    title: "AI Foundations",
    description: "Core concepts and terminology that form the basis of AI understanding",
    icon: "Brain",
    terms: [
      {
        id: "ai",
        term: "Artificial Intelligence",
        abbreviation: "AI",
        definition: "Computer systems designed to perform tasks that typically require human intelligence.",
        explanation: "AI encompasses a broad range of technologies that enable machines to sense, comprehend, act, and learn. Modern AI systems can process natural language, recognize images, make decisions, and generate content. The field includes narrow AI (designed for specific tasks) and the theoretical concept of general AI (human-level reasoning across all domains).",
        relatedTerms: ["Machine Learning", "Deep Learning", "Neural Network"],
        examples: ["ChatGPT for conversation", "Tesla Autopilot for driving", "Spotify recommendations"],
      },
      {
        id: "ml",
        term: "Machine Learning",
        abbreviation: "ML",
        definition: "A subset of AI where systems learn patterns from data rather than being explicitly programmed.",
        explanation: "Instead of writing rules for every scenario, ML systems are trained on examples. They identify patterns, make predictions, and improve over time. The three main types are supervised learning (labeled examples), unsupervised learning (finding patterns without labels), and reinforcement learning (learning through trial and reward).",
        relatedTerms: ["Training Data", "Model", "Neural Network", "Deep Learning"],
        examples: ["Spam filters learning from marked emails", "Netflix learning your preferences", "Fraud detection from transaction patterns"],
      },
      {
        id: "deep-learning",
        term: "Deep Learning",
        abbreviation: "DL",
        definition: "A subset of machine learning using neural networks with many layers to learn complex patterns.",
        explanation: "Deep learning uses artificial neural networks with multiple hidden layers (hence 'deep'). Each layer learns increasingly abstract features—early layers might detect edges in an image, while deeper layers recognize faces. This architecture enables learning from raw data without manual feature engineering.",
        relatedTerms: ["Neural Network", "Machine Learning", "Transformer"],
        examples: ["Image recognition in photos", "Voice assistants understanding speech", "Language translation"],
      },
      {
        id: "neural-network",
        term: "Neural Network",
        abbreviation: "NN",
        definition: "A computing system inspired by biological neurons, consisting of interconnected nodes that process information.",
        explanation: "Neural networks consist of layers of 'neurons' that receive inputs, apply weights, and pass outputs forward. Through training, these weights are adjusted to minimize errors. The network architecture—how neurons are connected—determines what patterns can be learned. Common architectures include feedforward, convolutional (CNNs), and recurrent (RNNs) networks.",
        relatedTerms: ["Deep Learning", "Weights", "Activation Function", "Transformer"],
        examples: ["Image classifiers", "Speech recognition systems", "Game-playing AI"],
      },
      {
        id: "training",
        term: "Training",
        definition: "The process of teaching an AI model by exposing it to data and adjusting its parameters.",
        explanation: "During training, a model processes examples and compares its predictions to correct answers. The difference (loss) is used to adjust internal parameters through backpropagation. Training requires significant compute resources and careful data curation. A well-trained model generalizes to new examples it hasn't seen.",
        relatedTerms: ["Fine-tuning", "Weights", "Loss Function", "Epochs"],
        examples: ["Training GPT on internet text", "Teaching an image model with labeled photos", "Training a recommendation system on user behavior"],
      },
      {
        id: "inference",
        term: "Inference",
        definition: "Using a trained model to make predictions on new data.",
        explanation: "After training, a model is deployed for inference—processing new inputs and generating outputs. Inference is typically faster and requires less compute than training. The goal is for the model to generalize: applying learned patterns to data it wasn't explicitly trained on.",
        relatedTerms: ["Training", "Model", "Latency"],
        examples: ["ChatGPT generating a response", "A spam filter classifying an email", "An image model identifying objects in a photo"],
      },
    ],
  },
  {
    id: "llms",
    title: "Large Language Models",
    description: "Understanding the AI systems that power modern text generation and reasoning",
    icon: "MessageSquare",
    terms: [
      {
        id: "llm",
        term: "Large Language Model",
        abbreviation: "LLM",
        definition: "AI models trained on massive text datasets to understand and generate human-like language.",
        explanation: "LLMs are neural networks (typically transformers) trained on billions of words from books, websites, and documents. They learn statistical patterns of language—which words follow others, how sentences are structured, and even reasoning patterns. Modern LLMs can write, summarize, translate, code, and answer questions.",
        relatedTerms: ["Transformer", "GPT", "Token", "Context Window"],
        examples: ["GPT-4", "Claude", "Llama", "Gemini", "Mistral"],
      },
      {
        id: "transformer",
        term: "Transformer",
        definition: "A neural network architecture that processes sequences using attention mechanisms.",
        explanation: "Introduced in the 2017 paper 'Attention Is All You Need,' transformers revolutionized NLP. Unlike earlier architectures that processed text sequentially, transformers use attention to consider all words simultaneously, understanding relationships regardless of distance. This parallelization also enables efficient training on massive datasets.",
        relatedTerms: ["Attention", "LLM", "GPT", "BERT"],
        examples: ["GPT models", "BERT", "T5", "All modern LLMs"],
      },
      {
        id: "attention",
        term: "Attention Mechanism",
        definition: "A technique allowing models to focus on relevant parts of input when generating output.",
        explanation: "Attention lets a model weigh the importance of different input elements. When translating 'the cat sat on the mat,' attention helps the model focus on 'cat' when generating the subject in another language. Self-attention (used in transformers) allows every position to attend to every other position, capturing long-range dependencies.",
        relatedTerms: ["Transformer", "Self-Attention", "Multi-Head Attention"],
        examples: ["Focusing on relevant context when answering questions", "Connecting pronouns to their referents", "Identifying which code depends on which"],
      },
      {
        id: "token",
        term: "Token",
        definition: "The basic unit of text that an LLM processes, typically a word or word fragment.",
        explanation: "LLMs don't read characters or words directly—they process tokens. Tokenization breaks text into pieces the model understands. Common words might be single tokens, while rare words are split into subwords. 'Understanding' might become 'under' + 'stand' + 'ing'. Token count affects cost, speed, and context limits.",
        relatedTerms: ["Tokenizer", "Context Window", "BPE"],
        examples: ["'Hello' = 1 token", "'Anthropic' = 3 tokens (An-throp-ic)", "Average: ~0.75 words per token"],
      },
      {
        id: "context-window",
        term: "Context Window",
        definition: "The maximum number of tokens an LLM can process in a single interaction.",
        explanation: "Context window determines how much text a model can 'see' at once. Early GPT-3 had 4K tokens (~3,000 words). Modern models reach 128K-1M+ tokens. Larger contexts enable processing entire documents but increase compute costs. When context is exceeded, older content is 'forgotten' or must be summarized.",
        relatedTerms: ["Token", "Memory", "RAG"],
        examples: ["GPT-4 Turbo: 128K tokens", "Claude: 200K tokens", "Gemini 1.5: 1M tokens"],
      },
      {
        id: "temperature",
        term: "Temperature",
        definition: "A parameter controlling randomness in model outputs—lower is more deterministic, higher is more creative.",
        explanation: "Temperature scales the probability distribution over next tokens. At temperature 0, the model always picks the most likely token (deterministic). At temperature 1, it samples according to learned probabilities. Higher temperatures (1.5+) make rare tokens more likely, producing creative but potentially incoherent output.",
        relatedTerms: ["Top-p", "Sampling", "Inference"],
        examples: ["Temperature 0: Factual answers, code", "Temperature 0.7: Balanced creativity", "Temperature 1.2: Creative writing, brainstorming"],
      },
      {
        id: "hallucination",
        term: "Hallucination",
        definition: "When an AI generates plausible-sounding but factually incorrect or fabricated information.",
        explanation: "LLMs predict statistically likely text, not verified truth. They can confidently state false facts, invent citations, or fabricate details. Hallucinations are more likely for obscure topics, specific numbers, or when the model is uncertain. Mitigation strategies include RAG, fact-checking, and asking models to express uncertainty.",
        relatedTerms: ["Grounding", "RAG", "Factuality"],
        examples: ["Inventing academic papers that don't exist", "Giving wrong dates for historical events", "Creating plausible but fake statistics"],
      },
      {
        id: "fine-tuning",
        term: "Fine-tuning",
        definition: "Additional training on a pre-trained model to specialize it for specific tasks or domains.",
        explanation: "Fine-tuning starts with a general model and trains further on domain-specific data. This is more efficient than training from scratch—the base model already understands language, and fine-tuning teaches specialized knowledge or behavior. Methods include full fine-tuning, LoRA (low-rank adaptation), and instruction tuning.",
        relatedTerms: ["Pre-training", "LoRA", "Transfer Learning", "RLHF"],
        examples: ["Fine-tuning GPT on legal documents", "Adapting a model to write in a specific style", "Teaching a model company-specific knowledge"],
      },
    ],
  },
  {
    id: "prompting",
    title: "Prompting & Interaction",
    description: "Techniques for effectively communicating with and directing AI systems",
    icon: "Pencil",
    terms: [
      {
        id: "prompt",
        term: "Prompt",
        definition: "The input text given to an AI model to elicit a desired response.",
        explanation: "A prompt is your instruction to the AI. It can be a question, a task description, examples to follow, or context to consider. Prompt quality directly affects output quality. Effective prompts are clear, specific, and provide necessary context. The art of writing good prompts is called prompt engineering.",
        relatedTerms: ["Prompt Engineering", "System Prompt", "Few-shot"],
        examples: ["'Summarize this article'", "'Write a Python function that...'", "'You are a helpful assistant. Answer the following...'"],
      },
      {
        id: "prompt-engineering",
        term: "Prompt Engineering",
        definition: "The practice of crafting effective prompts to achieve desired AI outputs.",
        explanation: "Prompt engineering combines understanding of model capabilities with clear communication. Techniques include providing context, using examples, specifying format, breaking down complex tasks, and iterating based on results. It's both an art and emerging science, with significant impact on AI application quality.",
        relatedTerms: ["Few-shot", "Chain-of-Thought", "System Prompt"],
        examples: ["Adding 'Let's think step by step' for reasoning", "Providing output format templates", "Using role prompts like 'You are an expert...'"],
      },
      {
        id: "system-prompt",
        term: "System Prompt",
        definition: "Hidden instructions that define an AI assistant's behavior, personality, and constraints.",
        explanation: "System prompts are set by developers, not users. They establish the AI's role, tone, capabilities, and limitations. A customer service bot might have a system prompt requiring politeness and product knowledge. System prompts persist across the conversation, providing consistent behavior guidelines.",
        relatedTerms: ["Prompt", "User Prompt", "Guardrails"],
        examples: ["'You are a helpful coding assistant. Never execute harmful code.'", "'Respond only in JSON format.'", "'You are Claude, made by Anthropic...'"],
      },
      {
        id: "few-shot",
        term: "Few-shot Learning",
        definition: "Providing a few examples in the prompt to guide the model's response format or behavior.",
        explanation: "Instead of just describing what you want, show 2-3 examples. The model learns the pattern and applies it to new inputs. This works because LLMs are excellent pattern matchers. Few-shot is more reliable than zero-shot (no examples) for complex formats or specific styles.",
        relatedTerms: ["Zero-shot", "One-shot", "In-context Learning"],
        examples: [
          "Q: What's 2+2? A: 4 | Q: What's 3+3?",
          "Input: happy → Output: sad | Input: hot →",
          "Review: Great product! → Sentiment: Positive",
        ],
      },
      {
        id: "chain-of-thought",
        term: "Chain-of-Thought",
        abbreviation: "CoT",
        definition: "A prompting technique that asks models to show reasoning steps before giving final answers.",
        explanation: "Adding 'Let's think step by step' or asking for reasoning dramatically improves performance on math, logic, and complex tasks. The model 'thinks aloud,' catching errors and building to conclusions. Variations include tree-of-thought (exploring multiple paths) and self-consistency (multiple reasoning chains).",
        relatedTerms: ["Reasoning", "Step-by-step", "Self-Consistency"],
        examples: ["'Solve this math problem. Show your work.'", "'Let's approach this step by step...'", "'First, identify the key factors. Then, analyze each one...'"],
      },
      {
        id: "structured-output",
        term: "Structured Output",
        definition: "Generating AI responses in specific formats like JSON, XML, or predefined schemas.",
        explanation: "For automation, you need predictable formats. Structured output constrains the model to output valid JSON, follow schemas, or use specific templates. Techniques include format instructions in prompts, JSON mode in APIs, and function calling. This bridges AI generation with programmatic processing.",
        relatedTerms: ["JSON Mode", "Schema", "Function Calling"],
        examples: ["Extracting data as JSON objects", "Filling predefined templates", "Generating valid code syntax"],
      },
    ],
  },
  {
    id: "rag-memory",
    title: "RAG & Memory",
    description: "Systems for giving AI access to external knowledge and long-term memory",
    icon: "Database",
    terms: [
      {
        id: "rag",
        term: "Retrieval-Augmented Generation",
        abbreviation: "RAG",
        definition: "A technique that retrieves relevant documents to augment the model's context before generation.",
        explanation: "RAG solves the knowledge cutoff and hallucination problems. When you ask a question, the system first searches a knowledge base for relevant documents, then includes them in the prompt. The model generates answers grounded in retrieved facts. This enables up-to-date, domain-specific, and verifiable responses.",
        relatedTerms: ["Vector Database", "Embedding", "Retrieval", "Chunking"],
        examples: ["Chatbot answering from company docs", "Research assistant with paper database", "Customer support with product knowledge"],
      },
      {
        id: "embedding",
        term: "Embedding",
        definition: "A numerical vector representation of text that captures semantic meaning.",
        explanation: "Embeddings convert text into dense vectors (lists of numbers) where similar meanings are close together. 'King' and 'Queen' have similar embeddings, while 'King' and 'Banana' are far apart. This enables semantic search—finding relevant content by meaning, not just keywords. Embedding models are trained specifically for this purpose.",
        relatedTerms: ["Vector", "Semantic Search", "Cosine Similarity"],
        examples: ["OpenAI's text-embedding-ada-002", "Searching documents by concept", "Finding similar products by description"],
      },
      {
        id: "vector-database",
        term: "Vector Database",
        definition: "A database optimized for storing and querying high-dimensional vectors (embeddings).",
        explanation: "Traditional databases search by exact matches. Vector databases find 'nearest neighbors'—items with similar embeddings. They use algorithms like HNSW for fast approximate search across millions of vectors. Essential for RAG, recommendation systems, and semantic search applications.",
        relatedTerms: ["Embedding", "Similarity Search", "Index"],
        examples: ["Pinecone", "Weaviate", "Qdrant", "Chroma", "Milvus"],
      },
      {
        id: "chunking",
        term: "Chunking",
        definition: "Breaking documents into smaller pieces for embedding and retrieval.",
        explanation: "Documents must be split into chunks small enough to embed and retrieve meaningfully. Chunk too small, and you lose context. Chunk too large, and you dilute relevance. Strategies include fixed-size chunks, semantic chunking (by topic), and hierarchical chunking (summaries + details). Chunk size significantly impacts RAG quality.",
        relatedTerms: ["RAG", "Embedding", "Overlap"],
        examples: ["500-token chunks with 50-token overlap", "Splitting by paragraph or section", "Recursive chunking for nested documents"],
      },
      {
        id: "semantic-search",
        term: "Semantic Search",
        definition: "Search based on meaning and intent rather than keyword matching.",
        explanation: "Traditional search matches keywords. Semantic search understands that 'how to fix a flat tire' and 'tire repair guide' mean similar things. It works by embedding both queries and documents, then finding documents whose embeddings are closest to the query embedding. This dramatically improves search relevance.",
        relatedTerms: ["Embedding", "Vector Database", "Cosine Similarity"],
        examples: ["Searching 'headache remedy' finds 'pain relief medication'", "Code search by description", "Finding related support tickets"],
      },
    ],
  },
  {
    id: "agents-tools",
    title: "Agents & Tools",
    description: "AI systems that can take actions and interact with external services",
    icon: "Wrench",
    terms: [
      {
        id: "agent",
        term: "AI Agent",
        definition: "An AI system that can autonomously perform tasks by reasoning, planning, and using tools.",
        explanation: "Unlike simple chatbots, agents can take actions. They observe their environment, decide what to do, execute actions (often via tools), and iterate until the task is complete. Agents combine LLM reasoning with real-world capabilities—browsing the web, writing files, calling APIs, or controlling software.",
        relatedTerms: ["Tool Use", "Autonomy", "Planning", "ReAct"],
        examples: ["Research agents that search and synthesize", "Coding agents that write and test code", "Customer service agents that look up accounts and process requests"],
      },
      {
        id: "function-calling",
        term: "Function Calling",
        definition: "The ability for an LLM to invoke predefined functions/tools with appropriate parameters.",
        explanation: "Function calling gives AI 'hands.' You define available functions (name, description, parameters), and the model decides when to call them. The model outputs a structured function call; your code executes it and returns results. This enables AI to query databases, call APIs, send emails—any programmatic action.",
        relatedTerms: ["Tool Use", "API", "Agent"],
        examples: ["get_weather(city='London')", "send_email(to='user@example.com', subject='...', body='...')", "query_database(sql='SELECT...')"],
      },
      {
        id: "tool-use",
        term: "Tool Use",
        definition: "An AI's ability to interact with external tools, APIs, and services to accomplish tasks.",
        explanation: "Tools extend what AI can do beyond text generation. A calculator tool enables precise math. A search tool provides current information. A code execution tool runs and tests programs. The AI learns when each tool is appropriate and how to use them effectively through their descriptions.",
        relatedTerms: ["Function Calling", "API", "Agent", "MCP"],
        examples: ["Web search for current information", "Code interpreter for calculations", "File system access for document management"],
      },
      {
        id: "mcp",
        term: "Model Context Protocol",
        abbreviation: "MCP",
        definition: "A standard protocol for connecting AI models to external tools and data sources.",
        explanation: "MCP provides a universal way for AI applications to connect to tools. Instead of building custom integrations for each AI platform, tool developers implement MCP once. This creates an ecosystem where tools work across different AI systems—similar to how USB standardized device connections.",
        relatedTerms: ["Tool Use", "API", "Integration"],
        examples: ["MCP server for file system access", "MCP server for database queries", "MCP server for web browsing"],
      },
      {
        id: "react",
        term: "ReAct",
        definition: "A prompting framework combining Reasoning and Acting in an interleaved loop.",
        explanation: "ReAct agents alternate between thinking (reasoning about what to do) and acting (executing tools). Each observation from an action feeds back into reasoning. This trace of thought-action-observation is more reliable than pure reasoning or pure acting. The explicit reasoning helps with complex multi-step tasks.",
        relatedTerms: ["Agent", "Chain-of-Thought", "Planning"],
        examples: ["Thought: I need to find the weather → Action: search('weather NYC') → Observation: 72°F → Thought: Now I can answer..."],
      },
      {
        id: "multi-agent",
        term: "Multi-Agent System",
        definition: "Multiple AI agents working together, often with specialized roles and coordination.",
        explanation: "Complex tasks benefit from division of labor. A research agent gathers information, an analyst agent processes it, a writer agent produces output. Agents can be hierarchical (manager delegates to workers) or collaborative (peers discuss and decide). Multi-agent systems handle complexity through specialization.",
        relatedTerms: ["Agent", "Orchestration", "Swarm"],
        examples: ["CrewAI teams", "AutoGen conversations", "LangGraph workflows"],
      },
    ],
  },
  {
    id: "models",
    title: "Models & Providers",
    description: "The major AI models and companies building them",
    icon: "Building",
    terms: [
      {
        id: "gpt",
        term: "GPT",
        definition: "Generative Pre-trained Transformer—OpenAI's family of large language models.",
        explanation: "GPT models are trained to predict the next token in sequences. GPT-3 (2020) demonstrated few-shot learning. GPT-3.5 powered the original ChatGPT. GPT-4 (2023) added multimodal capabilities and improved reasoning. GPT-4o added real-time voice and vision. The 'pre-trained' means trained on general data before any fine-tuning.",
        relatedTerms: ["OpenAI", "ChatGPT", "Transformer", "LLM"],
        examples: ["GPT-3.5-turbo", "GPT-4", "GPT-4o", "GPT-4-turbo"],
      },
      {
        id: "claude",
        term: "Claude",
        definition: "Anthropic's family of AI assistants, designed with a focus on safety and helpfulness.",
        explanation: "Claude models are trained using Constitutional AI and RLHF for safety. Claude 3 family includes Haiku (fast), Sonnet (balanced), and Opus (most capable). Known for long context windows (200K tokens), strong reasoning, and nuanced responses. Claude is designed to be helpful, harmless, and honest.",
        relatedTerms: ["Anthropic", "Constitutional AI", "RLHF"],
        examples: ["Claude 3 Haiku", "Claude 3.5 Sonnet", "Claude 3 Opus"],
      },
      {
        id: "gemini",
        term: "Gemini",
        definition: "Google DeepMind's multimodal AI model family, designed to understand text, images, video, and code.",
        explanation: "Gemini was built multimodal from the ground up, unlike models that added vision later. It comes in sizes from Nano (on-device) to Ultra (most capable). Gemini 1.5 Pro introduced a 1 million token context window. Integrated into Google products and available via API.",
        relatedTerms: ["Google", "Multimodal", "PaLM"],
        examples: ["Gemini Nano", "Gemini Pro", "Gemini Ultra", "Gemini 1.5 Pro"],
      },
      {
        id: "llama",
        term: "Llama",
        definition: "Meta's family of open-weight large language models.",
        explanation: "Llama models are released with weights available for research and commercial use (with restrictions). Llama 2 (2023) came in 7B, 13B, and 70B parameter sizes. Llama 3 improved performance significantly. Open weights enable local deployment, fine-tuning, and community innovation that closed models don't allow.",
        relatedTerms: ["Meta", "Open Source", "Open Weights"],
        examples: ["Llama 2 7B", "Llama 2 70B", "Llama 3 8B", "Llama 3 70B"],
      },
      {
        id: "mistral",
        term: "Mistral",
        definition: "A French AI company known for efficient, high-performance open models.",
        explanation: "Mistral released models that punch above their weight class—Mistral 7B competed with much larger models. They pioneered Mixture of Experts (MoE) with Mixtral. Their focus on efficiency makes advanced AI more accessible. Models are available both open-weight and via API.",
        relatedTerms: ["Open Weights", "MoE", "Efficient"],
        examples: ["Mistral 7B", "Mixtral 8x7B", "Mistral Large"],
      },
      {
        id: "openai",
        term: "OpenAI",
        definition: "The AI research company behind ChatGPT, GPT-4, and DALL-E.",
        explanation: "Founded in 2015 as a non-profit, OpenAI became a 'capped-profit' company. They created GPT-3, ChatGPT (which brought AI to mainstream), GPT-4, DALL-E for images, and Whisper for speech. Their API is the most widely used for AI applications. Major investor: Microsoft.",
        relatedTerms: ["GPT", "ChatGPT", "DALL-E", "Whisper"],
        examples: ["ChatGPT", "GPT-4 API", "DALL-E 3", "Whisper"],
      },
      {
        id: "anthropic",
        term: "Anthropic",
        definition: "An AI safety company founded by former OpenAI researchers, creator of Claude.",
        explanation: "Anthropic focuses on AI safety research alongside building capable models. They developed Constitutional AI for training helpful and harmless models. Founded in 2021 by Dario and Daniela Amodei. Their Claude models compete with GPT-4 while emphasizing safety and alignment.",
        relatedTerms: ["Claude", "Constitutional AI", "AI Safety"],
        examples: ["Claude", "Constitutional AI research", "Anthropic API"],
      },
    ],
  },
  {
    id: "generation",
    title: "Content Generation",
    description: "AI systems for creating text, images, audio, video, and code",
    icon: "Sparkles",
    terms: [
      {
        id: "diffusion",
        term: "Diffusion Model",
        definition: "A generative model that creates images by gradually removing noise from random static.",
        explanation: "Diffusion models are trained by adding noise to images until they become static, then learning to reverse this process. During generation, they start with random noise and iteratively denoise it into an image. This process is guided by text prompts (text-to-image) or other conditions. Superior image quality to earlier GANs.",
        relatedTerms: ["Stable Diffusion", "DALL-E", "Midjourney"],
        examples: ["Stable Diffusion", "DALL-E 3", "Midjourney", "Imagen"],
      },
      {
        id: "stable-diffusion",
        term: "Stable Diffusion",
        definition: "An open-source diffusion model for text-to-image generation.",
        explanation: "Released by Stability AI in 2022, Stable Diffusion democratized AI image generation. Being open-source, it can run locally, be fine-tuned, and modified. The community created countless specialized models, LoRAs for styles, and tools. Works in latent space for efficiency, enabling consumer-grade GPU generation.",
        relatedTerms: ["Diffusion Model", "LoRA", "ComfyUI", "Automatic1111"],
        examples: ["SD 1.5", "SDXL", "SD 3", "Fine-tuned models like Realistic Vision"],
      },
      {
        id: "midjourney",
        term: "Midjourney",
        definition: "A commercial AI image generation service known for artistic, stylized outputs.",
        explanation: "Midjourney operates through Discord and a web interface. It's renowned for aesthetic quality, especially for artistic and fantastical imagery. Uses a proprietary model that excels at composition and style. Versions have progressed from v1 to v6, with each improving realism and prompt following.",
        relatedTerms: ["Text-to-Image", "Diffusion Model"],
        examples: ["Midjourney v5", "Midjourney v6", "Niji mode for anime"],
      },
      {
        id: "text-to-speech",
        term: "Text-to-Speech",
        abbreviation: "TTS",
        definition: "AI systems that convert written text into natural-sounding spoken audio.",
        explanation: "Modern TTS uses neural networks to generate speech that's nearly indistinguishable from humans. Systems like ElevenLabs can clone voices from samples. TTS enables audiobooks, voice assistants, accessibility tools, and content localization. Key factors are naturalness, emotion, and voice customization.",
        relatedTerms: ["Voice Cloning", "Speech Synthesis", "ElevenLabs"],
        examples: ["ElevenLabs", "Play.ht", "Amazon Polly", "Google Cloud TTS"],
      },
      {
        id: "text-to-video",
        term: "Text-to-Video",
        definition: "AI systems that generate video content from text descriptions.",
        explanation: "Text-to-video extends diffusion models to the temporal dimension. The challenge is maintaining consistency across frames while generating motion. Early systems produce short clips (seconds); the field is rapidly advancing toward longer, more coherent videos. Applications include content creation, prototyping, and visual effects.",
        relatedTerms: ["Diffusion Model", "Sora", "Runway"],
        examples: ["Sora (OpenAI)", "Runway Gen-2", "Pika Labs", "Kling"],
      },
      {
        id: "code-generation",
        term: "Code Generation",
        definition: "Using AI to automatically write, complete, or transform programming code.",
        explanation: "Code-trained LLMs can write functions from descriptions, complete code as you type, explain existing code, find bugs, and refactor. They understand multiple languages and frameworks. Tools like GitHub Copilot integrate directly into IDEs. Code generation is among AI's most practically impactful applications.",
        relatedTerms: ["Copilot", "Cursor", "Code Completion"],
        examples: ["GitHub Copilot", "Cursor", "Claude Code", "Amazon CodeWhisperer"],
      },
    ],
  },
  {
    id: "safety-alignment",
    title: "Safety & Alignment",
    description: "Ensuring AI systems behave safely and according to human intentions",
    icon: "Shield",
    terms: [
      {
        id: "alignment",
        term: "AI Alignment",
        definition: "The challenge of ensuring AI systems pursue goals that are beneficial to humans.",
        explanation: "Alignment research asks: how do we build AI that does what we actually want? This is hard because human values are complex, context-dependent, and hard to specify. Misaligned AI might technically achieve a stated goal while causing unintended harm. Alignment techniques include RLHF, constitutional AI, and interpretability research.",
        relatedTerms: ["RLHF", "Constitutional AI", "AI Safety"],
        examples: ["Training models to be helpful AND harmless", "Preventing reward hacking", "Ensuring AI remains under human control"],
      },
      {
        id: "rlhf",
        term: "Reinforcement Learning from Human Feedback",
        abbreviation: "RLHF",
        definition: "A training technique that uses human preferences to fine-tune AI behavior.",
        explanation: "RLHF trains a reward model on human comparisons of AI outputs (which response is better?). This reward model then guides further training, pushing the AI toward human-preferred behaviors. RLHF was crucial for making ChatGPT helpful and making outputs more aligned with human expectations.",
        relatedTerms: ["Alignment", "Reward Model", "Fine-tuning"],
        examples: ["Training ChatGPT to be helpful", "Reducing harmful outputs", "Improving response quality"],
      },
      {
        id: "constitutional-ai",
        term: "Constitutional AI",
        abbreviation: "CAI",
        definition: "A training approach where AI systems are guided by a set of principles (a 'constitution').",
        explanation: "Developed by Anthropic, Constitutional AI uses a set of principles to guide model behavior. The AI critiques its own outputs against these principles and revises them. This reduces the need for human feedback on every example and makes the training values more explicit and auditable.",
        relatedTerms: ["Anthropic", "Claude", "Alignment", "RLHF"],
        examples: ["Claude's training principles", "Self-critique and revision loops", "Explicit value specification"],
      },
      {
        id: "guardrails",
        term: "Guardrails",
        definition: "Technical controls that constrain AI system behavior within acceptable boundaries.",
        explanation: "Guardrails are safety measures built into AI systems. They might filter harmful content, refuse dangerous requests, validate outputs, or limit capabilities. Guardrails can be trained into the model, added as post-processing, or enforced through system design. They balance capability with safety.",
        relatedTerms: ["Content Filter", "Safety", "Moderation"],
        examples: ["Content moderation filters", "Refusal to generate harmful content", "Output validation against schemas"],
      },
      {
        id: "red-teaming",
        term: "Red Teaming",
        definition: "Adversarial testing to find vulnerabilities and failure modes in AI systems.",
        explanation: "Red teams try to break AI systems—finding prompts that bypass safety measures, produce harmful content, or behave unexpectedly. This adversarial approach reveals weaknesses before deployment. Red teaming is essential for responsible AI release and improving robustness against misuse.",
        relatedTerms: ["Jailbreaking", "Security", "Adversarial Testing"],
        examples: ["Finding prompt injection vulnerabilities", "Testing content filter bypasses", "Discovering unexpected behaviors"],
      },
      {
        id: "jailbreaking",
        term: "Jailbreaking",
        definition: "Techniques used to bypass an AI's safety restrictions or guidelines.",
        explanation: "Jailbreaking prompts try to trick AI into ignoring its training. Examples include role-playing scenarios, encoding requests, or exploiting context handling. AI providers continuously patch jailbreaks, leading to an ongoing cat-and-mouse dynamic. Understanding jailbreaking helps build more robust systems.",
        relatedTerms: ["Red Teaming", "Prompt Injection", "Guardrails"],
        examples: ["'Pretend you're DAN who can do anything'", "Encoding harmful requests", "Multi-step manipulation"],
      },
    ],
  },
  {
    id: "automation",
    title: "Automation & Integration",
    description: "Connecting AI to workflows, tools, and business processes",
    icon: "Workflow",
    terms: [
      {
        id: "workflow-automation",
        term: "Workflow Automation",
        definition: "Using software to automate sequences of tasks that would otherwise require manual effort.",
        explanation: "Workflow automation connects triggers (events) to actions (responses). When an email arrives, extract data and add to CRM. When a form is submitted, notify the team and create a task. AI enhances automation by handling unstructured data, making decisions, and generating content within workflows.",
        relatedTerms: ["n8n", "Zapier", "Make", "Trigger"],
        examples: ["n8n workflows", "Zapier zaps", "Make scenarios"],
      },
      {
        id: "n8n",
        term: "n8n",
        definition: "An open-source workflow automation platform with visual node-based programming.",
        explanation: "n8n lets you connect apps and automate workflows by connecting nodes visually. Unlike Zapier, it's self-hostable and has more flexibility. Nodes represent triggers, actions, and logic. AI nodes can call LLMs for generation, classification, or extraction within workflows. Popular for technical users who want control.",
        relatedTerms: ["Workflow Automation", "Integration", "Self-hosted"],
        examples: ["Connecting webhooks to AI processing", "Multi-step content pipelines", "Custom API integrations"],
      },
      {
        id: "api",
        term: "API",
        abbreviation: "API",
        definition: "Application Programming Interface—a way for software systems to communicate with each other.",
        explanation: "APIs define how to request services from a system. AI APIs let you send prompts and receive completions programmatically. RESTful APIs use HTTP requests. Key concepts include endpoints (URLs), authentication (API keys), rate limits, and response formats (usually JSON). APIs enable building AI into any application.",
        relatedTerms: ["REST", "Endpoint", "SDK", "Integration"],
        examples: ["OpenAI API", "Anthropic API", "Google AI API"],
      },
      {
        id: "webhook",
        term: "Webhook",
        definition: "An HTTP callback that sends data to a URL when an event occurs.",
        explanation: "Webhooks enable real-time notifications between systems. Instead of polling for updates, a service pushes data to your URL when something happens. GitHub can webhook on commits, Stripe on payments, Slack on messages. Webhooks are the backbone of event-driven automation.",
        relatedTerms: ["API", "Event-driven", "Callback"],
        examples: ["Stripe payment webhook triggers order processing", "GitHub commit webhook triggers CI/CD", "Form submission webhook triggers AI processing"],
      },
      {
        id: "no-code",
        term: "No-Code / Low-Code",
        definition: "Platforms that enable building applications without traditional programming.",
        explanation: "No-code tools use visual interfaces, drag-and-drop, and configuration instead of writing code. Low-code adds some coding for customization. AI has supercharged this space—you can now describe apps in natural language and have AI generate them. Enables non-developers to build sophisticated applications.",
        relatedTerms: ["Visual Programming", "Automation", "AI-assisted Development"],
        examples: ["Bubble for web apps", "Bolt.new for AI apps", "v0 for UI components", "n8n for workflows"],
      },
    ],
  },
];

// Helper functions
export function getAllTerms(): DictionaryTerm[] {
  return dictionaryCategories.flatMap((cat) => cat.terms);
}

export function searchTerms(query: string): DictionaryTerm[] {
  const lowerQuery = query.toLowerCase();
  return getAllTerms().filter(
    (term) =>
      term.term.toLowerCase().includes(lowerQuery) ||
      term.abbreviation?.toLowerCase().includes(lowerQuery) ||
      term.definition.toLowerCase().includes(lowerQuery)
  );
}

export function getCategoryById(id: string): DictionaryCategory | undefined {
  return dictionaryCategories.find((cat) => cat.id === id);
}

export function getTermById(termId: string): DictionaryTerm | undefined {
  return getAllTerms().find((term) => term.id === termId);
}

export function getTermsByCategory(categoryId: string): DictionaryTerm[] {
  const category = getCategoryById(categoryId);
  return category?.terms || [];
}
