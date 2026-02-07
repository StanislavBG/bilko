export * from "./types";
export { bilkoSays, bilkoTransition } from "./voice";
export * from "./pacing";
export { BILKO_IDENTITY, bilkoSystemPrompt } from "./system-prompt";
export type { ContextTier, CommunicationContext } from "./context-tiers";
// Conversation design framework lives in contexts/conversation-design-context.tsx
// — re-exported here for discoverability
export { useConversationDesign, ConversationDesignProvider } from "@/contexts/conversation-design-context";
