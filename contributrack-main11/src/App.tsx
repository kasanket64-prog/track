import { useState, useEffect } from 'react';
import type { Page } from './lib/types';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Sessions from './pages/Sessions';
import Documents from './pages/Documents';
import Settings from './pages/Settings';
import IoTDevice from './pages/IoTDevice';

function getInitialPage(): Page {
  const hash = window.location.hash.slice(1) as Page;
  const valid: Page[] = ['landing', 'login', 'dashboard', 'members', 'sessions', 'documents', 'settings', 'iot'];
  return valid.includes(hash) ? hash : 'landing';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) setUserEmail(data.session.user.email);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (() => {
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        } else if (event === 'SIGNED_OUT') {
          setUserEmail(undefined);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const page = window.location.hash.slice(1) as Page;
      const valid: Page[] = ['landing', 'login', 'dashboard', 'members', 'sessions', 'documents', 'settings', 'iot'];
      if (valid.includes(page)) setCurrentPage(page);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (page: Page) => {
    window.location.hash = page;
    setCurrentPage(page);
  };

  const handleLogin = (email: string) => {
    setUserEmail(email);
  };

  if (currentPage === 'landing') return <Landing navigate={navigate} />;
  if (currentPage === 'login') return <Auth navigate={navigate} onLogin={handleLogin} />;

  // Auth guard — redirect to login if not authenticated
  if (!userEmail) {
    return <Auth navigate={navigate} onLogin={handleLogin} />;
  }

  const PAGES: Record<Exclude<Page, 'landing' | 'login'>, React.ReactNode> = {
    dashboard: <Dashboard />,
    members: <Members />,
    sessions: <Sessions />,
    documents: <Documents />,
    settings: <Settings />,
    iot: <IoTDevice />,
  };

  return (
    <Layout currentPage={currentPage} navigate={navigate} userEmail={userEmail}>
      {PAGES[currentPage as Exclude<Page, 'landing' | 'login'>] ?? <Dashboard />}
    </Layout>
  );
}
