import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NewClaim from './pages/employee/NewClaim';
import ReviewSummary from './pages/employee/ReviewSummary';
import MyRequests from './pages/employee/MyRequests';
import ManagerInbox from './pages/manager/ManagerInbox';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/employee/new-claim" element={<NewClaim />} />
        <Route path="/employee/review" element={<ReviewSummary />} />
        <Route path="/employee/my-requests" element={<MyRequests />} />
        <Route path="/manager/inbox" element={<ManagerInbox />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;