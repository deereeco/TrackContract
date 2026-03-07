export interface Session {
  id: string;
  name: string;
  ownerId: string;
  createdAt: number;
  active: boolean;
  shareToken: string;
}
