import { supabase } from '@/integrations/supabase/client';

export async function sendSystemMessage({
  senderId,
  receiverId,
  applicationId,
  content,
}: {
  senderId: string;
  receiverId: string;
  applicationId?: string;
  content: string;
}) {
  const { error } = await supabase.from('messages').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    application_id: applicationId || null,
    content,
    is_system: true,
  });
  if (error) console.error('Failed to send system message:', error);
}
