import React from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { FamilyProvider } from './context/FamilyContext';
import FamilyApp from './components/family/FamilyApp';
import Landing from './components/family/Landing';
import InviteAccept from './components/invite/InviteAccept';
import AdminDashboard from './components/admin/AdminDashboard';

function FamilyRoute() {
  const { familyId } = useParams();
  return (
    <FamilyProvider familyId={familyId}>
      <FamilyApp />
    </FamilyProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/family/:familyId/*" element={<FamilyRoute />} />
      <Route path="/invite/:code" element={<InviteAccept />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
}
