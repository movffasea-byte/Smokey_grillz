export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addresses: {
        Row: { area: string | null; id: string; label: string | null; lat: number | null; line: string; lng: number | null; user_id: string }
        Insert: { area?: string | null; id?: string; label?: string | null; lat?: number | null; line: string; lng?: number | null; user_id: string }
        Update: { area?: string | null; id?: string; label?: string | null; lat?: number | null; line?: string; lng?: number | null; user_id?: string }
        Relationships: [
          { foreignKeyName: "addresses_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      categories: {
        Row: { active: boolean; id: string; name: string; slug: string; sort: number }
        Insert: { active?: boolean; id?: string; name: string; slug: string; sort?: number }
        Update: { active?: boolean; id?: string; name?: string; slug?: string; sort?: number }
        Relationships: []
      }
      delivery_zones: {
        Row: { active: boolean; fee_kobo: number; id: string; name: string }
        Insert: { active?: boolean; fee_kobo: number; id?: string; name: string }
        Update: { active?: boolean; fee_kobo?: number; id?: string; name?: string }
        Relationships: []
      }
      item_options: {
        Row: { id: string; item_id: string; max_choices: number; name: string; required: boolean }
        Insert: { id?: string; item_id: string; max_choices?: number; name: string; required?: boolean }
        Update: { id?: string; item_id?: string; max_choices?: number; name?: string; required?: boolean }
        Relationships: [
          { foreignKeyName: "item_options_item_id_fkey"; columns: ["item_id"]; isOneToOne: false; referencedRelation: "menu_items"; referencedColumns: ["id"] },
        ]
      }
      menu_items: {
        Row: { available: boolean; category_id: string; created_at: string; description: string | null; featured: boolean; id: string; image_url: string | null; name: string; price_kobo: number }
        Insert: { available?: boolean; category_id: string; created_at?: string; description?: string | null; featured?: boolean; id?: string; image_url?: string | null; name: string; price_kobo: number }
        Update: { available?: boolean; category_id?: string; created_at?: string; description?: string | null; featured?: boolean; id?: string; image_url?: string | null; name?: string; price_kobo?: number }
        Relationships: [
          { foreignKeyName: "menu_items_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "categories"; referencedColumns: ["id"] },
        ]
      }
      option_choices: {
        Row: { available: boolean; id: string; name: string; option_id: string; price_delta_kobo: number }
        Insert: { available?: boolean; id?: string; name: string; option_id: string; price_delta_kobo?: number }
        Update: { available?: boolean; id?: string; name?: string; option_id?: string; price_delta_kobo?: number }
        Relationships: [
          { foreignKeyName: "option_choices_option_id_fkey"; columns: ["option_id"]; isOneToOne: false; referencedRelation: "item_options"; referencedColumns: ["id"] },
        ]
      }
      order_events: {
        Row: { created_at: string; id: string; order_id: string; status: string }
        Insert: { created_at?: string; id?: string; order_id: string; status: string }
        Update: { created_at?: string; id?: string; order_id?: string; status?: string }
        Relationships: [
          { foreignKeyName: "order_events_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] },
        ]
      }
      order_items: {
        Row: { id: string; menu_item_id: string | null; name: string; options: Json; order_id: string; qty: number; unit_price_kobo: number }
        Insert: { id?: string; menu_item_id?: string | null; name: string; options?: Json; order_id: string; qty: number; unit_price_kobo: number }
        Update: { id?: string; menu_item_id?: string | null; name?: string; options?: Json; order_id?: string; qty?: number; unit_price_kobo?: number }
        Relationships: [
          { foreignKeyName: "order_items_menu_item_id_fkey"; columns: ["menu_item_id"]; isOneToOne: false; referencedRelation: "menu_items"; referencedColumns: ["id"] },
          { foreignKeyName: "order_items_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] },
        ]
      }
      orders: {
        Row: { address: Json | null; claimed_at: string | null; claimed_by: string | null; created_at: string; delivery_fee_kobo: number; delivery_zone_id: string | null; id: string; notes: string | null; payment_method: string; payment_status: string; status: string; subtotal_kobo: number; total_kobo: number; type: string; user_id: string }
        Insert: { address?: Json | null; claimed_at?: string | null; claimed_by?: string | null; created_at?: string; delivery_fee_kobo?: number; delivery_zone_id?: string | null; id?: string; notes?: string | null; payment_method?: string; payment_status?: string; status?: string; subtotal_kobo: number; total_kobo: number; type: string; user_id: string }
        Update: { address?: Json | null; claimed_at?: string | null; claimed_by?: string | null; created_at?: string; delivery_fee_kobo?: number; delivery_zone_id?: string | null; id?: string; notes?: string | null; payment_method?: string; payment_status?: string; status?: string; subtotal_kobo?: number; total_kobo?: number; type?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: "orders_claimed_by_fkey"; columns: ["claimed_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "orders_delivery_zone_id_fkey"; columns: ["delivery_zone_id"]; isOneToOne: false; referencedRelation: "delivery_zones"; referencedColumns: ["id"] },
          { foreignKeyName: "orders_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      payments: {
        Row: { amount_kobo: number; created_at: string; id: string; order_id: string; provider: string; reference: string; status: string }
        Insert: { amount_kobo: number; created_at?: string; id?: string; order_id: string; provider: string; reference: string; status: string }
        Update: { amount_kobo?: number; created_at?: string; id?: string; order_id?: string; provider?: string; reference?: string; status?: string }
        Relationships: [
          { foreignKeyName: "payments_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] },
        ]
      }
      profiles: {
        Row: { created_at: string; full_name: string | null; id: string; phone: string | null; push_token: string | null; role: string }
        Insert: { created_at?: string; full_name?: string | null; id: string; phone?: string | null; push_token?: string | null; role?: string }
        Update: { created_at?: string; full_name?: string | null; id?: string; phone?: string | null; push_token?: string | null; role?: string }
        Relationships: []
      }
      promotions: {
        Row: { active: boolean; body: string | null; ends_at: string | null; id: string; image_url: string | null; kind: string; starts_at: string | null; title: string }
        Insert: { active?: boolean; body?: string | null; ends_at?: string | null; id?: string; image_url?: string | null; kind?: string; starts_at?: string | null; title: string }
        Update: { active?: boolean; body?: string | null; ends_at?: string | null; id?: string; image_url?: string | null; kind?: string; starts_at?: string | null; title?: string }
        Relationships: []
      }
      store_settings: {
        Row: { accepting_orders: boolean; account_name: string | null; account_number: string | null; address: string; bank_name: string | null; hours: Json; id: number; instagram: string; lat: number | null; lng: number | null; name: string; phone: string | null; whatsapp: string | null }
        Insert: { accepting_orders?: boolean; account_name?: string | null; account_number?: string | null; address?: string; bank_name?: string | null; hours?: Json; id?: number; instagram?: string; lat?: number | null; lng?: number | null; name?: string; phone?: string | null; whatsapp?: string | null }
        Update: { accepting_orders?: boolean; account_name?: string | null; account_number?: string | null; address?: string; bank_name?: string | null; hours?: Json; id?: number; instagram?: string; lat?: number | null; lng?: number | null; name?: string; phone?: string | null; whatsapp?: string | null }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      claim_order: { Args: { p_order_id: string }; Returns: undefined }
      release_order: { Args: { p_order_id: string }; Returns: undefined }
      set_user_role: { Args: { p_role: string; p_user_id: string }; Returns: undefined }
      place_order: {
        Args: {
          p_address?: Json
          p_delivery_zone_id?: string
          p_items: Json
          p_notes?: string
          p_payment_method?: string
          p_type: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
