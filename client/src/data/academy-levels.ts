export type QuestType = "prompt" | "build" | "quiz" | "game" | "capstone";

export interface Quest {
  id: string;
  title: string;
  type: QuestType;
  platform?: string;
  description: string;
  tasks?: string[]; // For quizzes or multi-step quests
}

export interface SubTopic {
  id: string;
  title: string;
  description: string;
  keyTechniques: string[];
  platforms: string[];
}

export interface AcademyLevel {
  id: string;
  levelRange: string;
  rank: string;
  coreSkill: string;
  skillSummary: string;
  lesson: string;
  keyPrinciples: string[];
  quests: Quest[];
  subTopics?: SubTopic[];
  order: number;
}

export interface JourneyPhase {
  id: string;
  name: string;
  levelRange: string;
  description: string;
  icon: "seedling" | "zap" | "sparkles";
}

export interface Track {
  id: string;
  name: string;
  tagline: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  color: string;
  journey: JourneyPhase[];
  levels: AcademyLevel[];
}

// ============================================
// RECRUIT TRACK - Entry Level (Beginner)
// ============================================
const recruitLevels: AcademyLevel[] = [
  {
    id: "recruit-level-0",
    levelRange: "0-10",
    rank: "The Tourist",
    coreSkill: "Prompting",
    skillSummary: "Learning to talk to AI to get instant creative results.",
    lesson: `Welcome to the world of AI. As a Tourist, your job is simple: learn to talk to AI and see magic happen instantly.

AI is like having a creative partner who never sleeps. You describe what you want in plain English, and it creates it for you. No coding. No technical knowledge. Just conversation.

The key insight is that AI understands intent. You don't need special commands or syntax. Just describe what you want as if you were explaining it to a helpful friend. "Create a logo for a coffee shop called Morning Brew" works perfectly.

Start with creative tasks. Names, logos, taglines, descriptions. These have no wrong answers, so you can experiment freely. Watch how AI interprets your words. Notice how adding details changes the output. This is your first taste of the power you're about to unlock.`,
    keyPrinciples: [
      "Describe what you want in plain English",
      "Add details to get more specific results",
      "Experiment freely - there are no wrong answers",
      "AI is a creative partner, not a replacement for your ideas",
      "The clearer your description, the better the output",
    ],
    quests: [
      {
        id: "recruit-q0-1",
        type: "prompt",
        title: "Name That Business",
        platform: "ChatGPT",
        description: "Generate 5 business names for each of these: a pet grooming service, a tech startup, and a bakery. Compare the results and note which prompts gave better names.",
      },
      {
        id: "recruit-q0-2",
        type: "prompt",
        title: "Logo Descriptions",
        platform: "DALL-E 3",
        description: "Write 3 different prompts for the same business logo. Start vague, then add specificity. Compare how detail level changes the output quality.",
      },
      {
        id: "recruit-q0-3",
        type: "prompt",
        title: "The Rewrite Game",
        platform: "ChatGPT",
        description: "Take a boring product description and prompt AI to rewrite it three ways: as luxury, budget-friendly, and eco-friendly. See how tone shifts the message.",
      },
      {
        id: "recruit-q0-4",
        type: "prompt",
        title: "Emoji Translator",
        platform: "ChatGPT",
        description: "Prompt AI to explain complex topics (blockchain, photosynthesis, economics) using only emojis, then translate the emojis back to text.",
      },
      {
        id: "recruit-q0-5",
        type: "quiz",
        title: "Prompting Basics Quiz",
        description: "Test your understanding of prompting fundamentals.",
        tasks: [
          "What makes a good prompt? (specificity, context, examples)",
          "Match the prompt to likely output",
          "Identify what's missing from weak prompts",
          "Rank prompts from worst to best",
        ],
      },
      {
        id: "recruit-q0-6",
        type: "capstone",
        title: "The Brand Kit",
        platform: "ChatGPT + DALL-E 3",
        description: "Create a complete brand kit: business name + tagline + logo + 3 social media bio variations. Document your prompts and show your iteration process.",
      },
    ],
    order: 0,
  },
  {
    id: "recruit-level-1",
    levelRange: "11-20",
    rank: "The Dreamer",
    coreSkill: "Vibe Coding (UI)",
    skillSummary: "Generating a real website using natural language.",
    lesson: `As a Dreamer, you'll create real websites without writing a single line of code. This is called "Vibe Coding"—you describe the vibe, and AI builds it.

Modern AI tools can turn your descriptions into fully functional websites. You say "a personal page with my photo, bio, and links to my social media" and within minutes, you have a real website with working buttons that you can share with anyone.

The magic is in being specific about what you want, but not worrying about how it works. You're the architect describing the building; AI is the construction crew that makes it happen.

This is your first real "ship"—something you create that exists on the internet. Anyone can visit it. It's yours. And you made it just by describing what you wanted.`,
    keyPrinciples: [
      "Describe the purpose, not the code",
      "Start simple—one page with a clear goal",
      "Working buttons and links matter more than perfect design",
      "Deploy and share—a website nobody sees doesn't exist",
      "Iterate based on what you actually need",
    ],
    quests: [
      {
        id: "recruit-q1-1",
        type: "prompt",
        title: "The One-Liner",
        platform: "Lovable.dev",
        description: "Describe a website in just one sentence and see what you get. Try: 'A portfolio for a photographer' and note what the AI assumes.",
      },
      {
        id: "recruit-q1-2",
        type: "prompt",
        title: "The Detail Test",
        platform: "Bolt.new",
        description: "Take your one-liner and add 5 specific details (colors, sections, features). Compare the results to see how specificity improves output.",
      },
      {
        id: "recruit-q1-3",
        type: "prompt",
        title: "Copy That Style",
        platform: "Lovable.dev",
        description: "Use style references like 'Make it look like Apple's website' or 'Notion-style minimalism'. Test how well AI interprets style references.",
      },
      {
        id: "recruit-q1-4",
        type: "build",
        title: "Personal Link Page",
        platform: "Lovable.dev or Bolt.new",
        description: "Build and deploy a Linktree-style page with your name, photo, bio, and 5+ working links to your social profiles. Share the live URL.",
      },
      {
        id: "recruit-q1-5",
        type: "build",
        title: "Event Countdown",
        platform: "Bolt.new",
        description: "Create a single page for an upcoming event with: event name, date, description, countdown timer, and RSVP button. Deploy it live.",
      },
      {
        id: "recruit-q1-6",
        type: "build",
        title: "Mini Portfolio",
        platform: "Lovable.dev",
        description: "Build a portfolio with: About section, 3 project cards with images, and a contact button. Each project card should link somewhere.",
      },
      {
        id: "recruit-q1-7",
        type: "quiz",
        title: "How Websites Work",
        description: "Test your understanding of web basics.",
        tasks: [
          "What's the difference between a button and a link?",
          "What happens when you 'deploy' a website?",
          "Match components to their purposes (header, footer, CTA)",
          "What makes a website 'responsive'?",
        ],
      },
      {
        id: "recruit-q1-8",
        type: "capstone",
        title: "Ship Something Real",
        platform: "Any vibe coding tool",
        description: "Build and deploy a page that solves a real problem for someone else. Share the link with 3 people and collect their feedback. Iterate based on what they say.",
      },
    ],
    order: 1,
  },
  {
    id: "recruit-level-2",
    levelRange: "21-30",
    rank: "The Scribe",
    coreSkill: "AI Writing",
    skillSummary: "Automating text generation for daily tasks.",
    lesson: `The Scribe automates words. You'll build your first real automation—a system that writes for you.

Think about how much time you spend writing emails, messages, and notes. What if you could just provide the topic and have a polished draft appear? That's exactly what you'll build.

This is your introduction to n8n, a visual automation tool. Instead of writing code, you connect blocks together like digital Lego. One block triggers the workflow, another talks to AI, another delivers the result.

The workflow is simple: Input (a topic) → AI Processing (write the email) → Output (your draft). But the principle is profound: you're teaching a computer to do work for you. This is the foundation of everything that follows.`,
    keyPrinciples: [
      "Automation is about inputs and outputs",
      "Start with one simple task you do repeatedly",
      "AI writing needs context—tell it who you are and your tone",
      "Review AI outputs before sending—you're the editor",
      "Small automations compound into big time savings",
    ],
    quests: [
      {
        id: "recruit-q2-1",
        type: "prompt",
        title: "Tone Shifter",
        platform: "ChatGPT",
        description: "Write the same message in 4 different tones: formal, casual, urgent, and apologetic. Use these as templates for your automation.",
      },
      {
        id: "recruit-q2-2",
        type: "prompt",
        title: "The Template Maker",
        platform: "ChatGPT",
        description: "Create a reusable email template with [BLANKS] for variable content. Test filling in different values to see how it adapts.",
      },
      {
        id: "recruit-q2-3",
        type: "prompt",
        title: "Summary Ladder",
        platform: "ChatGPT",
        description: "Take a long article and summarize it at 4 lengths: 100 words, 50 words, 25 words, and 1 sentence. Notice what gets cut at each level.",
      },
      {
        id: "recruit-q2-4",
        type: "build",
        title: "Email Drafter v1",
        platform: "n8n",
        description: "Create an n8n workflow: input a topic → AI writes an email draft → output appears. Trigger it manually and verify the draft quality.",
      },
      {
        id: "recruit-q2-5",
        type: "build",
        title: "Meeting Notes Cleaner",
        platform: "n8n",
        description: "Build a workflow that takes messy meeting notes as input and outputs clean action items with owners and due dates.",
      },
      {
        id: "recruit-q2-6",
        type: "build",
        title: "Social Post Generator",
        platform: "n8n",
        description: "Create a workflow: input a topic → output 3 social posts (Twitter, LinkedIn, Instagram) each optimized for that platform's style.",
      },
      {
        id: "recruit-q2-7",
        type: "game",
        title: "Prompt Golf",
        description: "Achieve a specific AI output using the fewest words possible. Challenge: Get AI to write a professional apology email in under 15 words of prompting.",
      },
      {
        id: "recruit-q2-8",
        type: "quiz",
        title: "Automation Basics",
        description: "Test your understanding of automation concepts.",
        tasks: [
          "What is a trigger?",
          "What's the difference between input and output?",
          "Put these workflow steps in the correct order",
          "What makes a workflow 'idempotent'?",
        ],
      },
      {
        id: "recruit-q2-9",
        type: "capstone",
        title: "Your First Automation",
        platform: "n8n",
        description: "Build a workflow you'll actually use weekly. Run it 5 times with real inputs. Document: What time does it save? What could be improved?",
      },
    ],
    order: 2,
  },
  {
    id: "recruit-level-3",
    levelRange: "31-40",
    rank: "The Collector",
    coreSkill: "Data Entry",
    skillSummary: "Automatically saving information to a spreadsheet.",
    lesson: `The Collector captures information automatically. No more copying and pasting into spreadsheets—your automation does it for you.

Spreadsheets are the world's most underrated database. Google Sheets can store tasks, contacts, ideas, expenses—anything you track regularly. The problem is manual entry. It's tedious, and you forget to do it.

Your automation solves this. You type something into a chat, and it automatically appears as a new row in your spreadsheet. The data captures itself.

This teaches a crucial pattern: AI can understand what you say and structure it into data. "Buy groceries tomorrow" becomes a task with a due date. "Meeting with Sarah about the project" becomes a calendar entry. Natural language in, structured data out.`,
    keyPrinciples: [
      "Spreadsheets are simple databases anyone can use",
      "Automate capture—if you have to remember to enter it, you won't",
      "Structure matters—consistent columns make data useful",
      "Natural language can become structured data",
      "Start with one type of thing you track regularly",
    ],
    quests: [
      {
        id: "recruit-q3-1",
        type: "prompt",
        title: "Structure This",
        platform: "ChatGPT",
        description: "Convert natural language to structured data. 'Buy milk tomorrow' → JSON with task, date, category. Try 10 different inputs.",
      },
      {
        id: "recruit-q3-2",
        type: "prompt",
        title: "Extract the Facts",
        platform: "ChatGPT",
        description: "From a paragraph of text, extract all: names, dates, numbers, and locations. Test with news articles and meeting notes.",
      },
      {
        id: "recruit-q3-3",
        type: "prompt",
        title: "Normalize This",
        platform: "ChatGPT",
        description: "Take messy address formats and normalize them to a consistent structure. Handle variations like 'St.' vs 'Street', missing zip codes, etc.",
      },
      {
        id: "recruit-q3-4",
        type: "build",
        title: "Smart To-Do",
        platform: "n8n + Google Sheets",
        description: "Build: chat input → AI extracts task details → adds row to Google Sheet with columns for task, due date, priority, and status.",
      },
      {
        id: "recruit-q3-5",
        type: "build",
        title: "Expense Logger",
        platform: "n8n + Google Sheets",
        description: "Build: 'Spent $45 on dinner with clients' → Spreadsheet row with amount ($45), category (meals), date (today), notes (with clients).",
      },
      {
        id: "recruit-q3-6",
        type: "build",
        title: "Contact Saver",
        platform: "n8n + Google Sheets",
        description: "Build: paste business card text or meeting intro → extract name, company, email, phone → add to contacts spreadsheet.",
      },
      {
        id: "recruit-q3-7",
        type: "game",
        title: "Data Detective",
        description: "Given messy input, predict exactly what the AI will extract. Score points for correct predictions. Lose points for wrong guesses.",
      },
      {
        id: "recruit-q3-8",
        type: "quiz",
        title: "Spreadsheet Basics",
        description: "Test your understanding of data organization.",
        tasks: [
          "What's a row vs a column?",
          "Why do consistent formats matter?",
          "What makes data 'queryable'?",
          "When should you use multiple sheets vs one sheet?",
        ],
      },
      {
        id: "recruit-q3-9",
        type: "capstone",
        title: "Personal Database",
        platform: "n8n + Google Sheets",
        description: "Choose something you track (books read, recipes tried, ideas). Build a system that captures it from natural language. Add 20 real entries over a week.",
      },
    ],
    order: 3,
  },
  {
    id: "recruit-level-4",
    levelRange: "41-50",
    rank: "The Curator",
    coreSkill: "Web Research",
    skillSummary: "Using AI to read the internet for you.",
    lesson: `The Curator has AI read the internet and report back. Instead of checking multiple websites every day, your automation does it and delivers a summary.

This introduces scheduled triggers. Instead of running workflows manually, they run automatically at specific times. "Every morning at 8 AM" becomes your automation's alarm clock.

The power is in aggregation. Checking the weather takes 30 seconds. Checking news takes 5 minutes. Checking multiple sources takes longer. But your automation does it all simultaneously while you sleep, and you wake up to a single summary.

This is your first taste of leverage. You built something once, and it works for you every day, forever, without additional effort.`,
    keyPrinciples: [
      "Scheduled triggers run without you",
      "Aggregation creates value—multiple sources, one summary",
      "AI can summarize—you don't need full articles",
      "Build once, benefit daily",
      "Start with information you actually check regularly",
    ],
    quests: [
      {
        id: "recruit-q4-1",
        type: "prompt",
        title: "Summary Styles",
        platform: "ChatGPT",
        description: "Summarize the same article 3 ways: bullet points, one paragraph, and tweet thread. Note which format works best for which content.",
      },
      {
        id: "recruit-q4-2",
        type: "prompt",
        title: "Source Comparison",
        platform: "ChatGPT",
        description: "Find the same news story from 3 different sources. Have AI create a unified summary that notes where sources agree and disagree.",
      },
      {
        id: "recruit-q4-3",
        type: "prompt",
        title: "The Filter",
        platform: "ChatGPT",
        description: "From 10 headlines, have AI identify the 3 most relevant to a specific topic. Test with different topics to see how filtering improves.",
      },
      {
        id: "recruit-q4-4",
        type: "build",
        title: "Morning Briefing",
        platform: "n8n",
        description: "Build: scheduled trigger (8 AM) → fetch weather + 3 news headlines → AI summarizes → email to yourself. Run for 5 days.",
      },
      {
        id: "recruit-q4-5",
        type: "build",
        title: "Price Watcher",
        platform: "n8n",
        description: "Build: daily trigger → check a product page → extract price → if lower than threshold, send alert email.",
      },
      {
        id: "recruit-q4-6",
        type: "build",
        title: "Content Radar",
        platform: "n8n",
        description: "Build: monitor an RSS feed or blog → when new post appears → AI summarizes → add to your reading list spreadsheet.",
      },
      {
        id: "recruit-q4-7",
        type: "game",
        title: "Forecast Roulette",
        description: "Use your weather automation to predict tomorrow's weather. Compare to actual weather. Track accuracy over a week. Can you beat the AI's summary?",
      },
      {
        id: "recruit-q4-8",
        type: "quiz",
        title: "Scheduled Automations",
        description: "Test your understanding of triggers and timing.",
        tasks: [
          "What's a cron schedule?",
          "When should automations NOT run (rate limits, costs)?",
          "What's the difference between polling and webhooks?",
          "How do you handle timezone differences?",
        ],
      },
      {
        id: "recruit-q4-9",
        type: "capstone",
        title: "Information Diet",
        platform: "n8n",
        description: "Build a daily briefing you actually want to read. Include 3+ sources relevant to your interests. Run for a week, iterate based on what's useful.",
      },
    ],
    order: 4,
  },
  {
    id: "recruit-level-5",
    levelRange: "51-60",
    rank: "The Sorter",
    coreSkill: "Categorization",
    skillSummary: "Teaching AI to label things (Good vs. Bad).",
    lesson: `The Sorter teaches AI to make decisions. Not complex decisions—simple ones. Is this urgent or not? Is this spam or legitimate? Is this positive or negative?

This is classification, the foundation of intelligent automation. When AI can categorize things, it can route them differently. Urgent emails get flagged. Spam gets deleted. Positive feedback gets archived.

The key insight is that AI doesn't need perfect rules—it understands context. You don't have to define every possible spam phrase. You just show it examples and explain the concept, and it generalizes.

This transforms your automations from simple conveyor belts into smart systems that behave differently based on what they encounter.`,
    keyPrinciples: [
      "Classification enables routing—different categories, different actions",
      "AI understands context, not just keywords",
      "Start with two categories before adding more",
      "Confidence matters—uncertain classifications need human review",
      "Log decisions to improve accuracy over time",
    ],
    quests: [
      {
        id: "recruit-q5-1",
        type: "prompt",
        title: "Binary Classifier",
        platform: "ChatGPT",
        description: "Classify 10 emails as Spam or Not Spam. Note which ones are ambiguous and why. How would you improve the classification?",
      },
      {
        id: "recruit-q5-2",
        type: "prompt",
        title: "Sentiment Scanner",
        platform: "ChatGPT",
        description: "Classify 10 customer reviews as Positive, Negative, or Neutral. Include a confidence score (high/medium/low) for each.",
      },
      {
        id: "recruit-q5-3",
        type: "prompt",
        title: "Priority Ranker",
        platform: "ChatGPT",
        description: "Classify 10 task descriptions as Urgent, Normal, or Low priority. Test edge cases: what makes something 'urgent'?",
      },
      {
        id: "recruit-q5-4",
        type: "build",
        title: "Inbox Triage",
        platform: "n8n",
        description: "Build: incoming message → AI classifies (Urgent/Normal/Spam) → add appropriate label → if Urgent, send notification.",
      },
      {
        id: "recruit-q5-5",
        type: "build",
        title: "Feedback Sorter",
        platform: "n8n",
        description: "Build: customer feedback input → AI classifies (Bug, Feature Request, Praise, Complaint) → route to appropriate spreadsheet tab.",
      },
      {
        id: "recruit-q5-6",
        type: "build",
        title: "Lead Scorer",
        platform: "n8n",
        description: "Build: inquiry form submission → AI analyzes → classify as Hot/Warm/Cold lead → add score and reasoning to CRM sheet.",
      },
      {
        id: "recruit-q5-7",
        type: "game",
        title: "Beat the Bot",
        description: "You and AI both classify the same 10 items. Compare accuracy and speed. Where does AI do better? Where do you?",
      },
      {
        id: "recruit-q5-8",
        type: "quiz",
        title: "Classification Concepts",
        description: "Test your understanding of categorization.",
        tasks: [
          "What's a confidence score and why does it matter?",
          "When should AI defer to humans?",
          "What's the difference between categories and tags?",
          "How do you handle items that fit multiple categories?",
        ],
      },
      {
        id: "recruit-q5-9",
        type: "capstone",
        title: "Smart Router",
        platform: "n8n",
        description: "Build a system that classifies AND routes to different actions based on category. Process 20 real items. Measure accuracy and fix misclassifications.",
      },
    ],
    order: 5,
  },
  {
    id: "recruit-level-6",
    levelRange: "61-70",
    rank: "The Creator",
    coreSkill: "Content Generation",
    skillSummary: "Combining text and image generation.",
    lesson: `The Creator generates complete content packages. Not just text. Not just images. Both together, ready to publish.

Social media posts need captions and visuals. Blog posts need featured images. Marketing needs copy and graphics. Previously, this required multiple tools and manual coordination. Now, one workflow does it all.

The workflow chains AI calls: first generate the text, then use that text to inform the image generation, then package both together. Each step feeds the next.

This is composition—combining simple capabilities into powerful outputs. One AI writes. Another AI illustrates. Your automation coordinates them. The result is greater than the sum of its parts.`,
    keyPrinciples: [
      "Content packages beat individual pieces",
      "Chain AI calls—text informs image, image informs text",
      "Consistent style requires consistent prompts",
      "Store outputs organized for easy retrieval",
      "Quality control: review before publishing",
    ],
    quests: [
      {
        id: "recruit-q6-1",
        type: "prompt",
        title: "Caption + Image Match",
        platform: "ChatGPT + DALL-E",
        description: "Write a caption first, then generate an image that matches. Then reverse: generate image first, write caption to match. Compare results.",
      },
      {
        id: "recruit-q6-2",
        type: "prompt",
        title: "Style Lock",
        platform: "DALL-E or Midjourney",
        description: "Generate 5 images for a fictional brand that look like they belong together. Document your style prompt that creates consistency.",
      },
      {
        id: "recruit-q6-3",
        type: "prompt",
        title: "The Remix",
        platform: "ChatGPT",
        description: "Take one piece of content and format it 3 ways: carousel post (5 slides), single image post, and story format. Same message, different structures.",
      },
      {
        id: "recruit-q6-4",
        type: "build",
        title: "Post Generator",
        platform: "n8n + DALL-E",
        description: "Build: topic input → AI writes caption → AI generates matching image → save both to Google Drive with consistent naming.",
      },
      {
        id: "recruit-q6-5",
        type: "build",
        title: "Thumbnail Factory",
        platform: "n8n + DALL-E",
        description: "Build: video title input → AI generates 3 thumbnail options → save all to folder for review.",
      },
      {
        id: "recruit-q6-6",
        type: "build",
        title: "Quote Cards",
        platform: "n8n + DALL-E",
        description: "Build: quote text input → AI creates beautiful background image → overlay quote text → save shareable image.",
      },
      {
        id: "recruit-q6-7",
        type: "game",
        title: "A/B Tester",
        description: "Generate 2 versions of the same post. Predict which would perform better and explain why. (Engagement, clarity, visual appeal)",
      },
      {
        id: "recruit-q6-8",
        type: "quiz",
        title: "Content Strategy Basics",
        description: "Test your understanding of content creation.",
        tasks: [
          "What makes an image 'scroll-stopping'?",
          "Why do captions need hooks?",
          "What's the ideal content:promotion ratio?",
          "How do different platforms favor different formats?",
        ],
      },
      {
        id: "recruit-q6-9",
        type: "capstone",
        title: "Content Week",
        platform: "n8n",
        description: "Generate a week's worth of content (7 posts). Each must have: caption, image, hashtags. Maintain visual consistency across all 7.",
      },
    ],
    order: 6,
  },
  {
    id: "recruit-level-7",
    levelRange: "71-80",
    rank: "The Listener",
    coreSkill: "Forms & Triggers",
    skillSummary: "Making AI react to outside user input.",
    lesson: `The Listener builds systems that respond to other people. Not just your input—anyone's input. This is where your automations become products.

Forms are the simplest interface. Someone fills out fields, clicks submit, and your automation springs into action. No app needed. No login required. Just a link they can visit.

The webhook pattern is powerful: external event → trigger → automation → response. When someone submits feedback, your system can thank them, categorize their input, and notify you—all instantly, all automatically.

This shifts your mindset from "tools for me" to "systems for others." You're building something that provides value to people who don't even know automation exists.`,
    keyPrinciples: [
      "Forms are the simplest user interface",
      "Webhooks let external events trigger automations",
      "Personalization matters—use their name, reference their input",
      "Response time creates magic—instant feels intelligent",
      "Build for others, not just yourself",
    ],
    quests: [
      {
        id: "recruit-q7-1",
        type: "prompt",
        title: "Thank You Variations",
        platform: "ChatGPT",
        description: "Write 5 different personalized thank-you messages that use the person's name and reference what they submitted. Test with different submission types.",
      },
      {
        id: "recruit-q7-2",
        type: "prompt",
        title: "The Follow-Up",
        platform: "ChatGPT",
        description: "Based on form responses, generate relevant follow-up content. Job application → interview tips. Feedback → related resources.",
      },
      {
        id: "recruit-q7-3",
        type: "prompt",
        title: "Conditional Responses",
        platform: "ChatGPT",
        description: "Design response templates that change based on input. Satisfied customer → upsell. Unsatisfied → support escalation.",
      },
      {
        id: "recruit-q7-4",
        type: "build",
        title: "Feedback Form",
        platform: "Typeform + n8n",
        description: "Build: form submission → AI writes personalized thank-you → send email → notify you in Slack → log to spreadsheet.",
      },
      {
        id: "recruit-q7-5",
        type: "build",
        title: "Quiz Form",
        platform: "Tally + n8n",
        description: "Build: quiz answers submitted → AI grades responses → calculates score → sends personalized results email with feedback.",
      },
      {
        id: "recruit-q7-6",
        type: "build",
        title: "Booking Request",
        platform: "Cal.com + n8n",
        description: "Build: booking request → AI confirms details → checks availability → sends confirmation or suggests alternatives.",
      },
      {
        id: "recruit-q7-7",
        type: "game",
        title: "Response Time Challenge",
        description: "How fast can your automation respond? Measure from form submit to email received. Optimize for speed while maintaining quality.",
      },
      {
        id: "recruit-q7-8",
        type: "quiz",
        title: "Webhooks & Triggers",
        description: "Test your understanding of external triggers.",
        tasks: [
          "What's a webhook?",
          "What's the difference between sync and async responses?",
          "When should you use forms vs chat?",
          "How do you handle webhook failures?",
        ],
      },
      {
        id: "recruit-q7-9",
        type: "capstone",
        title: "Public Tool",
        platform: "Form + n8n",
        description: "Build a form-based tool someone else can use. Share it publicly. Get 5 real submissions. Review responses and improve based on feedback.",
      },
    ],
    order: 7,
  },
  {
    id: "recruit-level-8",
    levelRange: "81-90",
    rank: "The Builder",
    coreSkill: "Chatbots",
    skillSummary: "Creating a conversational interface.",
    lesson: `The Builder creates conversations. Instead of forms and buttons, users just talk. They ask questions in natural language, and your system answers.

Chatbots feel like magic to users. They type a question, and an intelligent response appears. Behind the scenes, it's your automation: receive message → find relevant information → generate response → send reply.

The key is grounding the chatbot in specific knowledge. A general chatbot knows everything and nothing useful. Your chatbot knows about one specific thing—a pizza shop's hours, a product's features, a company's FAQ. Narrow focus enables accurate answers.

This is your first AI-powered interface. Not buttons. Not forms. Conversation. The most natural human interface, powered by your automation.`,
    keyPrinciples: [
      "Narrow focus beats broad knowledge",
      "Ground responses in specific documents",
      "Handle 'I don't know' gracefully",
      "Conversation history provides context",
      "Test with real questions from real users",
    ],
    quests: [
      {
        id: "recruit-q8-1",
        type: "prompt",
        title: "Persona Design",
        platform: "ChatGPT",
        description: "Write system prompts for 3 different personas: helpful assistant, strict teacher, friendly guide. Test how persona affects responses.",
      },
      {
        id: "recruit-q8-2",
        type: "prompt",
        title: "Boundary Setting",
        platform: "ChatGPT",
        description: "Create a system prompt that politely refuses off-topic questions. Test with various off-topic attempts. How gracefully does it redirect?",
      },
      {
        id: "recruit-q8-3",
        type: "prompt",
        title: "Knowledge Grounding",
        platform: "ChatGPT",
        description: "Give AI a document (menu, FAQ, policy). Test if it stays within the document or makes things up. How do you prevent hallucination?",
      },
      {
        id: "recruit-q8-4",
        type: "build",
        title: "FAQ Bot",
        platform: "n8n or Flowise",
        description: "Build: message received → find relevant FAQ → AI generates answer → send response. Test with 10 common questions.",
      },
      {
        id: "recruit-q8-5",
        type: "build",
        title: "Menu Helper",
        platform: "n8n or Flowise",
        description: "Build a chatbot that knows a restaurant menu. It should answer: What's vegetarian? What's spicy? Prices? Ingredients?",
      },
      {
        id: "recruit-q8-6",
        type: "build",
        title: "Onboarding Guide",
        platform: "n8n or Flowise",
        description: "Build a chatbot that walks new users through a product or service. It should answer common questions and guide next steps.",
      },
      {
        id: "recruit-q8-7",
        type: "game",
        title: "Stump the Bot",
        description: "Try to make your chatbot give wrong answers. Find edge cases, trick questions, ambiguous queries. Fix each vulnerability you find.",
      },
      {
        id: "recruit-q8-8",
        type: "quiz",
        title: "Conversational AI",
        description: "Test your understanding of chatbot design.",
        tasks: [
          "What's a system prompt vs user prompt?",
          "Why does conversation history matter?",
          "How do you handle 'I don't know'?",
          "What's the difference between retrieval and generation?",
        ],
      },
      {
        id: "recruit-q8-9",
        type: "capstone",
        title: "Expert Bot",
        platform: "n8n or Flowise",
        description: "Build a chatbot that's an expert on something you know well. Give it real documentation. Test with 20 real questions from other people.",
      },
    ],
    order: 8,
  },
  {
    id: "recruit-level-9",
    levelRange: "91-100",
    rank: "The Operator",
    coreSkill: "Integration",
    skillSummary: "Connecting a frontend to a backend.",
    lesson: `The Operator connects everything. You've built interfaces (websites) and you've built automations (workflows). Now you connect them. Frontend meets backend.

This is the architecture of real applications: a user interface sends data to a processing system, which does something intelligent, and sends results back. Website → n8n → AI → Response → Website.

When you build this, you've essentially built an app. Users interact with your interface. Your backend processes their requests. Results appear on screen. The fact that you described the UI and visually built the backend doesn't make it less real.

Congratulations. You started as someone who had never written code. Now you're building full-stack applications. The tools did the coding. You did the thinking. And thinking is the part that matters.`,
    keyPrinciples: [
      "Frontends display, backends process",
      "APIs are bridges between systems",
      "User experience matters—loading states, error messages, feedback",
      "End-to-end testing catches integration issues",
      "You're a builder now—keep building",
    ],
    quests: [
      {
        id: "recruit-q9-1",
        type: "prompt",
        title: "API Response Formatting",
        platform: "ChatGPT",
        description: "Make AI output responses that match a specific JSON schema. Practice with different schemas. How precise can you get?",
      },
      {
        id: "recruit-q9-2",
        type: "prompt",
        title: "Error Message Writing",
        platform: "ChatGPT",
        description: "Write friendly, helpful error messages for 5 scenarios: network failure, invalid input, rate limit, server error, not found.",
      },
      {
        id: "recruit-q9-3",
        type: "prompt",
        title: "Loading State Copy",
        platform: "ChatGPT",
        description: "Write engaging messages to show while users wait. Make waiting feel shorter through good copywriting.",
      },
      {
        id: "recruit-q9-4",
        type: "build",
        title: "Idea Generator App",
        platform: "Lovable + n8n",
        description: "Build: UI with input field → sends to n8n → AI generates ideas → display results on screen. Full round-trip.",
      },
      {
        id: "recruit-q9-5",
        type: "build",
        title: "Name Validator",
        platform: "Bolt.new + n8n",
        description: "Build: UI to check business name → n8n checks availability (mock) → returns available/taken with suggestions.",
      },
      {
        id: "recruit-q9-6",
        type: "build",
        title: "Content Preview Tool",
        platform: "Lovable + n8n",
        description: "Build: input content → show how it would look on Twitter, LinkedIn, and Instagram (formatted previews).",
      },
      {
        id: "recruit-q9-7",
        type: "game",
        title: "Latency Olympics",
        description: "Optimize your app for the fastest response time. Track: API call time, processing time, display time. How low can you go?",
      },
      {
        id: "recruit-q9-8",
        type: "quiz",
        title: "Full-Stack Basics",
        description: "Test your understanding of application architecture.",
        tasks: [
          "What's frontend vs backend?",
          "What's an API?",
          "What's the request-response cycle?",
          "How do you handle errors gracefully?",
        ],
      },
      {
        id: "recruit-q9-9",
        type: "capstone",
        title: "Ship an App",
        platform: "Lovable + n8n",
        description: "Build a complete tool with UI + backend. Get 10 real users to try it. Collect feedback and make one improvement based on what they say.",
      },
    ],
    order: 9,
  },
];

// ============================================
// SPECIALIST TRACK - Intermediate/Advanced
// ============================================
const specialistLevels: AcademyLevel[] = [
  {
    id: "specialist-level-0",
    levelRange: "0-10",
    rank: "The Drifter",
    coreSkill: "UI Manifestation",
    skillSummary: "Prompting full apps via natural language.",
    lesson: `UI Manifestation is the art of translating ideas into functional interfaces using only natural language. Modern AI-powered tools have democratized app development—you no longer need to write code to build working software.

The key insight is that these tools understand intent, not just instructions. Instead of describing every button and field, describe what you want to accomplish. "A landing page for a productivity app with a waitlist" yields better results than "a page with a header, three feature cards, and a form."

Start simple. Every complex app is just a collection of simple patterns: forms that collect data, lists that display it, and buttons that trigger actions. Master these building blocks and you can construct anything.

The platforms differ in their strengths: Bolt.new excels at full-stack apps with backends, v0.dev produces polished UI components, Lovable focuses on beautiful design, and Replit offers the most flexibility for customization. Choose based on your end goal.`,
    keyPrinciples: [
      "Describe outcomes, not implementations",
      "Start with a minimal viable interface",
      "Iterate in small increments",
      "Use reference examples when possible",
      "Test with real users early",
    ],
    quests: [
      {
        id: "spec-q0-1",
        type: "build",
        title: "5-Minute Landing Page",
        platform: "Bolt.new",
        description:
          "Create a SaaS landing page with hero section, three feature cards, and a working email waitlist form that stores submissions.",
      },
      {
        id: "spec-q0-2",
        type: "build",
        title: "Component Library Starter",
        platform: "v0.dev",
        description:
          "Generate a set of 5 reusable UI components: a pricing card, testimonial block, feature comparison table, CTA banner, and footer.",
      },
      {
        id: "spec-q0-3",
        type: "build",
        title: "Personal Portfolio",
        platform: "Lovable",
        description:
          "Build a personal portfolio site with an about section, project gallery with filtering, and contact form. Deploy to a live URL.",
      },
      {
        id: "spec-q0-4",
        type: "build",
        title: "Internal Tool Dashboard",
        platform: "Replit",
        description:
          "Create an internal dashboard that displays mock analytics data with charts, a data table with search/filter, and export to CSV functionality.",
      },
    ],
    order: 0,
  },
  {
    id: "specialist-level-1",
    levelRange: "11-20",
    rank: "The Scavenger",
    coreSkill: "Linear Automation",
    skillSummary: "Eliminating manual grunt work via triggers.",
    lesson: `Linear Automation is about identifying repetitive tasks and replacing them with trigger-based workflows. The philosophy is simple: if you do something more than twice, automate it.

A linear automation follows a predictable path: trigger → action → result. When X happens, do Y. The power comes from chaining these simple steps. When a form is submitted → send to Slack → add to spreadsheet → send confirmation email.

The hardest part isn't building the automation—it's recognizing what should be automated. Keep a "friction journal" for one week. Every time you do something manually that feels repetitive, write it down. That list is your automation roadmap.

Start with low-stakes automations. Notifications, data syncing, simple transformations. As you build confidence, move to automations that take actions on your behalf. The goal is to become the architect of systems, not the operator of tasks.`,
    keyPrinciples: [
      "Automate observation before action",
      "Build idempotent workflows (safe to run twice)",
      "Log everything for debugging",
      "Start with notifications, graduate to actions",
      "Test with real data in staging first",
    ],
    quests: [
      {
        id: "spec-q1-1",
        type: "build",
        title: "YouTube to LinkedIn Pipeline",
        platform: "n8n",
        description:
          "Build a workflow that monitors a YouTube channel RSS feed, summarizes new videos using an LLM, and posts the summary as a LinkedIn post with the video link.",
      },
      {
        id: "spec-q1-2",
        type: "build",
        title: "Email to Task Converter",
        platform: "Make",
        description:
          "Create an automation that monitors a specific Gmail label, extracts action items using AI, and creates corresponding tasks in Notion or Todoist.",
      },
      {
        id: "spec-q1-3",
        type: "build",
        title: "Content Repurposing Chain",
        platform: "n8n",
        description:
          "Build a pipeline that takes a blog post URL, generates 5 tweet variations, 1 LinkedIn post, and 3 email subject lines, storing all outputs in Airtable.",
      },
    ],
    order: 1,
  },
  {
    id: "specialist-level-2",
    levelRange: "21-30",
    rank: "The Prompt Smith",
    coreSkill: "Structured Output & Prompting",
    skillSummary: "Forcing AI to produce reliable, formatted outputs.",
    lesson: `The Prompt Smith understands that AI output quality is directly proportional to input quality. Prompting is not about finding magic words—it's about clear communication, context setting, and constraint definition.

Every prompt has anatomy: Role (who the AI should be), Context (what it needs to know), Task (what to do), Format (how to structure output), and Constraints (what to avoid). Master this structure and you control the output.

Structured output is the bridge between AI and automation. When you need an LLM to produce JSON, XML, or specific formats, you must be explicit. Show examples. Define schemas. Validate outputs. Never trust that the AI will "figure it out."

Different modalities require different approaches. Text prompting rewards specificity and examples. Image prompting is about visual vocabulary and style references. Video prompting requires understanding of motion, timing, and continuity.`,
    keyPrinciples: [
      "Show, don't just tell (use examples)",
      "Define output format explicitly",
      "Provide relevant context, not everything",
      "Use system prompts for persistent behavior",
      "Iterate prompts like code—version and test",
    ],
    subTopics: [
      {
        id: "spec-st2-text",
        title: "Text Prompting",
        description:
          "Techniques for generating high-quality written content, code, and structured data from language models.",
        keyTechniques: [
          "Few-shot prompting: Provide 2-3 examples of desired input/output pairs",
          "Chain-of-thought: Ask the model to show its reasoning step-by-step",
          "Role prompting: Assign a specific persona (You are a senior tax accountant...)",
          "Output templating: Define exact structure with placeholders",
        ],
        platforms: ["ChatGPT", "Claude", "Gemini", "Llama"],
      },
      {
        id: "spec-st2-image",
        title: "Image Prompting",
        description:
          "Creating visual content through text descriptions, style references, and compositional guidance.",
        keyTechniques: [
          "Subject + Style + Mood: 'A cyberpunk street market, oil painting style, moody lighting'",
          "Style references: 'in the style of Studio Ghibli'",
          "Negative prompts: --no text, blurry, distorted hands",
          "Weight parameters: (subject:1.2) to emphasize elements",
        ],
        platforms: ["Midjourney", "DALL-E 3", "Stable Diffusion", "Leonardo.ai"],
      },
    ],
    quests: [
      {
        id: "spec-q2-1",
        type: "build",
        title: "Data Sanitizer",
        platform: "n8n + OpenAI",
        description:
          "Create a workflow that takes messy receipts, extracts vendor, date, items, and total into clean JSON, and stores in Airtable.",
      },
      {
        id: "spec-q2-2",
        type: "build",
        title: "Brand Image Generator",
        platform: "Midjourney",
        description:
          "Develop a prompt template system that generates consistent brand imagery. Create 10 images that maintain style consistency.",
      },
    ],
    order: 2,
  },
  {
    id: "specialist-level-3",
    levelRange: "31-40",
    rank: "The Harvester",
    coreSkill: "Data Extraction",
    skillSummary: "Scraping the web for personal datasets.",
    lesson: `The Harvester sees the web as a vast, unstructured database waiting to be queried. Data extraction is the skill of turning public information into private advantage.

Traditional scraping is brittle—HTML changes break everything. AI-powered extraction is semantic. Instead of parsing DOM elements, you describe what you want: "Extract the product name, price, and review count from this page." The AI finds it regardless of structure.

The ethical framework matters. Scrape public data. Respect robots.txt. Don't hammer servers. Store only what you need. Never scrape personal data without consent.

Build for resilience. Websites change. APIs get deprecated. Your extraction pipelines should handle failures gracefully and alert you when patterns break.`,
    keyPrinciples: [
      "Semantic extraction over DOM parsing",
      "Respect rate limits and robots.txt",
      "Build failure handling into every pipeline",
      "Store raw data alongside extracted data",
      "Monitor for extraction drift over time",
    ],
    quests: [
      {
        id: "spec-q3-1",
        type: "build",
        title: "Competitor Price Monitor",
        platform: "Firecrawl + n8n",
        description:
          "Build a system that monitors 5 competitor product pages daily, extracts pricing data, and Slacks you when any price changes by more than 10%.",
      },
      {
        id: "spec-q3-2",
        type: "build",
        title: "Job Board Aggregator",
        platform: "Apify",
        description:
          "Create a scraper that aggregates job postings from 3 different job boards, deduplicates listings, and delivers a daily digest email.",
      },
    ],
    order: 3,
  },
  {
    id: "specialist-level-4",
    levelRange: "41-50",
    rank: "The Archivist",
    coreSkill: "RAG",
    skillSummary: "Giving AI long-term, searchable memory.",
    lesson: `The Archivist solves AI's memory problem. Language models have context limits and no persistent memory. RAG (Retrieval Augmented Generation) bridges this gap by connecting AI to external knowledge bases.

The core pattern: documents → chunks → embeddings → vector store → retrieval → augmented prompt → response. Each step has tradeoffs. Chunk too small and you lose context. Chunk too large and you dilute relevance.

Embeddings are the secret sauce. They convert text into numerical vectors where semantic similarity = geometric proximity. "How do I reset my password?" and "I forgot my login credentials" are far apart as strings but close as vectors.

Quality in, quality out. RAG is only as good as your knowledge base. Curate ruthlessly. Update regularly.`,
    keyPrinciples: [
      "Chunk size affects retrieval quality dramatically",
      "Hybrid search (keyword + semantic) beats either alone",
      "Always cite sources in generated responses",
      "Version and update your knowledge base regularly",
      "Test retrieval quality before trusting generation",
    ],
    subTopics: [
      {
        id: "spec-st4-chunking",
        title: "Chunking Strategies",
        description: "Methods for splitting documents into retrievable segments.",
        keyTechniques: [
          "Fixed-size chunks: Simple but may break mid-sentence",
          "Semantic chunking: Split on topic boundaries",
          "Sliding window: Overlapping chunks for context",
          "Hierarchical: Parent-child chunks for multi-level retrieval",
        ],
        platforms: ["LangChain", "LlamaIndex", "Unstructured.io"],
      },
    ],
    quests: [
      {
        id: "spec-q4-1",
        type: "build",
        title: "Technical Manual Chatbot",
        platform: "Pinecone + OpenAI",
        description:
          "Build a chatbot trained on a 100+ page technical manual. Must cite page numbers for every answer.",
      },
      {
        id: "spec-q4-2",
        type: "build",
        title: "Codebase Q&A System",
        platform: "LlamaIndex",
        description:
          "Create a RAG system over a GitHub repository that can answer questions about code functionality with file references.",
      },
    ],
    order: 4,
  },
  {
    id: "specialist-level-5",
    levelRange: "51-60",
    rank: "The Traffic Cop",
    coreSkill: "Intent Routing",
    skillSummary: "Directing traffic to specialized sub-agents.",
    lesson: `The Traffic Cop understands that one AI cannot do everything well. The skill is building routing layers that detect intent and dispatch to specialists.

Intent classification is the foundation. Is this email a sales inquiry, support request, or spam? Get classification wrong and everything downstream fails.

Build specialist handlers, not general handlers. A support response agent should speak differently than a sales response agent. Specialization enables quality.

Fallback gracefully. Not every input fits a category. Build explicit "unknown" handling. Escalate to humans when confidence is low.`,
    keyPrinciples: [
      "Classify intent before processing content",
      "Build specialist handlers, not generalists",
      "Always have an 'unknown/escalate' path",
      "Log routing decisions for analysis",
      "Confidence thresholds prevent bad routing",
    ],
    quests: [
      {
        id: "spec-q5-1",
        type: "build",
        title: "Inbox Zero Engine",
        platform: "n8n + OpenAI",
        description:
          "Build an email classifier that routes incoming mail into Sales, Support, Spam, and Personal with unique reply templates for each category.",
      },
      {
        id: "spec-q5-2",
        type: "build",
        title: "Multi-Lingual Intent Handler",
        platform: "LangChain",
        description:
          "Build a chatbot that detects language and intent simultaneously, routing to language-specific response handlers.",
      },
    ],
    order: 5,
  },
  {
    id: "specialist-level-6",
    levelRange: "61-70",
    rank: "The Tool Master",
    coreSkill: "Function Calling",
    skillSummary: "Giving AI hands to interact with the world.",
    lesson: `The Tool Master transforms AI from a brain into an operator. Function calling lets AI invoke real-world actions: query databases, call APIs, send messages, modify files.

The architecture is straightforward: define tools with clear schemas, let the AI decide when to use them, execute the calls, feed results back.

Tool design is UX design. The AI is your user. Name functions clearly. Write descriptions that explain when to use each tool. The better the tool definition, the better the AI uses it.

Security is non-negotiable. AI should never have unbounded capabilities. Sandbox dangerous operations. Require confirmation for destructive actions.`,
    keyPrinciples: [
      "Clear tool descriptions = better tool selection",
      "Always validate tool inputs before execution",
      "Implement confirmation for destructive actions",
      "Log every tool call with inputs and outputs",
      "Build tools that compose into workflows",
    ],
    quests: [
      {
        id: "spec-q6-1",
        type: "build",
        title: "Calendar Agent",
        platform: "OpenAI + Google Calendar API",
        description:
          "Build an agent that can check availability, find mutual free time, and book meetings autonomously.",
      },
      {
        id: "spec-q6-2",
        type: "build",
        title: "Database Query Agent",
        platform: "Claude + PostgreSQL",
        description:
          "Create an agent that translates natural language into SQL queries with validation to prevent destructive operations.",
      },
    ],
    order: 6,
  },
  {
    id: "specialist-level-7",
    levelRange: "71-80",
    rank: "The Hive Lord",
    coreSkill: "Multi-Agent Orchestration",
    skillSummary: "Manager-worker hierarchies for complex tasks.",
    lesson: `The Hive Lord commands armies. Multi-agent orchestration is the art of decomposing complex tasks into subtasks handled by specialized agents, coordinated by manager agents.

The fundamental pattern is hierarchical delegation. A manager agent receives a complex goal, breaks it into subtasks, assigns each to a worker agent, collects results, and synthesizes a final output.

Agent specialization is critical. A "Researcher" agent should have different prompts, tools, and context than a "Writer" agent.

The failure modes are subtle. Agents can loop infinitely. Workers can produce conflicting outputs. Build observability: logging, state inspection, timeout controls.`,
    keyPrinciples: [
      "Decompose before delegating",
      "Specialize worker agents for their tasks",
      "Define explicit communication protocols",
      "Build observability into every agent",
      "Set timeouts and iteration limits",
    ],
    quests: [
      {
        id: "spec-q7-1",
        type: "build",
        title: "Content Factory",
        platform: "CrewAI",
        description:
          "Build a multi-agent system where a Manager assigns topics to a Researcher, passes findings to a Writer, and has an Editor review output.",
      },
      {
        id: "spec-q7-2",
        type: "build",
        title: "Software Dev Team",
        platform: "n8n + Multiple LLMs",
        description:
          "Create a coding team: Architect designs, Developer implements, Reviewer checks quality, PM coordinates.",
      },
    ],
    order: 7,
  },
  {
    id: "specialist-level-8",
    levelRange: "81-90",
    rank: "The Code Wraith",
    coreSkill: "Full-Stack AI Development",
    skillSummary: "Building complete applications with AI assistance.",
    lesson: `The Code Wraith builds real systems. Full-stack AI development combines all previous skills—UI generation, automation, prompting, RAG, function calling—into production applications.

The paradigm shift: AI is not replacing programming, it's accelerating it. You still need to understand architecture, databases, authentication, deployment. AI writes the code faster; you design the systems.

The workflow is iterative. Describe → Generate → Test → Refine → Repeat. Start with a scaffold. Add features incrementally.

Production readiness is not optional. Authentication, error handling, data validation, logging, monitoring—these aren't features, they're requirements.`,
    keyPrinciples: [
      "Understand architecture before generating code",
      "Implement incrementally, test continuously",
      "AI accelerates; humans architect",
      "Production readiness is non-negotiable",
      "Version control everything, even AI-generated code",
    ],
    quests: [
      {
        id: "spec-q8-1",
        type: "build",
        title: "SaaS MVP",
        platform: "Cursor + Supabase",
        description:
          "Build a complete SaaS with user auth, Stripe billing, a core feature, and admin dashboard. Deploy to production.",
      },
      {
        id: "spec-q8-2",
        type: "build",
        title: "Realtime Collaboration Tool",
        platform: "v0 + Supabase Realtime",
        description:
          "Build a collaborative document editor with realtime sync, presence indicators, and version history.",
      },
    ],
    order: 8,
  },
  {
    id: "specialist-level-9",
    levelRange: "91-100",
    rank: "The Sovereign",
    coreSkill: "Autonomous Business Systems",
    skillSummary: "Self-correcting systems that generate value.",
    lesson: `The Sovereign builds businesses, not features. Autonomous business systems combine all skills into self-sustaining value engines that operate with minimal human intervention.

The architecture is full-cycle: Lead generation → Qualification → Outreach → Conversion → Delivery → Support → Retention. Each stage can be automated.

Self-correction is the differentiator. Static automations break. Autonomous systems monitor their own performance, detect degradation, and adapt.

The human role evolves. You become the architect and monitor, not the operator. Design the system, set the constraints, watch the metrics, intervene on exceptions.`,
    keyPrinciples: [
      "Full-cycle thinking: end-to-end value delivery",
      "Build feedback loops, not just workflows",
      "Model economics before building",
      "Validate each stage before expanding",
      "Human as architect and monitor, not operator",
    ],
    quests: [
      {
        id: "spec-q9-1",
        type: "build",
        title: "Headless SaaS",
        platform: "n8n + Stripe + Multiple APIs",
        description:
          "Launch a complete headless SaaS: automated lead finding, outreach, payment processing, and onboarding with zero manual input.",
      },
      {
        id: "spec-q9-2",
        type: "build",
        title: "Content Empire",
        platform: "Multi-platform Automation",
        description:
          "Build a content system that researches topics, generates content, publishes across platforms, and optimizes based on engagement.",
      },
    ],
    order: 9,
  },
];

// ============================================
// ARCHITECT TRACK - Expert (Coming Soon)
// ============================================
const architectLevels: AcademyLevel[] = [
  {
    id: "architect-level-0",
    levelRange: "0-100",
    rank: "Coming Soon",
    coreSkill: "Enterprise AI Architecture",
    skillSummary: "Building AI systems at scale for organizations.",
    lesson: `The Architect track is designed for experienced practitioners ready to tackle enterprise-scale challenges. This track covers advanced topics including: AI governance and compliance, multi-tenant system design, cost optimization at scale, security and privacy architecture, and organizational change management.

Coming soon.`,
    keyPrinciples: [
      "Scale introduces complexity",
      "Governance enables trust",
      "Cost optimization is continuous",
      "Security is foundational",
      "People are the hardest part",
    ],
    quests: [],
    order: 0,
  },
];

// ============================================
// BILKO'S WAY TRACK - Meta-Knowledge
// ============================================
export const bilkosWayLevels: AcademyLevel[] = [
  // ── Guide 1: Environment Setup ─────────────────────────
  {
    id: "bilkos-way-level-0",
    levelRange: "0-10",
    rank: "The Machinist",
    coreSkill: "Environment Setup (Expert)",
    skillSummary: "Deep technical understanding of the Replit + Git + Claude development stack.",
    lesson: `This guide breaks down the three foundational tools that power Bilko's AI School—and most modern AI-assisted development. You're reading this as someone who already ships code. Here's how these tools interconnect at the systems level.

**Replit** is a cloud-native IDE built on containerized Linux (Nix-based). Each Repl runs in an isolated container with its own filesystem, network, and process space. For Bilko's project, Replit provides: a full Node.js runtime (Express backend + Vite dev server), a PostgreSQL database via Replit's managed DB, automatic HTTPS and deployment, and persistent storage across sessions. The development server runs on port 5000 with hot module replacement via Vite. The \`replit.nix\` file pins system dependencies. Replit Auth provides user authentication without external OAuth setup.

**Git** operates as the distributed version control backbone. In this project, Git is not just "save points"—it's the collaboration protocol between human developers and AI agents. Every branch represents an isolated experiment. The branching model follows feature-branch workflow: \`main\` is production, feature branches like \`claude/add-environment-setup-topic-5CZEL\` represent AI-assisted development sessions. Git's DAG (directed acyclic graph) of commits mirrors the Flow Engine's own DAG architecture (ARCH-005)—both are about tracking directed, non-circular progressions of state.

**Claude Code** is an AI-powered CLI that runs inside the Replit terminal. It's not a chatbot—it's an agentic coding tool. Claude reads files, searches codebases, executes commands, and writes code through a tool-use protocol. It has access to: Bash (command execution), Read/Write/Edit (file operations), Grep/Glob (search), and Task (spawning sub-agents for complex work). In Bilko's project, Claude Code follows the rules-first architecture (ARCH-000)—it reads \`CLAUDE.md\` and the \`/rules/\` directory before making any changes, ensuring AI-generated code respects the project's governance structure.

**How they connect**: Replit provides the runtime environment → Git manages the code's history and branching → Claude Code operates within both to write, test, and iterate. The feedback loop is: Claude reads the codebase (via Replit's filesystem) → proposes changes (tracked by Git) → tests them (via Replit's runtime) → commits and pushes (via Git) → deployment happens automatically (via Replit). This is a concrete example of the human-AI collaboration loop: you define the intent, Claude executes, Git records, Replit runs.`,
    keyPrinciples: [
      "Replit provides containerized, reproducible environments with built-in deployment",
      "Git's DAG model tracks directed progression of state—same pattern as flow DAGs",
      "Claude Code is agentic, not conversational—it uses tools to read, write, and execute",
      "The three tools form a feedback loop: environment → version control → AI assistance",
      "Rules-first development (ARCH-000) governs how AI agents interact with the codebase",
    ],
    quests: [
      {
        id: "bw-q0-1",
        type: "prompt",
        title: "Map the Architecture",
        platform: "Claude Code",
        description: "Use Claude Code to explore Bilko's project structure. Run 'ls' at the root level and map every top-level directory to its architectural purpose using CLAUDE.md as reference.",
      },
      {
        id: "bw-q0-2",
        type: "quiz",
        title: "DevOps Connections",
        description: "Test your understanding of how Replit, Git, and Claude Code interconnect.",
        tasks: [
          "What container technology does Replit use under the hood?",
          "How does Git's DAG model relate to ARCH-005's flow validation?",
          "What is Claude Code's tool-use protocol and how does it differ from a chatbot?",
          "Trace the path of a code change from intent to deployment in this stack",
        ],
      },
      {
        id: "bw-q0-3",
        type: "build",
        title: "Branch Inspector",
        platform: "Terminal",
        description: "Use git log --graph --oneline to visualize the commit DAG. Identify feature branches, merge points, and map them to development sessions.",
      },
    ],
    subTopics: [
      {
        id: "bw-st0-replit",
        title: "Replit Internals",
        description: "How Replit's container architecture powers the development environment.",
        keyTechniques: [
          "Nix-based dependency management pins exact system package versions",
          "Each Repl is an isolated Linux container with persistent filesystem",
          "Port 5000 is the default dev server—Vite proxies frontend, Express handles API",
          "Replit Auth provides zero-config authentication via headers",
        ],
        platforms: ["Replit", "Nix", "Node.js"],
      },
      {
        id: "bw-st0-git",
        title: "Git as Collaboration Protocol",
        description: "Git's role beyond version control—as the bridge between human and AI development.",
        keyTechniques: [
          "Feature branches isolate AI-assisted changes from production code",
          "Commit messages document AI agent decisions for human review",
          "Git diff provides context for AI agents to understand changes",
          "Branch naming conventions (claude/*) signal AI-generated work",
        ],
        platforms: ["Git", "GitHub"],
      },
    ],
    order: 0,
  },
  {
    id: "bilkos-way-level-1",
    levelRange: "11-20",
    rank: "The Tinkerer",
    coreSkill: "Environment Setup (Intermediate)",
    skillSummary: "Practical understanding of how Replit, Git, and Claude work together.",
    lesson: `You use tools every day—editors, terminals, version control. This guide shows you how three specific tools work together to build an AI-powered application, using Bilko's AI School as a real example.

**Replit** is where the code lives and runs. Think of it as your development computer in the cloud. You don't need to install Node.js, PostgreSQL, or any dependencies—Replit handles all of that. When you open Bilko's project in Replit, you get: a code editor, a terminal, a running web server, and a live preview of the app. Hit "Run" and the whole application starts—the React frontend, the Express backend, and the database connection. Changes you make appear in real-time.

**Git** is how you track and manage changes. Every time you make a meaningful change, you "commit" it—like saving a checkpoint in a video game. You can always go back to any previous checkpoint. Git also enables branching: creating a parallel version of the code where you can experiment without affecting the main version. In Bilko's project, when Claude Code works on a feature, it creates a branch (like \`claude/add-environment-setup-topic-5CZEL\`), makes its changes there, and then those changes can be reviewed and merged into the main codebase.

**Claude Code** is your AI development partner. It runs in the terminal and can: read your project files to understand the codebase, search for patterns across hundreds of files, write new code or modify existing code, run commands to test changes, and create Git commits. It's different from ChatGPT or Claude.ai because it has direct access to your project files. You tell it what you want to build, and it figures out which files to change and how.

**How they work together in Bilko's project**: When adding a new feature to the Academy (like what you're reading right now), the workflow is: Claude Code reads the existing data structure in \`academy-levels.ts\` → understands the Track/Level/Quest pattern → writes new content following that structure → tests that TypeScript compiles without errors → commits the changes to a Git branch → pushes to GitHub. Replit runs the dev server the whole time, so you can see changes live as they're made.`,
    keyPrinciples: [
      "Replit = your development computer in the cloud (code, run, deploy)",
      "Git = your checkpoint system (track changes, branch experiments, merge results)",
      "Claude Code = your AI partner that reads and writes code directly in the project",
      "Together they form a build loop: write → run → test → save → repeat",
      "The project you're reading was built using exactly this workflow",
    ],
    quests: [
      {
        id: "bw-q1-1",
        type: "prompt",
        title: "Tool Walkthrough",
        platform: "Replit",
        description: "Open Bilko's project in Replit. Identify the editor, terminal, and preview panes. Run 'npm run dev' and verify the app starts. Note the port number and URL.",
      },
      {
        id: "bw-q1-2",
        type: "build",
        title: "Your First Branch",
        platform: "Terminal",
        description: "Create a new Git branch, make a small change to any file, commit it with a descriptive message, and then switch back to the main branch. Verify your change disappeared (it's safe on the branch).",
      },
      {
        id: "bw-q1-3",
        type: "prompt",
        title: "Ask Claude Code",
        platform: "Claude Code",
        description: "Ask Claude Code to explain any file in the project. Try: 'What does client/src/data/academy-levels.ts do?' Note how it reads the file before answering.",
      },
      {
        id: "bw-q1-4",
        type: "quiz",
        title: "Workflow Check",
        description: "Test your understanding of the development workflow.",
        tasks: [
          "What happens when you hit 'Run' in Replit?",
          "What is a Git branch and why would you use one?",
          "How is Claude Code different from a regular AI chatbot?",
          "Describe the workflow for adding a new feature to this project",
        ],
      },
    ],
    order: 1,
  },
  {
    id: "bilkos-way-level-2",
    levelRange: "21-30",
    rank: "The First Timer",
    coreSkill: "Environment Setup (Novice)",
    skillSummary: "Understanding the tools behind this project, explained simply.",
    lesson: `Imagine you're building a treehouse. You need three things: a place to build it, a way to remember what you did, and a helper who's really good at construction. That's exactly what Replit, Git, and Claude are for Bilko's AI School.

**Replit is your workshop.** It's like having a fully equipped workshop that exists on the internet. You don't need to buy tools or set anything up—everything is already there. When the creator of Bilko's AI School opens Replit, they see the project's files on the left (like folders in a filing cabinet), a place to write code in the middle (like a workbench), and a preview of the actual website on the right (like a window showing the finished product). If they change something, the preview updates immediately—like magic.

**Git is your journal.** Imagine keeping a detailed diary of every change you make to the treehouse. "Tuesday: Added a window. Wednesday: Painted the door blue. Thursday: Actually, changed the door to red." Git does this for code. Every change is recorded with a note about what was done and why. The best part? You can always go back. If the red door looks terrible, you can flip back to Wednesday and get the blue door back. Git also lets you try experiments safely—like sketching a design on a separate piece of paper before committing to building it.

**Claude is your expert helper.** Imagine having a really knowledgeable friend who can look at your treehouse plans, understand them, and then help you build. That's Claude Code. The creator of Bilko's project tells Claude things like "Add a new topic to the Academy about how our tools work," and Claude figures out which files need to change, writes the new content, and makes sure everything still works. It's like having a construction partner who never gets tired and can read blueprints instantly.

**How they work together—a real example:** The page you're reading right now was created this way: The creator told Claude "Add a new topic about our tools." Claude opened the right files in Replit, wrote the content (these very words!), saved the progress in Git (so nothing gets lost), and the website updated automatically. Three tools, working together, to build something you can see and use right now.`,
    keyPrinciples: [
      "Replit is your workshop—everything you need to build, all in one place on the internet",
      "Git is your journal—it remembers every change so you can always go back",
      "Claude is your expert helper—it reads your project and helps you build",
      "Together they let one person (with AI help) build a whole website",
      "This very page was built using these three tools working together",
    ],
    quests: [
      {
        id: "bw-q2-1",
        type: "prompt",
        title: "Spot the Tools",
        platform: "Any",
        description: "Look at any website you use daily. Can you guess what tools were used to build it? Every website has a 'workshop' (hosting), a 'journal' (version control), and 'helpers' (developers or AI).",
      },
      {
        id: "bw-q2-2",
        type: "quiz",
        title: "The Treehouse Quiz",
        description: "Test your understanding using the treehouse analogy.",
        tasks: [
          "If Replit is the workshop, what is a 'file' in the workshop?",
          "If Git is a journal, what is a 'branch'?",
          "If Claude is a helper, what makes it different from asking a friend?",
          "What happens when all three work together?",
        ],
      },
      {
        id: "bw-q2-3",
        type: "game",
        title: "Build a Story",
        description: "Explain to someone (or write down) how a website gets built, using only everyday objects as analogies. No technical words allowed. Can you make a 5-year-old understand?",
      },
    ],
    order: 2,
  },
  // ── Guide 2: What is an Agent ──────────────────────────
  {
    id: "bilkos-way-level-3",
    levelRange: "31-40",
    rank: "The Puppeteer",
    coreSkill: "What is an Agent (Expert)",
    skillSummary: "Agents as executable DAGs with tool access, memory, and autonomous decision-making.",
    lesson: `An agent is an autonomous software entity that perceives its environment, makes decisions, and takes actions to achieve goals—without step-by-step human instruction for each action. In Bilko's codebase, agents manifest at two architectural layers (ARCH-001): background agents in n8n and in-platform flows powered by the Flow Engine.

**Agent as Directed Acyclic Graph (DAG):** Every in-platform flow in Bilko's project is structurally a DAG—a directed graph with no cycles (ARCH-005 Invariant I1). The Video Discovery flow demonstrates this: \`research-topics\` → \`prefetch-videos\` (parallel) → \`validate-videos\` → \`select-topic\` (user-input) → \`display-video\`. Each node is a step with a type contract: \`llm\` steps require a prompt and output schema, \`validate\` steps verify data integrity, \`user-input\` steps pause for human interaction, and \`display\` steps render results. The DAG enforces that dependencies flow forward—step B can depend on step A's output, but never vice versa.

**Agent as Dataflow:** Data flows through the DAG like water through pipes. Each step transforms its inputs into outputs. The \`research-topics\` step outputs \`{topics: [...]}\`. The \`prefetch-videos\` step consumes that array and outputs \`{videos: [...]}\` for each topic—running in parallel (the \`parallel: true\` flag). The \`validate-videos\` step filters invalid YouTube IDs. This is a dataflow architecture: the computation is defined by data transformations, not control flow.

**Agent as Input/Output Sequence:** At the most fundamental level, an agent is a sequence of input→process→output operations. In the Flow Engine: Step receives input (from dependencies or user) → Processes it (LLM call, validation, transformation) → Produces output (structured data). The \`StepExecution\` trace captures this precisely: \`startedAt\`, \`input\`, \`output\`, \`completedAt\`, \`tokenUsage\`. Every agent action is auditable.

**The Flow Inspector** (accessible at \`/flows\`) visualizes all of this. It renders the DAG as an interactive canvas with Sugiyama-style layout, where you can inspect each step's prompt, schema, execution trace, and dependency chain. The inspector itself is a teaching tool—it exposes the agent's internals as a browsable interface.

**Beyond flows—n8n agents:** The background layer (n8n) hosts PER-001 agents: scheduled workflows that run autonomously. Content pipelines that generate daily briefings. Monitoring agents that check system health. These are true proactive agents—they don't wait for user input; they operate on schedules and triggers.`,
    keyPrinciples: [
      "An agent is an autonomous entity that perceives, decides, and acts toward goals",
      "In-platform flows are executable DAGs validated by ARCH-005 steel frame invariants",
      "Dataflow architecture: computation defined by data transformations, not control flow",
      "Every agent action produces auditable StepExecution traces with timing and I/O",
      "The Flow Inspector at /flows exposes agent internals as an interactive visualization",
    ],
    quests: [
      {
        id: "bw-q3-1",
        type: "build",
        title: "Trace the DAG",
        platform: "Bilko's Flow Inspector",
        description: "Open /flows in the app. Select the Video Discovery flow. Map every step's dependencies and identify which steps run in parallel vs sequential. Draw the DAG on paper.",
      },
      {
        id: "bw-q3-2",
        type: "prompt",
        title: "Agent Anatomy",
        platform: "Claude Code",
        description: "Read client/src/lib/flow-inspector/registry.ts. For each step in the video-discovery flow, identify: step type, input schema, output schema, and dependencies.",
      },
      {
        id: "bw-q3-3",
        type: "quiz",
        title: "Agent Architecture Quiz",
        description: "Test your understanding of agent internals.",
        tasks: [
          "What ARCH-005 invariant prevents circular dependencies in a flow?",
          "What is the difference between an llm step and a validate step?",
          "How does the parallel flag change execution behavior?",
          "What data does a StepExecution trace capture?",
        ],
      },
      {
        id: "bw-q3-4",
        type: "capstone",
        title: "Design an Agent",
        platform: "Paper + Code",
        description: "Design a new flow as a DAG: define steps, types, dependencies, and I/O schemas. Validate it mentally against ARCH-005 invariants (no cycles, unique IDs, valid deps).",
      },
    ],
    subTopics: [
      {
        id: "bw-st3-dag",
        title: "DAG Architecture",
        description: "How directed acyclic graphs structure agent execution in the Flow Engine.",
        keyTechniques: [
          "I1: No cycles—dependencies must flow forward only",
          "I2: At least one root step (no dependencies) to start execution",
          "I3: No orphan steps—every step must be reachable from a root",
          "Sugiyama layout algorithm converts DAG to visual coordinates",
        ],
        platforms: ["Flow Engine", "Flow Inspector"],
      },
      {
        id: "bw-st3-dataflow",
        title: "Dataflow Patterns",
        description: "How data transforms as it moves through agent steps.",
        keyTechniques: [
          "Each step's output becomes available to dependent steps' inputs",
          "Parallel steps process the same input concurrently (fan-out pattern)",
          "Validation steps filter bad data before it reaches downstream steps",
          "User-input steps pause the dataflow for human interaction",
        ],
        platforms: ["Flow Engine", "chatJSON"],
      },
    ],
    order: 3,
  },
  {
    id: "bilkos-way-level-4",
    levelRange: "41-50",
    rank: "The Flow Walker",
    coreSkill: "What is an Agent (Intermediate)",
    skillSummary: "Agents as organized sequences of AI-powered steps that work together.",
    lesson: `An agent is like a smart assembly line. Instead of one AI answering one question, an agent breaks a complex task into steps, handles each step with the right tool, and delivers a complete result.

**Think of it like a restaurant kitchen.** When you order a meal, there isn't one person doing everything. There's someone who takes the order, someone who preps ingredients, someone who cooks, someone who plates, and someone who delivers. Each person has a specific job, and they pass their work to the next person. An AI agent works the same way.

**In Bilko's project, the Flow Engine is the kitchen.** Take the Video Discovery feature on the landing page. When Bilko suggests "Let me find some AI videos for you," here's what actually happens behind the scenes:
1. **Research step** — AI generates 5 trending AI topics (like a chef deciding today's specials)
2. **Video search step** — For each topic, AI finds 3 real YouTube videos (like sourcing ingredients)
3. **Validation step** — The system checks that the YouTube videos actually exist and can be played (quality control)
4. **User choice step** — You pick which topic interests you (the waiter takes your order)
5. **Display step** — The selected video is presented with full details (plating and serving)

**Each step has a clear job.** Some steps use AI (the "llm" type), some wait for your input (the "user-input" type), some check data quality (the "validate" type), and some show results (the "display" type). The steps are connected—each one knows which previous steps it needs data from.

**You can actually see this in action.** Bilko's project has a Flow Inspector (at /flows) that shows a visual diagram of each agent. Each step is a box, and arrows show how data flows between them. It's like looking at the blueprint of the kitchen.

**Agent as workflow:** At its core, an agent is just a workflow—a planned sequence of actions. But unlike a simple automation that follows the same path every time, an agent can make decisions. The AI steps can produce different outputs based on context. The validation steps can filter out bad data. The user-input steps can redirect the flow based on your choices.`,
    keyPrinciples: [
      "An agent breaks a complex task into manageable steps, each with a specific job",
      "Steps are connected—data flows from one step to the next like an assembly line",
      "Different step types handle different jobs: AI calls, validation, user input, display",
      "The Flow Inspector shows you a visual diagram of how agent steps connect",
      "Agents are smarter than simple automations because AI steps can make decisions",
    ],
    quests: [
      {
        id: "bw-q4-1",
        type: "prompt",
        title: "Kitchen Blueprint",
        platform: "Any",
        description: "Think of a task you do that has multiple steps (planning a trip, cooking a recipe, organizing an event). Break it into 5 steps and label each as: AI step, human step, or check step.",
      },
      {
        id: "bw-q4-2",
        type: "build",
        title: "Explore the Inspector",
        platform: "Bilko's App",
        description: "Navigate to /flows in Bilko's app. Click on any flow and explore the visual diagram. Identify which steps use AI and which wait for user input.",
      },
      {
        id: "bw-q4-3",
        type: "quiz",
        title: "Agent Basics",
        description: "Test your understanding of agent concepts.",
        tasks: [
          "What's the difference between a simple automation and an agent?",
          "Why are steps connected with arrows (dependencies)?",
          "What happens when a validation step finds bad data?",
          "How does a user-input step change the flow?",
        ],
      },
      {
        id: "bw-q4-4",
        type: "game",
        title: "Step Type Sorting",
        description: "Given 10 tasks (like 'ask AI to summarize', 'show results on screen', 'check if link works', 'ask user to pick'), sort them into step types: llm, validate, user-input, display.",
      },
    ],
    order: 4,
  },
  {
    id: "bilkos-way-level-5",
    levelRange: "51-60",
    rank: "The Storyteller",
    coreSkill: "What is an Agent (Novice)",
    skillSummary: "Understanding AI agents through everyday stories.",
    lesson: `Have you ever asked someone to plan a birthday party for you? Not just "get a cake"—the whole thing. They need to figure out a theme, find a venue, make a guest list, send invitations, order food, set up decorations, and make sure everything happens in the right order. That person is acting like an agent.

**An AI agent works the same way.** Instead of you telling the AI every single thing to do one at a time, you give it a goal: "Find me interesting AI videos to watch." Then the agent figures out the steps on its own:
- First, it thinks about what AI topics are popular right now
- Then, it searches for good videos about each topic
- Then, it checks that the videos actually work (no broken links!)
- Then, it shows you the options and lets you pick
- Finally, it presents your chosen video with all the details

**Each step is like giving a task to a different helper.** One helper is great at research (the AI brain). Another is great at checking things (the quality checker). Another waits for you to decide (the assistant who asks "which one do you prefer?"). And the last one presents the final result beautifully (the presenter).

**The helpers pass notes to each other.** The researcher writes down the topics and passes the note to the video finder. The video finder writes down the videos and passes the note to the quality checker. Each helper needs the previous helper's work before they can do their job. It's like a relay race—each runner needs the baton from the previous runner.

**You can actually peek behind the curtain.** In Bilko's app, there's a special page called "Flows" that shows you a picture of how the helpers are connected. It looks like a map with boxes (the helpers) and arrows (the notes being passed). It's like seeing the birthday party planning board with all the tasks and who does what.

**Why is this exciting?** Because instead of you doing all the work yourself, or even asking AI one question at a time, the agent handles the whole process. You say what you want, and it figures out how to get there. It's like the difference between driving a car yourself and having a self-driving car—you set the destination, and the system handles the journey.`,
    keyPrinciples: [
      "An agent is like a party planner—you give it a goal, it figures out the steps",
      "Different helpers handle different jobs: thinking, checking, asking, and showing",
      "The helpers pass notes to each other—each one needs the previous one's work",
      "You can peek behind the curtain in the Flows page to see how helpers connect",
      "Agents let you say what you want instead of telling AI every single step",
    ],
    quests: [
      {
        id: "bw-q5-1",
        type: "game",
        title: "Party Planner",
        description: "Plan a birthday party by breaking it into steps. Who does what? What order? Which steps need previous steps to finish first? Draw it as a simple map with boxes and arrows.",
      },
      {
        id: "bw-q5-2",
        type: "prompt",
        title: "Agent Spotter",
        platform: "Any",
        description: "Think of 3 things in daily life that work like agents (GPS navigation, recipe apps, customer service). What are the 'helpers' in each one? What 'notes' do they pass?",
      },
      {
        id: "bw-q5-3",
        type: "quiz",
        title: "Helper Matching",
        description: "Match everyday jobs to agent step types.",
        tasks: [
          "A librarian who finds books → which type of helper?",
          "A proofreader who checks for errors → which type of helper?",
          "A waiter who asks 'what would you like?' → which type of helper?",
          "A presenter who shows the final result → which type of helper?",
        ],
      },
    ],
    order: 5,
  },
  // ── Guide 3: Prompt → Agent → Reactive AI → Proactive AI ──
  {
    id: "bilkos-way-level-6",
    levelRange: "61-70",
    rank: "The Philosopher",
    coreSkill: "The AI Spectrum (Expert)",
    skillSummary: "From single prompts to autonomous proactive systems—the full evolution of AI capability.",
    lesson: `AI capability exists on a spectrum. Understanding where you are on this spectrum—and where you're heading—is essential for designing systems. This guide maps the four stages and how Bilko's architecture embodies each one.

**Stage 1: Prompt (Stateless Interaction)**
A prompt is a single input→output exchange with zero memory. You send text, you get text back. This is \`chatJSON<T>()\` in its simplest form—one call to Gemini, one structured response. No state persists between calls. No tools are invoked. The LLM is a pure function: f(prompt) → response. In Bilko's project, the Prompt Playground (interactive quests in the Academy) operates at this level. Users type a prompt, get a response, and the conversation resets.

**Stage 2: Agent (Multi-Step with Tools)**
An agent chains multiple prompts into a workflow, adds tool access, and maintains state across steps. The Flow Engine elevates from prompt to agent: multiple \`chatJSON<T>()\` calls connected in a DAG, with validation steps, user-input steps, and structured I/O between steps. The agent maintains execution state (StepExecution traces), has access to tools (YouTube validation, data transformation), and can make conditional decisions based on intermediate results. Claude Code itself is an agent—it reads files, reasons about changes, writes code, and tests results across multiple interactions.

**Stage 3: Reactive AI (Event-Driven Response)**
Reactive AI responds to external triggers without human initiation. It monitors events and acts when conditions are met. In Bilko's architecture, this is the n8n integration layer: webhooks trigger workflows (\`POST /api/workflows/callback\`), scheduled triggers run workflows at set times, and the orchestrator (\`POST /api/orchestrate/:workflowId\`) bridges external events to internal processing. The system doesn't wait for you to ask—it responds to events. Form submissions trigger processing. New content triggers categorization. Errors trigger alerts.

**Stage 4: Proactive AI (Autonomous Goal Pursuit)**
Proactive AI initiates actions toward goals without being triggered. It monitors, analyzes, decides, and acts. This is the frontier. In Bilko's vision, proactive AI would: monitor Academy usage patterns and generate new content for popular topics before users ask, detect knowledge gaps from quiz results and create targeted lessons, optimize content pipelines based on engagement metrics, and self-correct when content quality drops. The architecture supports this—n8n's scheduled workflows plus the orchestrator pattern enable autonomous operation. But the governance structure (ARCH-000) requires human oversight at decision points. True proactive AI requires trust boundaries.

**The evolution is not replacement—it's layering.** Proactive AI still uses prompts. Agents still make individual LLM calls. Reactive systems still contain agent workflows. Each stage builds on the previous one, adding autonomy, context, and initiative.`,
    keyPrinciples: [
      "Prompt = stateless single exchange, Agent = multi-step with tools and state",
      "Reactive AI = event-driven (responds to triggers), Proactive AI = goal-driven (initiates actions)",
      "Each stage builds on the previous—proactive systems contain reactive, agentic, and prompt layers",
      "Bilko's architecture embodies all four stages across its dual-layer design (ARCH-001)",
      "Proactive AI requires trust boundaries and governance (ARCH-000) for safe autonomous operation",
    ],
    quests: [
      {
        id: "bw-q6-1",
        type: "prompt",
        title: "Spectrum Mapper",
        platform: "Claude Code",
        description: "Read the codebase and identify one concrete example of each stage: a pure prompt call, an agent flow, a reactive trigger, and a design pattern that enables proactive behavior.",
      },
      {
        id: "bw-q6-2",
        type: "build",
        title: "Classify the System",
        platform: "Bilko's App",
        description: "Map every API endpoint in Bilko's project to a spectrum stage. Is /api/llm/chat a prompt or agent? Is /api/workflows/callback reactive? Document your classification.",
      },
      {
        id: "bw-q6-3",
        type: "quiz",
        title: "AI Spectrum Quiz",
        description: "Test your understanding of the four stages.",
        tasks: [
          "What makes an agent different from a sequence of prompts?",
          "What distinguishes reactive AI from proactive AI?",
          "Why does proactive AI need governance boundaries?",
          "How do the four stages layer on top of each other?",
        ],
      },
      {
        id: "bw-q6-4",
        type: "capstone",
        title: "Design a Proactive System",
        platform: "Paper + Architecture",
        description: "Design a proactive AI system for Bilko's Academy that detects when students struggle with a topic and automatically generates supplementary content. Define: triggers, agent flows, trust boundaries.",
      },
    ],
    subTopics: [
      {
        id: "bw-st6-reactive",
        title: "Reactive Patterns",
        description: "How event-driven architectures enable AI systems that respond to the world.",
        keyTechniques: [
          "Webhook triggers: external events fire n8n workflows automatically",
          "Orchestrator pattern: POST /api/orchestrate/:workflowId bridges events to processing",
          "Callback system: n8n reports execution results back to Bilko for tracking",
          "Scheduled triggers: cron-based workflows run without human initiation",
        ],
        platforms: ["n8n", "Express", "Webhooks"],
      },
      {
        id: "bw-st6-proactive",
        title: "Proactive Patterns",
        description: "Design patterns for AI systems that initiate actions toward goals autonomously.",
        keyTechniques: [
          "Monitoring loops: continuously observe metrics and detect anomalies",
          "Self-correction: detect quality degradation and adjust parameters",
          "Goal decomposition: break high-level goals into sub-tasks autonomously",
          "Trust boundaries: governance rules that limit autonomous scope (ARCH-000)",
        ],
        platforms: ["n8n", "ARCH-000", "Autonomous Systems"],
      },
    ],
    order: 6,
  },
  {
    id: "bilkos-way-level-7",
    levelRange: "71-80",
    rank: "The Pathfinder",
    coreSkill: "The AI Spectrum (Intermediate)",
    skillSummary: "Understanding the four levels of AI capability and where current tools fit.",
    lesson: `AI tools aren't all the same. They exist on a spectrum from simple to sophisticated. Understanding this spectrum helps you choose the right tool for each job—and see where the technology is heading.

**Level 1: Prompt — Ask and receive.**
This is the simplest interaction with AI. You type a question or instruction, and you get a response. Like texting a knowledgeable friend. Each conversation starts fresh—the AI doesn't remember previous conversations. In Bilko's app, when you use the Prompt Playground to test an exercise, that's prompt-level AI. You send a message, you get a response, done.

**Level 2: Agent — A team that works together.**
An agent is a step up. Instead of one question and one answer, an agent handles a whole task by breaking it into steps. Bilko's Video Discovery feature is an agent: it researches topics, finds videos, checks they work, lets you choose, and presents the result. Five steps, all coordinated automatically. The agent remembers what happened in previous steps and uses that information to make the next step better. It can also use tools—like checking if a YouTube link actually works.

**Level 3: Reactive AI — Responds to events automatically.**
This is AI that doesn't need you to push a button. Something happens in the world (someone submits a form, a new article is published, a scheduled time arrives), and the AI system responds automatically. In Bilko's project, n8n workflows can run on schedules or respond to webhooks. A content pipeline might automatically process new content every morning without anyone asking it to. You set it up once, and it reacts to events on its own.

**Level 4: Proactive AI — Takes initiative.**
This is the frontier—AI that doesn't just respond to events, but actively pursues goals. Instead of waiting for you to ask "are there any problems?", proactive AI monitors the system and tells you "I noticed students are struggling with RAG concepts, so I created a supplementary guide." It identifies opportunities and acts on them. This is where AI starts to feel less like a tool and more like a colleague. Bilko's project is designed to eventually support this—the architecture is there, but true proactive behavior is still being explored.

**Where are we today?** Most AI tools you use are at Level 1 (prompts) or Level 2 (agents). Level 3 (reactive) is growing fast—tools like n8n, Zapier, and Make are making it accessible. Level 4 (proactive) is experimental and requires careful design to ensure the AI makes good decisions without constant supervision.`,
    keyPrinciples: [
      "Prompt = one question, one answer, no memory between interactions",
      "Agent = multiple steps coordinated together, with memory and tool access",
      "Reactive AI = responds to events automatically without you pushing a button",
      "Proactive AI = takes initiative and acts toward goals on its own",
      "Most tools today are at Level 1-2; Level 3 is growing; Level 4 is the frontier",
    ],
    quests: [
      {
        id: "bw-q7-1",
        type: "prompt",
        title: "Level Your Tools",
        platform: "Any",
        description: "List 5 AI tools or features you've used. Classify each as Prompt, Agent, Reactive, or Proactive. Which level do most of them fall into?",
      },
      {
        id: "bw-q7-2",
        type: "game",
        title: "Spectrum Sorting",
        description: "Sort these into the right level: ChatGPT conversation (___), email auto-responder (___), Bilko's Video Discovery (___), spam filter that learns (___), calendar that suggests meeting times (___), AI that writes weekly reports automatically (___).",
      },
      {
        id: "bw-q7-3",
        type: "quiz",
        title: "Four Levels Quiz",
        description: "Test your understanding of the AI spectrum.",
        tasks: [
          "What's the key difference between Level 1 and Level 2?",
          "Give an example of Reactive AI you might use daily",
          "Why is Proactive AI harder to build than Reactive AI?",
          "Can a system use multiple levels at once?",
        ],
      },
      {
        id: "bw-q7-4",
        type: "build",
        title: "Upgrade a Prompt",
        platform: "Conceptual",
        description: "Take a simple prompt-level task (like 'summarize this article') and design how you'd upgrade it to each level: Agent (multi-step), Reactive (triggered automatically), and Proactive (initiates on its own).",
      },
    ],
    order: 7,
  },
  {
    id: "bilkos-way-level-8",
    levelRange: "81-90",
    rank: "The Wonderer",
    coreSkill: "The AI Spectrum (Novice)",
    skillSummary: "How AI goes from answering questions to doing things on its own.",
    lesson: `Let's talk about four levels of helpfulness, using something everyone understands: having a personal assistant.

**Level 1: The Answer Machine.**
You ask a question, you get an answer. "What's the weather today?" → "Sunny and 72 degrees." That's it. Next time you ask, they don't remember the previous conversation. It's like calling a help line—each call starts fresh. This is what most AI chatbots do: you type, they respond, conversation over. Useful, but limited.

**Level 2: The Task Handler.**
Now imagine your assistant doesn't just answer questions—they handle entire tasks. You say "Plan a movie night," and they: look up what's playing, check review scores, find showtimes that work for your schedule, and present you with three options. Multiple steps, all handled for you. They remember what they learned in step 1 when they get to step 3. This is what an AI agent does. In Bilko's app, when it finds AI videos for you, it's doing exactly this—researching, searching, checking, and presenting, all from a single request.

**Level 3: The Responsive Helper.**
Your assistant starts doing things without you asking—but only when something happens. Your flight gets delayed? They automatically rebook your connecting flight and notify your hotel. A bill arrives? They schedule the payment. They're watching for events and responding. You set up the rules once ("if my flight changes, handle it"), and they take it from there. This is reactive AI—it responds to things happening in the world.

**Level 4: The Initiative Taker.**
This is the most advanced level. Your assistant doesn't just respond to events—they look ahead and act. They notice you have a busy week coming up, so they pre-order groceries. They see a pattern in your spending and suggest a budget adjustment. They find an interesting article about a topic you've been curious about and share it before you ask. They take initiative. This is proactive AI—and it's what the future looks like.

**From Bilko's perspective:** Right now, Bilko's app mostly works at Level 1 (the Prompt Playground) and Level 2 (the Video Discovery agent). The n8n workflows behind the scenes add Level 3 capabilities. Level 4 is the dream—imagine if the Academy noticed you were interested in agents and automatically created more content about that topic. That's where this is heading.

**The exciting part:** We're living through this evolution right now. Five years ago, most people had never talked to an AI. Today, agents are becoming mainstream. Tomorrow, AI helpers that take initiative will be normal. You're watching it happen.`,
    keyPrinciples: [
      "Level 1 (Answer Machine): Ask a question, get an answer, that's it",
      "Level 2 (Task Handler): Give a task, the AI handles all the steps for you",
      "Level 3 (Responsive Helper): The AI watches for events and acts automatically",
      "Level 4 (Initiative Taker): The AI looks ahead and does things before you ask",
      "We're living through this evolution right now—most tools are at Level 1-2",
    ],
    quests: [
      {
        id: "bw-q8-1",
        type: "game",
        title: "Level the Helpers",
        description: "Think of 5 'helpers' in your daily life (apps, services, people). What level is each one? A calculator? A GPS? A spam filter? A personal shopper? Your mom who packs your lunch before you ask?",
      },
      {
        id: "bw-q8-2",
        type: "prompt",
        title: "Future Vision",
        platform: "Any",
        description: "Pick something you do every week that's tedious. Describe what a Level 4 (Initiative Taker) AI assistant would do about it. How would it notice the problem? What would it do about it?",
      },
      {
        id: "bw-q8-3",
        type: "quiz",
        title: "The Helpfulness Quiz",
        description: "Match the description to the level.",
        tasks: [
          "You ask 'What's 2+2?' and get '4' → which level?",
          "You say 'Plan my vacation' and get a full itinerary → which level?",
          "Your thermostat adjusts when you leave the house → which level?",
          "Your fridge orders milk before you run out → which level?",
        ],
      },
    ],
    order: 8,
  },
];

// ============================================
// TRACK DEFINITIONS
// ============================================
export const academyTracks: Track[] = [
  {
    id: "recruit",
    name: "Recruit to Operator",
    tagline: "From Zero to Builder",
    description:
      "The entry-level path for absolute beginners. No coding experience required—just curiosity and a web browser. Learn to harness AI through conversation, visual tools, and 'Digital Lego' blocks.",
    difficulty: "beginner",
    color: "emerald",
    journey: [
      {
        id: "recruit-foundation",
        name: "Discovery",
        levelRange: "0-30",
        description:
          "See magic happen. Create with AI using just your words—no code, no complexity. Build websites by describing them and automate your first tasks.",
        icon: "seedling",
      },
      {
        id: "recruit-integration",
        name: "Utility",
        levelRange: "31-60",
        description:
          "Solve real problems. Automate data capture, let AI research for you, and build systems that categorize and organize automatically.",
        icon: "zap",
      },
      {
        id: "recruit-mastery",
        name: "Creation",
        levelRange: "61-100",
        description:
          "Build products. Generate content, respond to users, create chatbots, and connect frontends to backends—you're a builder now.",
        icon: "sparkles",
      },
    ],
    levels: recruitLevels,
  },
  {
    id: "specialist",
    name: "Specialist Path",
    tagline: "Deep Technical Mastery",
    description:
      "The intermediate-to-advanced path for those with some technical foundation. Dive deep into prompting, RAG, function calling, multi-agent systems, and production AI development.",
    difficulty: "intermediate",
    color: "blue",
    journey: [
      {
        id: "specialist-foundation",
        name: "Foundation",
        levelRange: "0-30",
        description:
          "Learn AI's language. Generate interfaces, automate workflows, and master prompting across text, image, video, and audio.",
        icon: "seedling",
      },
      {
        id: "specialist-integration",
        name: "Integration",
        levelRange: "31-60",
        description:
          "Connect AI to the real world. Extract data, give AI long-term memory with RAG, and build intelligent routing systems.",
        icon: "zap",
      },
      {
        id: "specialist-mastery",
        name: "Mastery",
        levelRange: "61-100",
        description:
          "Build autonomous systems. Give AI hands with function calling, orchestrate agent teams, and create self-sustaining systems.",
        icon: "sparkles",
      },
    ],
    levels: specialistLevels,
  },
  {
    id: "architect",
    name: "Architect Path",
    tagline: "Enterprise Scale",
    description:
      "The expert path for seasoned practitioners. Design AI systems for organizations, manage governance and compliance, and lead AI transformation at scale.",
    difficulty: "advanced",
    color: "purple",
    journey: [
      {
        id: "architect-foundation",
        name: "Foundations",
        levelRange: "0-30",
        description:
          "Enterprise patterns, governance frameworks, and organizational design for AI adoption.",
        icon: "seedling",
      },
      {
        id: "architect-integration",
        name: "Systems",
        levelRange: "31-60",
        description:
          "Multi-tenant architectures, cost optimization, security patterns, and compliance frameworks.",
        icon: "zap",
      },
      {
        id: "architect-mastery",
        name: "Leadership",
        levelRange: "61-100",
        description:
          "AI strategy, change management, team building, and organizational transformation.",
        icon: "sparkles",
      },
    ],
    levels: architectLevels,
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================
export function getTrackById(trackId: string): Track | undefined {
  return academyTracks.find((track) => track.id === trackId);
}

export function getLevelById(levelId: string): AcademyLevel | undefined {
  for (const track of academyTracks) {
    const level = track.levels.find((l) => l.id === levelId);
    if (level) return level;
  }
  return undefined;
}

export function getLevelsByTrack(trackId: string): AcademyLevel[] {
  const track = getTrackById(trackId);
  return track?.levels || [];
}

export function getTrackForLevel(levelId: string): Track | undefined {
  return academyTracks.find((track) =>
    track.levels.some((l) => l.id === levelId)
  );
}

export function getSubTopicById(
  levelId: string,
  subTopicId: string
): SubTopic | undefined {
  const level = getLevelById(levelId);
  return level?.subTopics?.find((st) => st.id === subTopicId);
}

// Legacy export for backward compatibility
export const academyLevels = specialistLevels;
