export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_name: string;
  details: string | null;
  created_at: string;
}
