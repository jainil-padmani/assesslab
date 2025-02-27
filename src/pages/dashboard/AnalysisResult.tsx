
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import type { BloomsTaxonomy } from "@/types/dashboard";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.1;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize="12"
      fontWeight="500"
    >
      {`${name}: ${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

export default function AnalysisResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const { analysis } = location.state || {};

  if (!analysis) {
    return (
      <div className="space-y-4">
        <Button onClick={() => navigate("/dashboard/analysis")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Analysis
        </Button>
        <p>No analysis data available. Please try again.</p>
      </div>
    );
  }

  const bloomsChartData = Object.entries(analysis.bloomsTaxonomy || {})
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: typeof value === 'number' ? value : 0
    }))
    .sort((a, b) => b.value - a.value);

  const difficultyData = (analysis.difficulty || [])
    .sort((a: any, b: any) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button onClick={() => navigate("/dashboard/analysis")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Analysis
        </Button>
        <Button onClick={() => window.print()}>
          <Download className="mr-2 h-4 w-4" />
          Download Analysis
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Difficulty Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={difficultyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={4}
                  >
                    {difficultyData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value.toFixed(1)}%`, 'Percentage']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => value}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bloom's Taxonomy Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bloomsChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={4}
                  >
                    {bloomsChartData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value.toFixed(1)}%`, 'Percentage']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => value}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Questions Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Question Number</TableHead>
                  <TableHead>Difficulty Level</TableHead>
                  <TableHead>Bloom's Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.questions?.map((question: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{question.topic}</TableCell>
                    <TableCell>Question {index + 1}</TableCell>
                    <TableCell>{question.difficulty}</TableCell>
                    <TableCell>{question.bloomsLevel}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Detailed Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {analysis.overallAssessment && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Overall Assessment</h3>
                  <p className="text-muted-foreground">{analysis.overallAssessment}</p>
                </div>
              )}
              
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Recommendations</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="text-muted-foreground">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.suggestedChanges && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Suggested Changes</h3>
                  <p className="text-muted-foreground">{analysis.suggestedChanges}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
