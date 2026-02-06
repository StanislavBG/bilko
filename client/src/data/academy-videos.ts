/**
 * Academy Videos - Curated video content for AI learning
 *
 * Structure:
 * - Video Categories (L3 navigation)
 * - Individual Videos (L4 navigation)
 */

export interface Video {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  youtubeUrl: string;
  creator: string;
  duration?: string;
  tags?: string[];
}

export interface VideoCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  videos: Video[];
}

export const videoCategories: VideoCategory[] = [
  {
    id: "thought-provoking",
    title: "Thought Provoking",
    description: "Mind-expanding content that challenges your understanding of AI and its implications",
    icon: "Brain",
    videos: [
      {
        id: "video-3lPnN8omdPA",
        title: "The AI Revolution",
        description: "A deep exploration of how AI is transforming our world and what it means for humanity",
        youtubeId: "3lPnN8omdPA",
        youtubeUrl: "https://www.youtube.com/watch?v=3lPnN8omdPA",
        creator: "Unknown",
        tags: ["AI", "Future", "Society"],
      },
      {
        id: "video-ivVPJhYM8Ng",
        title: "Understanding Intelligence",
        description: "What does it really mean for machines to be intelligent?",
        youtubeId: "ivVPJhYM8Ng",
        youtubeUrl: "https://www.youtube.com/watch?v=ivVPJhYM8Ng",
        creator: "Unknown",
        tags: ["Intelligence", "Philosophy", "AI"],
      },
      {
        id: "video-wv779vmyPVY",
        title: "The Future of AI",
        description: "Exploring the possibilities and challenges ahead",
        youtubeId: "wv779vmyPVY",
        youtubeUrl: "https://www.youtube.com/watch?v=wv779vmyPVY",
        creator: "Unknown",
        tags: ["Future", "Trends", "AI"],
      },
    ],
  },
];

// Helper functions
export function getCategoryById(id: string): VideoCategory | undefined {
  return videoCategories.find((c) => c.id === id);
}

export function getVideoById(id: string): Video | undefined {
  for (const category of videoCategories) {
    const video = category.videos.find((v) => v.id === id);
    if (video) return video;
  }
  return undefined;
}

export function getCategoryForVideo(videoId: string): VideoCategory | undefined {
  return videoCategories.find((c) => c.videos.some((v) => v.id === videoId));
}

export function getAllVideos(): Video[] {
  return videoCategories.flatMap((c) => c.videos);
}
