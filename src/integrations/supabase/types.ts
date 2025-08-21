export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      credit_events: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          grab_id: string | null
          id: string
          local_cents_change: number
          merchant_id: string
          network_cents_change: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type?: string
          grab_id?: string | null
          id?: string
          local_cents_change?: number
          merchant_id: string
          network_cents_change?: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          grab_id?: string | null
          id?: string
          local_cents_change?: number
          merchant_id?: string
          network_cents_change?: number
          user_id?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          created_at: string
          id: string
          local_cents: number
          merchant_id: string
          network_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          local_cents?: number
          merchant_id: string
          network_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          local_cents?: number
          merchant_id?: string
          network_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          cashback_pct: number | null
          created_at: string
          description: string | null
          discount_pct: number | null
          end_at: string | null
          grabs: number | null
          id: string
          is_active: boolean | null
          merchant_id: string
          redemptions: number | null
          reward_mode: Database["public"]["Enums"]["reward_mode"] | null
          start_at: string | null
          stock: number | null
          title: string
          views: number | null
          visibility: Database["public"]["Enums"]["deal_visibility"] | null
        }
        Insert: {
          cashback_pct?: number | null
          created_at?: string
          description?: string | null
          discount_pct?: number | null
          end_at?: string | null
          grabs?: number | null
          id?: string
          is_active?: boolean | null
          merchant_id: string
          redemptions?: number | null
          reward_mode?: Database["public"]["Enums"]["reward_mode"] | null
          start_at?: string | null
          stock?: number | null
          title: string
          views?: number | null
          visibility?: Database["public"]["Enums"]["deal_visibility"] | null
        }
        Update: {
          cashback_pct?: number | null
          created_at?: string
          description?: string | null
          discount_pct?: number | null
          end_at?: string | null
          grabs?: number | null
          id?: string
          is_active?: boolean | null
          merchant_id?: string
          redemptions?: number | null
          reward_mode?: Database["public"]["Enums"]["reward_mode"] | null
          start_at?: string | null
          stock?: number | null
          title?: string
          views?: number | null
          visibility?: Database["public"]["Enums"]["deal_visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      grabs: {
        Row: {
          anon_user_id: string | null
          created_at: string
          deal_id: string
          expires_at: string
          grabbed_at: string
          id: string
          merchant_id: string
          pin: string
          qr_token: string | null
          status: string
          updated_at: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          anon_user_id?: string | null
          created_at?: string
          deal_id: string
          expires_at?: string
          grabbed_at?: string
          id?: string
          merchant_id: string
          pin: string
          qr_token?: string | null
          status?: string
          updated_at?: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          anon_user_id?: string | null
          created_at?: string
          deal_id?: string
          expires_at?: string
          grabbed_at?: string
          id?: string
          merchant_id?: string
          pin?: string
          qr_token?: string | null
          status?: string
          updated_at?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      group_buy_participants: {
        Row: {
          group_buy_id: string
          id: string
          joined_at: string
          quantity: number | null
          user_id: string
        }
        Insert: {
          group_buy_id: string
          id?: string
          joined_at?: string
          quantity?: number | null
          user_id: string
        }
        Update: {
          group_buy_id?: string
          id?: string
          joined_at?: string
          quantity?: number | null
          user_id?: string
        }
        Relationships: []
      }
      group_buys: {
        Row: {
          created_at: string
          current_quantity: number | null
          description: string | null
          end_at: string
          group_price: number
          id: string
          is_active: boolean | null
          merchant_id: string
          original_price: number
          target_quantity: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_quantity?: number | null
          description?: string | null
          end_at: string
          group_price: number
          id?: string
          is_active?: boolean | null
          merchant_id: string
          original_price: number
          target_quantity: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_quantity?: number | null
          description?: string | null
          end_at?: string
          group_price?: number
          id?: string
          is_active?: boolean | null
          merchant_id?: string
          original_price?: number
          target_quantity?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      merchant_alert_settings: {
        Row: {
          alerts_enabled: boolean
          created_at: string
          id: string
          merchant_id: string
          sound_enabled: boolean
          telegram_chat_id: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          alerts_enabled?: boolean
          created_at?: string
          id?: string
          merchant_id: string
          sound_enabled?: boolean
          telegram_chat_id?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          alerts_enabled?: boolean
          created_at?: string
          id?: string
          merchant_id?: string
          sound_enabled?: boolean
          telegram_chat_id?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      merchant_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          merchant_id: string
          payload: Json
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          merchant_id: string
          payload?: Json
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          merchant_id?: string
          payload?: Json
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      merchant_products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          merchant_id: string
          name: string
          price: number | null
          stock_count: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          merchant_id: string
          name: string
          price?: number | null
          stock_count?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          merchant_id?: string
          name?: string
          price?: number | null
          stock_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      merchant_reels: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          merchant_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
          view_count: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          merchant_id: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
          view_count?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          merchant_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
          view_count?: number
        }
        Relationships: []
      }
      merchant_stats: {
        Row: {
          cashback_amount: number | null
          created_at: string
          date: string | null
          id: string
          merchant_id: string
          sales_amount: number | null
          sales_count: number | null
          unique_users: number | null
        }
        Insert: {
          cashback_amount?: number | null
          created_at?: string
          date?: string | null
          id?: string
          merchant_id: string
          sales_amount?: number | null
          sales_count?: number | null
          unique_users?: number | null
        }
        Update: {
          cashback_amount?: number | null
          created_at?: string
          date?: string | null
          id?: string
          merchant_id?: string
          sales_amount?: number | null
          sales_count?: number | null
          unique_users?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_stats_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string | null
          allow_pin_fallback: boolean | null
          category: Database["public"]["Enums"]["merchant_category"] | null
          cover_url: string | null
          created_at: string
          default_cashback_pct: number | null
          default_discount_pct: number | null
          default_reward_mode: Database["public"]["Enums"]["reward_mode"] | null
          geohash: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          owner_id: string | null
          payout_account_info: Json | null
          payout_method: string | null
          phone: string | null
          psp_enabled: boolean | null
          psp_fee_fixed_cents: number | null
          psp_fee_mode: string | null
          psp_fee_pct: number | null
          psp_provider: string | null
          qr_public_url: string | null
          static_qr_id: string | null
          stripe_account_id: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          allow_pin_fallback?: boolean | null
          category?: Database["public"]["Enums"]["merchant_category"] | null
          cover_url?: string | null
          created_at?: string
          default_cashback_pct?: number | null
          default_discount_pct?: number | null
          default_reward_mode?:
            | Database["public"]["Enums"]["reward_mode"]
            | null
          geohash?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          owner_id?: string | null
          payout_account_info?: Json | null
          payout_method?: string | null
          phone?: string | null
          psp_enabled?: boolean | null
          psp_fee_fixed_cents?: number | null
          psp_fee_mode?: string | null
          psp_fee_pct?: number | null
          psp_provider?: string | null
          qr_public_url?: string | null
          static_qr_id?: string | null
          stripe_account_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          allow_pin_fallback?: boolean | null
          category?: Database["public"]["Enums"]["merchant_category"] | null
          cover_url?: string | null
          created_at?: string
          default_cashback_pct?: number | null
          default_discount_pct?: number | null
          default_reward_mode?:
            | Database["public"]["Enums"]["reward_mode"]
            | null
          geohash?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          owner_id?: string | null
          payout_account_info?: Json | null
          payout_method?: string | null
          phone?: string | null
          psp_enabled?: boolean | null
          psp_fee_fixed_cents?: number | null
          psp_fee_mode?: string | null
          psp_fee_pct?: number | null
          psp_provider?: string | null
          qr_public_url?: string | null
          static_qr_id?: string | null
          stripe_account_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      pending_transactions: {
        Row: {
          authorized_at: string | null
          captured_at: string | null
          created_at: string
          credits_applied: number | null
          deal_id: string | null
          discount_applied: number | null
          expires_at: string
          final_amount: number
          grab_id: string | null
          id: string
          local_credits_used: number | null
          merchant_id: string
          network_credits_used: number | null
          original_amount: number
          payment_code: string
          status: string | null
          updated_at: string
          user_id: string
          voided_at: string | null
        }
        Insert: {
          authorized_at?: string | null
          captured_at?: string | null
          created_at?: string
          credits_applied?: number | null
          deal_id?: string | null
          discount_applied?: number | null
          expires_at?: string
          final_amount: number
          grab_id?: string | null
          id?: string
          local_credits_used?: number | null
          merchant_id: string
          network_credits_used?: number | null
          original_amount: number
          payment_code: string
          status?: string | null
          updated_at?: string
          user_id: string
          voided_at?: string | null
        }
        Update: {
          authorized_at?: string | null
          captured_at?: string | null
          created_at?: string
          credits_applied?: number | null
          deal_id?: string | null
          discount_applied?: number | null
          expires_at?: string
          final_amount?: number
          grab_id?: string | null
          id?: string
          local_credits_used?: number | null
          merchant_id?: string
          network_credits_used?: number | null
          original_amount?: number
          payment_code?: string
          status?: string | null
          updated_at?: string
          user_id?: string
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_transactions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_transactions_grab_id_fkey"
            columns: ["grab_id"]
            isOneToOne: false
            referencedRelation: "grabs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          merchant_id: string
          name: string
          price: number
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          merchant_id: string
          name: string
          price: number
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          merchant_id?: string
          name?: string
          price?: number
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          amount: number
          cashback_earned: number | null
          created_at: string
          deal_id: string | null
          discount_applied: number | null
          id: string
          merchant_id: string
          paid_amount: number
          payment_method:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          qr_signature: string | null
          txn_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          cashback_earned?: number | null
          created_at?: string
          deal_id?: string | null
          discount_applied?: number | null
          id?: string
          merchant_id: string
          paid_amount: number
          payment_method?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          qr_signature?: string | null
          txn_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          cashback_earned?: number | null
          created_at?: string
          deal_id?: string | null
          discount_applied?: number | null
          id?: string
          merchant_id?: string
          paid_amount?: number
          payment_method?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          qr_signature?: string | null
          txn_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          merchant_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tier_events: {
        Row: {
          created_at: string
          event_type: string
          grab_id: string | null
          id: string
          merchant_id: string | null
          new_tier_level: string | null
          points_earned: number
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          grab_id?: string | null
          id?: string
          merchant_id?: string | null
          new_tier_level?: string | null
          points_earned?: number
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          grab_id?: string | null
          id?: string
          merchant_id?: string | null
          new_tier_level?: string | null
          points_earned?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tier_events_grab_id_fkey"
            columns: ["grab_id"]
            isOneToOne: false
            referencedRelation: "grabs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          merchant_id: string | null
          message: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          merchant_id?: string | null
          message: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          merchant_id?: string | null
          message?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          favorite_merchants: string[] | null
          id: string
          local_credits: number
          network_credits: number
          payment_methods: Json | null
          phone: string | null
          photo_url: string | null
          settings: Json | null
          tier_level: string | null
          tier_points: number | null
          tier_points_lifetime: number | null
          tier_updated_at: string | null
          total_grabs: number | null
          total_redemptions: number | null
          total_savings: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          favorite_merchants?: string[] | null
          id?: string
          local_credits?: number
          network_credits?: number
          payment_methods?: Json | null
          phone?: string | null
          photo_url?: string | null
          settings?: Json | null
          tier_level?: string | null
          tier_points?: number | null
          tier_points_lifetime?: number | null
          tier_updated_at?: string | null
          total_grabs?: number | null
          total_redemptions?: number | null
          total_savings?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          favorite_merchants?: string[] | null
          id?: string
          local_credits?: number
          network_credits?: number
          payment_methods?: Json | null
          phone?: string | null
          photo_url?: string | null
          settings?: Json | null
          tier_level?: string | null
          tier_points?: number | null
          tier_points_lifetime?: number | null
          tier_updated_at?: string | null
          total_grabs?: number | null
          total_redemptions?: number | null
          total_savings?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_tier_points: {
        Args: { p_grab_id: string; p_merchant_id: string; p_user_id: string }
        Returns: undefined
      }
      calculate_tier_level: {
        Args: { points: number }
        Returns: string
      }
      generate_grab_pin: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_payment_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_deal_stats: {
        Args: { deal_id_param: string }
        Returns: {
          grabbed_today: number
          redeemed_today: number
          remaining_stock: number
          total_grabbed: number
          total_redeemed: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_group_buy_quantity: {
        Args: { group_buy_id: string; quantity_to_add: number }
        Returns: undefined
      }
      process_credit_payment: {
        Args: {
          p_final_amount: number
          p_local_credits_used: number
          p_merchant_id: string
          p_network_credits_used: number
          p_original_amount: number
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "merchant" | "user"
      deal_visibility: "PUBLIC" | "HIDDEN"
      merchant_category:
        | "restaurant"
        | "retail"
        | "service"
        | "entertainment"
        | "health"
        | "beauty"
        | "other"
      payment_method_type: "mock" | "paynow" | "card"
      payment_status: "succeeded" | "failed" | "pending"
      reward_mode: "DISCOUNT" | "CASHBACK" | "BOTH"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "merchant", "user"],
      deal_visibility: ["PUBLIC", "HIDDEN"],
      merchant_category: [
        "restaurant",
        "retail",
        "service",
        "entertainment",
        "health",
        "beauty",
        "other",
      ],
      payment_method_type: ["mock", "paynow", "card"],
      payment_status: ["succeeded", "failed", "pending"],
      reward_mode: ["DISCOUNT", "CASHBACK", "BOTH"],
    },
  },
} as const
