import { Metadata } from 'next';
import Dashboard from '@/features/dashboard/components/Dashboard';

export const metadata: Metadata = {
  title: 'Dashboard - Clarity',
};

export default function DashboardPage() {
  return <Dashboard />;
}
