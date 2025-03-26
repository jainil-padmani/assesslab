import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Brain, 
  CheckCircle, 
  FileText, 
  PenTool, 
  UserPlus, 
  Upload,
  ClipboardList,
  Calendar,
  School as SchoolIcon,
  ChevronRight,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const quickActions = [
  {
    title: "Add Student",
    description: "Create a new student profile",
    icon: UserPlus,
    href: "/dashboard/students",
    color: "bg-blue-100 dark:bg-blue-900",
    iconColor: "text-blue-600 dark:text-blue-400"
  },
  {
    title: "Create Test",
    description: "Set up a new assessment",
    icon: ClipboardList,
    href: "/dashboard/tests",
    color: "bg-purple-100 dark:bg-purple-900",
    iconColor: "text-purple-600 dark:text-purple-400"
  },
  {
    title: "Generate Questions",
    description: "Create questions with AI",
    icon: Brain,
    href: "/dashboard/paper-generation",
    color: "bg-green-100 dark:bg-green-900",
    iconColor: "text-green-600 dark:text-green-400"
  },
  {
    title: "Upload Files",
    description: "Add resources to the file hub",
    icon: Upload,
    href: "/dashboard/file-management",
    color: "bg-amber-100 dark:bg-amber-900",
    iconColor: "text-amber-600 dark:text-amber-400"
  }
];

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  }).format(date);
};

export default function Dashboard() {
  const navigate = useNavigate();
  
  const { data: recentTests = [] } = useQuery({
    queryKey: ['recent-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tests')
        .select(`
          id,
          name,
          test_date,
          max_marks,
          subjects(name),
          classes(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  });

  const { data: evaluationsCount = { completed: 0, pending: 0 } } = useQuery({
    queryKey: ['evaluations-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paper_evaluations')
        .select('status', { count: 'exact', head: true })
        .eq('status', 'completed');
      
      const completed = data?.count || 0;
      
      const { data: pendingData, error: pendingError } = await supabase
        .from('paper_evaluations')
        .select('status', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      const pending = pendingData?.count || 0;
      
      return { completed, pending };
    }
  });

  const { data: stats = { students: 0, classes: 0, subjects: 0 } } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { count: students } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });
      
      const { count: classes } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true });
        
      const { count: subjects } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true });
      
      return { students, classes, subjects };
    }
  });

  return (
    <div className="container mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome to TeachLab</p>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Link to={action.href}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/20">
                  <CardHeader className="pb-2">
                    <div className={`h-10 w-10 rounded-full ${action.color} flex items-center justify-center mb-2`}>
                      <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Recent Tests</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/tests')}>
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <CardDescription>Latest assessments and their status</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTests.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No tests created yet</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/dashboard/tests')}>
                  Create a Test
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTests.map((test: any) => (
                  <div 
                    key={test.id} 
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/20 cursor-pointer"
                    onClick={() => navigate(`/dashboard/tests/detail/${test.id}`)}
                  >
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{test.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {test.classes?.name} • {test.subjects?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatDate(test.test_date)}</div>
                      <div className="text-sm text-muted-foreground">{test.max_marks} marks</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Evaluations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-green-600">{evaluationsCount.completed}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-amber-600">{evaluationsCount.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => navigate('/dashboard/check')}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Grade Papers
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" /> Students
                  </span>
                  <span className="font-medium">{stats.students}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-muted-foreground">
                    <SchoolIcon className="mr-2 h-4 w-4" /> Classes
                  </span>
                  <span className="font-medium">{stats.classes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-muted-foreground">
                    <BookOpen className="mr-2 h-4 w-4" /> Subjects
                  </span>
                  <span className="font-medium">{stats.subjects}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/dashboard/students')}
                >
                  Manage Students
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/dashboard/classes')}
                >
                  Manage Classes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
