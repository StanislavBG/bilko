import { useState, useMemo } from "react";
import {
  ChevronLeft,
  BookOpen,
  Layers,
  ChevronRight,
  Brain,
  Search,
  MessageSquare,
  Pencil,
  Database,
  Wrench,
  Building,
  Sparkles,
  Shield,
  Workflow,
  Book,
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
import { Input } from "@/components/ui/input";
import {
  dictionaryCategories,
  searchTerms,
  getCategoryById,
  getTermById,
  getAllTerms,
  type DictionaryCategory,
  type DictionaryTerm,
} from "@/data/academy-dictionary";
import { useNavigation } from "@/contexts/navigation-context";
import { NavPanel } from "@/components/nav";

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  MessageSquare,
  Pencil,
  Database,
  Wrench,
  Building,
  Sparkles,
  Shield,
  Workflow,
};

// ── Presentation components ─────────────────────────────

function DictionaryOverview({
  onSelectCategory,
  onSelectTerm,
}: {
  onSelectCategory: (id: string) => void;
  onSelectTerm: (id: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const allTerms = useMemo(() => getAllTerms(), []);
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchTerms(searchQuery);
  }, [searchQuery]);

  const termsByLetter = useMemo(() => {
    const grouped: Record<string, DictionaryTerm[]> = {};
    allTerms.forEach((term) => {
      const letter = term.term.charAt(0).toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(term);
    });
    Object.keys(grouped).forEach((letter) => {
      grouped[letter].sort((a, b) => a.term.localeCompare(b.term));
    });
    return grouped;
  }, [allTerms]);

  const sortedLetters = Object.keys(termsByLetter).sort();
  const totalTerms = allTerms.length;

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-6 border-b bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Book className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">AI Dictionary</h1>
            <p className="text-muted-foreground">
              Comprehensive glossary of AI terminology, models, and concepts
            </p>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-primary">{dictionaryCategories.length}</div>
            <div className="text-xs text-muted-foreground">Categories</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-primary">{totalTerms}</div>
            <div className="text-xs text-muted-foreground">Terms</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {searchQuery.trim() ? (
          <section>
            <h2 className="text-lg font-semibold mb-4">Search Results ({searchResults.length})</h2>
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((term) => (
                  <Card key={term.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onSelectTerm(term.id)}>
                    <CardHeader className="py-3">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{term.term}</CardTitle>
                        {term.abbreviation && <Badge variant="outline" className="text-xs">{term.abbreviation}</Badge>}
                      </div>
                      <CardDescription className="text-sm">{term.definition}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No terms found matching "{searchQuery}"</p>
            )}
          </section>
        ) : (
          <>
            <section>
              <div className="flex flex-wrap gap-1 mb-4">
                {sortedLetters.map((letter) => (
                  <a
                    key={letter}
                    href={`#letter-${letter}`}
                    className="w-8 h-8 flex items-center justify-center rounded bg-muted hover:bg-primary hover:text-primary-foreground transition-colors text-sm font-medium"
                  >
                    {letter}
                  </a>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-4">Browse by Category</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dictionaryCategories.map((cat) => {
                  const IconComponent = categoryIcons[cat.icon] || Brain;
                  return (
                    <button
                      key={cat.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/50 transition-colors text-left"
                      onClick={() => onSelectCategory(cat.id)}
                    >
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{cat.title}</div>
                        <div className="text-xs text-muted-foreground">{cat.terms.length} terms</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-4">All Terms A-Z</h2>
              <div className="space-y-6">
                {sortedLetters.map((letter) => (
                  <div key={letter} id={`letter-${letter}`}>
                    <h3 className="text-xl font-bold text-primary mb-3 sticky top-0 bg-background py-1">{letter}</h3>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {termsByLetter[letter].map((term) => (
                        <button
                          key={term.id}
                          className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                          onClick={() => onSelectTerm(term.id)}
                        >
                          <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-primary" />
                          <div className="min-w-0">
                            <div className="font-medium text-sm group-hover:text-primary">
                              {term.term}
                              {term.abbreviation && (
                                <span className="text-muted-foreground font-normal ml-1">({term.abbreviation})</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-1">{term.definition}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function DictionaryCategoryOverview({
  category,
  onSelectTerm,
  onBack,
}: {
  category: DictionaryCategory;
  onSelectTerm: (id: string) => void;
  onBack?: () => void;
}) {
  const IconComponent = categoryIcons[category.icon] || Brain;

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-4 border-b bg-muted/30">
        {onBack && (
          <div className="md:hidden mb-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Dictionary
            </Button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{category.title}</h2>
            <p className="text-sm text-muted-foreground">{category.terms.length} terms</p>
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
          <h3 className="text-lg font-semibold mb-4">Terms in {category.title}</h3>
          <div className="space-y-3">
            {category.terms.map((term) => (
              <Card
                key={term.id}
                className="cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors"
                onClick={() => onSelectTerm(term.id)}
              >
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{term.term}</CardTitle>
                      {term.abbreviation && <Badge variant="outline" className="text-xs">{term.abbreviation}</Badge>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardDescription>{term.definition}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function DictionaryTermView({
  term,
  category,
  onSelectRelatedTerm,
  onBack,
}: {
  term: DictionaryTerm;
  category?: DictionaryCategory;
  onSelectRelatedTerm?: (termName: string) => void;
  onBack: () => void;
}) {
  const CategoryIcon = category ? categoryIcons[category.icon] || Brain : Brain;

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-4 border-b bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="md:hidden mb-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="flex items-start gap-4">
          {category && (
            <div className="p-3 rounded-xl bg-primary/10 shrink-0">
              <CategoryIcon className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h1 className="text-2xl font-bold">{term.term}</h1>
              {term.abbreviation && <Badge variant="outline" className="text-sm">{term.abbreviation}</Badge>}
            </div>
            {category && <Badge variant="secondary" className="text-xs mb-2">{category.title}</Badge>}
            <p className="text-muted-foreground">{term.definition}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Deep Dive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{term.explanation}</p>
          </CardContent>
        </Card>

        {term.examples && term.examples.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Examples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {term.examples.map((example, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm p-2 rounded-lg bg-muted/30">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                      {idx + 1}
                    </span>
                    <span className="text-muted-foreground">{example}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {term.relatedTerms && term.relatedTerms.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ChevronRight className="h-5 w-5 text-primary" />
                Related Terms
              </CardTitle>
              <CardDescription>Explore connected concepts to deepen your understanding</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {term.relatedTerms.map((related) => (
                  <Badge
                    key={related}
                    variant="secondary"
                    className={onSelectRelatedTerm ? "cursor-pointer hover:bg-primary hover:text-primary-foreground" : ""}
                    onClick={() => onSelectRelatedTerm?.(related)}
                  >
                    {related}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Section component: self-contained state + nav + content ──

export function DictionarySection() {
  const nav = useNavigation();
  const isL3Collapsed = nav.isCollapsed(3);
  const isL4Collapsed = nav.isCollapsed(4);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);

  const selectedCategory = selectedCategoryId ? getCategoryById(selectedCategoryId) : null;
  const selectedTerm = selectedTermId ? getTermById(selectedTermId) : null;

  const termCategory = useMemo(() => {
    if (!selectedTermId) return null;
    return dictionaryCategories.find((cat) => cat.terms.some((t) => t.id === selectedTermId));
  }, [selectedTermId]);

  const handleSelectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setSelectedTermId(null);
    nav.selectAtLevel(3, categoryId);
  };

  const handleSelectTerm = (termId: string | null) => {
    setSelectedTermId(termId);
    if (termId && !selectedCategoryId) {
      const cat = dictionaryCategories.find((c) => c.terms.some((t) => t.id === termId));
      if (cat) setSelectedCategoryId(cat.id);
    }
    if (termId) nav.selectAtLevel(4, termId);
  };

  const handleSelectRelatedTerm = (termName: string) => {
    const allTerms = getAllTerms();
    const found = allTerms.find(
      (t) => t.term.toLowerCase() === termName.toLowerCase() || t.abbreviation?.toLowerCase() === termName.toLowerCase()
    );
    if (found) handleSelectTerm(found.id);
  };

  const handleBackFromTerm = () => {
    setSelectedTermId(null);
    nav.goBack(4);
  };

  const handleBackFromCategory = () => {
    setSelectedCategoryId(null);
    setSelectedTermId(null);
    nav.goBack(3);
  };

  return (
    <>
      <NavPanel
        header="Categories"
        items={dictionaryCategories.map((cat) => ({
          id: cat.id,
          label: cat.title,
          icon: categoryIcons[cat.icon] || Brain,
        }))}
        selectedId={selectedCategoryId}
        onSelect={handleSelectCategory}
        isCollapsed={isL3Collapsed}
        onToggleCollapse={() => nav.toggleCollapse(3)}
      />

      {selectedCategory && (
        <NavPanel
          header="Terms"
          items={selectedCategory.terms.map((term) => ({
            id: term.id,
            label: term.abbreviation || term.term,
            shortLabel: term.abbreviation || term.term.charAt(0),
          }))}
          selectedId={selectedTermId}
          onSelect={handleSelectTerm}
          isCollapsed={isL4Collapsed}
          onToggleCollapse={() => nav.toggleCollapse(4)}
          expandedWidth="min-w-[8rem] max-w-[9rem]"
          collapsedWidth="min-w-8 max-w-8"
          bg="bg-muted/5"
        />
      )}

      {selectedTerm ? (
        <DictionaryTermView
          term={selectedTerm}
          category={termCategory || undefined}
          onSelectRelatedTerm={handleSelectRelatedTerm}
          onBack={handleBackFromTerm}
        />
      ) : selectedCategory ? (
        <DictionaryCategoryOverview
          category={selectedCategory}
          onSelectTerm={handleSelectTerm}
          onBack={handleBackFromCategory}
        />
      ) : (
        <DictionaryOverview onSelectCategory={handleSelectCategory} onSelectTerm={handleSelectTerm} />
      )}
    </>
  );
}
