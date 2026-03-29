import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, MessageSquare, Loader2, Bot, ExternalLink, Search, Check, CheckCheck } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { sendSystemMessage } from '@/hooks/useSendSystemMessage';
import { extractPaymentMarker, openDocumentReference, parseDocumentMarkers, stripMessageMarkers } from '@/lib/document-access';

interface ChatInboxProps {
  role: 'parent' | 'school_admin';
  schoolId?: string;
  onBack?: () => void;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  applicationId: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  application_id: string | null;
  content: string;
  is_system: boolean;
  is_read: boolean;
  created_at: string;
}

const formatMsgTime = (iso: string) => format(new Date(iso), 'HH:mm');

const formatConvTime = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
};

const ChatInbox = ({ role, onBack }: ChatInboxProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: allMessages = [], isLoading } = useQuery({
    queryKey: ['messages', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!user,
  });

  const partnerIds = [...new Set(allMessages.map(m =>
    m.sender_id === user?.id ? m.receiver_id : m.sender_id
  ))];

  const { data: profiles = [] } = useQuery({
    queryKey: ['chat-profiles', partnerIds.join(',')],
    queryFn: async () => {
      if (partnerIds.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles').select('user_id, full_name').in('user_id', partnerIds);
      if (error) throw error;
      return data;
    },
    enabled: partnerIds.length > 0,
  });

  const { data: schoolNames = [] } = useQuery({
    queryKey: ['chat-school-names', partnerIds.join(',')],
    queryFn: async () => {
      if (partnerIds.length === 0) return [];
      const { data, error } = await supabase
        .from('schools').select('admin_id, name').in('admin_id', partnerIds);
      if (error) throw error;
      return data;
    },
    enabled: partnerIds.length > 0,
  });

  const { data: ownSchool } = useQuery({
    queryKey: ['own-school-name', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('schools').select('name').eq('admin_id', user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && role === 'school_admin',
  });

  const { data: studentParentMap = [] } = useQuery({
    queryKey: ['chat-student-parents', partnerIds.join(',')],
    queryFn: async () => {
      if (partnerIds.length === 0 || role !== 'school_admin') return [];
      const { data, error } = await supabase
        .from('students').select('parent_id, name, mother_name, father_name').in('parent_id', partnerIds);
      if (error) throw error;
      return data;
    },
    enabled: partnerIds.length > 0 && role === 'school_admin',
  });

  const getPartnerDisplayName = (partnerId: string) => {
    if (role === 'parent') {
      const s = schoolNames.find(s => s.admin_id === partnerId);
      if (s) return s.name;
      const p = profiles.find(p => p.user_id === partnerId);
      return p?.full_name || 'School';
    }
    const si = studentParentMap.find(s => s.parent_id === partnerId);
    const p = profiles.find(p => p.user_id === partnerId);
    if (si && p?.full_name) return `${si.name}'s Parent (${p.full_name})`;
    if (si) {
      const name = si.mother_name || si.father_name || '';
      return `${si.name}'s Parent${name ? ` (${name})` : ''}`;
    }
    return p?.full_name || 'User';
  };

  const conversations: Conversation[] = React.useMemo(() => {
    if (!user) return [];
    const map = new Map<string, Conversation>();
    allMessages.forEach(msg => {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      const existing = map.get(partnerId);
      const isUnread = msg.receiver_id === user.id && !msg.is_read;
      if (!existing || new Date(msg.created_at) > new Date(existing.lastMessageAt)) {
        map.set(partnerId, {
          partnerId,
          partnerName: getPartnerDisplayName(partnerId),
          applicationId: null,
          lastMessage: stripMessageMarkers(msg.content),
          lastMessageAt: msg.created_at,
          unreadCount: (existing?.unreadCount || 0) + (isUnread ? 1 : 0),
        });
      } else if (isUnread) {
        existing.unreadCount += 1;
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }, [allMessages, profiles, schoolNames, studentParentMap, user]);

  const filtered = conversations.filter(c =>
    c.partnerName.toLowerCase().includes(search.toLowerCase())
  );

  const conversationMessages = React.useMemo(() => {
    if (!selectedConversation || !user) return [];
    return allMessages.filter(m => {
      const isPartner = m.sender_id === selectedConversation.partnerId || m.receiver_id === selectedConversation.partnerId;
      const isSelf = m.sender_id === user.id || m.receiver_id === user.id;
      return isPartner && isSelf;
    });
  }, [allMessages, selectedConversation, user]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !selectedConversation) throw new Error('No conversation selected');
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: selectedConversation.partnerId,
        application_id: null,
        content,
        is_system: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  const markPaymentPaidMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      if (!user) throw new Error('No user');
      const { data: payment, error: paymentError } = await supabase
        .from('payments').select('id, student_id, parent_id, school_id').eq('id', paymentId).single();
      if (paymentError) throw paymentError;
      await supabase.from('payments').update({ status: 'paid' }).eq('id', paymentId);
      const { data: student } = await supabase.from('students').select('name').eq('id', payment.student_id).single();
      // Enroll the student — application status stays as 'approved' set by the admin
      await supabase.from('students').update({ status: 'enrolled' as const }).eq('id', payment.student_id);
      if (student) {
        await sendSystemMessage({
          senderId: user.id,
          receiverId: payment.parent_id,
          content: `✅ Payment confirmed for ${student.name}. The student is now enrolled.`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['my-payments'] });
      queryClient.invalidateQueries({ queryKey: ['school-applications'] });
      queryClient.invalidateQueries({ queryKey: ['school-students'] });
    },
  });

  useEffect(() => {
    if (!selectedConversation || !user) return;
    const unreadIds = conversationMessages
      .filter(m => m.receiver_id === user.id && !m.is_read).map(m => m.id);
    if (unreadIds.length > 0) {
      supabase.from('messages').update({ is_read: true }).in('id', unreadIds).then(() => {
        queryClient.invalidateQueries({ queryKey: ['messages'] });
      });
    }
  }, [conversationMessages, selectedConversation, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['messages'] });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMutation.mutate(messageText.trim());
  };

  const getSenderName = (msg: Message) => {
    if (msg.sender_id === user?.id) return null;
    if (role === 'parent') {
      const s = schoolNames.find(s => s.admin_id === msg.sender_id);
      return s?.name || 'School';
    }
    return selectedConversation?.partnerName || 'Parent';
  };

  const renderMessageContent = (content: string, isMine: boolean) => {
    const docMarkers = parseDocumentMarkers(content);
    const paymentId = extractPaymentMarker(content);
    const cleanContent = stripMessageMarkers(content);

    // Also detect raw storage paths that weren't wrapped in markers (legacy messages)
    const storagePathRegex = /([0-9a-f-]{36}\/[^\s,]+\.(?:pdf|jpg|jpeg|png))/gi;
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    const renderText = (text: string) => {
      // Split on URLs first
      const parts = text.split(urlRegex);
      return parts.map((part, i) => {
        if (urlRegex.test(part)) {
          // Check if it's a storage URL — render as button
          if (part.includes('/storage/v1/')) {
            return (
              <button key={i} onClick={() => void openDocumentReference(part)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium mt-1 ${isMine ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-primary/10 hover:bg-primary/20 text-primary'} transition-colors`}>
                <ExternalLink className="w-3 h-3" />View Document
              </button>
            );
          }
          return <span key={i} className="underline opacity-70 text-xs break-all">{part}</span>;
        }
        // Detect raw storage paths in plain text (legacy messages)
        const pathParts = part.split(storagePathRegex);
        return pathParts.map((chunk, j) => {
          if (storagePathRegex.test(chunk)) {
            storagePathRegex.lastIndex = 0;
            return (
              <button key={`${i}-${j}`} onClick={() => void openDocumentReference(chunk, 'student-documents')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium mt-1 ${isMine ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-primary/10 hover:bg-primary/20 text-primary'} transition-colors`}>
                <ExternalLink className="w-3 h-3" />View Document
              </button>
            );
          }
          storagePathRegex.lastIndex = 0;
          return <span key={`${i}-${j}`}>{chunk}</span>;
        });
      });
    };

    return (
      <div className="space-y-1.5">
        {cleanContent && <div className="whitespace-pre-wrap leading-relaxed">{renderText(cleanContent)}</div>}
        {docMarkers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {docMarkers.flatMap((marker) => marker.refs.map((ref, idx) => (
              <button key={`${marker.label}-${idx}`}
                onClick={() => void openDocumentReference(ref, marker.bucket)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${isMine ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-primary/10 hover:bg-primary/20 text-primary'} transition-colors`}>
                <ExternalLink className="w-3 h-3" />
                {marker.refs.length > 1 ? `${marker.label} ${idx + 1}` : marker.label}
              </button>
            )))}
          </div>
        )}
        {role === 'school_admin' && paymentId && (
          <button onClick={() => markPaymentPaidMutation.mutate(paymentId)}
            disabled={markPaymentPaidMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-60 mt-0.5">
            {markPaymentPaidMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            ✓ Mark as Paid
          </button>
        )}
      </div>
    );
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const showChat = !!selectedConversation;

  return (
    <div className="flex h-[calc(100vh-160px)] min-h-[520px] rounded-2xl overflow-hidden border shadow-xl bg-background">

      {/* ── Sidebar ── */}
      <div className={`flex flex-col bg-gradient-to-b from-primary to-primary/90 ${showChat ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-shrink-0`}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/20">
          {onBack && (
            <button onClick={onBack} className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">
              {role === 'school_admin' ? (ownSchool?.name || 'School Inbox') : 'My Messages'}
            </p>
            <p className="text-white/60 text-xs">
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              {totalUnread > 0 && <span className="text-white/90 font-medium ml-1">· {totalUnread} unread</span>}
            </p>
          </div>
          <MessageSquare className="w-4 h-4 text-white/40 flex-shrink-0" />
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-white/20">
          <div className="flex items-center gap-2 bg-white/15 border border-white/20 rounded-xl px-3 py-2">
            <Search className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="bg-transparent text-white text-xs placeholder:text-white/50 outline-none flex-1 min-w-0" />
          </div>
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <MessageSquare className="w-10 h-10 text-white/20 mb-3" />
              <p className="text-white/50 text-sm">{search ? 'No results' : t('chat.noMessages')}</p>
            </div>
          ) : (
            <div className="py-1">
              {filtered.map((conv, i) => {
                const isActive = selectedConversation?.partnerId === conv.partnerId;
                const initials = conv.partnerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <button key={`${conv.partnerId}-${i}`}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${isActive ? 'bg-white/20 border-l-[3px] border-white' : 'hover:bg-white/10 border-l-[3px] border-transparent'}`}
                    onClick={() => setSelectedConversation(conv)}>
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold ${isActive ? 'bg-white text-primary' : 'bg-white/20 text-white'}`}>
                        {initials}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-white text-primary rounded-full text-[10px] font-bold flex items-center justify-center">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className={`text-sm font-semibold truncate ${conv.unreadCount > 0 ? 'text-white' : 'text-white/80'}`}>
                          {conv.partnerName}
                        </p>
                        <span className="text-[10px] text-white/50 flex-shrink-0">
                          {formatConvTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-white/80 font-medium' : 'text-white/50'}`}>
                        {conv.lastMessage || '...'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── Chat pane ── */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col min-w-0"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--muted)) 1px, transparent 0)', backgroundSize: '24px 24px', backgroundPosition: '0 0' }}>

          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur-sm">
            <button className="md:hidden text-muted-foreground hover:text-foreground p-1"
              onClick={() => setSelectedConversation(null)}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-primary/15 text-primary font-bold text-sm">
                {selectedConversation.partnerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{selectedConversation.partnerName}</p>
              <p className="text-xs text-green-500">Online</p>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-1 max-w-2xl mx-auto">
              {conversationMessages.map((msg, idx) => {
                const isMine = msg.sender_id === user?.id;
                const prevMsg = conversationMessages[idx - 1];
                const showDateDivider = !prevMsg ||
                  format(new Date(prevMsg.created_at), 'yyyy-MM-dd') !== format(new Date(msg.created_at), 'yyyy-MM-dd');

                // System message
                if (msg.is_system) {
                  return (
                    <React.Fragment key={msg.id}>
                      {showDateDivider && (
                        <div className="flex items-center justify-center py-3">
                          <span className="bg-background/80 text-muted-foreground text-[11px] px-3 py-1 rounded-full border shadow-sm">
                            {isToday(new Date(msg.created_at)) ? 'Today' : isYesterday(new Date(msg.created_at)) ? 'Yesterday' : format(new Date(msg.created_at), 'MMMM d, yyyy')}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-center py-1">
                        <div className="bg-background/90 border rounded-xl px-4 py-2 max-w-[85%] text-center shadow-sm">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <Bot className="w-3 h-3" />
                            <span className="text-[10px] font-medium uppercase tracking-wide">System</span>
                          </div>
                          <div className="text-xs text-foreground">{renderMessageContent(msg.content, false)}</div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                }

                // Regular message
                const prevIsSameSender = prevMsg && !prevMsg.is_system && prevMsg.sender_id === msg.sender_id;
                const showAvatar = !isMine && !prevIsSameSender;

                return (
                  <React.Fragment key={msg.id}>
                    {showDateDivider && (
                      <div className="flex items-center justify-center py-3">
                        <span className="bg-background/80 text-muted-foreground text-[11px] px-3 py-1 rounded-full border shadow-sm">
                          {isToday(new Date(msg.created_at)) ? 'Today' : isYesterday(new Date(msg.created_at)) ? 'Yesterday' : format(new Date(msg.created_at), 'MMMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'} ${prevIsSameSender ? 'mt-0.5' : 'mt-3'}`}>
                      {/* Left avatar placeholder to keep bubbles aligned */}
                      {!isMine && (
                        <div className="w-7 flex-shrink-0">
                          {showAvatar && (
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-bold">
                                {getSenderName(msg)?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}

                      <div className={`max-w-[72%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        {showAvatar && !isMine && (
                          <span className="text-[11px] font-semibold text-primary ml-1 mb-0.5">
                            {getSenderName(msg)}
                          </span>
                        )}
                        <div className={`px-3.5 py-2 text-sm shadow-sm ${
                          isMine
                            ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm'
                            : 'bg-background text-foreground border rounded-2xl rounded-bl-sm'
                        }`}>
                          {renderMessageContent(msg.content, isMine)}
                        </div>
                        {/* Timestamp + read receipt */}
                        <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className="text-[10px] text-muted-foreground">{formatMsgTime(msg.created_at)}</span>
                          {isMine && (
                            msg.is_read
                              ? <CheckCheck className="w-3 h-3 text-primary" />
                              : <Check className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="px-4 py-3 border-t bg-background/95 backdrop-blur-sm">
            <div className="flex items-center gap-2 max-w-2xl mx-auto">
              <Input
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder={t('chat.typePlaceholder')}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                className="flex-1 rounded-full bg-muted border-0 focus-visible:ring-1 text-sm"
              />
              <Button onClick={handleSend}
                disabled={sendMutation.isPending || !messageText.trim()}
                size="icon"
                className="rounded-full w-10 h-10 flex-shrink-0 shadow-md">
                {sendMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state on desktop when no conversation selected */
        <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-3 text-muted-foreground bg-muted/10">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-primary/40" />
          </div>
          <p className="text-sm font-medium">Select a conversation</p>
          <p className="text-xs text-muted-foreground/60">Choose from the list on the left</p>
        </div>
      )}
    </div>
  );
};

export default ChatInbox;
