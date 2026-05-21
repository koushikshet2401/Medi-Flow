import React from 'react';
import AdminLayout from '../components/AdminLayout';
import DashboardPage from '../components/DashboardPage';

function Home() {
  return (
    <AdminLayout>
      <DashboardPage />
    </AdminLayout>
  );
}

export default Home;
