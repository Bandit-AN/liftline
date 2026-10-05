-- Live updates for chat and the notification bell (RLS still applies).
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
