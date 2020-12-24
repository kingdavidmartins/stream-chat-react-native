import { useContext, useRef, useState } from 'react';
import { ChannelFilters, MessageFilters, MessageResponse } from 'stream-chat';
import { useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import {
  LocalAttachmentType,
  LocalChannelType,
  LocalCommandType,
  LocalMessageType,
  LocalReactionType,
  LocalUserType,
} from '../types';

export const MESSAGE_SEARCH_LIMIT = 10;
export const usePaginatedSearchedMessages = (
  messageFilters:
    | string
    | MessageFilters<
        LocalAttachmentType,
        LocalChannelType,
        LocalCommandType,
        LocalMessageType,
        LocalReactionType,
        LocalUserType
      > = {},
) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(true);
  const [messages, setMessages] = useState<
    | MessageResponse<
        LocalAttachmentType,
        LocalChannelType,
        LocalCommandType,
        LocalMessageType,
        LocalReactionType,
        LocalUserType
      >[]
    | null
  >(null);
  const offset = useRef(0);
  const hasMoreResults = useRef(true);
  const queryInProgress = useRef(false);
  const { chatClient } = useContext(AppContext);

  const done = () => {
    queryInProgress.current = false;
    setLoading(false);
    setRefreshing(false);
  };

  const reset = () => {
    setMessages(null);
    offset.current = 0;
    hasMoreResults.current = true;
  };

  const fetchMessages = async () => {
    if (!messageFilters) {
      reset();
      done();
      return;
    }

    if (queryInProgress.current) {
      done();
      return;
    }

    setLoading(true);

    try {
      queryInProgress.current = true;

      if (!hasMoreResults.current) {
        queryInProgress.current = false;
        done();
        return;
      }
      const res = await chatClient?.search(
        {
          members: {
            $in: [chatClient?.user?.id],
          },
        },
        messageFilters,
        {
          limit: MESSAGE_SEARCH_LIMIT,
          offset: offset.current,
        },
      );

      const newMessages = res?.results.map((r) => r.message);
      if (!newMessages) {
        queryInProgress.current = false;
        done();
        return;
      }

      let messagesLength = 0;
      if (offset.current === 0) {
        messagesLength = newMessages.length;
        setMessages(newMessages);
      } else {
        setMessages((existingMessages) => {
          if (!existingMessages) {
            messagesLength = newMessages.length;
            return newMessages;
          }

          const messages = existingMessages.concat(newMessages);
          messagesLength = messages.length;
          return messages;
        });
      }

      if (newMessages.length < MESSAGE_SEARCH_LIMIT) {
        hasMoreResults.current = false;
      }

      offset.current = offset.current + messagesLength;
    } catch (e) {
      // do nothing;
    }

    done();
  };

  const loadMore = () => {
    fetchMessages();
  };

  useEffect(() => {
    reloadList();
  }, [messageFilters]);

  const refreshList = () => {
    if (!chatClient?.user?.id) return;

    offset.current = 0;
    hasMoreResults.current = true;

    setRefreshing(true);
    fetchMessages();
  };

  const reloadList = () => {
    setMessages([]);
    fetchMessages();
  };

  return {
    loading,
    loadMore,
    messages,
    refreshing,
    refreshList,
    reloadList,
    reset,
  };
};