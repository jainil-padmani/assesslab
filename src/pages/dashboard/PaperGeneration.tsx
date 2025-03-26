import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HelpCircle, BookOpen, History, Plus, Brain, List, Grid } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionHistory } from '@/components/paper-generation/QuestionHistory';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function PaperGeneration() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterSubject, setFilterSubject] = useState<string>('all');

  // Fetch subjects for filtering
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch recent questions for the dashboard
  const { data: recentQuestions = [] } = useQuery({
    queryKey: ['recent-questions'],
    queryFn: async () => {
      let query = supabase
        .from('generated_questions')
        .select('id, topic, created_at, subject_id, questions, subjects(name)')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (filterSubject !== 'all') {
        query = query.eq('subject_id', filterSubject);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: true
  });

  const handleCreateClick = () => {
    navigate('/dashboard/paper-generation/create');
  };

  const handleHistoryClick = () => {
    navigate('/dashboard/paper-generation/history');
  };

  const handleQuestionHistoryClick = () => {
    navigate('/dashboard/paper-generation/questions-history');
  };

  return (
    <div className="container mx-auto">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Question Bank</h1>
          <p className="text-muted-foreground mt-1">Generate and manage questions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateClick} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Generate Questions
          </Button>
          <Button variant="outline" onClick={handleHistoryClick} className="flex items-center gap-2">
            <History className="h-4 w-4" />
            View Papers
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Brain className="mr-2 h-5 w-5 text-primary" />
              AI Question Generation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Generate questions using AI by uploading study materials or entering text
            </p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button size="sm" onClick={handleCreateClick} className="w-full">Generate Now</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <HelpCircle className="mr-2 h-5 w-5 text-primary" />
              Question Library
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Browse and search through your saved question bank by subject or topic
            </p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button size="sm" onClick={handleQuestionHistoryClick} variant="outline" className="w-full">
              View Library
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <BookOpen className="mr-2 h-5 w-5 text-primary" />
              Question Paper Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create and manage templates for generating complete question papers
            </p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button size="sm" onClick={handleHistoryClick} variant="outline" className="w-full">
              Manage Templates
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Tabs defaultValue="recent" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="recent">Recent Questions</TabsTrigger>
            <TabsTrigger value="papers">Generated Papers</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <select 
              className="h-9 rounded-md border border-input px-3 py-1 text-sm shadow-sm"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="all">All Subjects</option>
              {subjects.map((subject: any) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
            
            <div className="border rounded-md flex">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                size="icon" 
                onClick={() => setViewMode('grid')}
                className="rounded-r-none h-9 w-9"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'ghost'} 
                size="icon" 
                onClick={() => setViewMode('list')}
                className="rounded-l-none h-9 w-9"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <TabsContent value="recent">
          <QuestionHistory 
            data={recentQuestions}
            viewMode={viewMode}
            enableFiltering={false}
            showViewAll={true}
            onViewAllClick={handleQuestionHistoryClick}
          />
        </TabsContent>
        
        <TabsContent value="papers">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                <h3 className="text-lg font-medium">Paper Templates</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-2 mb-6">
                  Create paper templates to organize questions into structured formats for exams and assessments
                </p>
                <Button onClick={handleHistoryClick}>
                  View Generated Papers
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
