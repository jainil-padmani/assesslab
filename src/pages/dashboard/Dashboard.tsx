import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/hooks/useUser";
import { useTests } from "@/hooks/useTests";
import { useAcademicsData } from "@/hooks/useAcademicsData";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PieChart,
  BarChart3,
  LayoutDashboard,
  Users,
  Book,
  ListChecks,
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading: isUserLoading } = useUser();
  const { testMetrics, isLoading: isTestMetricsLoading } = useTests();
  const {
    students,
    classes,
    subjects,
    isLoading: isAcademicsLoading,
  } = useAcademicsData();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const getGreeting = () => {
      const now = new Date();
      const hour = now.getHours();

      if (hour < 12) {
        return "Good morning";
      } else if (hour < 18) {
        return "Good afternoon";
      } else {
        return "Good evening";
      }
    };

    setGreeting(getGreeting());
  }, []);

  const isLoading = isUserLoading || isTestMetricsLoading || isAcademicsLoading;

  const getCompletedTestsCount = () => {
    if (!testMetrics) return 0;
    
    // Handle array type correctly
    if (Array.isArray(testMetrics)) {
      const completed = testMetrics.find(metric => metric.status === 'Completed');
      return completed ? parseInt(completed.count, 10) || 0 : 0;
    }
    return 0;
  };

  const getPendingTestsCount = () => {
    if (!testMetrics) return 0;
    
    // Handle array type correctly
    if (Array.isArray(testMetrics)) {
      const pending = testMetrics.find(metric => metric.status === 'Pending');
      return pending ? parseInt(pending.count, 10) || 0 : 0;
    }
    return 0;
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{greeting}, {user?.user_metadata?.name}!</h1>
        <p className="text-muted-foreground mt-1">Welcome to your dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Tests Assigned
            </CardTitle>
            <CardDescription>Total tests assigned to students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{isLoading ? "Loading..." : getCompletedTestsCount() + getPendingTestsCount()}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {getCompletedTestsCount()} completed, {getPendingTestsCount()} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              Students Enrolled
            </CardTitle>
            <CardDescription>Total number of students enrolled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{isLoading ? "Loading..." : students.length}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Track student progress and performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Book className="mr-2 h-4 w-4" />
              Subjects Offered
            </CardTitle>
            <CardDescription>Total number of subjects offered</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{isLoading ? "Loading..." : subjects.length}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Manage subjects and curriculum
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ListChecks className="mr-2 h-4 w-4" />
              Classes
            </CardTitle>
            <CardDescription>Total number of classes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{isLoading ? "Loading..." : classes.length}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Organize students into classes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:bg-secondary cursor-pointer" onClick={() => navigate('/dashboard/tests/create')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="mr-2 h-4 w-4" />
                Create New Test
              </CardTitle>
              <CardDescription>Create a new test for students</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Quickly create and assign tests to students
              </p>
            </CardContent>
          </Card>

          <Card className="hover:bg-secondary cursor-pointer" onClick={() => navigate('/dashboard/analysis')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-4 w-4" />
                Analyze Question Paper
              </CardTitle>
              <CardDescription>Analyze question papers and test insights</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upload a question paper or answer key for analysis
              </p>
            </CardContent>
          </Card>

          <Card className="hover:bg-secondary cursor-pointer" onClick={() => navigate('/dashboard/paper-generation')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Generate Question Paper
              </CardTitle>
              <CardDescription>Generate question papers using AI</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Generate questions using AI by uploading study materials or entering text
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
