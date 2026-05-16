"use client";

import { useChat } from 'ai/react';
import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

export const ChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-primary text-primary-foreground p-4 rounded-full shadow-lg hover:bg-primary/90 transition-all z-50 flex items-center gap-2"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="font-semibold hidden md:inline-block">AI Assistant</span>
        </button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[350px] h-[500px] flex flex-col shadow-2xl z-50 border-primary/20">
          <CardHeader className="p-4 bg-primary text-primary-foreground flex flex-row items-center justify-between rounded-t-lg">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              AI Analytics Assistant
            </CardTitle>
            <button onClick={() => setIsOpen(false)} className="hover:bg-primary-foreground/20 p-1 rounded">
              <X className="h-4 w-4" />
            </button>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground mt-10">
                Ask me about your sales trends, customer behavior, or store performance.
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg text-sm ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-muted text-foreground rounded-bl-none'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </CardContent>

          <CardFooter className="p-3 border-t">
            <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
              <input
                className="flex-1 bg-transparent text-sm border outline-none rounded-full px-4 py-2"
                value={input}
                onChange={handleInputChange}
                placeholder="Ask a question..."
              />
              <button
                type="submit"
                className="bg-primary text-primary-foreground p-2 rounded-full hover:bg-primary/90 transition"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
};
