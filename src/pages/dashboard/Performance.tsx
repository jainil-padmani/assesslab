
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, LineChart, PieChart } from "lucide-react";

export default function Performance() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Performance Tracking</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              Class Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              View comprehensive class performance metrics and trends.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-accent" />
              Progress Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Monitor student progress over time with detailed analytics.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-accent" />
              Topic Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Break down performance by topics and identify areas for improvement.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
