export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      alias_members: {
        Row: {
          alias_id: string;
          created_at: string;
          member_id: string;
          space_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          alias_id: string;
          created_at?: string;
          member_id: string;
          space_id: string;
          updated_at?: string;
        };
        Update: {
          alias_id?: string;
          created_at?: string;
          member_id?: string;
          space_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alias_members_alias_fkey";
            columns: ["space_id", "alias_id"];
            referencedRelation: "aliases";
            referencedColumns: ["space_id", "id"];
          },
          {
            foreignKeyName: "alias_members_member_fkey";
            columns: ["space_id", "member_id"];
            referencedRelation: "members";
            referencedColumns: ["space_id", "id"];
          },
          {
            foreignKeyName: "alias_members_space_id_fkey";
            columns: ["space_id"];
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      aliases: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          space_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          space_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          space_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "aliases_space_id_fkey";
            columns: ["space_id"];
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      members: {
        Row: {
          archived_at: string | null;
          created_at: string;
          id: string;
          name: string;
          space_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          space_id: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          space_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "members_space_id_fkey";
            columns: ["space_id"];
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      space_currencies: {
        Row: {
          created_at: string;
          currency: string;
          is_default: boolean;
          rate: number;
          space_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          currency: string;
          is_default?: boolean;
          rate: number;
          space_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          is_default?: boolean;
          rate?: number;
          space_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "space_currencies_space_id_fkey";
            columns: ["space_id"];
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      spaces: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "spaces_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "spaces_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
      transaction_parties: {
        Row: {
          alias_id: string | null;
          created_at: string;
          id: string;
          member_id: string | null;
          share_minor: number | null;
          side: Database["public"]["Enums"]["transaction_side"];
          space_id: string;
          transaction_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          alias_id?: string | null;
          created_at?: string;
          id?: string;
          member_id?: string | null;
          share_minor?: number | null;
          side: Database["public"]["Enums"]["transaction_side"];
          space_id: string;
          transaction_id: string;
          updated_at?: string;
        };
        Update: {
          alias_id?: string | null;
          created_at?: string;
          id?: string;
          member_id?: string | null;
          share_minor?: number | null;
          side?: Database["public"]["Enums"]["transaction_side"];
          space_id?: string;
          transaction_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_parties_alias_fkey";
            columns: ["space_id", "alias_id"];
            referencedRelation: "aliases";
            referencedColumns: ["space_id", "id"];
          },
          {
            foreignKeyName: "transaction_parties_member_fkey";
            columns: ["space_id", "member_id"];
            referencedRelation: "members";
            referencedColumns: ["space_id", "id"];
          },
          {
            foreignKeyName: "transaction_parties_space_id_fkey";
            columns: ["space_id"];
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_parties_transaction_fkey";
            columns: ["space_id", "transaction_id"];
            referencedRelation: "transactions";
            referencedColumns: ["space_id", "id"];
          },
        ];
      };
      transactions: {
        Row: {
          amount_minor: number;
          created_at: string;
          created_by: string | null;
          currency: string;
          description: string | null;
          id: string;
          space_id: string;
          title: string;
          transaction_date: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_minor: number;
          created_at?: string;
          created_by?: string | null;
          currency: string;
          description?: string | null;
          id?: string;
          space_id: string;
          title: string;
          transaction_date: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          amount_minor?: number;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          id?: string;
          space_id?: string;
          title?: string;
          transaction_date?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_currency_fkey";
            columns: ["space_id", "currency"];
            referencedRelation: "space_currencies";
            referencedColumns: ["space_id", "currency"];
          },
          {
            foreignKeyName: "transactions_space_id_fkey";
            columns: ["space_id"];
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      app_users: {
        Row: {
          id: string | null;
          image: string | null;
          name: string | null;
        };
        ComputedFields: never;
        Insert: {
          id?: string | null;
          image?: string | null;
          name?: string | null;
        };
        Update: {
          id?: string | null;
          image?: string | null;
          name?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_space: {
        Args: {
          p_default_currency: string;
          p_description: string;
          p_member_names: string[];
          p_title: string;
        };
        Returns: string;
      };
      current_user_id: { Args: Record<PropertyKey, never>; Returns: string };
      save_alias: {
        Args: {
          p_alias_id: string;
          p_member_ids: string[];
          p_name: string;
          p_space_id: string;
        };
        Returns: string;
      };
      save_space_currencies: {
        Args: { p_currencies: Json; p_space_id: string };
        Returns: string;
      };
      save_transaction: {
        Args: {
          p_amount_minor: number;
          p_currency: string;
          p_description: string;
          p_paid_by: Json;
          p_paid_for: Json;
          p_space_id: string;
          p_title: string;
          p_transaction_date: string;
          p_transaction_id: string;
        };
        Returns: string;
      };
    };
    Enums: {
      transaction_side: "paid_by" | "paid_for";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      transaction_side: ["paid_by", "paid_for"],
    },
  },
} as const;
