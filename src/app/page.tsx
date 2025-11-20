'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConversationList, type ConversationListRef } from '@/components/conversation-list';
import { MessageView } from '@/components/message-view';

type Conversation = {
  id: string;
  phoneNumber: string;
  contactName?: string;
};

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<Conversation>();
  const conversationListRef = useRef<ConversationListRef>(null);

  // Load conversation from URL on mount
  useEffect(() => {
    const chatId = searchParams.get('chat');
    if (chatId) {
      // Fetch conversation details
      fetch(`/api/conversations`)
        .then(res => res.json())
        .then(data => {
          const conversation = data.data?.find((conv: Conversation) => conv.id === chatId);
          if (conversation) {
            setSelectedConversation(conversation);
          }
        })
        .catch(console.error);
    }
  }, [searchParams]);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    // Update URL
    router.push(`?chat=${conversation.id}`, { scroll: false });
  };

  const handleTemplateSent = async (phoneNumber: string) => {
    // Refresh the conversation list and get the updated conversations
    const conversations = await conversationListRef.current?.refresh();

    // Find and select the conversation for the phone number
    if (conversations) {
      const conversation = conversations.find(conv => conv.phoneNumber === phoneNumber);
      if (conversation) {
        setSelectedConversation(conversation);
        router.push(`?chat=${conversation.id}`, { scroll: false });
      }
    }
  };

  const handleBackToList = () => {
    setSelectedConversation(undefined);
    router.push('/', { scroll: false });
  };

  return (
    <div className="h-screen flex">
      <ConversationList
        ref={conversationListRef}
        onSelectConversation={handleSelectConversation}
        selectedConversationId={selectedConversation?.id}
        isHidden={!!selectedConversation}
      />
      <MessageView
        conversationId={selectedConversation?.id}
        phoneNumber={selectedConversation?.phoneNumber}
        contactName={selectedConversation?.contactName}
        onTemplateSent={handleTemplateSent}
        onBack={handleBackToList}
        isVisible={!!selectedConversation}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
