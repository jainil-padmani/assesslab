
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TopicSelectorProps {
  selectedTopic: string;
  setSelectedTopic: (topic: string) => void;
  topics: string[];
  disabled: boolean;
}

export function TopicSelector({ selectedTopic, setSelectedTopic, topics, disabled }: TopicSelectorProps) {
  return (
    <Select
      value={selectedTopic}
      onValueChange={setSelectedTopic}
      disabled={disabled || topics.length === 0}
    >
      <SelectTrigger id="subject">
        <SelectValue placeholder="Select topic" />
      </SelectTrigger>
      <SelectContent>
        {topics.map(topic => (
          <SelectItem key={topic} value={topic}>
            {topic}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
