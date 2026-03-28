import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Send, MessageSquare, Loader2, Bot, Inbox, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
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

const ChatInbox = ({ role, schoolId, onBack }: ChatInboxProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
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
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', partnerIds);
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
        .from('schools')
        .select('admin_id, name')
        .in('admin_id', partnerIds);
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
        .from('schools')
        .select('name')
        .eq('admin_id', user.id)
        .maybeSingle();
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
        .from('students')
        .select('parent_id, name, mother_name, father_name')
        .in('parent_id', partnerIds);
      if (error) throw error;
      return data;
    },
    enabled: partnerIds.length > 0 && role === 'school_admin',
  });

  const getPartnerDisplayName = (partnerId: string) => {
    if (role === 'parent') {
      const schoolInfo = schoolNames.find(s => s.admin_id === partnerId);
      if (schoolInfo) return schoolInfo.name;
      const profile = profiles.find(p => p.user_id === partnerId);
      return profile?.full_name || 'School';
    }
    
    if (role === 'school_admin') {
      const studentInfo = studentParentMap.find(s => s.parent_id === partnerId);
      const profile = profiles.find(p => p.user_id === partnerId);
      if (studentInfo && profile?.full_name) {
        return `${studentInfo.name}'s Parent (${profile.full_name})`;
      }
      if (studentInfo) {
        const parentName = studentInfo.mother_name || studentInfo.father_name || '';
        return `${studentInfo.name}'s Parent${parentName ? ` (${parentName})` : ''}`;
      }
      if (profile?.full_name) return profile.full_name;
    }
    
    const profile = profiles.find(p => p.user_id === partnerId);
    return profile?.full_name || 'User';
  };

  const conversations: Conversation[] = React.useMemo(() => {
    if (!user) return [];
    const convMap = new Map<string, Conversation>();

    allMessages.forEach(msg => {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      const key = partnerId;
      
      const existing = convMap.get(key);
      const isUnread = msg.receiver_id === user.id && !msg.is_read;

      if (!existing || new Date(msg.created_at) > new Date(existing.lastMessageAt)) {
        convMap.set(key, {
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

    return Array.from(convMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }, [allMessages, profiles, schoolNames, studentParentMap, user]);

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
        .from('payments')
        .select('id, student_id, parent_id, school_id')
        .eq('id', paymentId)
        .single();
      if (paymentError) throw paymentError;

      const { error: payUpdateError } = await supabase.from('payments').update({ status: 'paid' }).eq('id', paymentId);
      if (payUpdateError) throw payUpdateError;

      const { error: appUpdateError } = await supabase
        .from('applications')
        .update({ status: 'enrolled' })
        .eq('student_id', payment.student_id)
        .eq('school_id', payment.school_id)
        .in('status', ['approved', 'pending']);
      if (appUpdateError) throw appUpdateError;

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('name')
        .eq('id', payment.student_id)
        .single();
      if (studentError) throw studentError;

      const { error: studentUpdateError } = await supabase
        .from('students')
        .update({ status: 'enrolled' as const })
        .eq('id', payment.student_id);
      if (studentUpdateError) throw studentUpdateError;

      await sendSystemMessage({
        senderId: user.id,
        receiverId: payment.parent_id,
        content: `✅ Payment confirmed for ${student.name}. The student is now enrolled.`,
      });
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
      .filter(m => m.receiver_id === user.id && !m.is_read)
      .map(m => m.id);
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
    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['messages'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMutation.mutate(messageText.trim());
  };

  const getSenderName = (msg: Message) => {
    if (msg.sender_id === user?.id) return null;
    if (role === 'parent') {
      const schoolInfo = schoolNames.find(s => s.admin_id === msg.sender_id);
      return schoolInfo?.name || 'School';
    }
    return selectedConversation?.partnerName || 'Parent';
  };

  // Render message content with clickable document links
  const renderMessageContent = (content: string) => {
    const docMarkers = parseDocumentMarkers(content);
    const paymentId = extractPaymentMarker(content);
    const cleanContent = stripMessageMarkers(content);
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = cleanContent.split(urlRegex);

    return (
      <div className="space-y-2">
        <div>
          {parts.map((part, i) => {
            if (urlRegex.test(part)) {
              return (
                <Button key={i} type="button" variant="outline" size="sm" className="my-1 inline-flex" onClick={() => void openDocumentReference(part)}>
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View Document
                </Button>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
        {docMarkers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {docMarkers.flatMap((marker) => marker.refs.map((ref, index) => (
              <Button key={`${marker.label}-${index}-${ref}`} type="button" variant="outline" size="sm" onClick={() => void openDocumentReference(ref, marker.bucket)}>
                <ExternalLink className="w-3 h-3 mr-1" />
                {marker.refs.length > 1 ? `${marker.label} ${index + 1}` : marker.label}
              </Button>
            )))}
          </div>
        )}
        {role === 'school_admin' && paymentId && (
          <Button type="button" size="sm" onClick={() => markPaymentPaidMutation.mutate(paymentId)} disabled={markPaymentPaidMutation.isPending}>
            {markPaymentPaidMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            Mark as Paid
          </Button>
        )}
      </div>
    );
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (selectedConversation) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => setSelectedConversation(null)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('chat.backToInbox')}
        </Button>

        <Card className="flex flex-col h-[600px]">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary">
                  {selectedConversation.partnerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-lg">{selectedConversation.partnerName}</CardTitle>
            </div>
          </CardHeader>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {conversationMessages.map((msg) => {
                const isMine = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      msg.is_system 
                        ? 'bg-muted text-muted-foreground text-center max-w-full w-full text-sm italic'
                        : isMine 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-foreground'
                    }`}>
                      {msg.is_system && <Bot className="w-3 h-3 inline mr-1" />}
                      {!isMine && !msg.is_system && (
                        <p className="text-xs font-semibold mb-1 text-primary">{getSenderName(msg)}</p>
                      )}
                      <div className="text-sm whitespace-pre-wrap">{renderMessageContent(msg.content)}</div>
                      <p className={`text-[10px] mt-1 ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-3">
            <div className="flex gap-2">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={t('chat.typePlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={sendMutation.isPending || !messageText.trim()}>
                {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Inbox className="w-6 h-6 text-primary" />
              <CardTitle>{t('chat.inbox')}</CardTitle>
            </div>
            {totalUnread > 0 && (
              <Badge className="bg-destructive text-destructive-foreground">{totalUnread} {t('chat.unread')}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('chat.noMessages')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv, i) => (
                <button
                  key={`${conv.partnerId}-${i}`}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                  onClick={() => setSelectedConversation(conv)}
                >
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {conv.partnerName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{conv.partnerName}</p>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(conv.lastMessageAt), 'MMM d')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <Badge className="bg-destructive text-destructive-foreground text-xs">{conv.unreadCount}</Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatInbox;
