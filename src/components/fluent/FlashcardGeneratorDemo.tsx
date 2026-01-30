import * as React from "react";
import { Shuffle, Download, Trash2, Sparkles, RotateCcw, Moon, Sun } from "lucide-react";
import { Button } from "./Button";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { Card, CardContent } from "./Card";
import { Tabs, TabsList, TabsTrigger } from "./Tabs";
import { Badge } from "./Badge";
import { DropZone } from "./DropZone";
import { Section } from "./Section";
import { EmptyState } from "./EmptyState";

export function FlashcardGeneratorDemo() {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("upload");
  const [desiredCount, setDesiredCount] = React.useState("10");
  const [pasteText, setPasteText] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleFilesSelected = (fileList: FileList) => {
    setFiles(Array.from(fileList));
  };

  const handleReset = () => {
    setDesiredCount("10");
    setPasteText("");
    setFiles([]);
  };

  const handleGenerate = () => {
    // Demo: just show an alert with the current state
    const source = activeTab === "upload" ? `${files.length} file(s)` : `${pasteText.length} characters of text`;
    alert(`Generating ${desiredCount} flashcards from ${source}.\n\nThis is a demo - no actual generation happens.`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flashcard Generator</h1>
          <p className="text-muted-foreground">
            Client-side demo. Upload text files or paste content, then generate study cards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="standard" size="sm">
            <Shuffle className="h-4 w-4" />
            Shuffle
          </Button>
          <Button variant="standard" size="sm">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="standard" size="sm">
            <Download className="h-4 w-4" />
            JSON
          </Button>
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
          <Button variant="standard" size="sm" className="ml-2" onClick={toggleDarkMode}>
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            Dark mode
          </Button>
        </div>
      </div>

      {/* Knowledge Source Section */}
      <Section title="Knowledge source" description="Accepts .txt, .md. Other types are ignored in this demo.">
        <Card variant="surface">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <Tabs defaultValue="upload" value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="upload">Upload files</TabsTrigger>
                  <TabsTrigger value="paste">Paste text</TabsTrigger>
                </TabsList>
              </Tabs>
              <Badge variant="secondary">Client-only</Badge>
            </div>

            {activeTab === "upload" && (
              <DropZone accept=".txt,.md" onFilesSelected={handleFilesSelected}>
                {files.length > 0 ? (
                  <div className="text-sm">
                    <p className="font-medium">{files.length} file(s) selected</p>
                    <p className="text-muted-foreground">{files.map((f) => f.name).join(", ")}</p>
                  </div>
                ) : undefined}
              </DropZone>
            )}

            {activeTab === "paste" && (
              <Textarea
                placeholder="Paste your notes, articles, or any text content here..."
                className="min-h-[150px]"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Desired count</span>
                <Input
                  type="number"
                  className="w-20"
                  value={desiredCount}
                  onChange={(e) => setDesiredCount(e.target.value)}
                  min={1}
                  max={100}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="accent" onClick={handleGenerate}>
                  <Sparkles className="h-4 w-4" />
                  Generate
                </Button>
                <Button variant="standard" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4" />
                  Reset inputs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Flashcards Section */}
      <Section title="Flashcards" count={0}>
        <EmptyState description="No cards yet. Upload a text file or paste content, then click Generate." />
      </Section>
    </div>
  );
}
