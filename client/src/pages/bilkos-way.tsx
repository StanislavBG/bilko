import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContent } from "@/components/page-content";
import { NavPanel } from "@/components/nav";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { writeUps, getWriteUpById, type WriteUp } from "@/data/bilkos-way";

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
            Write-ups
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

export default function BilkosWay() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedWriteUp = selectedId ? getWriteUpById(selectedId) : null;

  return (
    <>
      <NavPanel
        header="Bilko's Way"
        items={writeUps.map((w) => ({
          id: w.id,
          label: w.title,
          shortLabel: w.title.charAt(0),
        }))}
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
        ) : (
          <>
            {/* Desktop: prompt to select */}
            <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground bg-background">
              <p className="text-sm">Select a write-up to read</p>
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
            </div>
          </>
        )}
      </PageContent>
    </>
  );
}
