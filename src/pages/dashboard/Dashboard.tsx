
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BookOpen, Brain, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    title: "Generate Questions",
    description: "Generate comprehensive question papers from your study materials in minutes.",
    icon: BookOpen,
    href: "/dashboard/generate",
  },
  {
    title: "Smart Analysis",
    description: "Get detailed insights and suggestions to improve your question papers.",
    icon: Brain,
    href: "/dashboard/analysis",
  },
  {
    title: "Automated Checking",
    description: "Save time with AI-powered answer sheet evaluation and grading.",
    icon: CheckCircle,
    href: "/dashboard/check",
  },
];

export default function Dashboard() {
  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome to TeachLab</h1>
        <p className="text-gray-600 mt-2">Select a feature to get started</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Link to={feature.href}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
