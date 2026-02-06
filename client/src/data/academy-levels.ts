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
