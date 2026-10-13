import { useAuth } from './hooks/useAuth';
import { Workspace } from './components/Workspace';

export default function App() {
  const auth = useAuth();
  if (auth.loading) return <div className="boot" aria-busy="true" />;
  // a new key per account gives each person a clean workspace
  return <Workspace key={auth.user?.id ?? 'guest'} auth={auth} />;
}
