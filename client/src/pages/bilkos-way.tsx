import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContent } from "@/components/page-content";
import { NavPanel } from "@/components/nav";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { writeUps, getWriteUpById, thinkingVideos, type WriteUp, type Video } from "@/data/bilkos-way";

type NavItem = { id: string; label: string; shortLabel: string; section?: "writeups" | "videos" };

const VIDEOS_HEADER_ID = "__videos_header__";

function WriteUpDetail({
  writeUp,
  onBack,
}: {
  writeUp: WriteUp;
  onBack?: () => void;
}) {
  return (
    <div
      className="flex-1 overflow-auto bg-background"
      data-testid={`detail-writeup-${writeUp.id}`}
    >
      {onBack && (
        <div className="md:hidden p-2 border-b bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1"
            data-testid="button-back-to-writeups"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      )}

      <div className="p-4 border-b bg-muted/30">
        <h2
          className="text-lg font-semibold"
          data-testid="text-writeup-title"
        >
          {writeUp.title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {writeUp.subtitle}
        </p>
      </div>

      <div className="p-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {writeUp.content}
          </ReactMarkdown>
        </div>

        {writeUp.keyTakeaways.length > 0 && (
          <div className="mt-6 p-4 rounded-lg border bg-muted/30">
            <h3 className="text-sm font-semibold mb-2">Key Takeaways</h3>
            <ul className="space-y-1">
              {writeUp.keyTakeaways.map((takeaway, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-muted-foreground/60 shrink-0">&bull;</span>
                  {takeaway}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function VideoDetail({
  video,
  onBack,
}: {
  video: Video;
  onBack?: () => void;
}) {
  return (
    <div
      className="flex-1 overflow-auto bg-background"
      data-testid={`detail-video-${video.id}`}
    >
      {onBack && (
        <div className="md:hidden p-2 border-b bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1"
            data-testid="button-back-to-videos"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      )}

      <div className="p-4 border-b bg-muted/30">
        <h2 className="text-lg font-semibold" data-testid="text-video-title">
          {video.title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {video.description}
        </p>
      </div>

      <div className="p-4">
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 w-full h-full rounded-lg"
            src={`https://www.youtube.com/embed/${video.youtubeId}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {video.tags && video.tags.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {video.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BilkosWay() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedWriteUp = selectedId ? getWriteUpById(selectedId) : null;
  const selectedVideo = selectedId
    ? thinkingVideos.find((v) => v.id === selectedId)
    : null;

  const navItems: NavItem[] = [
    ...writeUps.map((w) => ({
      id: w.id,
      label: w.title,
      shortLabel: w.title.charAt(0),
      section: "writeups" as const,
    })),
    {
      id: VIDEOS_HEADER_ID,
      label: "Thinking Videos",
      shortLabel: "—",
      section: "videos" as const,
    },
    ...thinkingVideos.map((v) => ({
      id: v.id,
      label: v.title,
      shortLabel: v.title.charAt(0),
      section: "videos" as const,
    })),
  ];

  return (
    <>
      <NavPanel
        header="Bilko's Way"
        items={navItems.filter((item) => item.id !== VIDEOS_HEADER_ID)}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id)}
        isCollapsed={false}
        onToggleCollapse={() => {}}
        expandedWidth="min-w-[12rem] max-w-[14rem]"
        collapsedWidth="min-w-12 max-w-12"
        bg="bg-muted/20"
        testId="writeup-nav"
      />

      <PageContent>
        {selectedWriteUp ? (
          <WriteUpDetail
            writeUp={selectedWriteUp}
            onBack={() => setSelectedId(null)}
          />
        ) : selectedVideo ? (
          <VideoDetail
            video={selectedVideo}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <>
            {/* Desktop: prompt to select */}
            <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground bg-background">
              <p className="text-sm">Select a write-up or video</p>
            </div>
            {/* Mobile: show cards */}
            <div className="md:hidden flex-1 p-4 overflow-auto">
              <h2
                className="text-lg font-semibold mb-1"
                data-testid="text-bilkos-way-heading"
              >
                Bilko's Way
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Write-ups on the development environment and the progression
                of agentic development.
              </p>
              <div className="space-y-3">
                {writeUps.map((w) => (
                  <Card
                    key={w.id}
                    className="p-4 cursor-pointer hover-elevate"
                    onClick={() => setSelectedId(w.id)}
                    data-testid={`card-writeup-${w.id}`}
                  >
                    <div className="font-medium text-sm">{w.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {w.subtitle}
                    </div>
                  </Card>
                ))}
              </div>

              <h3 className="text-md font-semibold mt-6 mb-3">Thinking Videos</h3>
              <div className="space-y-3">
                {thinkingVideos.map((v) => (
                  <Card
                    key={v.id}
                    className="p-4 cursor-pointer hover-elevate"
                    onClick={() => setSelectedId(v.id)}
                    data-testid={`card-video-${v.id}`}
                  >
                    <div className="font-medium text-sm">{v.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {v.description}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </PageContent>
    </>
  );
}
