import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Brain,
  Sparkles,
  Play,
  Video as VideoIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  videoCategories,
  getCategoryById as getVideoCategoryById,
  getVideoById,
  getCategoryForVideo,
  type VideoCategory,
} from "@/data/academy-videos";
import { useNavigation } from "@/contexts/navigation-context";
import { NavPanel } from "@/components/nav";
import { VideoExperienceRenderer } from "@/components/content-blocks";

const videoCategoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  Video: VideoIcon,
  Sparkles,
  Play,
};

// ── Presentation components ─────────────────────────────

function VideoOverview({
  onSelectCategory,
}: {
  onSelectCategory: (id: string) => void;
}) {
  const totalVideos = videoCategories.reduce((sum, cat) => sum + cat.videos.length, 0);

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-6 border-b bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <VideoIcon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">Video Library</h1>
            <p className="text-muted-foreground">
              Curated video content with AI-powered learning tools
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-primary">{videoCategories.length}</div>
            <div className="text-xs text-muted-foreground">Categories</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-primary">{totalVideos}</div>
            <div className="text-xs text-muted-foreground">Videos</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-4">Browse by Category</h2>
          <div className="grid gap-4">
            {videoCategories.map((cat) => {
              const IconComponent = videoCategoryIcons[cat.icon] || VideoIcon;
              return (
                <Card
                  key={cat.id}
                  className="cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors"
                  onClick={() => onSelectCategory(cat.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{cat.title}</CardTitle>
                          <CardDescription>{cat.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline">{cat.videos.length} videos</Badge>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function VideoCategoryOverview({
  category,
  onSelectVideo,
  onBack,
}: {
  category: VideoCategory;
  onSelectVideo: (id: string) => void;
  onBack: () => void;
}) {
  const IconComponent = videoCategoryIcons[category.icon] || VideoIcon;

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-4 border-b bg-muted/30">
        <div className="md:hidden mb-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Video
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{category.title}</h2>
            <p className="text-sm text-muted-foreground">{category.videos.length} videos</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About This Category</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{category.description}</p>
          </CardContent>
        </Card>

        <section>
          <h3 className="text-lg font-semibold mb-4">Videos</h3>
          <div className="space-y-3">
            {category.videos.map((video) => (
              <Card
                key={video.id}
                className="cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors"
                onClick={() => onSelectVideo(video.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-16 bg-muted rounded overflow-hidden shrink-0">
                      <img
                        src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{video.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>
                      <div className="flex gap-2 mt-2">
                        {video.tags?.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Section component: self-contained state + nav + content ──

export function VideoSection() {
  const nav = useNavigation();
  const isL3Collapsed = nav.isCollapsed(3);
  const isL4Collapsed = nav.isCollapsed(4);

  const [selectedVideoCategoryId, setSelectedVideoCategoryId] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const selectedVideoCategory = selectedVideoCategoryId ? getVideoCategoryById(selectedVideoCategoryId) : null;
  const selectedVideo = selectedVideoId ? getVideoById(selectedVideoId) : null;

  const handleSelectVideoCategory = (categoryId: string) => {
    setSelectedVideoCategoryId(categoryId);
    setSelectedVideoId(null);
    nav.selectAtLevel(3, categoryId);
  };

  const handleSelectVideo = (videoId: string) => {
    setSelectedVideoId(videoId);
    if (!selectedVideoCategoryId) {
      const cat = getCategoryForVideo(videoId);
      if (cat) setSelectedVideoCategoryId(cat.id);
    }
    nav.selectAtLevel(4, videoId);
  };

  const handleBackFromVideo = () => {
    setSelectedVideoId(null);
    nav.goBack(4);
  };

  const handleBackFromVideoCategory = () => {
    setSelectedVideoCategoryId(null);
    setSelectedVideoId(null);
    nav.goBack(3);
  };

  return (
    <>
      <NavPanel
        header="Categories"
        items={videoCategories.map((cat) => ({
          id: cat.id,
          label: cat.title,
          icon: videoCategoryIcons[cat.icon] || VideoIcon,
        }))}
        selectedId={selectedVideoCategoryId}
        onSelect={handleSelectVideoCategory}
        isCollapsed={isL3Collapsed}
        onToggleCollapse={() => nav.toggleCollapse(3)}
      />

      {selectedVideoCategory && (
        <NavPanel
          header="Videos"
          items={selectedVideoCategory.videos.map((video, idx) => ({
            id: video.id,
            label: video.title,
            shortLabel: String(idx + 1),
          }))}
          selectedId={selectedVideoId}
          onSelect={handleSelectVideo}
          isCollapsed={isL4Collapsed}
          onToggleCollapse={() => nav.toggleCollapse(4)}
          expandedWidth="min-w-[8rem] max-w-[9rem]"
          collapsedWidth="min-w-8 max-w-8"
          bg="bg-muted/5"
        />
      )}

      {selectedVideo ? (
        <VideoExperienceRenderer block={{
          id: selectedVideo.id,
          type: "video-experience",
          embedId: selectedVideo.youtubeId,
          title: selectedVideo.title,
          description: selectedVideo.description,
          creator: selectedVideo.creator,
          tags: selectedVideo.tags,
          youtubeUrl: selectedVideo.youtubeUrl,
        }} />
      ) : selectedVideoCategory ? (
        <VideoCategoryOverview
          category={selectedVideoCategory}
          onSelectVideo={handleSelectVideo}
          onBack={handleBackFromVideoCategory}
        />
      ) : (
        <VideoOverview onSelectCategory={handleSelectVideoCategory} />
      )}
    </>
  );
}
