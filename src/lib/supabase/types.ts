export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; created_at: string };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: { display_name?: string | null };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by: string;
          created_at?: string;
        };
        Update: { name?: string };
        Relationships: [];
      };
      team_members: {
        Row: {
          team_id: string;
          user_id: string;
          role: "leader" | "kid";
          created_at: string;
        };
        Insert: {
          team_id: string;
          user_id: string;
          role: "leader" | "kid";
          created_at?: string;
        };
        Update: { role?: "leader" | "kid" };
        Relationships: [];
      };
      team_invites: {
        Row: {
          id: string;
          team_id: string;
          code: string;
          created_by: string;
          created_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          code: string;
          created_by: string;
          created_at?: string;
          revoked_at?: string | null;
        };
        Update: { revoked_at?: string | null };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          team_id: string;
          display_name: string;
          color: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          display_name: string;
          color?: string;
          created_by: string;
          created_at?: string;
        };
        Update: { display_name?: string; color?: string };
        Relationships: [];
      };
      boards: {
        Row: {
          id: string;
          team_id: string;
          title: string;
          description: string | null;
          slug: string | null;
          width: number;
          height: number;
          status: "draft" | "active";
          created_by: string;
          created_at: string;
          generated_at: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          title: string;
          description?: string | null;
          slug?: string | null;
          width: number;
          height: number;
          status?: "draft" | "active";
          created_by: string;
          created_at?: string;
          generated_at?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          slug?: string | null;
          width?: number;
          height?: number;
          status?: "draft" | "active";
          generated_at?: string | null;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          board_id: string;
          title: string;
          description: string | null;
          appearance_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          title: string;
          description?: string | null;
          appearance_count: number;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          appearance_count?: number;
        };
        Relationships: [];
      };
      board_cells: {
        Row: {
          id: string;
          board_id: string;
          task_id: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          task_id: string;
          position: number;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      cell_checks: {
        Row: {
          id: string;
          cell_id: string;
          member_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cell_id: string;
          member_id: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      accept_team_invite: {
        Args: { invite_code: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
