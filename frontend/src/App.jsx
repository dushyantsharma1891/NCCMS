import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Departments from './pages/Departments';
import About from './pages/About';
import DepartmentDetail from './pages/DepartmentDetail';
import TrackComplaint from './pages/TrackComplaint';
import CitizenDashboard from './pages/CitizenDashboard';
import AIAssistant from './pages/AIAssistant';
import CitizenHelpline from './pages/CitizenHelpline';
import OfficerDashboard from './pages/OfficerDashboard';
import OfficerStatusRequests from './pages/OfficerStatusRequests';
import AdminDashboard from './pages/AdminDashboard';
import AdminReports from './pages/AdminReports';
import AdminCitizens from './pages/AdminCitizens';
import AdminOfficers from './pages/AdminOfficers';
import AdminDepartments from './pages/AdminDepartments';
import AdminApprovals from './pages/AdminApprovals';
import AdminStatusRequests from './pages/AdminStatusRequests';
import FalseComplaints from './pages/FalseComplaints';
import AdminHelpline from './pages/AdminHelpline';
import OfficerHelpline from './pages/OfficerHelpline';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminAdmins from './pages/SuperAdminAdmins';
import SuperAdminOfficers from './pages/SuperAdminOfficers';
import SuperAdminCitizens from './pages/SuperAdminCitizens';
import SuperAdminApprovals from './pages/SuperAdminApprovals';
import SuperAdminDepartments from './pages/SuperAdminDepartments';
import SuperAdminActivity from './pages/SuperAdminActivity';
import SuperAdminSettings from './pages/SuperAdminSettings';
import ComplaintForm from './pages/ComplaintForm';
import ComplaintDetails from './pages/ComplaintDetails';
import ReceiptView from './pages/ReceiptView';
import ComplaintsList from './pages/ComplaintsList';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/authorized-administration" element={<Login superAdminMode />} />
      <Route path="/register" element={<Register />} />
      <Route path="/departments" element={<Departments />} />
      <Route path="/about" element={<About />} />
      <Route path="/departments/:id" element={<DepartmentDetail />} />
      <Route path="/track" element={<TrackComplaint />} />

      <Route path="/citizen" element={<ProtectedRoute allowedRoles={['citizen']}><CitizenDashboard /></ProtectedRoute>} />
      <Route path="/citizen/complaints" element={<ProtectedRoute allowedRoles={['citizen']}><ComplaintsList /></ProtectedRoute>} />
      <Route path="/citizen/ai-assistant" element={<ProtectedRoute allowedRoles={['citizen']}><AIAssistant /></ProtectedRoute>} />
      <Route path="/citizen/helpline" element={<ProtectedRoute allowedRoles={['citizen']}><CitizenHelpline /></ProtectedRoute>} />

      <Route path="/officer" element={<ProtectedRoute allowedRoles={['officer']}><OfficerDashboard /></ProtectedRoute>} />
      <Route path="/officer/complaints" element={<ProtectedRoute allowedRoles={['officer']}><ComplaintsList /></ProtectedRoute>} />
      <Route path="/officer/status-requests" element={<ProtectedRoute allowedRoles={['officer']}><OfficerStatusRequests /></ProtectedRoute>} />

      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/complaints" element={<ProtectedRoute allowedRoles={['admin']}><ComplaintsList /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/citizens" element={<ProtectedRoute allowedRoles={['admin']}><AdminCitizens /></ProtectedRoute>} />
      <Route path="/admin/officers" element={<ProtectedRoute allowedRoles={['admin']}><AdminOfficers /></ProtectedRoute>} />
      <Route path="/admin/departments" element={<ProtectedRoute allowedRoles={['admin']}><AdminDepartments /></ProtectedRoute>} />
      <Route path="/admin/approvals" element={<ProtectedRoute allowedRoles={['admin']}><AdminApprovals /></ProtectedRoute>} />
      <Route path="/officer/false-reports" element={<ProtectedRoute allowedRoles={['officer']}><FalseComplaints /></ProtectedRoute>} />
      <Route path="/admin/false-complaints" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><FalseComplaints /></ProtectedRoute>} />
      <Route path="/super-admin/false-complaints" element={<ProtectedRoute allowedRoles={['super_admin']}><FalseComplaints /></ProtectedRoute>} />
      <Route path="/admin/status-requests" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminStatusRequests /></ProtectedRoute>} />
      <Route path="/officer/helpline" element={<ProtectedRoute allowedRoles={['officer']}><OfficerHelpline /></ProtectedRoute>} />
      <Route path="/admin/helpline" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminHelpline /></ProtectedRoute>} />

      <Route path="/super-admin" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
      <Route path="/super-admin/complaints" element={<ProtectedRoute allowedRoles={['super_admin']}><ComplaintsList /></ProtectedRoute>} />
      <Route path="/super-admin/admins" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminAdmins /></ProtectedRoute>} />
      <Route path="/super-admin/officers" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminOfficers /></ProtectedRoute>} />
      <Route path="/super-admin/citizens" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminCitizens /></ProtectedRoute>} />
      <Route path="/super-admin/approvals" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminApprovals /></ProtectedRoute>} />
      <Route path="/super-admin/departments" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDepartments /></ProtectedRoute>} />
      <Route path="/super-admin/helpline" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminHelpline /></ProtectedRoute>} />
      <Route path="/super-admin/activity" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminActivity /></ProtectedRoute>} />
      <Route path="/super-admin/settings" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminSettings /></ProtectedRoute>} />

      <Route path="/complaints/new" element={<ProtectedRoute allowedRoles={['citizen']}><ComplaintForm /></ProtectedRoute>} />
      <Route path="/complaints/:id" element={<ProtectedRoute><ComplaintDetails /></ProtectedRoute>} />
      <Route path="/complaints/:id/receipt" element={<ProtectedRoute><ReceiptView /></ProtectedRoute>} />

      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
