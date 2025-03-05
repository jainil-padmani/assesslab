
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ChevronRight, BookOpen, Brain, CheckCircle, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

const features = [
  {
    title: "Generate Questions",
    description: "Generate comprehensive question papers from your study materials in minutes.",
    icon: BookOpen,
  },
  {
    title: "Smart Analysis",
    description: "Get detailed insights and suggestions to improve your question papers.",
    icon: Brain,
  },
  {
    title: "Automated Checking",
    description: "Save time with AI-powered answer sheet evaluation and grading.",
    icon: CheckCircle,
  },
  {
    title: "Performance Tracking",
    description: "Track and analyze student performance with detailed analytics.",
    icon: BarChart3,
  },
];

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="py-4 border-b backdrop-blur-sm bg-background/80 sticky top-0 z-10">
        <div className="container px-4 mx-auto">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Assess<span className="font-black">Lab</span>
              </h1>
            </motion.div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link to="/auth">
                <Button variant="outline" className="hover:border-primary">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-gradient py-20 md:py-32">
        <div className="container px-4 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Transform Your Teaching
              <br />
              with AI-Powered Tools
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8">
              Streamline question paper generation, analysis, and evaluation with
              cutting-edge artificial intelligence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white btn-pulse"
                >
                  Start Free Trial
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-primary hover:bg-primary/5"
              >
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container px-4 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Powerful Features for Modern Education
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Everything you need to create, analyze, and grade examinations with
              the power of artificial intelligence.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * (index + 1) }}
              >
                <Card className="h-full border border-secondary/80 hover:border-primary/50">
                  <CardHeader>
                    <div className="h-12 w-12 bg-secondary rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-secondary">
        <div className="container px-4 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Ready to Transform Your Teaching?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Try AssessLab free for your first 10 papers. No credit card required.
            </p>
            <Link to="/auth">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white">
                Get Started Now
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-10 border-t">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">© 2023 AssessLab. All rights reserved.</p>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-500 hover:text-primary">Terms</a>
              <a href="#" className="text-gray-500 hover:text-primary">Privacy</a>
              <a href="#" className="text-gray-500 hover:text-primary">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
