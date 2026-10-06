import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NewClaim from './pages/employee/NewClaim';
import ReviewSummary from './pages/employee/ReviewSummary';
import MyRequests from './pages/employee/MyRequests';
import ManagerInbox from './pages/manager/ManagerInbox';
import FeedbackProvider from './components/FeedbackProvider';
import UpdateBanner from './components/UpdateBanner';
import { queryClient } from './lib/queryClient';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <FeedbackProvider>
          <UpdateBanner />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/employee/new-claim" element={<NewClaim />} />
            <Route path="/employee/review" element={<ReviewSummary />} />
            <Route path="/employee/my-requests" element={<MyRequests />} />
            <Route path="/manager/inbox" element={<ManagerInbox />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </FeedbackProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;