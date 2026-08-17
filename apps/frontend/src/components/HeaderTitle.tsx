import { useQuery } from '@tanstack/react-query';
import { useMatch } from 'react-router';

import { fetchConversations } from '@/api/conversations';
import { queryKeys } from '@/api/queryKeys';
import { useTypewriter } from '@/hooks/useTypewriter';
import { useChatStore } from '@/store/chatStore';

export function HeaderTitle() {
  const conversationId = useMatch('/c/:conversationId')?.params.conversationId;
  const isDocuments = !!useMatch('/documents');
  const animatingId = useChatStore((s) => s.titleAnimatingId);

  // same key as the sidebar, so this is a cache read, not a second request
  const { data } = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: fetchConversations,
  });

  let title = 'New chat';
  if (isDocuments) {
    title = 'Documents';
  } else if (conversationId) {
    // blank until the list arrives, rather than flashing "Untitled"
    title = data ? (data.find((c) => c.id === conversationId)?.title ?? 'Untitled') : '';
  }

  const displayTitle = useTypewriter(title, !!conversationId && animatingId === conversationId);

  return <span className="min-w-0 truncate">{displayTitle}</span>;
}
