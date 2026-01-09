import { Header } from './components/Header';
import { ChatInterface } from './components/ChatInterface';

export default function App() {
  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f]">
      <Header />
      <main className="flex-1 overflow-hidden">
        <ChatInterface />
      </main>
    </div>
  );
}
