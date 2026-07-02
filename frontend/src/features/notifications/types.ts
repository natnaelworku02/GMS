export interface NotificationResponse {
  id: string;
  user_id: string | null;
  role_id: string | null;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}
