
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FileText, CheckCircle, Upload, PieChart, Info } from "lucide-react";

export function AutoCheckGuide({ onClose }: { onClose: () => void }) {
  return (
    <Card className="w-full">
      <CardHeader className="bg-primary/5">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Auto-Check Guide
            </CardTitle>
            <CardDescription>
              Learn how to use the AI-powered paper evaluation system
            </CardDescription>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close Guide
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Overview</h2>
            <p className="text-muted-foreground">
              The Auto-Check system helps you evaluate student answer sheets using AI technology.
              This guide explains the entire workflow from selecting tests to viewing detailed evaluation results.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="step-1">
              <AccordionTrigger className="text-lg font-medium">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">1</span>
                  </div>
                  Test Selection
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-10 space-y-2">
                <div className="space-y-2">
                  <p>To begin the evaluation process, you need to select:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>A class</li>
                    <li>A subject</li>
                    <li>A test</li>
                  </ul>
                  <p>The system will then load:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>All students in the selected class</li>
                    <li>Question papers and answer keys associated with the test</li>
                  </ul>
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-2">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">Important Note</p>
                        <p className="text-amber-700 text-sm">
                          Before using Auto-Check, make sure you have uploaded both a question paper
                          and an answer key in the Test section. Without these files, the evaluation
                          cannot be performed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-2">
              <AccordionTrigger className="text-lg font-medium">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">2</span>
                  </div>
                  Uploading Answer Sheets
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-10 space-y-2">
                <div className="space-y-2">
                  <p>For each student, you need to upload their answer sheet:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Locate the student in the list</li>
                    <li>Click the file upload button next to their name</li>
                    <li>Select their answer sheet (only PDF files are accepted)</li>
                    <li>Click "Upload" to save the answer sheet</li>
                  </ul>
                  <p className="text-sm text-muted-foreground">
                    The uploaded answer sheets will be stored in the Supabase storage and 
                    associated with the student and subject.
                  </p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
                    <div className="flex items-start gap-2">
                      <Upload className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-800">Upload Tips</p>
                        <p className="text-blue-700 text-sm">
                          Make sure all answer sheets are clearly scanned or photographed PDFs
                          for best results. Poor image quality may affect the AI's ability to
                          evaluate the answers accurately.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-3">
              <AccordionTrigger className="text-lg font-medium">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">3</span>
                  </div>
                  Evaluating Papers
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-10 space-y-2">
                <div className="space-y-2">
                  <p>There are two ways to evaluate papers:</p>
                  
                  <h4 className="font-semibold mt-4">Individual Evaluation</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Click the "Evaluate" button next to a student's name</li>
                    <li>The system will process this student's paper only</li>
                    <li>Results will appear once processing is complete</li>
                  </ul>
                  
                  <h4 className="font-semibold mt-4">Batch Evaluation</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Click the "Evaluate All" button at the top of the card</li>
                    <li>The system will process all uploaded answer sheets</li>
                    <li>A progress bar will show the evaluation progress</li>
                    <li>Results will be displayed after all papers are evaluated</li>
                  </ul>
                  
                  <h4 className="font-semibold mt-4">How Evaluation Works</h4>
                  <p className="text-sm">
                    During evaluation, the system:
                  </p>
                  <ol className="list-decimal pl-6 space-y-1 text-sm">
                    <li>Retrieves the question paper, answer key, and the student's answer sheet</li>
                    <li>Sends these documents to an AI model for processing</li>
                    <li>The AI analyzes each answer against the answer key</li>
                    <li>Assigns scores for each question based on the correctness and completeness</li>
                    <li>Provides remarks and a confidence level for each evaluation</li>
                    <li>Calculates a total score and percentage</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-4">
              <AccordionTrigger className="text-lg font-medium">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">4</span>
                  </div>
                  Viewing Results
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-10 space-y-2">
                <div className="space-y-2">
                  <p>After evaluation is complete, you can view the results in two ways:</p>
                  
                  <h4 className="font-semibold mt-4">Summary View</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>The Evaluation Results card shows a summary of all student scores</li>
                    <li>It displays each student's name and their total score</li>
                    <li>You can click "View Details" to see the detailed evaluation</li>
                  </ul>
                  
                  <h4 className="font-semibold mt-4">Detailed View</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>The detailed view shows a breakdown of each question</li>
                    <li>You can see the question, the student's answer, and the score</li>
                    <li>The AI's remarks and confidence level are also displayed</li>
                    <li>You can manually adjust scores if needed</li>
                  </ul>
                  
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 mt-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-800">Manual Adjustments</p>
                        <p className="text-green-700 text-sm">
                          Teachers can override the AI-assigned scores by adjusting the score for any 
                          question in the detailed view. The total score will be automatically recalculated.
                          This allows for human review and correction if needed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-5">
              <AccordionTrigger className="text-lg font-medium">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">5</span>
                  </div>
                  Integration with Test Section
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-10 space-y-2">
                <div className="space-y-2">
                  <p>
                    All evaluation results are automatically synced with the Test section:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Scores are updated in the Test Grades table</li>
                    <li>Answer sheets are stored for future reference</li>
                    <li>Evaluation details can be accessed in the Test Detail page</li>
                  </ul>
                  <p className="text-sm">
                    To access detailed evaluations from the Test section:
                  </p>
                  <ol className="list-decimal pl-6 space-y-1 text-sm">
                    <li>Go to Dashboard → Tests</li>
                    <li>Select the subject and test</li>
                    <li>In the student list, click the details button for any evaluated student</li>
                    <li>You'll see the evaluation details with options to adjust scores</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mt-6">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <PieChart className="h-5 w-5 text-primary" />
              Performance and Tips
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="font-medium">Answer Sheet Format:</span> For best results, upload 
                clear, well-scanned PDF documents.
              </li>
              <li>
                <span className="font-medium">Processing Time:</span> Evaluation time may vary based 
                on the length and complexity of the answer sheets. Typically, each paper takes 
                about 30-60 seconds to process.
              </li>
              <li>
                <span className="font-medium">Review AI Evaluations:</span> While the AI is very 
                capable, it's recommended to review the evaluations for critical assessments.
              </li>
              <li>
                <span className="font-medium">Confidence Scores:</span> Pay special attention to 
                answers with low confidence scores, as these may require manual review.
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
