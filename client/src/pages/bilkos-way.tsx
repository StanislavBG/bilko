import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, Video, Image, FileText, Upload, X, Download, Trash2, Play, Eye, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContent } from "@/components/page-content";
import { NavPanel } from "@/components/nav";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useViewMode } from "@/contexts/view-mode-context";
import { writeUps, getWriteUpById, thinkingVideos, type WriteUp, type Video as VideoType } from "@/data/bilkos-way";

type SectionId = "writeups" | "videos";

interface TopicMedia {
  topicId: string;
  mediaType: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

// ─── Media hooks ─────────────────────────────────────────────

function useTopicMedia(topicId: string | null) {
  const [media, setMedia] = useState<TopicMedia[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!topicId) { setMedia([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/uploads/bilkos-way/topic/${topicId}`);
      const data = await res.json();
      setMedia(data.media || []);
    } catch {
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { media, loading, refresh };
}

// ─── Admin upload button ─────────────────────────────────────

function AdminUploadButton({
  topicId,
  mediaType,
  accept,
  icon: Icon,
  label,
  existingMedia,
  onUploaded,
  onView,
  onDelete,
}: {
  topicId: string;
  mediaType: string;
  accept: string;
  icon: typeof Video;
  label: string;
  existingMedia: TopicMedia | undefined;
  onUploaded: () => void;
  onView: (media: TopicMedia) => void;
  onDelete: (media: TopicMedia) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/uploads/bilkos-way/${topicId}/${mediaType}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Upload failed");
        return;
      }
      onUploaded();
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (existingMedia) {
    return (
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-emerald-400"
              onClick={() => onView(existingMedia)}
            >
              <Icon className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>View {label}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(existingMedia)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove {label}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Upload className="h-3.5 w-3.5 animate-pulse" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Upload {label}</TooltipContent>
      </Tooltip>
    </>
  );
}

// ─── Media viewer dialog ─────────────────────────────────────

function MediaViewer({
  media,
  onClose,
}: {
  media: TopicMedia | null;
  onClose: () => void;
}) {
  if (!media) return null;

  return (
    <Dialog open={!!media} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-medium">
            {media.mediaType === "video" && "Video"}
            {media.mediaType === "infographic" && "Infographic"}
            {media.mediaType === "pdf" && "PDF Document"}
          </DialogTitle>
          <a
            href={media.url}
            download={media.filename}
            className="inline-flex"
          >
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              <Download className="h-3 w-3" />
              Download
            </Button>
          </a>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-4 pt-0">
          {media.mediaType === "video" && (
            <video
              src={media.url}
              controls
              className="w-full rounded-lg"
              style={{ maxHeight: "70vh" }}
            >
              Your browser does not support the video tag.
            </video>
          )}
          {media.mediaType === "infographic" && (
            <img
              src={media.url}
              alt="Infographic"
              className="w-full h-auto rounded-lg"
              style={{ maxHeight: "70vh", objectFit: "contain" }}
            />
          )}
          {media.mediaType === "pdf" && (
            <iframe
              src={media.url}
              className="w-full rounded-lg border-0"
              style={{ height: "70vh" }}
              title="PDF Viewer"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Admin upload bar (3 icons in header) ────────────────────

function AdminMediaBar({
  topicId,
  media,
  onRefresh,
  onView,
}: {
  topicId: string;
  media: TopicMedia[];
  onRefresh: () => void;
  onView: (media: TopicMedia) => void;
}) {
  const findMedia = (type: string) => media.find((m) => m.mediaType === type);

  async function handleDelete(m: TopicMedia) {
    if (!confirm(`Remove this ${m.mediaType}?`)) return;
    await fetch(`/api/uploads/bilkos-way/${m.topicId}/${m.mediaType}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div className="flex items-center gap-0.5">
      <AdminUploadButton
        topicId={topicId}
        mediaType="video"
        accept=".mp4,video/mp4"
        icon={Video}
        label="Video"
        existingMedia={findMedia("video")}
        onUploaded={onRefresh}
        onView={onView}
        onDelete={handleDelete}
      />
      <AdminUploadButton
        topicId={topicId}
        mediaType="infographic"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        icon={Image}
        label="Infographic"
        existingMedia={findMedia("infographic")}
        onUploaded={onRefresh}
        onView={onView}
        onDelete={handleDelete}
      />
      <AdminUploadButton
        topicId={topicId}
        mediaType="pdf"
        accept=".pdf,application/pdf"
        icon={FileText}
        label="PDF"
        existingMedia={findMedia("pdf")}
        onUploaded={onRefresh}
        onView={onView}
        onDelete={handleDelete}
      />
    </div>
  );
}

// ─── User view bar (only shows buttons for existing media) ───

const USER_LABELS: Record<string, { label: string; icon: typeof Play }> = {
  video: { label: "Play Video", icon: Play },
  infographic: { label: "View Image", icon: Eye },
  pdf: { label: "View Slides", icon: BookOpen },
};

function UserMediaBar({
  media,
  onView,
}: {
  media: TopicMedia[];
  onView: (media: TopicMedia) => void;
}) {
  if (media.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {media.map((m) => {
        const cfg = USER_LABELS[m.mediaType];
        if (!cfg) return null;
        const Icon = cfg.icon;
        return (
          <Button
            key={m.mediaType}
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground"
            onClick={() => onView(m)}
          >
            <Icon className="h-3 w-3" />
            {cfg.label}
          </Button>
        );
      })}
    </div>
  );
}

// ─── Combined media bar (switches on admin) ──────────────────

function TopicMediaBar({
  topicId,
  media,
  isAdmin,
  onRefresh,
  onView,
}: {
  topicId: string;
  media: TopicMedia[];
  isAdmin: boolean;
  onRefresh: () => void;
  onView: (media: TopicMedia) => void;
}) {
  if (isAdmin) {
    return (
      <AdminMediaBar
        topicId={topicId}
        media={media}
        onRefresh={onRefresh}
        onView={onView}
      />
    );
  }
  return <UserMediaBar media={media} onView={onView} />;
}

// ─── Inline media preview strip ──────────────────────────────

function MediaPreviewStrip({
  media,
  onView,
}: {
  media: TopicMedia[];
  onView: (m: TopicMedia) => void;
}) {
  if (media.length === 0) return null;

  return (
    <div className="flex gap-3 flex-wrap p-4 pt-0">
      {media.map((m) => (
        <button
          key={m.filename}
          onClick={() => onView(m)}
          className="group relative rounded-lg border bg-muted/40 hover:bg-muted/60 transition-colors overflow-hidden cursor-pointer"
          style={{ width: m.mediaType === "video" ? 180 : 120, height: 80 }}
        >
          {m.mediaType === "video" && (
            <div className="flex items-center justify-center h-full">
              <Video className="h-6 w-6 text-muted-foreground group-hover:text-foreground" />
              <span className="ml-1.5 text-xs text-muted-foreground">.mp4</span>
            </div>
          )}
          {m.mediaType === "infographic" && (
            <img
              src={m.url}
              alt="Infographic thumbnail"
              className="w-full h-full object-cover"
            />
          )}
          {m.mediaType === "pdf" && (
            <div className="flex items-center justify-center h-full">
              <FileText className="h-6 w-6 text-muted-foreground group-hover:text-foreground" />
              <span className="ml-1.5 text-xs text-muted-foreground">.pdf</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── WriteUp detail ──────────────────────────────────────────

function WriteUpDetail({
  writeUp,
  onBack,
}: {
  writeUp: WriteUp;
  onBack?: () => void;
}) {
  const { effectiveIsAdmin } = useViewMode();
  const { media, refresh } = useTopicMedia(writeUp.id);
  const [viewingMedia, setViewingMedia] = useState<TopicMedia | null>(null);

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
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
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
          <TopicMediaBar
            topicId={writeUp.id}
            media={media}
            isAdmin={effectiveIsAdmin}
            onRefresh={refresh}
            onView={setViewingMedia}
          />
        </div>
      </div>

      {effectiveIsAdmin && <MediaPreviewStrip media={media} onView={setViewingMedia} />}

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

      <MediaViewer media={viewingMedia} onClose={() => setViewingMedia(null)} />
    </div>
  );
}

// ─── Video detail ────────────────────────────────────────────

function VideoDetail({
  video,
  onBack,
}: {
  video: VideoType;
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

// ─── Main page ───────────────────────────────────────────────

export default function BilkosWay() {
  // L2: section selection (Write-ups / Videos)
  const [selectedSection, setSelectedSection] = useState<SectionId | null>(null);
  const [isSectionCollapsed, setIsSectionCollapsed] = useState(false);

  // L3: item selection within the section
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isItemCollapsed, setIsItemCollapsed] = useState(false);

  const selectedWriteUp = selectedItemId ? getWriteUpById(selectedItemId) : null;
  const selectedVideo = selectedItemId
    ? thinkingVideos.find((v) => v.id === selectedItemId)
    : null;

  // L2 items: sections
  const sectionItems = [
    { id: "writeups" as const, label: "Write-ups", shortLabel: "W" },
    { id: "videos" as const, label: "Videos", shortLabel: "V" },
  ];

  // L3 items: depends on selected section
  const itemNavItems = selectedSection === "writeups"
    ? writeUps.map((w) => ({
        id: w.id,
        label: w.title,
        shortLabel: w.title.charAt(0),
      }))
    : selectedSection === "videos"
    ? thinkingVideos.map((v) => ({
        id: v.id,
        label: v.title,
        shortLabel: v.title.charAt(0),
      }))
    : [];

  const handleSectionSelect = (id: string) => {
    setSelectedSection(id as SectionId);
    setSelectedItemId(null); // Reset L3 on L2 change
  };

  return (
    <>
      {/* L2: Section nav */}
      <NavPanel
        header="Bilko's Way"
        items={sectionItems}
        selectedId={selectedSection}
        onSelect={handleSectionSelect}
        isCollapsed={isSectionCollapsed}
        onToggleCollapse={() => setIsSectionCollapsed(!isSectionCollapsed)}
        expandedWidth="min-w-[9rem] max-w-[10rem]"
        collapsedWidth="min-w-10 max-w-10"
        bg="bg-muted/20"
        testId="section-nav"
      />

      {/* L3: Items within section (conditional) */}
      {selectedSection && (
        <NavPanel
          header={selectedSection === "writeups" ? "Write-ups" : "Videos"}
          items={itemNavItems}
          selectedId={selectedItemId}
          onSelect={(id) => setSelectedItemId(id)}
          isCollapsed={isItemCollapsed}
          onToggleCollapse={() => setIsItemCollapsed(!isItemCollapsed)}
          expandedWidth="min-w-[12rem] max-w-[14rem]"
          collapsedWidth="min-w-10 max-w-10"
          bg="bg-muted/10"
          testId="item-nav"
        />
      )}

      <PageContent>
        {selectedWriteUp ? (
          <WriteUpDetail
            writeUp={selectedWriteUp}
            onBack={() => setSelectedItemId(null)}
          />
        ) : selectedVideo ? (
          <VideoDetail
            video={selectedVideo}
            onBack={() => setSelectedItemId(null)}
          />
        ) : (
          <>
            {/* Desktop: prompt to select */}
            <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground bg-background">
              <p className="text-sm">
                {selectedSection
                  ? `Select ${selectedSection === "writeups" ? "a write-up" : "a video"}`
                  : "Select a section"}
              </p>
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

              {/* Mobile section cards when no section selected */}
              {!selectedSection && (
                <div className="space-y-3">
                  <Card
                    className="p-4 cursor-pointer hover-elevate"
                    onClick={() => setSelectedSection("writeups")}
                    data-testid="card-section-writeups"
                  >
                    <div className="font-medium text-sm">Write-ups</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {writeUps.length} articles
                    </div>
                  </Card>
                  <Card
                    className="p-4 cursor-pointer hover-elevate"
                    onClick={() => setSelectedSection("videos")}
                    data-testid="card-section-videos"
                  >
                    <div className="font-medium text-sm">Videos</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {thinkingVideos.length} videos
                    </div>
                  </Card>
                </div>
              )}

              {/* Mobile item cards when section selected */}
              {selectedSection === "writeups" && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSection(null)}
                    className="gap-1 mb-3"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <div className="space-y-3">
                    {writeUps.map((w) => (
                      <Card
                        key={w.id}
                        className="p-4 cursor-pointer hover-elevate"
                        onClick={() => setSelectedItemId(w.id)}
                        data-testid={`card-writeup-${w.id}`}
                      >
                        <div className="font-medium text-sm">{w.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {w.subtitle}
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {selectedSection === "videos" && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSection(null)}
                    className="gap-1 mb-3"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <div className="space-y-3">
                    {thinkingVideos.map((v) => (
                      <Card
                        key={v.id}
                        className="p-4 cursor-pointer hover-elevate"
                        onClick={() => setSelectedItemId(v.id)}
                        data-testid={`card-video-${v.id}`}
                      >
                        <div className="font-medium text-sm">{v.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {v.description}
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </PageContent>
    </>
  );
}
