import { useState } from "react";
import { Target, Book, Video as VideoIcon } from "lucide-react";
import { useNavigation } from "@/contexts/navigation-context";
import { NavPanel, type NavPanelItem } from "@/components/nav";
import { LevelsSection } from "./academy-levels-section";
import { DictionarySection } from "./academy-dictionary-section";
import { VideoSection } from "./academy-video-section";

type AcademySection = "levels" | "dictionary" | "video";

const l2Items: NavPanelItem[] = [
  { id: "levels", label: "Levels", description: "Progression & Quests", icon: Target },
  { id: "dictionary", label: "Dictionary", description: "AI Terminology", icon: Book },
  { id: "video", label: "Video", description: "Curated Content", icon: VideoIcon },
];

export default function Academy() {
  const nav = useNavigation();
  const isL2Collapsed = nav.isCollapsed(2);

  const [activeSection, setActiveSection] = useState<AcademySection>("levels");

  const handleSectionChange = (section: AcademySection) => {
    setActiveSection(section);
    nav.resetAll();
    window.history.pushState({}, "", "/academy");
  };

  return (
    <>
      <NavPanel
        header="Academy"
        items={l2Items}
        selectedId={activeSection}
        onSelect={(id) => handleSectionChange(id as AcademySection)}
        isCollapsed={isL2Collapsed}
        onToggleCollapse={() => nav.toggleCollapse(2)}
        expandedWidth="min-w-[10rem] max-w-[12rem]"
        collapsedWidth="min-w-12 max-w-12"
        bg="bg-muted/20"
        testId="academy-l2-nav"
      />

      {activeSection === "levels" && <LevelsSection />}
      {activeSection === "dictionary" && <DictionarySection />}
      {activeSection === "video" && <VideoSection />}
    </>
  );
}
