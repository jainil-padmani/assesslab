
import React from "react";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GeneratedQuestionItem } from "./GeneratedQuestionItem";

interface TopicOption {
  value: string;
  label: string;
}

interface GeneratedQuestionsSelectorProps {
  selectedTopic: string;
  topicOptions: TopicOption[];
  generatedQuestions: any[];
  isLoadingTopics: boolean;
  isLoadingQuestions: boolean;
  onTopicChange: (topic: string) => void;
  onAddQuestion: (question: any) => void;
}

export function GeneratedQuestionsSelector({
  selectedTopic,
  topicOptions,
  generatedQuestions,
  isLoadingTopics,
  isLoadingQuestions,
  onTopicChange,
  onAddQuestion
}: GeneratedQuestionsSelectorProps) {
  return (
    <div className="space-y-4 py-4">
      <div>
        <Label htmlFor="topic">Select Topic</Label>
        <Select value={selectedTopic} onValueChange={onTopicChange}>
          <SelectTrigger id="topic" className="mt-1">
            <SelectValue placeholder="Select a topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {isLoadingTopics ? (
                <SelectItem value="loading" disabled>Loading topics...</SelectItem>
              ) : topicOptions && topicOptions.length > 0 ? (
                topicOptions.map((topic, i) => (
                  <SelectItem key={i} value={topic.value}>
                    {topic.label}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>No topics found</SelectItem>
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      
      {selectedTopic ? (
        <div className="border rounded-md p-4 min-h-96 max-h-96 overflow-y-auto">
          {isLoadingQuestions ? (
            <div className="flex justify-center items-center h-full">
              Loading questions...
            </div>
          ) : generatedQuestions && generatedQuestions.length > 0 ? (
            <ul className="space-y-4">
              {generatedQuestions.map((q, index) => (
                <GeneratedQuestionItem 
                  key={index} 
                  question={q} 
                  onAdd={onAddQuestion} 
                />
              ))}
            </ul>
          ) : (
            <div className="flex justify-center items-center h-full text-gray-500">
              No questions available for this topic
            </div>
          )}
        </div>
      ) : (
        <Alert>
          <AlertDescription>
            Please select a topic to view questions
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
