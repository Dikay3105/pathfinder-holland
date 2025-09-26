import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import HollandTest from "./pages/HollandTest";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/Admin/AdminDashboard";
import ExamBlocks from "./pages/Admin/ExamBlocks";
import HollandQuestions from "./pages/Admin/HollandQuestions";
import Majors from "./pages/Admin/Majors";
import StudentResults from "./pages/Admin/StudentResults";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/holland-test" element={<HollandTest />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/exam-blocks" element={<ExamBlocks />} />
          <Route path="/admin/holland-questions" element={<HollandQuestions />} />
          <Route path="/admin/majors" element={<Majors />} />
          <Route path="/admin/student-results" element={<StudentResults />} />
          <Route path="/admin/student-results/:id" element={<HollandTest />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
