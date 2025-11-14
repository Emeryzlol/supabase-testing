import { useState, useCallback } from 'react'
import './App.css'
import AuthGate from './components/authgate'
import AudioUploader from './components/audiouploader'
import type { Session } from "@supabase/supabase-js";


function App() {
  const [userId, setUserId] = useState<string | null>(null);

  const handleAuth = useCallback((session: Session | null) => {
    setUserId(session?.user.id ?? null);
  }, []);

  return (
    <div className="App">
      <AuthGate onAuth={handleAuth} />
      {userId && <AudioUploader userId={userId} />}
    </div>
  );
}

export default App;
