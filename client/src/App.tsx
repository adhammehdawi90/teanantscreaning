import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import CreateAssessment from "@/pages/create-assessment";
import VideoInterview from "@/pages/video-interview";
import AssessmentView from "@/pages/assessment-view";
import TakeAssessment from "@/pages/take-assessment";
import Nav from "@/components/nav";
import VideoInterviewPage from '@/pages/video-interview';

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container mx-auto px-4 py-8">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/create-assessment" component={CreateAssessment} />
          <Route path="/video-interview/:id" component={VideoInterview} />
          <Route path="/assessment/:id" component={AssessmentView} />
          <Route path="/take-assessment/:id" component={TakeAssessment} />
          <Route path="/video-interview/new" component={VideoInterviewPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;