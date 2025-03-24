
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface SubjectSelectProps {
  selectedSubject: string;
  setSelectedSubject: (id: string) => void;
  topicName: string;
  setTopicName: (name: string) => void;
  subjects: Array<{ id: string; name: string; subject_code: string }>;
  isSubjectsLoading: boolean;
}

export function SubjectSelect({
  selectedSubject,
  setSelectedSubject,
  topicName,
  setTopicName,
  subjects,
  isSubjectsLoading,
}: SubjectSelectProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subject Information</CardTitle>
        <CardDescription>
          Select a subject and enter a topic or chapter name to generate a test paper
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger id="subject">
              <SelectValue placeholder="Select a subject" />
            </SelectTrigger>
            <SelectContent>
              {isSubjectsLoading ? (
                <SelectItem value="loading" disabled>
                  Loading subjects...
                </SelectItem>
              ) : subjects.length === 0 ? (
                <SelectItem value="none" disabled>
                  No subjects available
                </SelectItem>
              ) : (
                subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name} ({subject.subject_code})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="topic">Topic or Chapter Name</Label>
          <Input
            id="topic"
            placeholder="Enter topic or chapter name"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
