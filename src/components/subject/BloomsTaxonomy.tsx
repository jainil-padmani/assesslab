
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { BloomsTaxonomy as BloomsTaxonomyType, Subject } from "@/types/dashboard";

interface BloomsTaxonomyProps {
  subject: Subject;
  bloomsData: BloomsTaxonomyType | null;
  fetchSubjectData: () => Promise<void>;
}

export function BloomsTaxonomy({ subject, bloomsData, fetchSubjectData }: BloomsTaxonomyProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBloomsData, setEditedBloomsData] = useState<BloomsTaxonomyType | null>(bloomsData);

  const handleStartEditing = () => {
    setEditedBloomsData(bloomsData || {
      remember: 20,
      understand: 20,
      apply: 15,
      analyze: 15,
      evaluate: 15,
      create: 15
    });
    setIsEditing(true);
  };

  const handleEditValue = (level: keyof BloomsTaxonomyType, value: string) => {
    if (!editedBloomsData) return;
    
    const numValue = Number(value);
    if (isNaN(numValue)) return;

    setEditedBloomsData({
      ...editedBloomsData,
      [level]: numValue
    });
  };

  const handleSaveBloomsTaxonomy = async () => {
    if (!editedBloomsData || !subject.id) return;

    try {
      const { error } = await supabase
        .from('answer_keys')
        .insert({
          subject_id: subject.id,
          title: `${subject?.name || 'Subject'} - Bloom's Taxonomy Update`,
          content: {},
          blooms_taxonomy: editedBloomsData
        });

      if (error) throw error;

      toast.success("Bloom's taxonomy updated successfully");
      setIsEditing(false);
      fetchSubjectData();
    } catch (error: any) {
      toast.error('Failed to update Bloom\'s taxonomy');
      console.error('Error:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Bloom's Taxonomy Distribution</CardTitle>
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={handleStartEditing}>
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isEditing ? (
            <>
              {editedBloomsData && Object.entries(editedBloomsData).map(([level, value]) => (
                <div key={level} className="space-y-2">
                  <div className="capitalize font-medium">{level}</div>
                  <div>
                    <label className="text-sm font-medium">Weight %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={value.toString()}
                      onChange={(e) => handleEditValue(level as keyof BloomsTaxonomyType, e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button onClick={handleSaveBloomsTaxonomy}>Save</Button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              {bloomsData && Object.entries(bloomsData).map(([level, value]) => (
                <div key={level} className="grid grid-cols-2 gap-4">
                  <p className="capitalize"><strong>{level}:</strong></p>
                  <p>{value}%</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
