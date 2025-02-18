
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ChevronRight, BookOpen, Brain, CheckCircle, BarChart3 } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen">
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
            <p className="text-lg md:text-xl text-gray-600 mb-8">
              Streamline question paper generation, analysis, and evaluation with
              cutting-edge artificial intelligence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-white"
              >
                Start Free Trial
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
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

      {/* Features Section */}
      <section className="py-20">
        <div className="container px-4 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Features for Modern Education
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Everything you need to create, analyze, and grade examinations with
              the power of artificial intelligence.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * (index + 1) }}
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow">
                  <div className="h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container px-4 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Transform Your Teaching?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Try TeachLab free for your first 10 papers. No credit card required.
            </p>
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-white">
              Get Started Now
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

const features = [
  {
    title: "AI Question Generation",
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

export default Index;
