
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// This is a placeholder component since team functionality has been removed
const TeamManagement = () => {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Team Management</CardTitle>
        <CardDescription>
          Manage your team settings and members.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Feature Unavailable</AlertTitle>
          <AlertDescription>
            Team functionality has been removed from this application. 
            The application now operates on an individual user basis.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default TeamManagement;
