import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import BannersPage from "@/pages/BannersPage";
import LoginPage, { getStoredAuth } from "@/pages/LoginPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

function App() {
  const [authed, setAuthed] = useState(() => getStoredAuth());

  return (
    <QueryClientProvider client={queryClient}>
      {authed ? (
        <BannersPage />
      ) : (
        <LoginPage onSuccess={() => setAuthed(true)} />
      )}
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
