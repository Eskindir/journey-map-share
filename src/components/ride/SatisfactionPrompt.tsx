import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface SatisfactionPromptProps {
  /** Current selection: null = not answered, true = satisfied, false = not. */
  selected: boolean | null;
  /** Called when the user picks an answer. */
  onSelect: (satisfied: boolean) => void;
}

/**
 * Lightweight post-ride satisfaction step. A binary Satisfied / Not satisfied
 * choice — picking "Not satisfied" is what reveals the video request flow on
 * the ride-end screen.
 */
const SatisfactionPrompt = ({ selected, onSelect }: SatisfactionPromptProps) => {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-6 space-y-4 text-center">
        <h3 className="text-lg font-semibold">How was your ride?</h3>

        <div className="flex gap-3 justify-center">
          <Button
            variant={selected === true ? "default" : "outline"}
            className="flex-1 gap-2"
            onClick={() => onSelect(true)}
            aria-pressed={selected === true}
          >
            <ThumbsUp className="h-4 w-4" />
            Satisfied
          </Button>
          <Button
            variant={selected === false ? "destructive" : "outline"}
            className="flex-1 gap-2"
            onClick={() => onSelect(false)}
            aria-pressed={selected === false}
          >
            <ThumbsDown className="h-4 w-4" />
            Not satisfied
          </Button>
        </div>

        {selected === true && (
          <p className="text-sm text-muted-foreground">
            Thanks for the feedback — glad it went well!
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default SatisfactionPrompt;
