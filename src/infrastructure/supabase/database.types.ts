// GENERADO por `supabase gen types typescript --project-id doqghevvrfufsynwkzxj --schema public`.
// No editar a mano: regenerar después de cada migración (ver docs/architecture/README.md).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      _legacy_permisos: {
        Row: {
          id: string;
          puede_borrar: boolean;
          puede_crear: boolean;
          puede_leer: boolean;
          puede_modificar: boolean;
          recurso_id: string;
          rol_id: string;
        };
        Insert: {
          id?: string;
          puede_borrar?: boolean;
          puede_crear?: boolean;
          puede_leer?: boolean;
          puede_modificar?: boolean;
          recurso_id: string;
          rol_id: string;
        };
        Update: {
          id?: string;
          puede_borrar?: boolean;
          puede_crear?: boolean;
          puede_leer?: boolean;
          puede_modificar?: boolean;
          recurso_id?: string;
          rol_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "permisos_recurso_id_fkey";
            columns: ["recurso_id"];
            isOneToOne: false;
            referencedRelation: "_legacy_recursos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "permisos_rol_id_fkey";
            columns: ["rol_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      _legacy_recursos: {
        Row: {
          codigo: string;
          id: string;
          modulo: string | null;
          nombre: string;
        };
        Insert: {
          codigo: string;
          id?: string;
          modulo?: string | null;
          nombre: string;
        };
        Update: {
          codigo?: string;
          id?: string;
          modulo?: string | null;
          nombre?: string;
        };
        Relationships: [];
      };
      account_blocks: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          alert_id: string | null;
          block_status: string;
          blocked_at: string;
          blocked_by: string | null;
          client_id: string;
          compliance_status: string;
          id: string;
          origin: string;
          reason: string;
          release_notes: string | null;
          released_at: string | null;
          released_by: string | null;
          rule_id: string | null;
          scope: string;
          subaccount_id: string | null;
          transaction_id: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          alert_id?: string | null;
          block_status?: string;
          blocked_at?: string;
          blocked_by?: string | null;
          client_id: string;
          compliance_status?: string;
          id?: string;
          origin: string;
          reason: string;
          release_notes?: string | null;
          released_at?: string | null;
          released_by?: string | null;
          rule_id?: string | null;
          scope: string;
          subaccount_id?: string | null;
          transaction_id?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          alert_id?: string | null;
          block_status?: string;
          blocked_at?: string;
          blocked_by?: string | null;
          client_id?: string;
          compliance_status?: string;
          id?: string;
          origin?: string;
          reason?: string;
          release_notes?: string | null;
          released_at?: string | null;
          released_by?: string | null;
          rule_id?: string | null;
          scope?: string;
          subaccount_id?: string | null;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "account_blocks_accepted_by_fkey";
            columns: ["accepted_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_blocks_accepted_by_fkey";
            columns: ["accepted_by"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_blocks_alert_id_fkey";
            columns: ["alert_id"];
            isOneToOne: false;
            referencedRelation: "alerts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_blocks_alert_id_fkey";
            columns: ["alert_id"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_blocks_blocked_by_fkey";
            columns: ["blocked_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_blocks_blocked_by_fkey";
            columns: ["blocked_by"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_blocks_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_blocks_released_by_fkey";
            columns: ["released_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_blocks_released_by_fkey";
            columns: ["released_by"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_blocks_rule_id_fkey";
            columns: ["rule_id"];
            isOneToOne: false;
            referencedRelation: "alert_rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_blocks_subaccount_id_fkey";
            columns: ["subaccount_id"];
            isOneToOne: false;
            referencedRelation: "subaccounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_blocks_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      acreditacion_ejecucion_items: {
        Row: {
          created_at: string;
          ejecucion_id: string;
          id: string;
          lote_id: string;
          motivo: string | null;
          neto_acreditar: number | null;
          resultado: string;
          transaction_id: string | null;
        };
        Insert: {
          created_at?: string;
          ejecucion_id: string;
          id?: string;
          lote_id: string;
          motivo?: string | null;
          neto_acreditar?: number | null;
          resultado: string;
          transaction_id?: string | null;
        };
        Update: {
          created_at?: string;
          ejecucion_id?: string;
          id?: string;
          lote_id?: string;
          motivo?: string | null;
          neto_acreditar?: number | null;
          resultado?: string;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "acreditacion_ejecucion_items_ejecucion_id_fkey";
            columns: ["ejecucion_id"];
            isOneToOne: false;
            referencedRelation: "acreditacion_ejecuciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "acreditacion_ejecucion_items_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "acreditacion_ejecucion_items_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
        ];
      };
      acreditacion_ejecuciones: {
        Row: {
          confirmaciones: Json;
          created_at: string;
          ejecutado_by: string | null;
          estado: string;
          fecha_acreditacion: string;
          finalizado_at: string | null;
          id: string;
          numero: number;
          totales: Json;
        };
        Insert: {
          confirmaciones?: Json;
          created_at?: string;
          ejecutado_by?: string | null;
          estado?: string;
          fecha_acreditacion: string;
          finalizado_at?: string | null;
          id?: string;
          numero?: never;
          totales?: Json;
        };
        Update: {
          confirmaciones?: Json;
          created_at?: string;
          ejecutado_by?: string | null;
          estado?: string;
          fecha_acreditacion?: string;
          finalizado_at?: string | null;
          id?: string;
          numero?: never;
          totales?: Json;
        };
        Relationships: [];
      };
      acreditacion_lotes: {
        Row: {
          comision_cierre_monto: number;
          comision_molipay_monto: number;
          comision_payway_monto: number;
          created_at: string;
          fuente: string;
          id: string;
          importe_neto_liquidado: number;
          importe_neto_original: number;
          lote_acreditacion_id: string;
          monto_adelanto_compensado: number;
          notas: string | null;
          renglon_id: string | null;
          saldo_antes: number;
          saldo_despues: number;
          usuario_id: string | null;
        };
        Insert: {
          comision_cierre_monto?: number;
          comision_molipay_monto?: number;
          comision_payway_monto?: number;
          created_at?: string;
          fuente?: string;
          id?: string;
          importe_neto_liquidado: number;
          importe_neto_original: number;
          lote_acreditacion_id: string;
          monto_adelanto_compensado?: number;
          notas?: string | null;
          renglon_id?: string | null;
          saldo_antes?: number;
          saldo_despues?: number;
          usuario_id?: string | null;
        };
        Update: {
          comision_cierre_monto?: number;
          comision_molipay_monto?: number;
          comision_payway_monto?: number;
          created_at?: string;
          fuente?: string;
          id?: string;
          importe_neto_liquidado?: number;
          importe_neto_original?: number;
          lote_acreditacion_id?: string;
          monto_adelanto_compensado?: number;
          notas?: string | null;
          renglon_id?: string | null;
          saldo_antes?: number;
          saldo_despues?: number;
          usuario_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "acreditacion_lotes_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "acreditacion_lotes_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      adelanto_compensaciones: {
        Row: {
          adelanto_id: string;
          created_at: string;
          id: string;
          lote_id: string;
          monto: number;
        };
        Insert: {
          adelanto_id: string;
          created_at?: string;
          id?: string;
          lote_id: string;
          monto: number;
        };
        Update: {
          adelanto_id?: string;
          created_at?: string;
          id?: string;
          lote_id?: string;
          monto?: number;
        };
        Relationships: [
          {
            foreignKeyName: "adelanto_compensaciones_adelanto_id_fkey";
            columns: ["adelanto_id"];
            isOneToOne: false;
            referencedRelation: "adelantos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "adelanto_compensaciones_adelanto_id_fkey";
            columns: ["adelanto_id"];
            isOneToOne: false;
            referencedRelation: "v_adelantos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "adelanto_compensaciones_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "adelanto_compensaciones_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
        ];
      };
      adelanto_operaciones: {
        Row: {
          adelanto_id: string;
          transaction_id: string;
        };
        Insert: {
          adelanto_id: string;
          transaction_id: string;
        };
        Update: {
          adelanto_id?: string;
          transaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "adelanto_operaciones_adelanto_id_fkey";
            columns: ["adelanto_id"];
            isOneToOne: false;
            referencedRelation: "adelantos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "adelanto_operaciones_adelanto_id_fkey";
            columns: ["adelanto_id"];
            isOneToOne: false;
            referencedRelation: "v_adelantos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "adelanto_operaciones_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      adelantos: {
        Row: {
          aceptado_at: string | null;
          acreditado_tx_id: string | null;
          comercio_id: string;
          compensado: number;
          created_at: string;
          descuento: number | null;
          estado: string;
          fecha_acreditacion: string | null;
          fecha_resolucion: string | null;
          fecha_solicitud: string;
          id: string;
          lote_acreditacion_id: string | null;
          modelo: string;
          monto_ofertado: number | null;
          monto_por_acreditar: number | null;
          monto_solicitado: number;
          motivo: string | null;
          neto_a_recibir: number | null;
          ofertado_at: string | null;
          ofertado_by: string | null;
          plazo_adelantado_dias: number;
          plazo_original_dias: number;
          rechazo_motivo: string | null;
          resuelto_por: string | null;
          tasa_interes_pct: number | null;
          tope_al_solicitar: number | null;
          updated_at: string;
        };
        Insert: {
          aceptado_at?: string | null;
          acreditado_tx_id?: string | null;
          comercio_id: string;
          compensado?: number;
          created_at?: string;
          descuento?: number | null;
          estado?: string;
          fecha_acreditacion?: string | null;
          fecha_resolucion?: string | null;
          fecha_solicitud?: string;
          id?: string;
          lote_acreditacion_id?: string | null;
          modelo?: string;
          monto_ofertado?: number | null;
          monto_por_acreditar?: number | null;
          monto_solicitado: number;
          motivo?: string | null;
          neto_a_recibir?: number | null;
          ofertado_at?: string | null;
          ofertado_by?: string | null;
          plazo_adelantado_dias: number;
          plazo_original_dias?: number;
          rechazo_motivo?: string | null;
          resuelto_por?: string | null;
          tasa_interes_pct?: number | null;
          tope_al_solicitar?: number | null;
          updated_at?: string;
        };
        Update: {
          aceptado_at?: string | null;
          acreditado_tx_id?: string | null;
          comercio_id?: string;
          compensado?: number;
          created_at?: string;
          descuento?: number | null;
          estado?: string;
          fecha_acreditacion?: string | null;
          fecha_resolucion?: string | null;
          fecha_solicitud?: string;
          id?: string;
          lote_acreditacion_id?: string | null;
          modelo?: string;
          monto_ofertado?: number | null;
          monto_por_acreditar?: number | null;
          monto_solicitado?: number;
          motivo?: string | null;
          neto_a_recibir?: number | null;
          ofertado_at?: string | null;
          ofertado_by?: string | null;
          plazo_adelantado_dias?: number;
          plazo_original_dias?: number;
          rechazo_motivo?: string | null;
          resuelto_por?: string | null;
          tasa_interes_pct?: number | null;
          tope_al_solicitar?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "adelantos_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "adelantos_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
          {
            foreignKeyName: "adelantos_lote_acreditacion_id_fkey";
            columns: ["lote_acreditacion_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "adelantos_lote_acreditacion_id_fkey";
            columns: ["lote_acreditacion_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "adelantos_resuelto_por_fkey";
            columns: ["resuelto_por"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "adelantos_resuelto_por_fkey";
            columns: ["resuelto_por"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      alert_attachments: {
        Row: {
          alert_id: string;
          comment_id: string | null;
          created_at: string;
          file_name: string;
          id: string;
          mime_type: string | null;
          size_bytes: number | null;
          storage_path: string;
          uploaded_by: string;
        };
        Insert: {
          alert_id: string;
          comment_id?: string | null;
          created_at?: string;
          file_name: string;
          id?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          uploaded_by: string;
        };
        Update: {
          alert_id?: string;
          comment_id?: string | null;
          created_at?: string;
          file_name?: string;
          id?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alert_attachments_alert_id_fkey";
            columns: ["alert_id"];
            isOneToOne: false;
            referencedRelation: "alerts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_attachments_alert_id_fkey";
            columns: ["alert_id"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_attachments_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "alert_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_attachments_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "v_alert_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      alert_comments: {
        Row: {
          alert_id: string;
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          kind: string;
        };
        Insert: {
          alert_id: string;
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          kind?: string;
        };
        Update: {
          alert_id?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          kind?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alert_comments_alert_id_fkey";
            columns: ["alert_id"];
            isOneToOne: false;
            referencedRelation: "alerts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_comments_alert_id_fkey";
            columns: ["alert_id"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      alert_rules: {
        Row: {
          action: string;
          category: string;
          code: string;
          conditions: Json;
          created_at: string;
          description: string | null;
          id: string;
          is_enabled: boolean;
          name: string;
          parameters: Json;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          action: string;
          category: string;
          code: string;
          conditions?: Json;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_enabled?: boolean;
          name: string;
          parameters?: Json;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          action?: string;
          category?: string;
          code?: string;
          conditions?: Json;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_enabled?: boolean;
          name?: string;
          parameters?: Json;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "alert_rules_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_rules_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      alertas_centro_lecturas: {
        Row: {
          admin_id: string;
          clave: string;
          leida_at: string;
        };
        Insert: {
          admin_id: string;
          clave: string;
          leida_at?: string;
        };
        Update: {
          admin_id?: string;
          clave?: string;
          leida_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alertas_centro_lecturas_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alertas_centro_lecturas_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      alerts: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          assigned_at: string | null;
          assigned_to: string | null;
          client_id: string;
          created_at: string;
          dedupe_key: string | null;
          description: string;
          details: Json;
          due_at: string;
          id: string;
          plaft_match_id: number | null;
          resolution: string | null;
          resolution_notes: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          rule_id: string | null;
          status: string;
          transaction_id: string | null;
          type: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          assigned_at?: string | null;
          assigned_to?: string | null;
          client_id: string;
          created_at?: string;
          dedupe_key?: string | null;
          description: string;
          details?: Json;
          due_at?: string;
          id?: string;
          plaft_match_id?: number | null;
          resolution?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          rule_id?: string | null;
          status?: string;
          transaction_id?: string | null;
          type: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          assigned_at?: string | null;
          assigned_to?: string | null;
          client_id?: string;
          created_at?: string;
          dedupe_key?: string | null;
          description?: string;
          details?: Json;
          due_at?: string;
          id?: string;
          plaft_match_id?: number | null;
          resolution?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          rule_id?: string | null;
          status?: string;
          transaction_id?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_accepted_by_fkey";
            columns: ["accepted_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_accepted_by_fkey";
            columns: ["accepted_by"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_plaft_match_id_fkey";
            columns: ["plaft_match_id"];
            isOneToOne: false;
            referencedRelation: "plaft_coincidencias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_rule_id_fkey";
            columns: ["rule_id"];
            isOneToOne: false;
            referencedRelation: "alert_rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      api_endpoints: {
        Row: {
          ambientes: string[];
          api_v1: boolean;
          categoria: string | null;
          created_at: string;
          default_produccion: boolean;
          descripcion: string | null;
          estado: string;
          grupo: string;
          id: string;
          metodo: string;
          nombre: string;
          path: string;
          rec: boolean;
          updated_at: string;
        };
        Insert: {
          ambientes?: string[];
          api_v1?: boolean;
          categoria?: string | null;
          created_at?: string;
          default_produccion?: boolean;
          descripcion?: string | null;
          estado: string;
          grupo: string;
          id?: string;
          metodo: string;
          nombre: string;
          path: string;
          rec?: boolean;
          updated_at?: string;
        };
        Update: {
          ambientes?: string[];
          api_v1?: boolean;
          categoria?: string | null;
          created_at?: string;
          default_produccion?: boolean;
          descripcion?: string | null;
          estado?: string;
          grupo?: string;
          id?: string;
          metodo?: string;
          nombre?: string;
          path?: string;
          rec?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      api_integraciones: {
        Row: {
          aprobado_at: string | null;
          aprobado_por: string | null;
          comercio_id: string;
          created_at: string;
          estado: string;
          estado_previo: string | null;
          historial: Json;
          id: string;
          ip_whitelist: string[];
          motivo_revocacion: string | null;
          motivo_suspension: string | null;
          pase_notas: string | null;
          pase_solicitado_at: string | null;
          rate_limit_produccion: number;
          rate_limit_sandbox: number;
          revocado_at: string | null;
          revocado_por: string | null;
          suspendido_at: string | null;
          suspendido_por: string | null;
          updated_at: string;
        };
        Insert: {
          aprobado_at?: string | null;
          aprobado_por?: string | null;
          comercio_id: string;
          created_at?: string;
          estado?: string;
          estado_previo?: string | null;
          historial?: Json;
          id?: string;
          ip_whitelist?: string[];
          motivo_revocacion?: string | null;
          motivo_suspension?: string | null;
          pase_notas?: string | null;
          pase_solicitado_at?: string | null;
          rate_limit_produccion?: number;
          rate_limit_sandbox?: number;
          revocado_at?: string | null;
          revocado_por?: string | null;
          suspendido_at?: string | null;
          suspendido_por?: string | null;
          updated_at?: string;
        };
        Update: {
          aprobado_at?: string | null;
          aprobado_por?: string | null;
          comercio_id?: string;
          created_at?: string;
          estado?: string;
          estado_previo?: string | null;
          historial?: Json;
          id?: string;
          ip_whitelist?: string[];
          motivo_revocacion?: string | null;
          motivo_suspension?: string | null;
          pase_notas?: string | null;
          pase_solicitado_at?: string | null;
          rate_limit_produccion?: number;
          rate_limit_sandbox?: number;
          revocado_at?: string | null;
          revocado_por?: string | null;
          suspendido_at?: string | null;
          suspendido_por?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_integraciones_aprobado_por_fkey";
            columns: ["aprobado_por"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "api_integraciones_aprobado_por_fkey";
            columns: ["aprobado_por"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "api_integraciones_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: true;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "api_integraciones_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: true;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
          {
            foreignKeyName: "api_integraciones_revocado_por_fkey";
            columns: ["revocado_por"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "api_integraciones_revocado_por_fkey";
            columns: ["revocado_por"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "api_integraciones_suspendido_por_fkey";
            columns: ["suspendido_por"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "api_integraciones_suspendido_por_fkey";
            columns: ["suspendido_por"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      api_keys: {
        Row: {
          ambiente: string;
          api_key: string;
          comercio_id: string;
          created_at: string;
          created_by: string | null;
          estado: string;
          id: string;
          integracion_id: string;
          revocada_at: string | null;
          revocada_motivo: string | null;
          secret_cifrado: string;
          secret_hash: string | null;
          secret_ultimos4: string;
          ultimo_uso_at: string | null;
        };
        Insert: {
          ambiente: string;
          api_key: string;
          comercio_id: string;
          created_at?: string;
          created_by?: string | null;
          estado?: string;
          id?: string;
          integracion_id: string;
          revocada_at?: string | null;
          revocada_motivo?: string | null;
          secret_cifrado: string;
          secret_hash?: string | null;
          secret_ultimos4: string;
          ultimo_uso_at?: string | null;
        };
        Update: {
          ambiente?: string;
          api_key?: string;
          comercio_id?: string;
          created_at?: string;
          created_by?: string | null;
          estado?: string;
          id?: string;
          integracion_id?: string;
          revocada_at?: string | null;
          revocada_motivo?: string | null;
          secret_cifrado?: string;
          secret_hash?: string | null;
          secret_ultimos4?: string;
          ultimo_uso_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "api_keys_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "api_keys_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
          {
            foreignKeyName: "api_keys_integracion_id_fkey";
            columns: ["integracion_id"];
            isOneToOne: false;
            referencedRelation: "api_integraciones";
            referencedColumns: ["id"];
          },
        ];
      };
      api_logs: {
        Row: {
          ambiente: string | null;
          api_key_id: string | null;
          codigo_error: string | null;
          comercio_id: string | null;
          created_at: string;
          id: number;
          integracion_id: string | null;
          ip: string | null;
          latencia_ms: number | null;
          metodo: string;
          request_id: string | null;
          ruta: string;
          status: number;
        };
        Insert: {
          ambiente?: string | null;
          api_key_id?: string | null;
          codigo_error?: string | null;
          comercio_id?: string | null;
          created_at?: string;
          id?: never;
          integracion_id?: string | null;
          ip?: string | null;
          latencia_ms?: number | null;
          metodo: string;
          request_id?: string | null;
          ruta: string;
          status: number;
        };
        Update: {
          ambiente?: string | null;
          api_key_id?: string | null;
          codigo_error?: string | null;
          comercio_id?: string | null;
          created_at?: string;
          id?: never;
          integracion_id?: string | null;
          ip?: string | null;
          latencia_ms?: number | null;
          metodo?: string;
          request_id?: string | null;
          ruta?: string;
          status?: number;
        };
        Relationships: [];
      };
      api_permisos: {
        Row: {
          ambiente: string;
          endpoint_id: string;
          integracion_id: string;
          permitido: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          ambiente: string;
          endpoint_id: string;
          integracion_id: string;
          permitido: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          ambiente?: string;
          endpoint_id?: string;
          integracion_id?: string;
          permitido?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "api_permisos_endpoint_id_fkey";
            columns: ["endpoint_id"];
            isOneToOne: false;
            referencedRelation: "api_endpoints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "api_permisos_integracion_id_fkey";
            columns: ["integracion_id"];
            isOneToOne: false;
            referencedRelation: "api_integraciones";
            referencedColumns: ["id"];
          },
        ];
      };
      api_rate_counters: {
        Row: {
          ambiente: string;
          integracion_id: string;
          n: number;
          ventana: string;
        };
        Insert: {
          ambiente: string;
          integracion_id: string;
          n?: number;
          ventana: string;
        };
        Update: {
          ambiente?: string;
          integracion_id?: string;
          n?: number;
          ventana?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_rate_counters_integracion_id_fkey";
            columns: ["integracion_id"];
            isOneToOne: false;
            referencedRelation: "api_integraciones";
            referencedColumns: ["id"];
          },
        ];
      };
      api_restricciones: {
        Row: {
          api_usuario_id: string;
          created_at: string;
          estado: string;
          fecha_creacion: string;
          fecha_expiracion: string | null;
          id: string;
        };
        Insert: {
          api_usuario_id: string;
          created_at?: string;
          estado: string;
          fecha_creacion?: string;
          fecha_expiracion?: string | null;
          id?: string;
        };
        Update: {
          api_usuario_id?: string;
          created_at?: string;
          estado?: string;
          fecha_creacion?: string;
          fecha_expiracion?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_restricciones_api_usuario_id_fkey";
            columns: ["api_usuario_id"];
            isOneToOne: false;
            referencedRelation: "api_usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      api_usuario_endpoints: {
        Row: {
          api_usuario_id: string;
          created_at: string;
          estado: string | null;
          grupo: string | null;
          id: string;
          metodo: string | null;
          path: string | null;
        };
        Insert: {
          api_usuario_id: string;
          created_at?: string;
          estado?: string | null;
          grupo?: string | null;
          id?: string;
          metodo?: string | null;
          path?: string | null;
        };
        Update: {
          api_usuario_id?: string;
          created_at?: string;
          estado?: string | null;
          grupo?: string | null;
          id?: string;
          metodo?: string | null;
          path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "api_usuario_endpoints_api_usuario_id_fkey";
            columns: ["api_usuario_id"];
            isOneToOne: false;
            referencedRelation: "api_usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      api_usuario_logs: {
        Row: {
          api_usuario_id: string;
          cliente_id: string | null;
          created_at: string;
          detalle: Json | null;
          endpoint: string | null;
          fecha_hora: string | null;
          id: string;
          ip: string | null;
          metodo: string | null;
          status: number | null;
          tiempo_respuesta_ms: number | null;
        };
        Insert: {
          api_usuario_id: string;
          cliente_id?: string | null;
          created_at?: string;
          detalle?: Json | null;
          endpoint?: string | null;
          fecha_hora?: string | null;
          id?: string;
          ip?: string | null;
          metodo?: string | null;
          status?: number | null;
          tiempo_respuesta_ms?: number | null;
        };
        Update: {
          api_usuario_id?: string;
          cliente_id?: string | null;
          created_at?: string;
          detalle?: Json | null;
          endpoint?: string | null;
          fecha_hora?: string | null;
          id?: string;
          ip?: string | null;
          metodo?: string | null;
          status?: number | null;
          tiempo_respuesta_ms?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "api_usuario_logs_api_usuario_id_fkey";
            columns: ["api_usuario_id"];
            isOneToOne: false;
            referencedRelation: "api_usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      api_usuarios: {
        Row: {
          codigo_usuario_api: string;
          created_at: string;
          estado: string;
          id: string;
          nombre_completo: string;
          updated_at: string;
          usuario: string;
        };
        Insert: {
          codigo_usuario_api: string;
          created_at?: string;
          estado: string;
          id?: string;
          nombre_completo: string;
          updated_at?: string;
          usuario: string;
        };
        Update: {
          codigo_usuario_api?: string;
          created_at?: string;
          estado?: string;
          id?: string;
          nombre_completo?: string;
          updated_at?: string;
          usuario?: string;
        };
        Relationships: [];
      };
      backoffice_users: {
        Row: {
          created_at: string;
          created_by: string | null;
          deactivated_at: string | null;
          deactivated_by: string | null;
          email: string;
          full_name: string;
          id: string;
          invited_at: string | null;
          is_active: boolean;
          last_login_at: string | null;
          must_change_password: boolean;
          password_set_at: string | null;
          role_id: string;
          staff_code: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deactivated_at?: string | null;
          deactivated_by?: string | null;
          email: string;
          full_name: string;
          id: string;
          invited_at?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
          must_change_password?: boolean;
          password_set_at?: string | null;
          role_id: string;
          staff_code: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deactivated_at?: string | null;
          deactivated_by?: string | null;
          email?: string;
          full_name?: string;
          id?: string;
          invited_at?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
          must_change_password?: boolean;
          password_set_at?: string | null;
          role_id?: string;
          staff_code?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "backoffice_users_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      banderas: {
        Row: {
          created_at: string | null;
          dias_habiles_acreditacion: number | null;
          estado: string;
          id: string;
          metodo_key: string | null;
          nombre: string;
          tipo: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          dias_habiles_acreditacion?: number | null;
          estado?: string;
          id?: string;
          metodo_key?: string | null;
          nombre: string;
          tipo?: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          dias_habiles_acreditacion?: number | null;
          estado?: string;
          id?: string;
          metodo_key?: string | null;
          nombre?: string;
          tipo?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      banderas_cuotas: {
        Row: {
          bandera_id: string;
          coeficiente: number | null;
          cuotas: number;
          estado: string;
          id: string;
          ten: number | null;
        };
        Insert: {
          bandera_id: string;
          coeficiente?: number | null;
          cuotas: number;
          estado?: string;
          id?: string;
          ten?: number | null;
        };
        Update: {
          bandera_id?: string;
          coeficiente?: number | null;
          cuotas?: number;
          estado?: string;
          id?: string;
          ten?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "banderas_cuotas_bandera_id_fkey";
            columns: ["bandera_id"];
            isOneToOne: false;
            referencedRelation: "banderas";
            referencedColumns: ["id"];
          },
        ];
      };
      bcra_correcciones: {
        Row: {
          campo: string;
          codigo: string | null;
          created_at: string;
          created_by: string | null;
          fila: number;
          id: string;
          motivo: string;
          presentacion_id: string;
          valor_anterior: string | null;
          valor_nuevo: string | null;
        };
        Insert: {
          campo: string;
          codigo?: string | null;
          created_at?: string;
          created_by?: string | null;
          fila: number;
          id?: string;
          motivo: string;
          presentacion_id: string;
          valor_anterior?: string | null;
          valor_nuevo?: string | null;
        };
        Update: {
          campo?: string;
          codigo?: string | null;
          created_at?: string;
          created_by?: string | null;
          fila?: number;
          id?: string;
          motivo?: string;
          presentacion_id?: string;
          valor_anterior?: string | null;
          valor_nuevo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bcra_correcciones_presentacion_id_fkey";
            columns: ["presentacion_id"];
            isOneToOne: false;
            referencedRelation: "bcra_presentaciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bcra_correcciones_presentacion_id_fkey";
            columns: ["presentacion_id"];
            isOneToOne: false;
            referencedRelation: "v_bcra_presentaciones";
            referencedColumns: ["id"];
          },
        ];
      };
      bcra_partidas: {
        Row: {
          activa: boolean;
          apartado: string;
          codigo: string;
          confirmada: boolean;
          descripcion: string;
          esquema: string | null;
          id: string;
          medio_pago: string | null;
          orden: number;
          params: Json;
          regla: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          activa?: boolean;
          apartado: string;
          codigo: string;
          confirmada?: boolean;
          descripcion: string;
          esquema?: string | null;
          id?: string;
          medio_pago?: string | null;
          orden?: number;
          params?: Json;
          regla: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          activa?: boolean;
          apartado?: string;
          codigo?: string;
          confirmada?: boolean;
          descripcion?: string;
          esquema?: string | null;
          id?: string;
          medio_pago?: string | null;
          orden?: number;
          params?: Json;
          regla?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      bcra_presentaciones: {
        Row: {
          archivo: string;
          avisos: Json;
          estado: string;
          filas: Json;
          generado_at: string;
          generado_by: string | null;
          id: string;
          notas: string | null;
          periodo: string;
          presentado_at: string | null;
          presentado_by: string | null;
          totales: Json;
          version: number;
        };
        Insert: {
          archivo: string;
          avisos?: Json;
          estado?: string;
          filas?: Json;
          generado_at?: string;
          generado_by?: string | null;
          id?: string;
          notas?: string | null;
          periodo: string;
          presentado_at?: string | null;
          presentado_by?: string | null;
          totales?: Json;
          version?: number;
        };
        Update: {
          archivo?: string;
          avisos?: Json;
          estado?: string;
          filas?: Json;
          generado_at?: string;
          generado_by?: string | null;
          id?: string;
          notas?: string | null;
          periodo?: string;
          presentado_at?: string | null;
          presentado_by?: string | null;
          totales?: Json;
          version?: number;
        };
        Relationships: [];
      };
      caja_molipay: {
        Row: {
          actualizado_por: string | null;
          created_at: string;
          id: string;
          nombre: string;
          observaciones: string | null;
          saldo_bancario: number;
          saldo_conciliado: number;
          updated_at: string;
        };
        Insert: {
          actualizado_por?: string | null;
          created_at?: string;
          id?: string;
          nombre?: string;
          observaciones?: string | null;
          saldo_bancario?: number;
          saldo_conciliado?: number;
          updated_at?: string;
        };
        Update: {
          actualizado_por?: string | null;
          created_at?: string;
          id?: string;
          nombre?: string;
          observaciones?: string | null;
          saldo_bancario?: number;
          saldo_conciliado?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "caja_molipay_actualizado_por_fkey";
            columns: ["actualizado_por"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "caja_molipay_actualizado_por_fkey";
            columns: ["actualizado_por"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      caja_movimientos: {
        Row: {
          caja_id: string;
          created_at: string;
          id: string;
          monto: number;
          observaciones: string | null;
          referencia: string | null;
          tipo: string;
          usuario_id: string | null;
        };
        Insert: {
          caja_id: string;
          created_at?: string;
          id?: string;
          monto: number;
          observaciones?: string | null;
          referencia?: string | null;
          tipo: string;
          usuario_id?: string | null;
        };
        Update: {
          caja_id?: string;
          created_at?: string;
          id?: string;
          monto?: number;
          observaciones?: string | null;
          referencia?: string | null;
          tipo?: string;
          usuario_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "caja_movimientos_caja_id_fkey";
            columns: ["caja_id"];
            isOneToOne: false;
            referencedRelation: "caja_molipay";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "caja_movimientos_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "caja_movimientos_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      canales_notificacion: {
        Row: {
          activo: boolean;
          configuracion: Json | null;
          created_at: string;
          id: string;
          nombre: string;
          tipo: string;
          updated_at: string;
        };
        Insert: {
          activo?: boolean;
          configuracion?: Json | null;
          created_at?: string;
          id?: string;
          nombre: string;
          tipo: string;
          updated_at?: string;
        };
        Update: {
          activo?: boolean;
          configuracion?: Json | null;
          created_at?: string;
          id?: string;
          nombre?: string;
          tipo?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      client_block_parameters: {
        Row: {
          client_id: string;
          company_min_wages: number | null;
          created_at: string;
          id: string;
          individual_min_wages: number | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          client_id: string;
          company_min_wages?: number | null;
          created_at?: string;
          id?: string;
          individual_min_wages?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          client_id?: string;
          company_min_wages?: number | null;
          created_at?: string;
          id?: string;
          individual_min_wages?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_block_parameters_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: true;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_block_parameters_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_block_parameters_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      client_transaction_profiles: {
        Row: {
          client_id: string;
          created_at: string;
          id: string;
          monthly_amount: number;
          monthly_operations: number | null;
          notes: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          id?: string;
          monthly_amount: number;
          monthly_operations?: number | null;
          notes?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          id?: string;
          monthly_amount?: number;
          monthly_operations?: number | null;
          notes?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_transaction_profiles_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: true;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_transaction_profiles_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_transaction_profiles_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      cliente_api_usuarios: {
        Row: {
          api_usuario_id: string;
          cliente_legajo: string;
          created_at: string;
          id: string;
        };
        Insert: {
          api_usuario_id: string;
          cliente_legajo: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          api_usuario_id?: string;
          cliente_legajo?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_api_usuarios_api_usuario_id_fkey";
            columns: ["api_usuario_id"];
            isOneToOne: false;
            referencedRelation: "api_usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cliente_api_usuarios_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_api_usuarios_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_api_usuarios_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_api_usuarios_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_api_usuarios_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
        ];
      };
      cliente_comercios_pst: {
        Row: {
          cliente_legajo: string;
          created_at: string;
          email: string | null;
          id: string;
          legajo_comercio: string | null;
          nombre: string;
        };
        Insert: {
          cliente_legajo: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          legajo_comercio?: string | null;
          nombre: string;
        };
        Update: {
          cliente_legajo?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          legajo_comercio?: string | null;
          nombre?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_comercios_pst_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_comercios_pst_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_comercios_pst_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_comercios_pst_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_comercios_pst_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
        ];
      };
      cliente_integraciones_ecommerce: {
        Row: {
          api_key: string | null;
          cliente_legajo: string;
          created_at: string;
          estado: string;
          id: string;
          plataforma: string;
          webhook_url: string | null;
        };
        Insert: {
          api_key?: string | null;
          cliente_legajo: string;
          created_at?: string;
          estado?: string;
          id?: string;
          plataforma: string;
          webhook_url?: string | null;
        };
        Update: {
          api_key?: string | null;
          cliente_legajo?: string;
          created_at?: string;
          estado?: string;
          id?: string;
          plataforma?: string;
          webhook_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_integraciones_ecommerce_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_integraciones_ecommerce_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_integraciones_ecommerce_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_integraciones_ecommerce_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_integraciones_ecommerce_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
        ];
      };
      cliente_links_pago: {
        Row: {
          cliente_legajo: string;
          comercio_id: string | null;
          comercio_nombre: string;
          created_at: string;
          estado: string | null;
          expira_en: string | null;
          id: string;
          metodos_pago: Json | null;
          monto: number | null;
          notas: string | null;
          pagos: number;
          pagos_parciales: boolean;
          referencia: string | null;
          url: string | null;
          vistas: number;
        };
        Insert: {
          cliente_legajo: string;
          comercio_id?: string | null;
          comercio_nombre: string;
          created_at?: string;
          estado?: string | null;
          expira_en?: string | null;
          id?: string;
          metodos_pago?: Json | null;
          monto?: number | null;
          notas?: string | null;
          pagos?: number;
          pagos_parciales?: boolean;
          referencia?: string | null;
          url?: string | null;
          vistas?: number;
        };
        Update: {
          cliente_legajo?: string;
          comercio_id?: string | null;
          comercio_nombre?: string;
          created_at?: string;
          estado?: string | null;
          expira_en?: string | null;
          id?: string;
          metodos_pago?: Json | null;
          monto?: number | null;
          notas?: string | null;
          pagos?: number;
          pagos_parciales?: boolean;
          referencia?: string | null;
          url?: string | null;
          vistas?: number;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_links_pago_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_links_pago_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_links_pago_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_links_pago_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_links_pago_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_links_pago_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cliente_links_pago_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
        ];
      };
      cliente_links_pago_detalle: {
        Row: {
          cantidad: number;
          created_at: string;
          id: string;
          link_id: string;
          precio_unitario: number;
          producto_id: string | null;
          producto_nombre: string;
        };
        Insert: {
          cantidad?: number;
          created_at?: string;
          id?: string;
          link_id: string;
          precio_unitario?: number;
          producto_id?: string | null;
          producto_nombre: string;
        };
        Update: {
          cantidad?: number;
          created_at?: string;
          id?: string;
          link_id?: string;
          precio_unitario?: number;
          producto_id?: string | null;
          producto_nombre?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_links_pago_detalle_link_id_fkey";
            columns: ["link_id"];
            isOneToOne: false;
            referencedRelation: "cliente_links_pago";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cliente_links_pago_detalle_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "productos";
            referencedColumns: ["id"];
          },
        ];
      };
      cliente_links_pago_pagos: {
        Row: {
          cliente_legajo: string;
          created_at: string;
          cuotas: number | null;
          estado: string;
          id: string;
          link_id: string;
          metodo: string | null;
          monto: number;
          pagador_email: string | null;
          pagador_nombre: string | null;
          payway_payment_id: string | null;
          payway_status: string | null;
          payway_status_detail: string | null;
          referencia: string | null;
          site_transaction_id: string | null;
        };
        Insert: {
          cliente_legajo: string;
          created_at?: string;
          cuotas?: number | null;
          estado?: string;
          id?: string;
          link_id: string;
          metodo?: string | null;
          monto?: number;
          pagador_email?: string | null;
          pagador_nombre?: string | null;
          payway_payment_id?: string | null;
          payway_status?: string | null;
          payway_status_detail?: string | null;
          referencia?: string | null;
          site_transaction_id?: string | null;
        };
        Update: {
          cliente_legajo?: string;
          created_at?: string;
          cuotas?: number | null;
          estado?: string;
          id?: string;
          link_id?: string;
          metodo?: string | null;
          monto?: number;
          pagador_email?: string | null;
          pagador_nombre?: string | null;
          payway_payment_id?: string | null;
          payway_status?: string | null;
          payway_status_detail?: string | null;
          referencia?: string | null;
          site_transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_links_pago_pagos_link_id_fkey";
            columns: ["link_id"];
            isOneToOne: false;
            referencedRelation: "cliente_links_pago";
            referencedColumns: ["id"];
          },
        ];
      };
      cliente_modulos: {
        Row: {
          cantidad: number;
          clave: string;
          cliente_legajo: string;
          created_at: string;
          detalle: string | null;
          id: string;
          titulo: string;
        };
        Insert: {
          cantidad?: number;
          clave: string;
          cliente_legajo: string;
          created_at?: string;
          detalle?: string | null;
          id?: string;
          titulo: string;
        };
        Update: {
          cantidad?: number;
          clave?: string;
          cliente_legajo?: string;
          created_at?: string;
          detalle?: string | null;
          id?: string;
          titulo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_modulos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_modulos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_modulos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_modulos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_modulos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
        ];
      };
      cliente_parametros_alertas: {
        Row: {
          clave: string;
          cliente_legajo: string;
          created_at: string;
          habilitado: boolean;
          id: string;
          periodo: string | null;
          valor: string | null;
        };
        Insert: {
          clave: string;
          cliente_legajo: string;
          created_at?: string;
          habilitado?: boolean;
          id?: string;
          periodo?: string | null;
          valor?: string | null;
        };
        Update: {
          clave?: string;
          cliente_legajo?: string;
          created_at?: string;
          habilitado?: boolean;
          id?: string;
          periodo?: string | null;
          valor?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_parametros_alertas_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_parametros_alertas_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_parametros_alertas_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_parametros_alertas_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_parametros_alertas_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
        ];
      };
      cliente_parametros_bloqueos: {
        Row: {
          clave: string;
          cliente_legajo: string;
          created_at: string;
          habilitado: boolean;
          id: string;
          periodo: string | null;
          valor: string | null;
        };
        Insert: {
          clave: string;
          cliente_legajo: string;
          created_at?: string;
          habilitado?: boolean;
          id?: string;
          periodo?: string | null;
          valor?: string | null;
        };
        Update: {
          clave?: string;
          cliente_legajo?: string;
          created_at?: string;
          habilitado?: boolean;
          id?: string;
          periodo?: string | null;
          valor?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_parametros_bloqueos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_parametros_bloqueos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_parametros_bloqueos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_parametros_bloqueos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_parametros_bloqueos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
        ];
      };
      cliente_perfil_riesgo: {
        Row: {
          cliente_legajo: string;
          created_at: string;
          detalle: Json | null;
          evaluado_por: string | null;
          id: string;
          motivo: string;
          nivel: string;
          vigente_desde: string;
          vigente_hasta: string | null;
        };
        Insert: {
          cliente_legajo: string;
          created_at?: string;
          detalle?: Json | null;
          evaluado_por?: string | null;
          id?: string;
          motivo: string;
          nivel: string;
          vigente_desde?: string;
          vigente_hasta?: string | null;
        };
        Update: {
          cliente_legajo?: string;
          created_at?: string;
          detalle?: Json | null;
          evaluado_por?: string | null;
          id?: string;
          motivo?: string;
          nivel?: string;
          vigente_desde?: string;
          vigente_hasta?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_perfil_riesgo_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_perfil_riesgo_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_perfil_riesgo_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_perfil_riesgo_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_perfil_riesgo_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_perfil_riesgo_evaluado_por_fkey";
            columns: ["evaluado_por"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cliente_perfil_riesgo_evaluado_por_fkey";
            columns: ["evaluado_por"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      cliente_transiciones: {
        Row: {
          admin_user_id: string | null;
          cliente_id: string;
          comentario: string | null;
          created_at: string;
          estado_anterior: string | null;
          estado_nuevo: string;
          id: string;
          legajo: string;
          origen: string;
        };
        Insert: {
          admin_user_id?: string | null;
          cliente_id: string;
          comentario?: string | null;
          created_at?: string;
          estado_anterior?: string | null;
          estado_nuevo: string;
          id?: string;
          legajo: string;
          origen?: string;
        };
        Update: {
          admin_user_id?: string | null;
          cliente_id?: string;
          comentario?: string | null;
          created_at?: string;
          estado_anterior?: string | null;
          estado_nuevo?: string;
          id?: string;
          legajo?: string;
          origen?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_transiciones_admin_user_id_fkey";
            columns: ["admin_user_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cliente_transiciones_admin_user_id_fkey";
            columns: ["admin_user_id"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cliente_transiciones_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      clientes: {
        Row: {
          actividad: string | null;
          alias: string | null;
          cbu: string | null;
          cbu_cancelado: boolean;
          ciudad: string | null;
          correo: string;
          cp: string | null;
          created_at: string;
          cuit: string;
          cuit_cuil: string | null;
          direccion: string | null;
          direccion2: string | null;
          email_verificado: boolean;
          es_pep: boolean;
          estado: string;
          estado_onboarding: string;
          fecha_alta: string;
          fecha_inscripcion: string | null;
          fecha_nacimiento: string | null;
          genero: string | null;
          id: string;
          legajo: string;
          limite_monto_diario: number | null;
          limite_ops_diarias: number | null;
          limite_transferencia: number | null;
          nombre: string;
          nombre_fantasia: string | null;
          nombre_legal: string | null;
          ocupacion: string | null;
          onboarding_completo: boolean;
          origen_fondos: string | null;
          provincia: string | null;
          telefono: string | null;
          tipo_persona: string;
          tipo_sociedad: string | null;
          updated_at: string;
        };
        Insert: {
          actividad?: string | null;
          alias?: string | null;
          cbu?: string | null;
          cbu_cancelado?: boolean;
          ciudad?: string | null;
          correo: string;
          cp?: string | null;
          created_at?: string;
          cuit: string;
          cuit_cuil?: string | null;
          direccion?: string | null;
          direccion2?: string | null;
          email_verificado?: boolean;
          es_pep?: boolean;
          estado?: string;
          estado_onboarding?: string;
          fecha_alta?: string;
          fecha_inscripcion?: string | null;
          fecha_nacimiento?: string | null;
          genero?: string | null;
          id?: string;
          legajo: string;
          limite_monto_diario?: number | null;
          limite_ops_diarias?: number | null;
          limite_transferencia?: number | null;
          nombre: string;
          nombre_fantasia?: string | null;
          nombre_legal?: string | null;
          ocupacion?: string | null;
          onboarding_completo?: boolean;
          origen_fondos?: string | null;
          provincia?: string | null;
          telefono?: string | null;
          tipo_persona: string;
          tipo_sociedad?: string | null;
          updated_at?: string;
        };
        Update: {
          actividad?: string | null;
          alias?: string | null;
          cbu?: string | null;
          cbu_cancelado?: boolean;
          ciudad?: string | null;
          correo?: string;
          cp?: string | null;
          created_at?: string;
          cuit?: string;
          cuit_cuil?: string | null;
          direccion?: string | null;
          direccion2?: string | null;
          email_verificado?: boolean;
          es_pep?: boolean;
          estado?: string;
          estado_onboarding?: string;
          fecha_alta?: string;
          fecha_inscripcion?: string | null;
          fecha_nacimiento?: string | null;
          genero?: string | null;
          id?: string;
          legajo?: string;
          limite_monto_diario?: number | null;
          limite_ops_diarias?: number | null;
          limite_transferencia?: number | null;
          nombre?: string;
          nombre_fantasia?: string | null;
          nombre_legal?: string | null;
          ocupacion?: string | null;
          onboarding_completo?: boolean;
          origen_fondos?: string | null;
          provincia?: string | null;
          telefono?: string | null;
          tipo_persona?: string;
          tipo_sociedad?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      codigos_categoria: {
        Row: {
          codigo: string;
          created_at: string;
          descripcion: string | null;
          estado: string;
          id: number;
          nombre: string;
          updated_at: string;
        };
        Insert: {
          codigo: string;
          created_at?: string;
          descripcion?: string | null;
          estado?: string;
          id?: never;
          nombre: string;
          updated_at?: string;
        };
        Update: {
          codigo?: string;
          created_at?: string;
          descripcion?: string | null;
          estado?: string;
          id?: never;
          nombre?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      codigos_error: {
        Row: {
          activo: boolean;
          audiencia: string;
          canal_defecto: string;
          codigo: string;
          created_at: string;
          descripcion: string | null;
          id: string;
          mensaje: string;
          updated_at: string;
        };
        Insert: {
          activo?: boolean;
          audiencia?: string;
          canal_defecto?: string;
          codigo: string;
          created_at?: string;
          descripcion?: string | null;
          id?: string;
          mensaje: string;
          updated_at?: string;
        };
        Update: {
          activo?: boolean;
          audiencia?: string;
          canal_defecto?: string;
          codigo?: string;
          created_at?: string;
          descripcion?: string | null;
          id?: string;
          mensaje?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      comercio_banderas: {
        Row: {
          bandera: string;
          bandera_id: string | null;
          comercio_id: string;
          comision_molipay: number;
          comision_neta: number | null;
          comision_payway: number;
          created_at: string;
          estado: string;
          id: string;
          metodo_key: string | null;
          updated_at: string;
        };
        Insert: {
          bandera: string;
          bandera_id?: string | null;
          comercio_id: string;
          comision_molipay: number;
          comision_neta?: number | null;
          comision_payway: number;
          created_at?: string;
          estado?: string;
          id?: string;
          metodo_key?: string | null;
          updated_at?: string;
        };
        Update: {
          bandera?: string;
          bandera_id?: string | null;
          comercio_id?: string;
          comision_molipay?: number;
          comision_neta?: number | null;
          comision_payway?: number;
          created_at?: string;
          estado?: string;
          id?: string;
          metodo_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comercio_banderas_bandera_id_fkey";
            columns: ["bandera_id"];
            isOneToOne: false;
            referencedRelation: "banderas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comercio_banderas_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comercio_banderas_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
        ];
      };
      comercio_banderas_cuotas: {
        Row: {
          comercio_bandera_id: string;
          created_at: string | null;
          cuotas: number;
          estado: string;
          id: string;
          tasa_mensual: number;
          updated_at: string | null;
        };
        Insert: {
          comercio_bandera_id: string;
          created_at?: string | null;
          cuotas: number;
          estado?: string;
          id?: string;
          tasa_mensual: number;
          updated_at?: string | null;
        };
        Update: {
          comercio_bandera_id?: string;
          created_at?: string | null;
          cuotas?: number;
          estado?: string;
          id?: string;
          tasa_mensual?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "comercio_banderas_cuotas_comercio_bandera_id_fkey";
            columns: ["comercio_bandera_id"];
            isOneToOne: false;
            referencedRelation: "comercio_banderas";
            referencedColumns: ["id"];
          },
        ];
      };
      comercio_establecimientos: {
        Row: {
          comercio_id: string;
          created_at: string;
          establecimiento: string;
          id: string;
          marca: string;
          updated_at: string;
          vigente_desde: string;
          vigente_hasta: string | null;
        };
        Insert: {
          comercio_id: string;
          created_at?: string;
          establecimiento: string;
          id?: string;
          marca: string;
          updated_at?: string;
          vigente_desde?: string;
          vigente_hasta?: string | null;
        };
        Update: {
          comercio_id?: string;
          created_at?: string;
          establecimiento?: string;
          id?: string;
          marca?: string;
          updated_at?: string;
          vigente_desde?: string;
          vigente_hasta?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "comercio_establecimientos_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comercio_establecimientos_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
        ];
      };
      comercios: {
        Row: {
          categoria_id: number | null;
          created_at: string;
          ejecutivo_responsable_id: string | null;
          estado: string;
          id: string;
          legajo: string;
          nivel: string;
          nombre_comercio: string | null;
          site_id: string | null;
          updated_at: string;
          usuario: string;
        };
        Insert: {
          categoria_id?: number | null;
          created_at?: string;
          ejecutivo_responsable_id?: string | null;
          estado: string;
          id?: string;
          legajo: string;
          nivel: string;
          nombre_comercio?: string | null;
          site_id?: string | null;
          updated_at?: string;
          usuario: string;
        };
        Update: {
          categoria_id?: number | null;
          created_at?: string;
          ejecutivo_responsable_id?: string | null;
          estado?: string;
          id?: string;
          legajo?: string;
          nivel?: string;
          nombre_comercio?: string | null;
          site_id?: string | null;
          updated_at?: string;
          usuario?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comercios_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "codigos_categoria";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comercios_ejecutivo_responsable_id_fkey";
            columns: ["ejecutivo_responsable_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comercios_ejecutivo_responsable_id_fkey";
            columns: ["ejecutivo_responsable_id"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
        ];
      };
      comisiones_cliente: {
        Row: {
          cliente_id: string;
          created_at: string;
          descripcion: string | null;
          estado: string;
          id: string;
          modalidad: string;
          monto_fijo: number | null;
          operacion: string;
          porcentaje: number | null;
          porcentaje_impuesto: number;
          subcuenta_id: string | null;
          tipo: string;
          updated_at: string;
        };
        Insert: {
          cliente_id: string;
          created_at?: string;
          descripcion?: string | null;
          estado?: string;
          id?: string;
          modalidad?: string;
          monto_fijo?: number | null;
          operacion: string;
          porcentaje?: number | null;
          porcentaje_impuesto?: number;
          subcuenta_id?: string | null;
          tipo: string;
          updated_at?: string;
        };
        Update: {
          cliente_id?: string;
          created_at?: string;
          descripcion?: string | null;
          estado?: string;
          id?: string;
          modalidad?: string;
          monto_fijo?: number | null;
          operacion?: string;
          porcentaje?: number | null;
          porcentaje_impuesto?: number;
          subcuenta_id?: string | null;
          tipo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comisiones_cliente_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comisiones_cliente_subcuenta_id_fkey";
            columns: ["subcuenta_id"];
            isOneToOne: false;
            referencedRelation: "subaccounts";
            referencedColumns: ["id"];
          },
        ];
      };
      conciliaciones: {
        Row: {
          archivo_origen: string | null;
          created_at: string;
          estado_conciliacion: string;
          fecha_conciliacion: string | null;
          id: string;
          monto_diferencia: number | null;
          movimiento_id: string;
        };
        Insert: {
          archivo_origen?: string | null;
          created_at?: string;
          estado_conciliacion?: string;
          fecha_conciliacion?: string | null;
          id?: string;
          monto_diferencia?: number | null;
          movimiento_id: string;
        };
        Update: {
          archivo_origen?: string | null;
          created_at?: string;
          estado_conciliacion?: string;
          fecha_conciliacion?: string | null;
          id?: string;
          monto_diferencia?: number | null;
          movimiento_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conciliaciones_movimiento_id_fkey";
            columns: ["movimiento_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      conciliaciones_archivos: {
        Row: {
          archivo_origen: string | null;
          created_at: string;
          created_by: string | null;
          estado: string;
          fecha_carga: string;
          id: string;
          nombre_archivo: string;
          storage_path: string | null;
          tipo: string;
        };
        Insert: {
          archivo_origen?: string | null;
          created_at?: string;
          created_by?: string | null;
          estado?: string;
          fecha_carga: string;
          id?: string;
          nombre_archivo: string;
          storage_path?: string | null;
          tipo?: string;
        };
        Update: {
          archivo_origen?: string | null;
          created_at?: string;
          created_by?: string | null;
          estado?: string;
          fecha_carga?: string;
          id?: string;
          nombre_archivo?: string;
          storage_path?: string | null;
          tipo?: string;
        };
        Relationships: [];
      };
      contracargos: {
        Row: {
          archivos_adjuntos: Json;
          cco_origen: string | null;
          cliente_legajo: string | null;
          comercio_id: string | null;
          created_at: string;
          created_by: string | null;
          deuda_id: string | null;
          documentacion: string | null;
          enviado_payway_at: string | null;
          es_simulacion: boolean;
          estado: string;
          fecha_cierre: string | null;
          fecha_limite: string | null;
          fecha_transaccion: string | null;
          id: string;
          impacto_cierre: number | null;
          impacto_neto: number | null;
          impacto_saldo: number | null;
          impacto_tasa: number | null;
          importe: number;
          liberado_at: string | null;
          lote_descuento_id: string | null;
          lote_sugerido_id: string | null;
          lote_venta_id: string | null;
          marca_tarjeta: string | null;
          motivo_payway: string | null;
          movimiento_id: string | null;
          nro_tarjeta_masked: string | null;
          pago_id: string | null;
          resolucion: string | null;
          resuelto_por: string | null;
          retencion_estado: string;
          retencion_lote_id: string | null;
          retenido_at: string | null;
          retenido_monto: number;
          site_id: string | null;
          site_transaction_id: string | null;
          ticket_payway: string | null;
          updated_at: string;
          url_origen: string | null;
        };
        Insert: {
          archivos_adjuntos?: Json;
          cco_origen?: string | null;
          cliente_legajo?: string | null;
          comercio_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deuda_id?: string | null;
          documentacion?: string | null;
          enviado_payway_at?: string | null;
          es_simulacion?: boolean;
          estado?: string;
          fecha_cierre?: string | null;
          fecha_limite?: string | null;
          fecha_transaccion?: string | null;
          id?: string;
          impacto_cierre?: number | null;
          impacto_neto?: number | null;
          impacto_saldo?: number | null;
          impacto_tasa?: number | null;
          importe?: number;
          liberado_at?: string | null;
          lote_descuento_id?: string | null;
          lote_sugerido_id?: string | null;
          lote_venta_id?: string | null;
          marca_tarjeta?: string | null;
          motivo_payway?: string | null;
          movimiento_id?: string | null;
          nro_tarjeta_masked?: string | null;
          pago_id?: string | null;
          resolucion?: string | null;
          resuelto_por?: string | null;
          retencion_estado?: string;
          retencion_lote_id?: string | null;
          retenido_at?: string | null;
          retenido_monto?: number;
          site_id?: string | null;
          site_transaction_id?: string | null;
          ticket_payway?: string | null;
          updated_at?: string;
          url_origen?: string | null;
        };
        Update: {
          archivos_adjuntos?: Json;
          cco_origen?: string | null;
          cliente_legajo?: string | null;
          comercio_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deuda_id?: string | null;
          documentacion?: string | null;
          enviado_payway_at?: string | null;
          es_simulacion?: boolean;
          estado?: string;
          fecha_cierre?: string | null;
          fecha_limite?: string | null;
          fecha_transaccion?: string | null;
          id?: string;
          impacto_cierre?: number | null;
          impacto_neto?: number | null;
          impacto_saldo?: number | null;
          impacto_tasa?: number | null;
          importe?: number;
          liberado_at?: string | null;
          lote_descuento_id?: string | null;
          lote_sugerido_id?: string | null;
          lote_venta_id?: string | null;
          marca_tarjeta?: string | null;
          motivo_payway?: string | null;
          movimiento_id?: string | null;
          nro_tarjeta_masked?: string | null;
          pago_id?: string | null;
          resolucion?: string | null;
          resuelto_por?: string | null;
          retencion_estado?: string;
          retencion_lote_id?: string | null;
          retenido_at?: string | null;
          retenido_monto?: number;
          site_id?: string | null;
          site_transaction_id?: string | null;
          ticket_payway?: string | null;
          updated_at?: string;
          url_origen?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contracargos_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
          {
            foreignKeyName: "contracargos_deuda_id_fkey";
            columns: ["deuda_id"];
            isOneToOne: false;
            referencedRelation: "deudas_comercio";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_lote_descuento_id_fkey";
            columns: ["lote_descuento_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_lote_descuento_id_fkey";
            columns: ["lote_descuento_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_lote_sugerido_id_fkey";
            columns: ["lote_sugerido_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_lote_sugerido_id_fkey";
            columns: ["lote_sugerido_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_lote_venta_id_fkey";
            columns: ["lote_venta_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_lote_venta_id_fkey";
            columns: ["lote_venta_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_movimiento_id_fkey";
            columns: ["movimiento_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_pago_id_fkey";
            columns: ["pago_id"];
            isOneToOne: false;
            referencedRelation: "cliente_links_pago_pagos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_resuelto_por_fkey";
            columns: ["resuelto_por"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_resuelto_por_fkey";
            columns: ["resuelto_por"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_retencion_lote_id_fkey";
            columns: ["retencion_lote_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_retencion_lote_id_fkey";
            columns: ["retencion_lote_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
        ];
      };
      dc_sync_retroactivo: {
        Row: {
          aplicado: boolean;
          created_at: string;
          cuit: string;
          desde: string | null;
          hasta: string | null;
          id: string;
          preview_json: Json | null;
        };
        Insert: {
          aplicado?: boolean;
          created_at?: string;
          cuit: string;
          desde?: string | null;
          hasta?: string | null;
          id?: string;
          preview_json?: Json | null;
        };
        Update: {
          aplicado?: boolean;
          created_at?: string;
          cuit?: string;
          desde?: string | null;
          hasta?: string | null;
          id?: string;
          preview_json?: Json | null;
        };
        Relationships: [];
      };
      destinatarios_frecuentes: {
        Row: {
          alias: string | null;
          banco: string | null;
          cbu: string | null;
          cliente_legajo: string;
          created_at: string;
          cuit: string | null;
          id: string;
          identifier: string;
          identifier_kind: string;
          nombre: string;
        };
        Insert: {
          alias?: string | null;
          banco?: string | null;
          cbu?: string | null;
          cliente_legajo: string;
          created_at?: string;
          cuit?: string | null;
          id?: string;
          identifier: string;
          identifier_kind: string;
          nombre: string;
        };
        Update: {
          alias?: string | null;
          banco?: string | null;
          cbu?: string | null;
          cliente_legajo?: string;
          created_at?: string;
          cuit?: string | null;
          id?: string;
          identifier?: string;
          identifier_kind?: string;
          nombre?: string;
        };
        Relationships: [
          {
            foreignKeyName: "destinatarios_frecuentes_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "destinatarios_frecuentes_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "destinatarios_frecuentes_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "destinatarios_frecuentes_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "destinatarios_frecuentes_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
        ];
      };
      deuda_recuperaciones: {
        Row: {
          created_at: string;
          deuda_id: string;
          id: string;
          lote_id: string;
          monto: number;
        };
        Insert: {
          created_at?: string;
          deuda_id: string;
          id?: string;
          lote_id: string;
          monto: number;
        };
        Update: {
          created_at?: string;
          deuda_id?: string;
          id?: string;
          lote_id?: string;
          monto?: number;
        };
        Relationships: [
          {
            foreignKeyName: "deuda_recuperaciones_deuda_id_fkey";
            columns: ["deuda_id"];
            isOneToOne: false;
            referencedRelation: "deudas_comercio";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deuda_recuperaciones_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deuda_recuperaciones_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
        ];
      };
      deudas_comercio: {
        Row: {
          cliente_legajo: string;
          comercio_id: string | null;
          created_at: string;
          id: string;
          lote_acreditacion_id: string | null;
          monto: number;
          observaciones: string | null;
          origen: string;
          recuperado: number;
          saldada: boolean;
          saldada_en: string | null;
          updated_at: string;
        };
        Insert: {
          cliente_legajo: string;
          comercio_id?: string | null;
          created_at?: string;
          id?: string;
          lote_acreditacion_id?: string | null;
          monto?: number;
          observaciones?: string | null;
          origen: string;
          recuperado?: number;
          saldada?: boolean;
          saldada_en?: string | null;
          updated_at?: string;
        };
        Update: {
          cliente_legajo?: string;
          comercio_id?: string | null;
          created_at?: string;
          id?: string;
          lote_acreditacion_id?: string | null;
          monto?: number;
          observaciones?: string | null;
          origen?: string;
          recuperado?: number;
          saldada?: boolean;
          saldada_en?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deudas_comercio_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deudas_comercio_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
          {
            foreignKeyName: "deudas_comercio_lote_acreditacion_id_fkey";
            columns: ["lote_acreditacion_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deudas_comercio_lote_acreditacion_id_fkey";
            columns: ["lote_acreditacion_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
        ];
      };
      documentos: {
        Row: {
          cliente_legajo: string;
          created_at: string;
          id: string;
          label: string;
          tipo: string;
          url: string | null;
        };
        Insert: {
          cliente_legajo: string;
          created_at?: string;
          id?: string;
          label?: string;
          tipo: string;
          url?: string | null;
        };
        Update: {
          cliente_legajo?: string;
          created_at?: string;
          id?: string;
          label?: string;
          tipo?: string;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documentos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "documentos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "documentos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "documentos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "documentos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
        ];
      };
      estados_movimiento: {
        Row: {
          codigo: string;
          created_at: string;
          es_final: boolean;
          id: number;
          nombre: string;
          requiere_conciliacion: boolean;
        };
        Insert: {
          codigo: string;
          created_at?: string;
          es_final?: boolean;
          id: number;
          nombre: string;
          requiere_conciliacion?: boolean;
        };
        Update: {
          codigo?: string;
          created_at?: string;
          es_final?: boolean;
          id?: number;
          nombre?: string;
          requiere_conciliacion?: boolean;
        };
        Relationships: [];
      };
      estados_por_tipo: {
        Row: {
          estado_id: number;
          tipo_movimiento: string;
        };
        Insert: {
          estado_id: number;
          tipo_movimiento: string;
        };
        Update: {
          estado_id?: number;
          tipo_movimiento?: string;
        };
        Relationships: [
          {
            foreignKeyName: "estados_por_tipo_estado_id_fkey";
            columns: ["estado_id"];
            isOneToOne: false;
            referencedRelation: "estados_movimiento";
            referencedColumns: ["id"];
          },
        ];
      };
      eventos_notificacion: {
        Row: {
          audiencia: string;
          canal: string;
          codigo_error_id: string | null;
          created_at: string;
          estado_entrega: string;
          fecha: string;
          id: string;
          mensaje: string;
          metadata: Json | null;
          tipo: string;
          titulo: string;
          updated_at: string;
        };
        Insert: {
          audiencia: string;
          canal: string;
          codigo_error_id?: string | null;
          created_at?: string;
          estado_entrega?: string;
          fecha?: string;
          id?: string;
          mensaje: string;
          metadata?: Json | null;
          tipo?: string;
          titulo: string;
          updated_at?: string;
        };
        Update: {
          audiencia?: string;
          canal?: string;
          codigo_error_id?: string | null;
          created_at?: string;
          estado_entrega?: string;
          fecha?: string;
          id?: string;
          mensaje?: string;
          metadata?: Json | null;
          tipo?: string;
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "eventos_notificacion_codigo_error_id_fkey";
            columns: ["codigo_error_id"];
            isOneToOne: false;
            referencedRelation: "codigos_error";
            referencedColumns: ["id"];
          },
        ];
      };
      historial_cambios: {
        Row: {
          campo: string;
          cliente_legajo: string;
          created_at: string;
          fecha: string;
          hora: string | null;
          id: string;
          usuario: string | null;
          valor_anterior: string | null;
          valor_nuevo: string | null;
        };
        Insert: {
          campo: string;
          cliente_legajo: string;
          created_at?: string;
          fecha?: string;
          hora?: string | null;
          id?: string;
          usuario?: string | null;
          valor_anterior?: string | null;
          valor_nuevo?: string | null;
        };
        Update: {
          campo?: string;
          cliente_legajo?: string;
          created_at?: string;
          fecha?: string;
          hora?: string | null;
          id?: string;
          usuario?: string | null;
          valor_anterior?: string | null;
          valor_nuevo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "historial_cambios_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "historial_cambios_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "historial_cambios_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "historial_cambios_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "historial_cambios_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
        ];
      };
      integraciones: {
        Row: {
          created_at: string;
          id: string;
          nombre: string;
          proveedor: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          nombre: string;
          proveedor: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          nombre?: string;
          proveedor?: string;
        };
        Relationships: [];
      };
      ledger_accounts: {
        Row: {
          account_code: string;
          account_type: string;
          balance_bucket: string | null;
          created_at: string;
          currency_code: string;
          id: string;
          is_active: boolean;
          name: string;
          subaccount_id: string | null;
        };
        Insert: {
          account_code: string;
          account_type: string;
          balance_bucket?: string | null;
          created_at?: string;
          currency_code?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          subaccount_id?: string | null;
        };
        Update: {
          account_code?: string;
          account_type?: string;
          balance_bucket?: string | null;
          created_at?: string;
          currency_code?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          subaccount_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ledger_accounts_subaccount_id_fkey";
            columns: ["subaccount_id"];
            isOneToOne: false;
            referencedRelation: "subaccounts";
            referencedColumns: ["id"];
          },
        ];
      };
      ledger_entries: {
        Row: {
          account_id: string;
          amount: number;
          concepto: string;
          created_at: string;
          created_by: string | null;
          currency_code: string;
          entry_type: string;
          id: string;
          line_no: number;
          memo: string | null;
          posted_at: string | null;
          posting_key: string;
          reversal_of_entry_id: string | null;
          transaction_id: string;
        };
        Insert: {
          account_id: string;
          amount: number;
          concepto?: string;
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          entry_type: string;
          id?: string;
          line_no: number;
          memo?: string | null;
          posted_at?: string | null;
          posting_key: string;
          reversal_of_entry_id?: string | null;
          transaction_id: string;
        };
        Update: {
          account_id?: string;
          amount?: number;
          concepto?: string;
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          entry_type?: string;
          id?: string;
          line_no?: number;
          memo?: string | null;
          posted_at?: string | null;
          posting_key?: string;
          reversal_of_entry_id?: string | null;
          transaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "ledger_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_entries_reversal_of_entry_id_fkey";
            columns: ["reversal_of_entry_id"];
            isOneToOne: false;
            referencedRelation: "ledger_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      liquidacion_conciliaciones: {
        Row: {
          conciliado_by: string | null;
          created_at: string;
          diferencia: number | null;
          estado: string;
          fecha_pago: string;
          id: string;
          ingresado: number;
          marca_norm: string;
          neto_archivo: number;
          notas: string | null;
        };
        Insert: {
          conciliado_by?: string | null;
          created_at?: string;
          diferencia?: number | null;
          estado: string;
          fecha_pago: string;
          id?: string;
          ingresado: number;
          marca_norm: string;
          neto_archivo: number;
          notas?: string | null;
        };
        Update: {
          conciliado_by?: string | null;
          created_at?: string;
          diferencia?: number | null;
          estado?: string;
          fecha_pago?: string;
          id?: string;
          ingresado?: number;
          marca_norm?: string;
          neto_archivo?: number;
          notas?: string | null;
        };
        Relationships: [];
      };
      liquidaciones_importaciones: {
        Row: {
          adquirente: string;
          applied_at: string | null;
          archivo_hash: string;
          archivo_nombre: string;
          created_at: string;
          estado: string;
          id: string;
          observaciones: string | null;
          rango_desde: string | null;
          rango_hasta: string | null;
          resumen: Json | null;
          updated_at: string;
          uploaded_por: string | null;
        };
        Insert: {
          adquirente?: string;
          applied_at?: string | null;
          archivo_hash: string;
          archivo_nombre: string;
          created_at?: string;
          estado?: string;
          id?: string;
          observaciones?: string | null;
          rango_desde?: string | null;
          rango_hasta?: string | null;
          resumen?: Json | null;
          updated_at?: string;
          uploaded_por?: string | null;
        };
        Update: {
          adquirente?: string;
          applied_at?: string | null;
          archivo_hash?: string;
          archivo_nombre?: string;
          created_at?: string;
          estado?: string;
          id?: string;
          observaciones?: string | null;
          rango_desde?: string | null;
          rango_hasta?: string | null;
          resumen?: Json | null;
          updated_at?: string;
          uploaded_por?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "liquidaciones_importaciones_uploaded_por_fkey";
            columns: ["uploaded_por"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "liquidaciones_importaciones_uploaded_por_fkey";
            columns: ["uploaded_por"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      liquidaciones_renglones: {
        Row: {
          advertencias: string[];
          bandera_id: string | null;
          comercio_id: string | null;
          comision_cierre_monto: number | null;
          comision_molipay_monto: number | null;
          comision_payway_monto: number | null;
          costo_servicio: number;
          created_at: string;
          diferencia_bruto: number | null;
          establecimiento: string;
          establecimiento_id: string | null;
          estado: string;
          excepcion_estado: string | null;
          fecha: string;
          id: string;
          importacion_id: string;
          importe_neto_final: number | null;
          impuestos: number;
          lote_acreditacion_id: string | null;
          marca: string;
          marca_norm: string | null;
          motivo_excepcion: string | null;
          nro_renglon: number;
          resolucion_motivo: string | null;
          resuelto_at: string | null;
          resuelto_by: string | null;
          total_bruto: number;
          total_neto: number;
          updated_at: string;
        };
        Insert: {
          advertencias?: string[];
          bandera_id?: string | null;
          comercio_id?: string | null;
          comision_cierre_monto?: number | null;
          comision_molipay_monto?: number | null;
          comision_payway_monto?: number | null;
          costo_servicio?: number;
          created_at?: string;
          diferencia_bruto?: number | null;
          establecimiento: string;
          establecimiento_id?: string | null;
          estado?: string;
          excepcion_estado?: string | null;
          fecha: string;
          id?: string;
          importacion_id: string;
          importe_neto_final?: number | null;
          impuestos?: number;
          lote_acreditacion_id?: string | null;
          marca: string;
          marca_norm?: string | null;
          motivo_excepcion?: string | null;
          nro_renglon: number;
          resolucion_motivo?: string | null;
          resuelto_at?: string | null;
          resuelto_by?: string | null;
          total_bruto?: number;
          total_neto?: number;
          updated_at?: string;
        };
        Update: {
          advertencias?: string[];
          bandera_id?: string | null;
          comercio_id?: string | null;
          comision_cierre_monto?: number | null;
          comision_molipay_monto?: number | null;
          comision_payway_monto?: number | null;
          costo_servicio?: number;
          created_at?: string;
          diferencia_bruto?: number | null;
          establecimiento?: string;
          establecimiento_id?: string | null;
          estado?: string;
          excepcion_estado?: string | null;
          fecha?: string;
          id?: string;
          importacion_id?: string;
          importe_neto_final?: number | null;
          impuestos?: number;
          lote_acreditacion_id?: string | null;
          marca?: string;
          marca_norm?: string | null;
          motivo_excepcion?: string | null;
          nro_renglon?: number;
          resolucion_motivo?: string | null;
          resuelto_at?: string | null;
          resuelto_by?: string | null;
          total_bruto?: number;
          total_neto?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "liquidaciones_renglones_comercio_fk";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "liquidaciones_renglones_comercio_fk";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
          {
            foreignKeyName: "liquidaciones_renglones_establecimiento_fk";
            columns: ["establecimiento_id"];
            isOneToOne: false;
            referencedRelation: "comercio_establecimientos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "liquidaciones_renglones_importacion_fk";
            columns: ["importacion_id"];
            isOneToOne: false;
            referencedRelation: "liquidaciones_importaciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "liquidaciones_renglones_lote_fk";
            columns: ["lote_acreditacion_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "liquidaciones_renglones_lote_fk";
            columns: ["lote_acreditacion_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
        ];
      };
      lote_movimientos: {
        Row: {
          lote_id: string;
          movimiento_id: string;
        };
        Insert: {
          lote_id: string;
          movimiento_id: string;
        };
        Update: {
          lote_id?: string;
          movimiento_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lote_movimientos_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lote_movimientos_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lote_movimientos_movimiento_id_fkey";
            columns: ["movimiento_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      lote_registros: {
        Row: {
          cbu_id: string | null;
          created_at: string;
          descripcion: string;
          email: string | null;
          email_enviado: boolean;
          estado: string;
          fecha_pago: string | null;
          fecha_venc_1: string | null;
          fecha_venc_2: string | null;
          fecha_venc_3: string | null;
          id: string;
          id_entidad: string;
          id_unico_beneficiario: string | null;
          identificacion_usuario: string;
          link_de_pago: string | null;
          lote_id: string;
          medios_pago: Json | null;
          monto: number;
          monto_pagado: number;
          pagos_parciales: boolean | null;
          periodo_facturacion: string | null;
          sub_entidad: string;
          tasa_interes: number | null;
          tipo_entidad: string;
        };
        Insert: {
          cbu_id?: string | null;
          created_at?: string;
          descripcion?: string;
          email?: string | null;
          email_enviado?: boolean;
          estado?: string;
          fecha_pago?: string | null;
          fecha_venc_1?: string | null;
          fecha_venc_2?: string | null;
          fecha_venc_3?: string | null;
          id: string;
          id_entidad: string;
          id_unico_beneficiario?: string | null;
          identificacion_usuario: string;
          link_de_pago?: string | null;
          lote_id: string;
          medios_pago?: Json | null;
          monto: number;
          monto_pagado?: number;
          pagos_parciales?: boolean | null;
          periodo_facturacion?: string | null;
          sub_entidad: string;
          tasa_interes?: number | null;
          tipo_entidad: string;
        };
        Update: {
          cbu_id?: string | null;
          created_at?: string;
          descripcion?: string;
          email?: string | null;
          email_enviado?: boolean;
          estado?: string;
          fecha_pago?: string | null;
          fecha_venc_1?: string | null;
          fecha_venc_2?: string | null;
          fecha_venc_3?: string | null;
          id?: string;
          id_entidad?: string;
          id_unico_beneficiario?: string | null;
          identificacion_usuario?: string;
          link_de_pago?: string | null;
          lote_id?: string;
          medios_pago?: Json | null;
          monto?: number;
          monto_pagado?: number;
          pagos_parciales?: boolean | null;
          periodo_facturacion?: string | null;
          sub_entidad?: string;
          tasa_interes?: number | null;
          tipo_entidad?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lote_registros_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "lotes";
            referencedColumns: ["id"];
          },
        ];
      };
      lotes: {
        Row: {
          cliente_legajo: string;
          created_at: string;
          dia_pago: number;
          estado: string;
          fecha_finalizacion: string | null;
          fecha_inicio: string | null;
          fecha_venc_1: string;
          fecha_venc_2: string | null;
          fecha_venc_3: string | null;
          id: string;
          medios_pago: Json;
          nombre: string;
          notificaciones: boolean;
          pagos_parciales: boolean;
          periodo: string;
          tasa_interes: number;
        };
        Insert: {
          cliente_legajo: string;
          created_at?: string;
          dia_pago?: number;
          estado?: string;
          fecha_finalizacion?: string | null;
          fecha_inicio?: string | null;
          fecha_venc_1: string;
          fecha_venc_2?: string | null;
          fecha_venc_3?: string | null;
          id: string;
          medios_pago?: Json;
          nombre: string;
          notificaciones?: boolean;
          pagos_parciales?: boolean;
          periodo: string;
          tasa_interes?: number;
        };
        Update: {
          cliente_legajo?: string;
          created_at?: string;
          dia_pago?: number;
          estado?: string;
          fecha_finalizacion?: string | null;
          fecha_inicio?: string | null;
          fecha_venc_1?: string;
          fecha_venc_2?: string | null;
          fecha_venc_3?: string | null;
          id?: string;
          medios_pago?: Json;
          nombre?: string;
          notificaciones?: boolean;
          pagos_parciales?: boolean;
          periodo?: string;
          tasa_interes?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lotes_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "lotes_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "lotes_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "lotes_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "lotes_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
        ];
      };
      lotes_acreditacion: {
        Row: {
          acreditado_tx_id: string | null;
          bandera: string;
          bandera_id: string | null;
          calculado_at: string | null;
          calculo_hash: string | null;
          cantidad_operaciones: number;
          codigo: string;
          comercio_id: string;
          comision_cierre_base: string | null;
          comision_cierre_lote_monto: number | null;
          comision_cierre_lote_pct: number | null;
          compensacion_adelantos: number;
          conciliacion_id: string | null;
          conciliado: boolean;
          contracargo_monto: number;
          costo_payway_pago_unico: number | null;
          costo_servicio_payway: number | null;
          created_at: string;
          cuotas: number | null;
          debito_credito_monto: number | null;
          dias_habiles_aplicados: number | null;
          ejecucion_id: string | null;
          es_estimado: boolean;
          es_negativo: boolean | null;
          establecimiento: string | null;
          estado: string;
          fecha: string;
          fecha_acreditacion: string | null;
          fecha_cobro_real: string | null;
          fecha_estimada_recalcular: boolean;
          fecha_resolucion: string | null;
          id: string;
          iibb_monto: number | null;
          importacion_id: string | null;
          importe_bruto: number;
          importe_neto: number;
          impuestos: number;
          impuestos_detalle: Json;
          impuestos_payway: number | null;
          iva_monto: number | null;
          iva_tasa_monto: number | null;
          legacy: boolean;
          liquidado_en_lote_id: string | null;
          marca_norm: string | null;
          neto_a_acreditar: number | null;
          neto_payway: number | null;
          notas_resolucion: string | null;
          origen: string;
          recuperacion_deuda: number;
          renglon_id: string | null;
          resuelto_por: string | null;
          retencion_contracargos: number;
          tasa_molipay_monto: number;
          tasa_molipay_pct: number;
          tasa_payway_monto: number;
          tasa_payway_pct: number;
          updated_at: string;
        };
        Insert: {
          acreditado_tx_id?: string | null;
          bandera: string;
          bandera_id?: string | null;
          calculado_at?: string | null;
          calculo_hash?: string | null;
          cantidad_operaciones?: number;
          codigo: string;
          comercio_id: string;
          comision_cierre_base?: string | null;
          comision_cierre_lote_monto?: number | null;
          comision_cierre_lote_pct?: number | null;
          compensacion_adelantos?: number;
          conciliacion_id?: string | null;
          conciliado?: boolean;
          contracargo_monto?: number;
          costo_payway_pago_unico?: number | null;
          costo_servicio_payway?: number | null;
          created_at?: string;
          cuotas?: number | null;
          debito_credito_monto?: number | null;
          dias_habiles_aplicados?: number | null;
          ejecucion_id?: string | null;
          es_estimado?: boolean;
          es_negativo?: boolean | null;
          establecimiento?: string | null;
          estado?: string;
          fecha: string;
          fecha_acreditacion?: string | null;
          fecha_cobro_real?: string | null;
          fecha_estimada_recalcular?: boolean;
          fecha_resolucion?: string | null;
          id?: string;
          iibb_monto?: number | null;
          importacion_id?: string | null;
          importe_bruto: number;
          importe_neto: number;
          impuestos?: number;
          impuestos_detalle?: Json;
          impuestos_payway?: number | null;
          iva_monto?: number | null;
          iva_tasa_monto?: number | null;
          legacy?: boolean;
          liquidado_en_lote_id?: string | null;
          marca_norm?: string | null;
          neto_a_acreditar?: number | null;
          neto_payway?: number | null;
          notas_resolucion?: string | null;
          origen?: string;
          recuperacion_deuda?: number;
          renglon_id?: string | null;
          resuelto_por?: string | null;
          retencion_contracargos?: number;
          tasa_molipay_monto: number;
          tasa_molipay_pct: number;
          tasa_payway_monto: number;
          tasa_payway_pct: number;
          updated_at?: string;
        };
        Update: {
          acreditado_tx_id?: string | null;
          bandera?: string;
          bandera_id?: string | null;
          calculado_at?: string | null;
          calculo_hash?: string | null;
          cantidad_operaciones?: number;
          codigo?: string;
          comercio_id?: string;
          comision_cierre_base?: string | null;
          comision_cierre_lote_monto?: number | null;
          comision_cierre_lote_pct?: number | null;
          compensacion_adelantos?: number;
          conciliacion_id?: string | null;
          conciliado?: boolean;
          contracargo_monto?: number;
          costo_payway_pago_unico?: number | null;
          costo_servicio_payway?: number | null;
          created_at?: string;
          cuotas?: number | null;
          debito_credito_monto?: number | null;
          dias_habiles_aplicados?: number | null;
          ejecucion_id?: string | null;
          es_estimado?: boolean;
          es_negativo?: boolean | null;
          establecimiento?: string | null;
          estado?: string;
          fecha?: string;
          fecha_acreditacion?: string | null;
          fecha_cobro_real?: string | null;
          fecha_estimada_recalcular?: boolean;
          fecha_resolucion?: string | null;
          id?: string;
          iibb_monto?: number | null;
          importacion_id?: string | null;
          importe_bruto?: number;
          importe_neto?: number;
          impuestos?: number;
          impuestos_detalle?: Json;
          impuestos_payway?: number | null;
          iva_monto?: number | null;
          iva_tasa_monto?: number | null;
          legacy?: boolean;
          liquidado_en_lote_id?: string | null;
          marca_norm?: string | null;
          neto_a_acreditar?: number | null;
          neto_payway?: number | null;
          notas_resolucion?: string | null;
          origen?: string;
          recuperacion_deuda?: number;
          renglon_id?: string | null;
          resuelto_por?: string | null;
          retencion_contracargos?: number;
          tasa_molipay_monto?: number;
          tasa_molipay_pct?: number;
          tasa_payway_monto?: number;
          tasa_payway_pct?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lotes_acreditacion_bandera_id_fkey";
            columns: ["bandera_id"];
            isOneToOne: false;
            referencedRelation: "banderas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_conciliacion_id_fkey";
            columns: ["conciliacion_id"];
            isOneToOne: false;
            referencedRelation: "liquidacion_conciliaciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_ejecucion_fk";
            columns: ["ejecucion_id"];
            isOneToOne: false;
            referencedRelation: "acreditacion_ejecuciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_importacion_id_fkey";
            columns: ["importacion_id"];
            isOneToOne: false;
            referencedRelation: "liquidaciones_importaciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_liquidado_en_lote_id_fkey";
            columns: ["liquidado_en_lote_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_liquidado_en_lote_id_fkey";
            columns: ["liquidado_en_lote_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_renglon_id_fkey";
            columns: ["renglon_id"];
            isOneToOne: false;
            referencedRelation: "liquidaciones_renglones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_resuelto_por_fkey";
            columns: ["resuelto_por"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_resuelto_por_fkey";
            columns: ["resuelto_por"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      lotes_venta: {
        Row: {
          bandera: string;
          cantidad_operaciones: number;
          comercio_id: string;
          comision: number;
          created_at: string;
          fecha: string;
          id: string;
          importe_bruto: number;
          importe_neto: number;
          impuestos: number;
          updated_at: string;
        };
        Insert: {
          bandera: string;
          cantidad_operaciones?: number;
          comercio_id: string;
          comision?: number;
          created_at?: string;
          fecha: string;
          id?: string;
          importe_bruto?: number;
          importe_neto?: number;
          impuestos?: number;
          updated_at?: string;
        };
        Update: {
          bandera?: string;
          cantidad_operaciones?: number;
          comercio_id?: string;
          comision?: number;
          created_at?: string;
          fecha?: string;
          id?: string;
          importe_bruto?: number;
          importe_neto?: number;
          impuestos?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lotes_venta_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_venta_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
        ];
      };
      otp_transferencias: {
        Row: {
          codigo: string;
          correo: string;
          created_at: string;
          expires_at: string;
          id: string;
          intentos: number;
          usado: boolean;
        };
        Insert: {
          codigo: string;
          correo: string;
          created_at?: string;
          expires_at: string;
          id?: string;
          intentos?: number;
          usado?: boolean;
        };
        Update: {
          codigo?: string;
          correo?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          intentos?: number;
          usado?: boolean;
        };
        Relationships: [];
      };
      pagos_intentos_payway: {
        Row: {
          completed_at: string | null;
          created_at: string;
          estado_intento: string;
          id: string;
          link_id: string;
          motivo: string | null;
          pago_id: string | null;
          payway_payment_id: string | null;
          payway_status: string | null;
          site_transaction_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          estado_intento?: string;
          id?: string;
          link_id: string;
          motivo?: string | null;
          pago_id?: string | null;
          payway_payment_id?: string | null;
          payway_status?: string | null;
          site_transaction_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          estado_intento?: string;
          id?: string;
          link_id?: string;
          motivo?: string | null;
          pago_id?: string | null;
          payway_payment_id?: string | null;
          payway_status?: string | null;
          site_transaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pagos_intentos_payway_link_id_fkey";
            columns: ["link_id"];
            isOneToOne: false;
            referencedRelation: "cliente_links_pago";
            referencedColumns: ["id"];
          },
        ];
      };
      parametros_globales: {
        Row: {
          clave: string;
          descripcion: string | null;
          updated_at: string;
          valor: string;
        };
        Insert: {
          clave: string;
          descripcion?: string | null;
          updated_at?: string;
          valor: string;
        };
        Update: {
          clave?: string;
          descripcion?: string | null;
          updated_at?: string;
          valor?: string;
        };
        Relationships: [];
      };
      parametros_historial: {
        Row: {
          cambiado_at: string;
          cambiado_by: string | null;
          clave: string;
          id: string;
          valor_anterior: string | null;
          valor_nuevo: string;
        };
        Insert: {
          cambiado_at?: string;
          cambiado_by?: string | null;
          clave: string;
          id?: string;
          valor_anterior?: string | null;
          valor_nuevo: string;
        };
        Update: {
          cambiado_at?: string;
          cambiado_by?: string | null;
          clave?: string;
          id?: string;
          valor_anterior?: string | null;
          valor_nuevo?: string;
        };
        Relationships: [];
      };
      permission_modules: {
        Row: {
          code: string;
          description: string | null;
          icon: string | null;
          name: string;
          parent_code: string | null;
          sort_order: number;
        };
        Insert: {
          code: string;
          description?: string | null;
          icon?: string | null;
          name: string;
          parent_code?: string | null;
          sort_order?: number;
        };
        Update: {
          code?: string;
          description?: string | null;
          icon?: string | null;
          name?: string;
          parent_code?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "permission_modules_parent_code_fkey";
            columns: ["parent_code"];
            isOneToOne: false;
            referencedRelation: "permission_modules";
            referencedColumns: ["code"];
          },
        ];
      };
      permissions: {
        Row: {
          code: string;
          description: string | null;
          is_sensitive: boolean;
          module_code: string;
          name: string;
          sort_order: number;
        };
        Insert: {
          code: string;
          description?: string | null;
          is_sensitive?: boolean;
          module_code: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          code?: string;
          description?: string | null;
          is_sensitive?: boolean;
          module_code?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "permissions_module_code_fkey";
            columns: ["module_code"];
            isOneToOne: false;
            referencedRelation: "permission_modules";
            referencedColumns: ["code"];
          },
        ];
      };
      plaft_coincidencias: {
        Row: {
          analizada_en: string | null;
          analizada_por: string | null;
          cliente_id: string;
          cliente_nombre: string;
          estado: string;
          fecha: string;
          id: number;
          lista_dataid: string;
          lista_nombre: string;
          lista_origen: string | null;
          lista_referencia: string | null;
          lista_variante: string | null;
          observaciones: string | null;
          similitud: number;
        };
        Insert: {
          analizada_en?: string | null;
          analizada_por?: string | null;
          cliente_id: string;
          cliente_nombre: string;
          estado?: string;
          fecha?: string;
          id?: number;
          lista_dataid: string;
          lista_nombre: string;
          lista_origen?: string | null;
          lista_referencia?: string | null;
          lista_variante?: string | null;
          observaciones?: string | null;
          similitud: number;
        };
        Update: {
          analizada_en?: string | null;
          analizada_por?: string | null;
          cliente_id?: string;
          cliente_nombre?: string;
          estado?: string;
          fecha?: string;
          id?: number;
          lista_dataid?: string;
          lista_nombre?: string;
          lista_origen?: string | null;
          lista_referencia?: string | null;
          lista_variante?: string | null;
          observaciones?: string | null;
          similitud?: number;
        };
        Relationships: [];
      };
      plaft_corridas: {
        Row: {
          coincidencias_nuevas: number | null;
          duracion_ms: number | null;
          error: string | null;
          estado: string;
          fecha: string;
          id: number;
          total_clientes: number | null;
          total_lista: number | null;
          umbral: number | null;
        };
        Insert: {
          coincidencias_nuevas?: number | null;
          duracion_ms?: number | null;
          error?: string | null;
          estado: string;
          fecha?: string;
          id?: number;
          total_clientes?: number | null;
          total_lista?: number | null;
          umbral?: number | null;
        };
        Update: {
          coincidencias_nuevas?: number | null;
          duracion_ms?: number | null;
          error?: string | null;
          estado?: string;
          fecha?: string;
          id?: number;
          total_clientes?: number | null;
          total_lista?: number | null;
          umbral?: number | null;
        };
        Relationships: [];
      };
      plantillas_transferencia: {
        Row: {
          cliente_legajo: string;
          concepto: string | null;
          created_at: string;
          destinatario_alias: string | null;
          destinatario_banco: string | null;
          destinatario_cbu: string | null;
          destinatario_cuit: string | null;
          destinatario_identifier: string | null;
          destinatario_kind: string | null;
          destinatario_nombre: string | null;
          id: string;
          monto: number | null;
          nombre: string;
          subcuenta_origen: string | null;
          tipo: string;
          updated_at: string | null;
        };
        Insert: {
          cliente_legajo: string;
          concepto?: string | null;
          created_at?: string;
          destinatario_alias?: string | null;
          destinatario_banco?: string | null;
          destinatario_cbu?: string | null;
          destinatario_cuit?: string | null;
          destinatario_identifier?: string | null;
          destinatario_kind?: string | null;
          destinatario_nombre?: string | null;
          id?: string;
          monto?: number | null;
          nombre: string;
          subcuenta_origen?: string | null;
          tipo?: string;
          updated_at?: string | null;
        };
        Update: {
          cliente_legajo?: string;
          concepto?: string | null;
          created_at?: string;
          destinatario_alias?: string | null;
          destinatario_banco?: string | null;
          destinatario_cbu?: string | null;
          destinatario_cuit?: string | null;
          destinatario_identifier?: string | null;
          destinatario_kind?: string | null;
          destinatario_nombre?: string | null;
          id?: string;
          monto?: number | null;
          nombre?: string;
          subcuenta_origen?: string | null;
          tipo?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "plantillas_transferencia_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "plantillas_transferencia_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "plantillas_transferencia_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "plantillas_transferencia_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "plantillas_transferencia_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "plantillas_transferencia_subcuenta_origen_fkey";
            columns: ["subcuenta_origen"];
            isOneToOne: false;
            referencedRelation: "subaccounts";
            referencedColumns: ["id"];
          },
        ];
      };
      productos: {
        Row: {
          activo: boolean;
          cantidad: number;
          cliente_legajo: string;
          created_at: string;
          descripcion: string | null;
          id: string;
          imagen_url: string | null;
          moneda: string;
          nombre: string;
          precio: number;
          sku: string | null;
        };
        Insert: {
          activo?: boolean;
          cantidad?: number;
          cliente_legajo: string;
          created_at?: string;
          descripcion?: string | null;
          id?: string;
          imagen_url?: string | null;
          moneda?: string;
          nombre: string;
          precio?: number;
          sku?: string | null;
        };
        Update: {
          activo?: boolean;
          cantidad?: number;
          cliente_legajo?: string;
          created_at?: string;
          descripcion?: string | null;
          id?: string;
          imagen_url?: string | null;
          moneda?: string;
          nombre?: string;
          precio?: number;
          sku?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "productos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "productos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "productos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "productos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "productos_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
        ];
      };
      puntos_venta: {
        Row: {
          comercio_id: string;
          created_at: string;
          estado: string;
          id: string;
          nombre: string;
        };
        Insert: {
          comercio_id: string;
          created_at?: string;
          estado: string;
          id?: string;
          nombre: string;
        };
        Update: {
          comercio_id?: string;
          created_at?: string;
          estado?: string;
          id?: string;
          nombre?: string;
        };
        Relationships: [
          {
            foreignKeyName: "puntos_venta_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "puntos_venta_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
        ];
      };
      rbac_audit_log: {
        Row: {
          actor_id: string | null;
          after_data: Json | null;
          before_data: Json | null;
          created_at: string;
          event: string | null;
          id: string;
          operation: string;
          row_id: string | null;
          table_name: string;
        };
        Insert: {
          actor_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          event?: string | null;
          id?: string;
          operation: string;
          row_id?: string | null;
          table_name: string;
        };
        Update: {
          actor_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          event?: string | null;
          id?: string;
          operation?: string;
          row_id?: string | null;
          table_name?: string;
        };
        Relationships: [];
      };
      rbac_legacy_permission_map: {
        Row: {
          action: string;
          permission_code: string;
          resource: string;
        };
        Insert: {
          action: string;
          permission_code: string;
          resource: string;
        };
        Update: {
          action?: string;
          permission_code?: string;
          resource?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rbac_legacy_permission_map_permission_code_fkey";
            columns: ["permission_code"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["code"];
          },
        ];
      };
      resolvers: {
        Row: {
          as_header: boolean;
          created_at: string;
          cuit: string;
          estado: string;
          formato_web: string | null;
          id: string;
          id_pcp: string | null;
          nombre: string;
          nombre_reverso: string | null;
          pcp_id: string | null;
          soa: boolean;
          token: string | null;
          updated_at: string;
          url: string;
        };
        Insert: {
          as_header?: boolean;
          created_at?: string;
          cuit: string;
          estado: string;
          formato_web?: string | null;
          id?: string;
          id_pcp?: string | null;
          nombre: string;
          nombre_reverso?: string | null;
          pcp_id?: string | null;
          soa?: boolean;
          token?: string | null;
          updated_at?: string;
          url: string;
        };
        Update: {
          as_header?: boolean;
          created_at?: string;
          cuit?: string;
          estado?: string;
          formato_web?: string | null;
          id?: string;
          id_pcp?: string | null;
          nombre?: string;
          nombre_reverso?: string | null;
          pcp_id?: string | null;
          soa?: boolean;
          token?: string | null;
          updated_at?: string;
          url?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          permission_code: string;
          role_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          permission_code: string;
          role_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          permission_code?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_code_fkey";
            columns: ["permission_code"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_superadmin: boolean;
          is_system: boolean;
          name: string;
          permissions_version: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_superadmin?: boolean;
          is_system?: boolean;
          name: string;
          permissions_version?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_superadmin?: boolean;
          is_system?: boolean;
          name?: string;
          permissions_version?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      rpc_debug_log: {
        Row: {
          comercio_id: string | null;
          created_at: string;
          id: number;
          legajo: string | null;
          nota: string | null;
          op: string;
          payload: Json | null;
          request_id: string | null;
          row_id: string | null;
          source_table: string;
        };
        Insert: {
          comercio_id?: string | null;
          created_at?: string;
          id?: number;
          legajo?: string | null;
          nota?: string | null;
          op: string;
          payload?: Json | null;
          request_id?: string | null;
          row_id?: string | null;
          source_table: string;
        };
        Update: {
          comercio_id?: string | null;
          created_at?: string;
          id?: number;
          legajo?: string | null;
          nota?: string | null;
          op?: string;
          payload?: Json | null;
          request_id?: string | null;
          row_id?: string | null;
          source_table?: string;
        };
        Relationships: [];
      };
      security_event_types: {
        Row: {
          action: string;
          category: string;
          customer_visible: boolean;
          default_severity: string;
          description: string;
          is_enabled: boolean;
          label: string;
        };
        Insert: {
          action: string;
          category: string;
          customer_visible?: boolean;
          default_severity: string;
          description: string;
          is_enabled?: boolean;
          label: string;
        };
        Update: {
          action?: string;
          category?: string;
          customer_visible?: boolean;
          default_severity?: string;
          description?: string;
          is_enabled?: boolean;
          label?: string;
        };
        Relationships: [];
      };
      security_events: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_type: string;
          category: string;
          id: number;
          ip: unknown;
          metadata: Json;
          occurred_at: string;
          outcome: string;
          request_id: string | null;
          severity: string;
          source: string;
          target_id: string | null;
          target_type: string | null;
          target_user_id: string | null;
          tenant_id: string | null;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_type: string;
          category: string;
          id?: never;
          ip?: unknown;
          metadata?: Json;
          occurred_at?: string;
          outcome: string;
          request_id?: string | null;
          severity: string;
          source: string;
          target_id?: string | null;
          target_type?: string | null;
          target_user_id?: string | null;
          tenant_id?: string | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_type?: string;
          category?: string;
          id?: never;
          ip?: unknown;
          metadata?: Json;
          occurred_at?: string;
          outcome?: string;
          request_id?: string | null;
          severity?: string;
          source?: string;
          target_id?: string | null;
          target_type?: string | null;
          target_user_id?: string | null;
          tenant_id?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "security_events_action_fkey";
            columns: ["action"];
            isOneToOne: false;
            referencedRelation: "security_event_types";
            referencedColumns: ["action"];
          },
        ];
      };
      subaccount_balances: {
        Row: {
          saldo_conciliado: number;
          saldo_disponible: number;
          saldo_retenido: number;
          subaccount_id: string;
          updated_at: string;
        };
        Insert: {
          saldo_conciliado?: number;
          saldo_disponible?: number;
          saldo_retenido?: number;
          subaccount_id: string;
          updated_at?: string;
        };
        Update: {
          saldo_conciliado?: number;
          saldo_disponible?: number;
          saldo_retenido?: number;
          subaccount_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subaccount_balances_subaccount_id_fkey";
            columns: ["subaccount_id"];
            isOneToOne: true;
            referencedRelation: "subaccounts";
            referencedColumns: ["id"];
          },
        ];
      };
      subaccounts: {
        Row: {
          apellido: string;
          cbu: string | null;
          cliente_legajo: string;
          configuracion: Json;
          created_at: string;
          egresos: string | null;
          email: string;
          estado: string;
          id: string;
          ingresos: string | null;
          limite: string | null;
          nombre: string;
          responsable: string | null;
          retiros_habilitados: boolean;
          tipo: string;
          updated_at: string;
          validada: boolean;
        };
        Insert: {
          apellido?: string;
          cbu?: string | null;
          cliente_legajo: string;
          configuracion?: Json;
          created_at?: string;
          egresos?: string | null;
          email?: string;
          estado?: string;
          id?: string;
          ingresos?: string | null;
          limite?: string | null;
          nombre?: string;
          responsable?: string | null;
          retiros_habilitados?: boolean;
          tipo?: string;
          updated_at?: string;
          validada?: boolean;
        };
        Update: {
          apellido?: string;
          cbu?: string | null;
          cliente_legajo?: string;
          configuracion?: Json;
          created_at?: string;
          egresos?: string | null;
          email?: string;
          estado?: string;
          id?: string;
          ingresos?: string | null;
          limite?: string | null;
          nombre?: string;
          responsable?: string | null;
          retiros_habilitados?: boolean;
          tipo?: string;
          updated_at?: string;
          validada?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "subaccounts_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "subaccounts_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "subaccounts_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "subaccounts_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "subaccounts_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
        ];
      };
      tax_assignments: {
        Row: {
          assigned_at: string;
          client_legajo: string;
          custom_calculation_type: string | null;
          custom_rate: number | null;
          id: string;
          operation_type: string | null;
          status: string;
          tax_id: string;
          updated_at: string;
        };
        Insert: {
          assigned_at?: string;
          client_legajo: string;
          custom_calculation_type?: string | null;
          custom_rate?: number | null;
          id?: string;
          operation_type?: string | null;
          status: string;
          tax_id: string;
          updated_at?: string;
        };
        Update: {
          assigned_at?: string;
          client_legajo?: string;
          custom_calculation_type?: string | null;
          custom_rate?: number | null;
          id?: string;
          operation_type?: string | null;
          status?: string;
          tax_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tax_assignments_client_legajo_fkey";
            columns: ["client_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "tax_assignments_client_legajo_fkey";
            columns: ["client_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "tax_assignments_client_legajo_fkey";
            columns: ["client_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "tax_assignments_client_legajo_fkey";
            columns: ["client_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "tax_assignments_client_legajo_fkey";
            columns: ["client_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "tax_assignments_tax_id_fkey";
            columns: ["tax_id"];
            isOneToOne: false;
            referencedRelation: "taxes";
            referencedColumns: ["id"];
          },
        ];
      };
      tax_exemptions: {
        Row: {
          authorization_code: string | null;
          certificate_path: string | null;
          client_legajo: string | null;
          contact_email: string | null;
          created_at: string;
          created_by: string | null;
          cuit: string;
          deactivated_at: string | null;
          deactivated_by: string | null;
          deactivation_reason: string | null;
          direction: string;
          exemption_type: string;
          id: string;
          reason: string | null;
          status: string;
          tax_id: string;
          updated_at: string;
          updated_by: string | null;
          valid_from: string;
          valid_to: string | null;
        };
        Insert: {
          authorization_code?: string | null;
          certificate_path?: string | null;
          client_legajo?: string | null;
          contact_email?: string | null;
          created_at?: string;
          created_by?: string | null;
          cuit: string;
          deactivated_at?: string | null;
          deactivated_by?: string | null;
          deactivation_reason?: string | null;
          direction: string;
          exemption_type?: string;
          id?: string;
          reason?: string | null;
          status?: string;
          tax_id: string;
          updated_at?: string;
          updated_by?: string | null;
          valid_from?: string;
          valid_to?: string | null;
        };
        Update: {
          authorization_code?: string | null;
          certificate_path?: string | null;
          client_legajo?: string | null;
          contact_email?: string | null;
          created_at?: string;
          created_by?: string | null;
          cuit?: string;
          deactivated_at?: string | null;
          deactivated_by?: string | null;
          deactivation_reason?: string | null;
          direction?: string;
          exemption_type?: string;
          id?: string;
          reason?: string | null;
          status?: string;
          tax_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          valid_from?: string;
          valid_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tax_exemptions_client_legajo_fkey";
            columns: ["client_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "tax_exemptions_client_legajo_fkey";
            columns: ["client_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "tax_exemptions_client_legajo_fkey";
            columns: ["client_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "tax_exemptions_client_legajo_fkey";
            columns: ["client_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "tax_exemptions_client_legajo_fkey";
            columns: ["client_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "tax_exemptions_tax_id_fkey";
            columns: ["tax_id"];
            isOneToOne: false;
            referencedRelation: "taxes";
            referencedColumns: ["id"];
          },
        ];
      };
      tax_filing_items: {
        Row: {
          amount: number;
          business_name: string | null;
          client_legajo: string;
          cuit: string;
          filing_id: string;
          id: number;
          kind: string;
          normalization_item_id: string | null;
          operation_date: string;
          rate: number;
          taxable_base: number;
          transaction_id: string;
          transaction_tax_id: string | null;
        };
        Insert: {
          amount: number;
          business_name?: string | null;
          client_legajo: string;
          cuit: string;
          filing_id: string;
          id?: never;
          kind: string;
          normalization_item_id?: string | null;
          operation_date: string;
          rate: number;
          taxable_base: number;
          transaction_id: string;
          transaction_tax_id?: string | null;
        };
        Update: {
          amount?: number;
          business_name?: string | null;
          client_legajo?: string;
          cuit?: string;
          filing_id?: string;
          id?: never;
          kind?: string;
          normalization_item_id?: string | null;
          operation_date?: string;
          rate?: number;
          taxable_base?: number;
          transaction_id?: string;
          transaction_tax_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tax_filing_items_filing_id_fkey";
            columns: ["filing_id"];
            isOneToOne: false;
            referencedRelation: "tax_filings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tax_filing_items_normalization_item_id_fkey";
            columns: ["normalization_item_id"];
            isOneToOne: false;
            referencedRelation: "tax_normalization_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tax_filing_items_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tax_filing_items_transaction_tax_id_fkey";
            columns: ["transaction_tax_id"];
            isOneToOne: false;
            referencedRelation: "transaction_taxes";
            referencedColumns: ["id"];
          },
        ];
      };
      tax_filings: {
        Row: {
          content_hash: string;
          due_date: string | null;
          file_type: string;
          filed_at: string | null;
          filed_by: string | null;
          generated_at: string;
          generated_by: string | null;
          id: string;
          paid_at: string | null;
          paid_by: string | null;
          payment_reference: string | null;
          period: string;
          record_count: number;
          segment: number;
          segment_from: string;
          segment_to: string;
          status: string;
          tax_id: string;
          total_amount: number;
          total_base: number;
          version: number;
        };
        Insert: {
          content_hash: string;
          due_date?: string | null;
          file_type: string;
          filed_at?: string | null;
          filed_by?: string | null;
          generated_at?: string;
          generated_by?: string | null;
          id?: string;
          paid_at?: string | null;
          paid_by?: string | null;
          payment_reference?: string | null;
          period: string;
          record_count?: number;
          segment: number;
          segment_from: string;
          segment_to: string;
          status: string;
          tax_id: string;
          total_amount?: number;
          total_base?: number;
          version: number;
        };
        Update: {
          content_hash?: string;
          due_date?: string | null;
          file_type?: string;
          filed_at?: string | null;
          filed_by?: string | null;
          generated_at?: string;
          generated_by?: string | null;
          id?: string;
          paid_at?: string | null;
          paid_by?: string | null;
          payment_reference?: string | null;
          period?: string;
          record_count?: number;
          segment?: number;
          segment_from?: string;
          segment_to?: string;
          status?: string;
          tax_id?: string;
          total_amount?: number;
          total_base?: number;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tax_filings_tax_id_fkey";
            columns: ["tax_id"];
            isOneToOne: false;
            referencedRelation: "taxes";
            referencedColumns: ["id"];
          },
        ];
      };
      tax_normalization_items: {
        Row: {
          business_name: string | null;
          client_legajo: string;
          cuit: string | null;
          delta: number;
          id: string;
          new_amount: number;
          new_rate: number;
          old_amount: number;
          old_rate: number;
          operation_date: string;
          run_id: string;
          taxable_base: number;
          transaction_id: string;
          transaction_tax_id: string;
        };
        Insert: {
          business_name?: string | null;
          client_legajo: string;
          cuit?: string | null;
          delta: number;
          id?: string;
          new_amount: number;
          new_rate: number;
          old_amount: number;
          old_rate: number;
          operation_date: string;
          run_id: string;
          taxable_base: number;
          transaction_id: string;
          transaction_tax_id: string;
        };
        Update: {
          business_name?: string | null;
          client_legajo?: string;
          cuit?: string | null;
          delta?: number;
          id?: string;
          new_amount?: number;
          new_rate?: number;
          old_amount?: number;
          old_rate?: number;
          operation_date?: string;
          run_id?: string;
          taxable_base?: number;
          transaction_id?: string;
          transaction_tax_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tax_normalization_items_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "tax_normalization_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tax_normalization_items_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tax_normalization_items_transaction_tax_id_fkey";
            columns: ["transaction_tax_id"];
            isOneToOne: false;
            referencedRelation: "transaction_taxes";
            referencedColumns: ["id"];
          },
        ];
      };
      tax_normalization_runs: {
        Row: {
          applied_at: string | null;
          applied_by: string | null;
          clients_count: number;
          created_at: string;
          created_by: string | null;
          date_from: string;
          date_to: string;
          discarded_at: string | null;
          id: string;
          operations_count: number;
          period: string;
          registry_id: string;
          status: string;
          tax_id: string;
          total_base: number;
          total_delta: number;
        };
        Insert: {
          applied_at?: string | null;
          applied_by?: string | null;
          clients_count?: number;
          created_at?: string;
          created_by?: string | null;
          date_from: string;
          date_to: string;
          discarded_at?: string | null;
          id?: string;
          operations_count?: number;
          period: string;
          registry_id: string;
          status?: string;
          tax_id: string;
          total_base?: number;
          total_delta?: number;
        };
        Update: {
          applied_at?: string | null;
          applied_by?: string | null;
          clients_count?: number;
          created_at?: string;
          created_by?: string | null;
          date_from?: string;
          date_to?: string;
          discarded_at?: string | null;
          id?: string;
          operations_count?: number;
          period?: string;
          registry_id?: string;
          status?: string;
          tax_id?: string;
          total_base?: number;
          total_delta?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tax_normalization_runs_registry_id_fkey";
            columns: ["registry_id"];
            isOneToOne: false;
            referencedRelation: "taxpayer_registries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tax_normalization_runs_tax_id_fkey";
            columns: ["tax_id"];
            isOneToOne: false;
            referencedRelation: "taxes";
            referencedColumns: ["id"];
          },
        ];
      };
      tax_rates: {
        Row: {
          calculation_type: string;
          code: string;
          created_at: string;
          description: string | null;
          direction: string;
          id: string;
          status: string;
          tax_id: string;
          updated_at: string;
          valid_from: string;
          valid_to: string | null;
          value: number;
        };
        Insert: {
          calculation_type?: string;
          code: string;
          created_at?: string;
          description?: string | null;
          direction?: string;
          id?: string;
          status?: string;
          tax_id: string;
          updated_at?: string;
          valid_from?: string;
          valid_to?: string | null;
          value: number;
        };
        Update: {
          calculation_type?: string;
          code?: string;
          created_at?: string;
          description?: string | null;
          direction?: string;
          id?: string;
          status?: string;
          tax_id?: string;
          updated_at?: string;
          valid_from?: string;
          valid_to?: string | null;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tax_rates_tax_id_fkey";
            columns: ["tax_id"];
            isOneToOne: false;
            referencedRelation: "taxes";
            referencedColumns: ["id"];
          },
        ];
      };
      taxes: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          rate_source: string;
          reporting_period_days: number | null;
          scope: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          rate_source?: string;
          reporting_period_days?: number | null;
          scope?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          rate_source?: string;
          reporting_period_days?: number | null;
          scope?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      taxpayer_registries: {
        Row: {
          authority: string | null;
          confirmed_at: string | null;
          confirmed_by: string | null;
          created_at: string;
          created_by: string | null;
          error_message: string | null;
          file_name: string | null;
          id: string;
          issued_on: string | null;
          name: string;
          period: string | null;
          progress: number;
          replaced_by: string | null;
          rows_duplicated: number;
          rows_failed: number;
          rows_read: number;
          rows_valid: number;
          status: string;
          summary: Json | null;
          tax_id: string | null;
          valid_from: string | null;
          valid_to: string | null;
        };
        Insert: {
          authority?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          error_message?: string | null;
          file_name?: string | null;
          id?: string;
          issued_on?: string | null;
          name: string;
          period?: string | null;
          progress?: number;
          replaced_by?: string | null;
          rows_duplicated?: number;
          rows_failed?: number;
          rows_read?: number;
          rows_valid?: number;
          status: string;
          summary?: Json | null;
          tax_id?: string | null;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Update: {
          authority?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          error_message?: string | null;
          file_name?: string | null;
          id?: string;
          issued_on?: string | null;
          name?: string;
          period?: string | null;
          progress?: number;
          replaced_by?: string | null;
          rows_duplicated?: number;
          rows_failed?: number;
          rows_read?: number;
          rows_valid?: number;
          status?: string;
          summary?: Json | null;
          tax_id?: string | null;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "taxpayer_registries_replaced_by_fkey";
            columns: ["replaced_by"];
            isOneToOne: false;
            referencedRelation: "taxpayer_registries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "taxpayer_registries_tax_id_fkey";
            columns: ["tax_id"];
            isOneToOne: false;
            referencedRelation: "taxes";
            referencedColumns: ["id"];
          },
        ];
      };
      taxpayer_registry_entries: {
        Row: {
          business_name: string;
          control_code_1: string | null;
          control_code_2: string | null;
          cuit: string;
          is_exempt: boolean | null;
          is_subject: boolean | null;
          line_no: number | null;
          perception_rate: number;
          regime_type: string | null;
          registry_id: string;
          withholding_rate: number;
        };
        Insert: {
          business_name?: string;
          control_code_1?: string | null;
          control_code_2?: string | null;
          cuit: string;
          is_exempt?: boolean | null;
          is_subject?: boolean | null;
          line_no?: number | null;
          perception_rate?: number;
          regime_type?: string | null;
          registry_id: string;
          withholding_rate?: number;
        };
        Update: {
          business_name?: string;
          control_code_1?: string | null;
          control_code_2?: string | null;
          cuit?: string;
          is_exempt?: boolean | null;
          is_subject?: boolean | null;
          line_no?: number | null;
          perception_rate?: number;
          regime_type?: string | null;
          registry_id?: string;
          withholding_rate?: number;
        };
        Relationships: [
          {
            foreignKeyName: "taxpayer_registry_entries_registry_id_fkey";
            columns: ["registry_id"];
            isOneToOne: false;
            referencedRelation: "taxpayer_registries";
            referencedColumns: ["id"];
          },
        ];
      };
      taxpayer_registry_errors: {
        Row: {
          id: number;
          line_no: number | null;
          raw_line: string | null;
          reason: string;
          registry_id: string;
        };
        Insert: {
          id?: number;
          line_no?: number | null;
          raw_line?: string | null;
          reason: string;
          registry_id: string;
        };
        Update: {
          id?: number;
          line_no?: number | null;
          raw_line?: string | null;
          reason?: string;
          registry_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "taxpayer_registry_errors_registry_id_fkey";
            columns: ["registry_id"];
            isOneToOne: false;
            referencedRelation: "taxpayer_registries";
            referencedColumns: ["id"];
          },
        ];
      };
      tipos_movimiento: {
        Row: {
          codigo: string;
          created_at: string;
          id: string;
          nombre: string;
          requiere_bandera: boolean;
          requiere_comercio: boolean;
          updated_at: string;
        };
        Insert: {
          codigo: string;
          created_at?: string;
          id?: string;
          nombre: string;
          requiere_bandera?: boolean;
          requiere_comercio?: boolean;
          updated_at?: string;
        };
        Update: {
          codigo?: string;
          created_at?: string;
          id?: string;
          nombre?: string;
          requiere_bandera?: boolean;
          requiere_comercio?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      transaction_status_history: {
        Row: {
          admin_user_id: string | null;
          comentario: string | null;
          estado_anterior_id: number | null;
          estado_nuevo_id: number;
          fecha: string;
          id: string;
          origen: string;
          transaction_id: string;
        };
        Insert: {
          admin_user_id?: string | null;
          comentario?: string | null;
          estado_anterior_id?: number | null;
          estado_nuevo_id: number;
          fecha?: string;
          id?: string;
          origen: string;
          transaction_id: string;
        };
        Update: {
          admin_user_id?: string | null;
          comentario?: string | null;
          estado_anterior_id?: number | null;
          estado_nuevo_id?: number;
          fecha?: string;
          id?: string;
          origen?: string;
          transaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_status_history_admin_user_id_fkey";
            columns: ["admin_user_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_status_history_admin_user_id_fkey";
            columns: ["admin_user_id"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_status_history_estado_anterior_id_fkey";
            columns: ["estado_anterior_id"];
            isOneToOne: false;
            referencedRelation: "estados_movimiento";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_status_history_estado_nuevo_id_fkey";
            columns: ["estado_nuevo_id"];
            isOneToOne: false;
            referencedRelation: "estados_movimiento";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_status_history_movimiento_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      transaction_taxes: {
        Row: {
          amount: number;
          assignment_id: string | null;
          calculation_type: string;
          created_at: string;
          direction: string;
          exemption_id: string | null;
          id: string;
          note: string | null;
          rate: number;
          rate_code: string | null;
          rate_source: string;
          registry_id: string | null;
          tax_code: string;
          tax_id: string;
          taxable_base: number;
          transaction_id: string;
        };
        Insert: {
          amount: number;
          assignment_id?: string | null;
          calculation_type: string;
          created_at?: string;
          direction: string;
          exemption_id?: string | null;
          id?: string;
          note?: string | null;
          rate: number;
          rate_code?: string | null;
          rate_source: string;
          registry_id?: string | null;
          tax_code: string;
          tax_id: string;
          taxable_base: number;
          transaction_id: string;
        };
        Update: {
          amount?: number;
          assignment_id?: string | null;
          calculation_type?: string;
          created_at?: string;
          direction?: string;
          exemption_id?: string | null;
          id?: string;
          note?: string | null;
          rate?: number;
          rate_code?: string | null;
          rate_source?: string;
          registry_id?: string | null;
          tax_code?: string;
          tax_id?: string;
          taxable_base?: number;
          transaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_taxes_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "tax_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_taxes_exemption_id_fkey";
            columns: ["exemption_id"];
            isOneToOne: false;
            referencedRelation: "tax_exemptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_taxes_registry_id_fkey";
            columns: ["registry_id"];
            isOneToOne: false;
            referencedRelation: "taxpayer_registries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_taxes_tax_id_fkey";
            columns: ["tax_id"];
            isOneToOne: false;
            referencedRelation: "taxes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_taxes_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          bandera: string | null;
          bandera_id: string | null;
          canal: string | null;
          cliente_id: string;
          comercio_id: string | null;
          comision: number;
          created_at: string;
          cuotas: number | null;
          currency_code: string;
          cvu: string | null;
          destinatario_banco: string | null;
          destinatario_cuit: string | null;
          destinatario_nombre: string | null;
          estado_id: number;
          fecha: string;
          held_block_id: string | null;
          id: string;
          id_txn: string;
          impuesto: number;
          ledger_status: string;
          legajo: string;
          monto_cobrado: number;
          monto_operacion: number;
          site_transaction_id: string | null;
          subcuenta_id: string | null;
          tax_amount: number;
          tipo: string;
        };
        Insert: {
          bandera?: string | null;
          bandera_id?: string | null;
          canal?: string | null;
          cliente_id: string;
          comercio_id?: string | null;
          comision: number;
          created_at?: string;
          cuotas?: number | null;
          currency_code?: string;
          cvu?: string | null;
          destinatario_banco?: string | null;
          destinatario_cuit?: string | null;
          destinatario_nombre?: string | null;
          estado_id: number;
          fecha?: string;
          held_block_id?: string | null;
          id?: string;
          id_txn: string;
          impuesto: number;
          ledger_status?: string;
          legajo: string;
          monto_cobrado: number;
          monto_operacion: number;
          site_transaction_id?: string | null;
          subcuenta_id?: string | null;
          tax_amount?: number;
          tipo: string;
        };
        Update: {
          bandera?: string | null;
          bandera_id?: string | null;
          canal?: string | null;
          cliente_id?: string;
          comercio_id?: string | null;
          comision?: number;
          created_at?: string;
          cuotas?: number | null;
          currency_code?: string;
          cvu?: string | null;
          destinatario_banco?: string | null;
          destinatario_cuit?: string | null;
          destinatario_nombre?: string | null;
          estado_id?: number;
          fecha?: string;
          held_block_id?: string | null;
          id?: string;
          id_txn?: string;
          impuesto?: number;
          ledger_status?: string;
          legajo?: string;
          monto_cobrado?: number;
          monto_operacion?: number;
          site_transaction_id?: string | null;
          subcuenta_id?: string | null;
          tax_amount?: number;
          tipo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_bandera_id_fkey";
            columns: ["bandera_id"];
            isOneToOne: false;
            referencedRelation: "banderas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
          {
            foreignKeyName: "transactions_estado_id_fkey";
            columns: ["estado_id"];
            isOneToOne: false;
            referencedRelation: "estados_movimiento";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_held_block_id_fkey";
            columns: ["held_block_id"];
            isOneToOne: false;
            referencedRelation: "account_blocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_held_block_id_fkey";
            columns: ["held_block_id"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_legajo_fkey";
            columns: ["legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transactions_legajo_fkey";
            columns: ["legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transactions_legajo_fkey";
            columns: ["legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transactions_legajo_fkey";
            columns: ["legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transactions_legajo_fkey";
            columns: ["legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transactions_subcuenta_id_fkey";
            columns: ["subcuenta_id"];
            isOneToOne: false;
            referencedRelation: "subaccounts";
            referencedColumns: ["id"];
          },
        ];
      };
      transferencias_borrador: {
        Row: {
          cliente_legajo: string;
          concepto: string | null;
          created_at: string;
          destinatario_alias: string | null;
          destinatario_banco: string | null;
          destinatario_cbu: string | null;
          destinatario_cuit: string | null;
          destinatario_identifier: string;
          destinatario_kind: string;
          destinatario_nombre: string | null;
          id: string;
          monto: number;
          subcuenta_origen: string | null;
        };
        Insert: {
          cliente_legajo: string;
          concepto?: string | null;
          created_at?: string;
          destinatario_alias?: string | null;
          destinatario_banco?: string | null;
          destinatario_cbu?: string | null;
          destinatario_cuit?: string | null;
          destinatario_identifier: string;
          destinatario_kind: string;
          destinatario_nombre?: string | null;
          id?: string;
          monto: number;
          subcuenta_origen?: string | null;
        };
        Update: {
          cliente_legajo?: string;
          concepto?: string | null;
          created_at?: string;
          destinatario_alias?: string | null;
          destinatario_banco?: string | null;
          destinatario_cbu?: string | null;
          destinatario_cuit?: string | null;
          destinatario_identifier?: string;
          destinatario_kind?: string;
          destinatario_nombre?: string | null;
          id?: string;
          monto?: number;
          subcuenta_origen?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transferencias_borrador_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transferencias_borrador_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transferencias_borrador_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transferencias_borrador_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transferencias_borrador_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transferencias_borrador_subcuenta_origen_fkey";
            columns: ["subcuenta_origen"];
            isOneToOne: false;
            referencedRelation: "subaccounts";
            referencedColumns: ["id"];
          },
        ];
      };
      transferencias_programadas: {
        Row: {
          actualizado_at: string | null;
          cliente_legajo: string;
          concepto: string | null;
          created_at: string;
          destinatario_alias: string | null;
          destinatario_banco: string | null;
          destinatario_cbu: string | null;
          destinatario_cuit: string | null;
          destinatario_identifier: string;
          destinatario_kind: string;
          destinatario_nombre: string | null;
          estado: string;
          fecha_envio: string;
          hora_envio: string;
          id: string;
          monto: number;
          subcuenta_origen: string | null;
        };
        Insert: {
          actualizado_at?: string | null;
          cliente_legajo: string;
          concepto?: string | null;
          created_at?: string;
          destinatario_alias?: string | null;
          destinatario_banco?: string | null;
          destinatario_cbu?: string | null;
          destinatario_cuit?: string | null;
          destinatario_identifier: string;
          destinatario_kind: string;
          destinatario_nombre?: string | null;
          estado?: string;
          fecha_envio: string;
          hora_envio: string;
          id?: string;
          monto: number;
          subcuenta_origen?: string | null;
        };
        Update: {
          actualizado_at?: string | null;
          cliente_legajo?: string;
          concepto?: string | null;
          created_at?: string;
          destinatario_alias?: string | null;
          destinatario_banco?: string | null;
          destinatario_cbu?: string | null;
          destinatario_cuit?: string | null;
          destinatario_identifier?: string;
          destinatario_kind?: string;
          destinatario_nombre?: string | null;
          estado?: string;
          fecha_envio?: string;
          hora_envio?: string;
          id?: string;
          monto?: number;
          subcuenta_origen?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transferencias_programadas_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transferencias_programadas_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transferencias_programadas_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transferencias_programadas_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transferencias_programadas_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transferencias_programadas_subcuenta_origen_fkey";
            columns: ["subcuenta_origen"];
            isOneToOne: false;
            referencedRelation: "subaccounts";
            referencedColumns: ["id"];
          },
        ];
      };
      validaciones: {
        Row: {
          cliente_legajo: string;
          created_at: string;
          estado: string;
          fecha: string;
          id: string;
          proveedor: string;
        };
        Insert: {
          cliente_legajo: string;
          created_at?: string;
          estado: string;
          fecha?: string;
          id?: string;
          proveedor: string;
        };
        Update: {
          cliente_legajo?: string;
          created_at?: string;
          estado?: string;
          fecha?: string;
          id?: string;
          proveedor?: string;
        };
        Relationships: [
          {
            foreignKeyName: "validaciones_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "validaciones_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "validaciones_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "validaciones_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "validaciones_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
        ];
      };
      verificaciones_correo: {
        Row: {
          correo: string;
          created_at: string;
          expires_at: string;
          token: string;
          usado: boolean;
          user_id: string;
        };
        Insert: {
          correo: string;
          created_at?: string;
          expires_at: string;
          token: string;
          usado?: boolean;
          user_id: string;
        };
        Update: {
          correo?: string;
          created_at?: string;
          expires_at?: string;
          token?: string;
          usado?: boolean;
          user_id?: string;
        };
        Relationships: [];
      };
      webhook_config: {
        Row: {
          activo: boolean;
          ambiente: string;
          comercio_id: string;
          created_at: string;
          eventos_suscritos: string[];
          id: string;
          secret_cifrado: string;
          secret_ultimos4: string;
          updated_at: string;
          url_callback: string;
        };
        Insert: {
          activo?: boolean;
          ambiente: string;
          comercio_id: string;
          created_at?: string;
          eventos_suscritos: string[];
          id?: string;
          secret_cifrado: string;
          secret_ultimos4: string;
          updated_at?: string;
          url_callback: string;
        };
        Update: {
          activo?: boolean;
          ambiente?: string;
          comercio_id?: string;
          created_at?: string;
          eventos_suscritos?: string[];
          id?: string;
          secret_cifrado?: string;
          secret_ultimos4?: string;
          updated_at?: string;
          url_callback?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_config_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "webhook_config_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
        ];
      };
      webhook_logs: {
        Row: {
          ambiente: string;
          comercio_id: string;
          created_at: string;
          es_prueba: boolean;
          estado: string;
          evento: string;
          id: string;
          intento: number;
          latencia_ms: number | null;
          lease_hasta: string | null;
          payload: Json;
          proximo_reintento: string | null;
          respuesta_body: string | null;
          respuesta_http_status: number | null;
          ultimo_error: string | null;
          updated_at: string;
          webhook_id: string;
        };
        Insert: {
          ambiente: string;
          comercio_id: string;
          created_at?: string;
          es_prueba?: boolean;
          estado?: string;
          evento: string;
          id?: string;
          intento?: number;
          latencia_ms?: number | null;
          lease_hasta?: string | null;
          payload: Json;
          proximo_reintento?: string | null;
          respuesta_body?: string | null;
          respuesta_http_status?: number | null;
          ultimo_error?: string | null;
          updated_at?: string;
          webhook_id: string;
        };
        Update: {
          ambiente?: string;
          comercio_id?: string;
          created_at?: string;
          es_prueba?: boolean;
          estado?: string;
          evento?: string;
          id?: string;
          intento?: number;
          latencia_ms?: number | null;
          lease_hasta?: string | null;
          payload?: Json;
          proximo_reintento?: string | null;
          respuesta_body?: string | null;
          respuesta_http_status?: number | null;
          ultimo_error?: string | null;
          updated_at?: string;
          webhook_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey";
            columns: ["webhook_id"];
            isOneToOne: false;
            referencedRelation: "webhook_config";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      admin_users: {
        Row: {
          activo: boolean | null;
          created_at: string | null;
          email: string | null;
          id: string | null;
          legajo: string | null;
          nombre: string | null;
          rol_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          activo?: boolean | null;
          created_at?: string | null;
          email?: string | null;
          id?: string | null;
          legajo?: string | null;
          nombre?: string | null;
          rol_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          activo?: boolean | null;
          created_at?: string | null;
          email?: string | null;
          id?: string | null;
          legajo?: string | null;
          nombre?: string | null;
          rol_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "backoffice_users_role_id_fkey";
            columns: ["rol_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      auditoria_legajos: {
        Row: {
          fecha: string | null;
          id_txn: string | null;
          legajo: string | null;
          observacion: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_legajo_fkey";
            columns: ["legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transactions_legajo_fkey";
            columns: ["legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transactions_legajo_fkey";
            columns: ["legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transactions_legajo_fkey";
            columns: ["legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transactions_legajo_fkey";
            columns: ["legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
        ];
      };
      v_account_blocks: {
        Row: {
          accepted_at: string | null;
          accepted_by_name: string | null;
          alert_id: string | null;
          block_status: string | null;
          blocked_at: string | null;
          blocked_by_name: string | null;
          client_id: string | null;
          compliance_status: string | null;
          correo: string | null;
          held_amount: number | null;
          id: string | null;
          id_txn: string | null;
          legajo: string | null;
          nombre: string | null;
          origin: string | null;
          reason: string | null;
          release_notes: string | null;
          released_at: string | null;
          released_by_name: string | null;
          rule_id: string | null;
          rule_name: string | null;
          scope: string | null;
          subaccount_id: string | null;
          subcuenta_cvu: string | null;
          subcuenta_nombre: string | null;
          transaction_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "account_blocks_alert_id_fkey";
            columns: ["alert_id"];
            isOneToOne: false;
            referencedRelation: "alerts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_blocks_alert_id_fkey";
            columns: ["alert_id"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_blocks_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_blocks_rule_id_fkey";
            columns: ["rule_id"];
            isOneToOne: false;
            referencedRelation: "alert_rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_blocks_subaccount_id_fkey";
            columns: ["subaccount_id"];
            isOneToOne: false;
            referencedRelation: "subaccounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_blocks_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      v_adelantos: {
        Row: {
          aceptado_at: string | null;
          acreditado_tx_id: string | null;
          comercio_id: string | null;
          comercio_legajo: string | null;
          comercio_nombre: string | null;
          compensado: number | null;
          created_at: string | null;
          descuento: number | null;
          estado: string | null;
          estado_etiqueta: string | null;
          fecha_acreditacion: string | null;
          fecha_resolucion: string | null;
          fecha_solicitud: string | null;
          id: string | null;
          lote_acreditacion_id: string | null;
          modelo: string | null;
          monto_ofertado: number | null;
          monto_por_acreditar: number | null;
          monto_solicitado: number | null;
          motivo: string | null;
          neto_a_recibir: number | null;
          ofertado_at: string | null;
          ofertado_by: string | null;
          pendiente_compensar: number | null;
          plazo_adelantado_dias: number | null;
          plazo_original_dias: number | null;
          rechazo_motivo: string | null;
          resuelto_por: string | null;
          tasa_interes_pct: number | null;
          tope_al_solicitar: number | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "adelantos_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "adelantos_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
          {
            foreignKeyName: "adelantos_lote_acreditacion_id_fkey";
            columns: ["lote_acreditacion_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "adelantos_lote_acreditacion_id_fkey";
            columns: ["lote_acreditacion_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "adelantos_resuelto_por_fkey";
            columns: ["resuelto_por"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "adelantos_resuelto_por_fkey";
            columns: ["resuelto_por"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercio_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercio_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercio_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercio_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercio_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
        ];
      };
      v_alert_attachments: {
        Row: {
          alert_id: string | null;
          comment_id: string | null;
          created_at: string | null;
          file_name: string | null;
          id: string | null;
          mime_type: string | null;
          size_bytes: number | null;
          storage_path: string | null;
          uploaded_by: string | null;
          uploaded_by_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "alert_attachments_alert_id_fkey";
            columns: ["alert_id"];
            isOneToOne: false;
            referencedRelation: "alerts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_attachments_alert_id_fkey";
            columns: ["alert_id"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_attachments_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "alert_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_attachments_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "v_alert_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      v_alert_comments: {
        Row: {
          alert_id: string | null;
          author_id: string | null;
          author_name: string | null;
          body: string | null;
          created_at: string | null;
          id: string | null;
          kind: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "alert_comments_alert_id_fkey";
            columns: ["alert_id"];
            isOneToOne: false;
            referencedRelation: "alerts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_comments_alert_id_fkey";
            columns: ["alert_id"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      v_alerts: {
        Row: {
          accepted_at: string | null;
          accepted_by_name: string | null;
          actividad: string | null;
          assigned_at: string | null;
          assigned_to: string | null;
          assigned_to_name: string | null;
          attachments_count: number | null;
          client_id: string | null;
          comments_count: number | null;
          correo: string | null;
          created_at: string | null;
          description: string | null;
          details: Json | null;
          due_at: string | null;
          fecha_operacion: string | null;
          id: string | null;
          id_txn: string | null;
          is_active: boolean | null;
          is_overdue: boolean | null;
          legajo: string | null;
          monto_operacion: number | null;
          nombre: string | null;
          plaft_match_id: number | null;
          provincia: string | null;
          resolution: string | null;
          resolution_notes: string | null;
          resolved_at: string | null;
          resolved_by_name: string | null;
          rule_code: string | null;
          rule_id: string | null;
          status: string | null;
          tipo_operacion: string | null;
          transaction_id: string | null;
          type: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_plaft_match_id_fkey";
            columns: ["plaft_match_id"];
            isOneToOne: false;
            referencedRelation: "plaft_coincidencias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_rule_id_fkey";
            columns: ["rule_id"];
            isOneToOne: false;
            referencedRelation: "alert_rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      v_bcra_presentaciones: {
        Row: {
          archivo: string | null;
          avisos: Json | null;
          cantidad_filas: number | null;
          correcciones: number | null;
          estado: string | null;
          generado_at: string | null;
          generado_by_name: string | null;
          id: string | null;
          notas: string | null;
          periodo: string | null;
          presentado_at: string | null;
          presentado_by_name: string | null;
          totales: Json | null;
          version: number | null;
        };
        Relationships: [];
      };
      v_client_block_parameters: {
        Row: {
          client_id: string | null;
          company_min_wages: number | null;
          correo: string | null;
          created_at: string | null;
          id: string | null;
          individual_min_wages: number | null;
          legajo: string | null;
          nombre: string | null;
          tipo_persona: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_block_parameters_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: true;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      v_client_transaction_profiles: {
        Row: {
          actividad: string | null;
          client_id: string | null;
          correo: string | null;
          current_month_amount: number | null;
          current_month_operations: number | null;
          id: string | null;
          legajo: string | null;
          monthly_amount: number | null;
          monthly_operations: number | null;
          nombre: string | null;
          notes: string | null;
          tipo_persona: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_transaction_profiles_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: true;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      v_cliente_riesgo_vigente: {
        Row: {
          cliente_legajo: string | null;
          detalle: Json | null;
          evaluado_por: string | null;
          motivo: string | null;
          nivel: string | null;
          vigente_desde: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_perfil_riesgo_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_perfil_riesgo_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_perfil_riesgo_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_perfil_riesgo_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_perfil_riesgo_cliente_legajo_fkey";
            columns: ["cliente_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "cliente_perfil_riesgo_evaluado_por_fkey";
            columns: ["evaluado_por"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cliente_perfil_riesgo_evaluado_por_fkey";
            columns: ["evaluado_por"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      v_contracargos_recupero: {
        Row: {
          archivos_adjuntos: Json | null;
          cco_origen: string | null;
          cliente_legajo: string | null;
          comercio_id: string | null;
          comercio_nombre: string | null;
          created_at: string | null;
          created_by: string | null;
          deuda_id: string | null;
          deuda_monto: number | null;
          deuda_recuperado: number | null;
          documentacion: string | null;
          enviado_payway_at: string | null;
          es_simulacion: boolean | null;
          estado: string | null;
          estado_recupero: string | null;
          fecha_cierre: string | null;
          fecha_limite: string | null;
          fecha_transaccion: string | null;
          id: string | null;
          impacto_cierre: number | null;
          impacto_neto: number | null;
          impacto_saldo: number | null;
          impacto_tasa: number | null;
          importe: number | null;
          liberado_at: string | null;
          lote_descuento_codigo: string | null;
          lote_descuento_estado: string | null;
          lote_descuento_fecha: string | null;
          lote_descuento_id: string | null;
          lote_sugerido_id: string | null;
          lote_venta_codigo: string | null;
          lote_venta_estado: string | null;
          lote_venta_fecha: string | null;
          lote_venta_id: string | null;
          marca_tarjeta: string | null;
          motivo_payway: string | null;
          movimiento_id: string | null;
          nro_tarjeta_masked: string | null;
          pago_id: string | null;
          pendiente_recuperar: number | null;
          resolucion: string | null;
          resuelto_por: string | null;
          retencion_estado: string | null;
          retencion_lote_codigo: string | null;
          retencion_lote_id: string | null;
          retenido_at: string | null;
          retenido_monto: number | null;
          site_id: string | null;
          site_transaction_id: string | null;
          ticket_payway: string | null;
          updated_at: string | null;
          url_origen: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contracargos_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
          {
            foreignKeyName: "contracargos_deuda_id_fkey";
            columns: ["deuda_id"];
            isOneToOne: false;
            referencedRelation: "deudas_comercio";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_lote_descuento_id_fkey";
            columns: ["lote_descuento_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_lote_descuento_id_fkey";
            columns: ["lote_descuento_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_lote_sugerido_id_fkey";
            columns: ["lote_sugerido_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_lote_sugerido_id_fkey";
            columns: ["lote_sugerido_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_lote_venta_id_fkey";
            columns: ["lote_venta_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_lote_venta_id_fkey";
            columns: ["lote_venta_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_movimiento_id_fkey";
            columns: ["movimiento_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_pago_id_fkey";
            columns: ["pago_id"];
            isOneToOne: false;
            referencedRelation: "cliente_links_pago_pagos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_resuelto_por_fkey";
            columns: ["resuelto_por"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_resuelto_por_fkey";
            columns: ["resuelto_por"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_retencion_lote_id_fkey";
            columns: ["retencion_lote_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracargos_retencion_lote_id_fkey";
            columns: ["retencion_lote_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
        ];
      };
      v_lotes_acreditacion: {
        Row: {
          acreditado_tx_id: string | null;
          bandera: string | null;
          bandera_id: string | null;
          calculado_at: string | null;
          calculo_hash: string | null;
          cantidad_operaciones: number | null;
          codigo: string | null;
          comercio_id: string | null;
          comercio_legajo: string | null;
          comercio_nombre: string | null;
          comercio_usuario: string | null;
          comision_cierre_base: string | null;
          comision_cierre_lote_monto: number | null;
          comision_cierre_lote_pct: number | null;
          compensacion_adelantos: number | null;
          conciliacion_id: string | null;
          conciliado: boolean | null;
          contracargo_monto: number | null;
          contracargos: number | null;
          costo_payway_pago_unico: number | null;
          costo_servicio_payway: number | null;
          created_at: string | null;
          cuotas: number | null;
          debito_credito_monto: number | null;
          dias_habiles_aplicados: number | null;
          ejecucion_id: string | null;
          elegible: boolean | null;
          es_estimado: boolean | null;
          es_negativo: boolean | null;
          establecimiento: string | null;
          estado: string | null;
          fecha: string | null;
          fecha_acreditacion: string | null;
          fecha_cobro_real: string | null;
          fecha_estimada_recalcular: boolean | null;
          fecha_resolucion: string | null;
          id: string | null;
          iibb_monto: number | null;
          importacion_archivo: string | null;
          importacion_id: string | null;
          importe_bruto: number | null;
          importe_neto: number | null;
          impuestos: number | null;
          impuestos_detalle: Json | null;
          impuestos_payway: number | null;
          iva_monto: number | null;
          iva_tasa_monto: number | null;
          legacy: boolean | null;
          liquidado_en_lote_id: string | null;
          marca_norm: string | null;
          motivo_no_elegible: string | null;
          neto_a_acreditar: number | null;
          neto_payway: number | null;
          notas_resolucion: string | null;
          origen: string | null;
          recuperacion_deuda: number | null;
          renglon_id: string | null;
          resuelto_por: string | null;
          retencion_contracargos: number | null;
          retencion_pendiente: number | null;
          subestado: string | null;
          tasa_molipay_monto: number | null;
          tasa_molipay_pct: number | null;
          tasa_payway_monto: number | null;
          tasa_payway_pct: number | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercio_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercio_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercio_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercio_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercio_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "lotes_acreditacion_bandera_id_fkey";
            columns: ["bandera_id"];
            isOneToOne: false;
            referencedRelation: "banderas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_conciliacion_id_fkey";
            columns: ["conciliacion_id"];
            isOneToOne: false;
            referencedRelation: "liquidacion_conciliaciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_ejecucion_fk";
            columns: ["ejecucion_id"];
            isOneToOne: false;
            referencedRelation: "acreditacion_ejecuciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_importacion_id_fkey";
            columns: ["importacion_id"];
            isOneToOne: false;
            referencedRelation: "liquidaciones_importaciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_liquidado_en_lote_id_fkey";
            columns: ["liquidado_en_lote_id"];
            isOneToOne: false;
            referencedRelation: "lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_liquidado_en_lote_id_fkey";
            columns: ["liquidado_en_lote_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_acreditacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_renglon_id_fkey";
            columns: ["renglon_id"];
            isOneToOne: false;
            referencedRelation: "liquidaciones_renglones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_resuelto_por_fkey";
            columns: ["resuelto_por"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_acreditacion_resuelto_por_fkey";
            columns: ["resuelto_por"];
            isOneToOne: false;
            referencedRelation: "backoffice_users";
            referencedColumns: ["id"];
          },
        ];
      };
      v_lotes_venta: {
        Row: {
          bandera: string | null;
          cantidad_operaciones: number | null;
          comercio_id: string | null;
          comercios_id: string | null;
          comercios_legajo: string | null;
          comercios_nombre_comercio: string | null;
          comercios_usuario: string | null;
          comision: number | null;
          fecha: string | null;
          importe_bruto: number | null;
          importe_neto: number | null;
          impuestos: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercios_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercios_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercios_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercios_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercios_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transactions_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
        ];
      };
      v_lotes_venta_dia: {
        Row: {
          bruto: number | null;
          comercio_id: string | null;
          comercio_legajo: string | null;
          comercio_nombre: string | null;
          estado: string | null;
          fecha: string | null;
          liquidado: number | null;
          pendiente_liquidar: number | null;
          por_bandera: Json | null;
          proxima_acreditacion: string | null;
          rechazos: number | null;
          ventas: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercio_legajo"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercio_legajo"];
            isOneToOne: false;
            referencedRelation: "v_account_blocks";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercio_legajo"];
            isOneToOne: false;
            referencedRelation: "v_alerts";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercio_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_block_parameters";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "comercios_legajo_fkey";
            columns: ["comercio_legajo"];
            isOneToOne: false;
            referencedRelation: "v_client_transaction_profiles";
            referencedColumns: ["legajo"];
          },
          {
            foreignKeyName: "transactions_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "comercios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_comercio_id_fkey";
            columns: ["comercio_id"];
            isOneToOne: false;
            referencedRelation: "v_lotes_venta";
            referencedColumns: ["comercios_id"];
          },
        ];
      };
      v_security_summary: {
        Row: {
          tablas_con_rls: number | null;
          tablas_con_rls_fuerte: number | null;
          total_policies: number | null;
        };
        Relationships: [];
      };
      v_transaction_lines: {
        Row: {
          comercio_id: string | null;
          concepto: string | null;
          cuit: string | null;
          cvu: string | null;
          cvu_propio: string | null;
          detalle: string | null;
          email: string | null;
          estado_codigo: string | null;
          estado_id: number | null;
          estado_nombre: string | null;
          fecha: string | null;
          id_txn: string | null;
          ledger_status: string | null;
          legajo: string | null;
          line_id: string | null;
          line_no: number | null;
          monto: number | null;
          nombre: string | null;
          nombre_destino: string | null;
          posting_key: string | null;
          reversal_of_entry_id: string | null;
          subaccount_id: string | null;
          tipo_linea: string | null;
          tipo_operacion: string | null;
          transaction_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      _alerta_desde_plaft: { Args: { p_match_id: number }; Returns: string };
      _alerta_jurisdiccion: {
        Args: {
          p_client_id: string;
          p_ctx: Json;
          p_params: Json;
          p_rule_id: string;
          p_rule_name: string;
          p_transaction_id: string;
        };
        Returns: string;
      };
      _api_admin: { Args: { p_modificar?: boolean }; Returns: undefined };
      _api_cambiar_estado: {
        Args: { p_estado: string; p_id: string; p_nota: string };
        Returns: undefined;
      };
      _api_sembrar_permisos: {
        Args: { p_ambiente: string; p_integracion_id: string };
        Returns: undefined;
      };
      _api_solo_servicio: { Args: never; Returns: undefined };
      _api_validar_ips: { Args: { p_ips: string[] }; Returns: string[] };
      _bcra_cierre: { Args: { p_dia: string }; Returns: string };
      _bcra_guardar: {
        Args: {
          p_archivo: string;
          p_avisos: Json;
          p_filas: Json;
          p_periodo: string;
          p_totales: Json;
        };
        Returns: string;
      };
      _bcra_monto: {
        Args: { p_unidad: string; p_valor: number };
        Returns: number;
      };
      _bcra_op_aplica: {
        Args: {
          p_contraparte: string;
          p_params: Json;
          p_sentido: string;
          p_tipo: string;
          p_tipo_persona: string;
        };
        Returns: boolean;
      };
      _bcra_operaciones: {
        Args: { p_periodo: string };
        Returns: {
          cliente_id: string;
          contraparte: string;
          monto_bruto: number;
          monto_debitado: number;
          monto_neto: number;
          sentido: string;
          subcuenta_id: string;
          tipo: string;
          tipo_persona: string;
          transaction_id: string;
        }[];
      };
      _bcra_periodo: { Args: { p_periodo: string }; Returns: string };
      _bcra_saldo_clientes: {
        Args: { p_buckets: string[]; p_cierre: string };
        Returns: {
          cuentas: number;
          monto: number;
        }[];
      };
      _bcra_saldo_cuenta: {
        Args: { p_account_code: string; p_cierre: string };
        Returns: number;
      };
      _bloqueo_activo: {
        Args: { p_client_id: string; p_subaccount_id?: string };
        Returns: string;
      };
      _comercio_adelantos_pendientes: {
        Args: { p_comercio_id: string };
        Returns: number;
      };
      _comercio_de_usuario: { Args: { p_user_id: string }; Returns: string };
      _comercio_deuda_pendiente: {
        Args: { p_comercio_id: string };
        Returns: number;
      };
      _comercio_operativa: { Args: { p_comercio_id: string }; Returns: string };
      _comercio_sesion: { Args: never; Returns: string };
      _comision_aplicable: {
        Args: { p_cliente_id: string; p_subcuenta_id: string; p_tipo: string };
        Returns: {
          id: string;
          modalidad: string;
          monto_fijo: number;
          por_cvu: boolean;
          porcentaje: number;
          porcentaje_impuesto: number;
        }[];
      };
      _contexto_cliente: { Args: { p_client_id: string }; Returns: Json };
      _contracargo_cobrar: {
        Args: { p_cc_id: string; p_monto: number; p_ref: string };
        Returns: Json;
      };
      _contracargo_liberar: { Args: { p_cc_id: string }; Returns: Json };
      _contracargo_lote_venta: {
        Args: { p_movimiento_id: string };
        Returns: string;
      };
      _contracargo_preparar: { Args: { p_cc_id: string }; Returns: string };
      _ensure_subaccount: {
        Args: { p_legajo: string; p_tipo: string };
        Returns: string;
      };
      _es_transferencia_interna: {
        Args: { p_cliente_id: string; p_destino: string };
        Returns: boolean;
      };
      _estado_movimiento_id: { Args: { p_codigo: string }; Returns: number };
      _evaluar_retiros_fallidos: {
        Args: { p_transaction_id: string };
        Returns: undefined;
      };
      _hoy_ar: { Args: never; Returns: string };
      _iibb_segment: { Args: { p_date: string }; Returns: number };
      _iibb_segment_range: {
        Args: { p_period: string; p_segment: number };
        Returns: Record<string, unknown>;
      };
      _iibb_tax_id: { Args: { p_registry_tax_id?: string }; Returns: string };
      _ip_en_rango: {
        Args: { p_ip: string; p_regla: string };
        Returns: boolean;
      };
      _ledger_account_id: { Args: { p_code: string }; Returns: string };
      _ledger_line: {
        Args: {
          p_account_id: string;
          p_amount: number;
          p_concepto?: string;
          p_entry_type: string;
        };
        Returns: Json;
      };
      _ledger_lines: { Args: { p_lines: Json[] }; Returns: Json };
      _ledger_reverse: {
        Args: {
          p_ledger_status?: string;
          p_posting_key: string;
          p_transaction_id: string;
        };
        Returns: number;
      };
      _ledger_saldo: { Args: { p_code: string }; Returns: number };
      _ledger_sub_account_id: {
        Args: { p_bucket: string; p_subaccount_id: string };
        Returns: string;
      };
      _liq_crear_lote: { Args: { p_renglon_id: string }; Returns: string };
      _liq_evaluar: {
        Args: { p_renglones: Json };
        Returns: {
          advertencias: string[];
          bandera_id: string;
          bruto: number;
          comercio_id: string;
          costo: number;
          establecimiento: string;
          establecimiento_id: string;
          estado: string;
          fecha: string;
          impuestos: number;
          marca: string;
          marca_norm: string;
          motivo: string;
          neto: number;
          nro: number;
          resultado: string;
        }[];
      };
      _liq_neto_archivo: {
        Args: { p_fecha: string; p_marca_norm: string };
        Returns: number;
      };
      _liq_vincular_ventas: { Args: { p_lote_id: string }; Returns: number };
      _lock_cliente_reglas: {
        Args: { p_client_id: string };
        Returns: undefined;
      };
      _lote_acreditar: {
        Args: {
          p_ejecucion_id: string;
          p_fecha: string;
          p_hash: string;
          p_lote_id: string;
        };
        Returns: Json;
      };
      _lote_calculo: {
        Args: { p_adel_pend: number; p_deuda_pend: number; p_lote_id: string };
        Returns: Json;
      };
      _lote_conciliar: {
        Args: { p_conciliacion_id: string; p_lote_id: string };
        Returns: undefined;
      };
      _lote_guardar_calculo: {
        Args: { p_calc: Json; p_lote_id: string };
        Returns: undefined;
      };
      _lote_impuestos: {
        Args: { p_bruto: number; p_comercio_id: string; p_neto_payway: number };
        Returns: Json;
      };
      _lote_retencion_pendiente: {
        Args: { p_lote_id: string };
        Returns: number;
      };
      _lote_tasa_pct: {
        Args: {
          p_bandera: string;
          p_bandera_id: string;
          p_comercio_id: string;
          p_marca_norm: string;
        };
        Returns: number;
      };
      _marca_norm: { Args: { p: string }; Returns: string };
      _neto_estimado: {
        Args: {
          p_bandera: string;
          p_bandera_id: string;
          p_bruto: number;
          p_comercio_id: string;
          p_marca_norm: string;
        };
        Returns: number;
      };
      _normalizar_texto: { Args: { p: string }; Returns: string };
      _param_num: {
        Args: { p_clave: string; p_default: number };
        Returns: number;
      };
      _param_texto: {
        Args: { p_clave: string; p_default: string };
        Returns: string;
      };
      _puede: {
        Args: { p_accion: string; p_recurso: string };
        Returns: boolean;
      };
      _rbac_event: {
        Args: {
          p_actor?: string;
          p_data?: Json;
          p_event: string;
          p_row_id: string;
          p_table: string;
        };
        Returns: undefined;
      };
      _rechazar_retiro: {
        Args: { p_codigo: string; p_transaction_id: string };
        Returns: Json;
      };
      _registrar_alerta: {
        Args: {
          p_client_id: string;
          p_dedupe_key: string;
          p_description: string;
          p_details: Json;
          p_plaft_match_id?: number;
          p_rule_id: string;
          p_transaction_id: string;
          p_type: string;
        };
        Returns: string;
      };
      _registrar_bloqueo_regla: {
        Args: {
          p_alert_id: string;
          p_client_id: string;
          p_reason: string;
          p_rule_id: string;
          p_transaction_id: string;
        };
        Returns: string;
      };
      _regla_aplica: {
        Args: { p_conditions: Json; p_ctx: Json };
        Returns: boolean;
      };
      _security_actor_type: { Args: { p_user_id: string }; Returns: string };
      _subaccount_add_conciliado: {
        Args: { p_delta: number; p_subaccount_id: string };
        Returns: undefined;
      };
      _tax_breakdown: {
        Args: {
          p_base: number;
          p_cap?: number;
          p_legajo: string;
          p_operation: string;
        };
        Returns: Json;
      };
      _tax_filing_generate: {
        Args: { p_period: string; p_segment: number; p_tax_id: string };
        Returns: string;
      };
      _tax_label: {
        Args: { p_calculation_type: string; p_name: string; p_rate: number };
        Returns: string;
      };
      _tax_ledger_lines: {
        Args: { p_client_account: string; p_lines: Json };
        Returns: Json;
      };
      _tax_lines_of: { Args: { p_transaction_id: string }; Returns: Json };
      _tax_quote: {
        Args: {
          p_base: number;
          p_cap?: number;
          p_legajo: string;
          p_on?: string;
          p_operation: string;
        };
        Returns: {
          amount: number;
          assignment_id: string;
          calculation_type: string;
          direction: string;
          exemption_id: string;
          note: string;
          rate: number;
          rate_code: string;
          rate_source: string;
          registry_id: string;
          tax_code: string;
          tax_id: string;
          tax_name: string;
          taxable_base: number;
        }[];
      };
      _tax_rate: {
        Args: {
          p_cuit: string;
          p_custom_rate?: number;
          p_custom_type?: string;
          p_direction: string;
          p_on: string;
          p_tax_id: string;
        };
        Returns: {
          calculation_type: string;
          exemption_id: string;
          note: string;
          rate: number;
          rate_code: string;
          registry_id: string;
        }[];
      };
      _tax_record: {
        Args: { p_lines: Json; p_transaction_id: string };
        Returns: undefined;
      };
      _tx_confirmar_transferencia: {
        Args: { p_estado_bdc?: string; p_tx_id: string };
        Returns: Json;
      };
      _tx_operacion_interna: {
        Args: {
          p_comercio_id?: string;
          p_id_txn: string;
          p_legajo: string;
          p_monto: number;
          p_subcuenta_id?: string;
          p_tipo: string;
        };
        Returns: string;
      };
      _tx_operation_date: {
        Args: { p_created_at: string; p_fecha: string };
        Returns: string;
      };
      _tx_reservar_transferencia: {
        Args: {
          p_cliente_id: string;
          p_destinatario_banco?: string;
          p_destinatario_cbu: string;
          p_destinatario_cuit?: string;
          p_destinatario_nombre?: string;
          p_legajo: string;
          p_monto: number;
          p_origin_id: string;
          p_subcuenta_origen: string;
        };
        Returns: Json;
      };
      _volumen_cliente: {
        Args: {
          p_client_id: string;
          p_desde: string;
          p_excluir?: string;
          p_hasta: string;
        };
        Returns: {
          monto: number;
          operaciones: number;
        }[];
      };
      _webhook_encolar: {
        Args: {
          p_ambiente: string;
          p_comercio_id: string;
          p_datos: Json;
          p_evento: string;
        };
        Returns: number;
      };
      aceptar_alerta: { Args: { p_id: string }; Returns: undefined };
      aceptar_bloqueo: { Args: { p_id: string }; Returns: undefined };
      acreditacion_ejecutar: {
        Args: {
          p_confirmaciones: Json;
          p_fecha: string;
          p_hashes?: Json;
          p_lote_ids: string[];
          p_texto: string;
        };
        Returns: Json;
      };
      acreditacion_guardar_parametro: {
        Args: { p_clave: string; p_valor: string };
        Returns: Json;
      };
      acreditacion_leer_parametros: { Args: never; Returns: Json };
      acreditacion_revisar: { Args: { p_lote_ids: string[] }; Returns: Json };
      acreditaciones_por_dia: {
        Args: { p_comercio_id?: string; p_desde: string; p_hasta: string };
        Returns: Json;
      };
      acreditar_lote: {
        Args: {
          p_adelantos_monto?: number;
          p_lote_id: string;
          p_notas?: string;
        };
        Returns: Json;
      };
      actualizar_estado_lote: {
        Args: { p_estado: string; p_lote_id: string };
        Returns: undefined;
      };
      actualizar_link_registro: {
        Args: { p_link: string; p_registro_id: string };
        Returns: undefined;
      };
      adelanto_aceptar: {
        Args: { p_acepto: boolean; p_adelanto_id: string };
        Returns: Json;
      };
      adelanto_acreditar: { Args: { p_adelanto_id: string }; Returns: Json };
      adelanto_ofertar: {
        Args: {
          p_adelanto_id: string;
          p_monto: number;
          p_plazo_dias: number;
          p_tasa_pct: number;
        };
        Returns: Json;
      };
      adelanto_rechazar: {
        Args: { p_adelanto_id: string; p_motivo: string };
        Returns: Json;
      };
      adelanto_solicitar: {
        Args: {
          p_monto: number;
          p_motivo?: string;
          p_plazo_dias?: number;
          p_transaction_ids?: string[];
        };
        Returns: Json;
      };
      adelanto_tope: {
        Args: { p_comercio_id?: string; p_excluir_adelanto?: string };
        Returns: Json;
      };
      agregar_registros_lote: {
        Args: { p_lote_id: string; p_registros: Json };
        Returns: number;
      };
      ajustar_saldo_subcuenta: {
        Args: {
          p_bucket?: string;
          p_monto: number;
          p_motivo: string;
          p_subaccount_id: string;
        };
        Returns: Json;
      };
      alertas_centro: { Args: { p_limite?: number }; Returns: Json };
      alertas_centro_marcar: { Args: { p_claves: string[] }; Returns: number };
      api_admin_aprobar_pase: {
        Args: { p_id: string; p_nota?: string };
        Returns: Json;
      };
      api_admin_detalle: { Args: { p_id: string }; Returns: Json };
      api_admin_guardar_limites: {
        Args: {
          p_id: string;
          p_ips: string[];
          p_rate_produccion: number;
          p_rate_sandbox: number;
        };
        Returns: Json;
      };
      api_admin_guardar_permisos: {
        Args: { p_ambiente: string; p_id: string; p_permisos: Json };
        Returns: number;
      };
      api_admin_listar: { Args: never; Returns: Json };
      api_admin_reactivar: {
        Args: { p_id: string; p_nota?: string };
        Returns: Json;
      };
      api_admin_rechazar_pase: {
        Args: { p_id: string; p_motivo: string };
        Returns: Json;
      };
      api_admin_reintentar_webhook: {
        Args: { p_log_id: string };
        Returns: Json;
      };
      api_admin_revocar: {
        Args: { p_id: string; p_motivo: string };
        Returns: Json;
      };
      api_admin_revocar_llave: {
        Args: { p_key_id: string; p_motivo: string };
        Returns: Json;
      };
      api_admin_suspender: {
        Args: { p_id: string; p_motivo: string };
        Returns: Json;
      };
      api_credencial: { Args: { p_api_key: string }; Returns: Json };
      api_credencial_por_secreto: {
        Args: { p_secret_hash: string };
        Returns: Json;
      };
      api_dev_registrar_llave:
        | {
            Args: {
              p_ambiente: string;
              p_api_key: string;
              p_secret_cifrado: string;
              p_ultimos4: string;
              p_user_id: string;
            };
            Returns: Json;
          }
        | {
            Args: {
              p_ambiente: string;
              p_api_key: string;
              p_secret_cifrado: string;
              p_secret_hash: string;
              p_ultimos4: string;
              p_user_id: string;
            };
            Returns: Json;
          };
      api_dev_registrar_webhook: {
        Args: {
          p_activo: boolean;
          p_ambiente: string;
          p_eventos: string[];
          p_secret_cifrado?: string;
          p_ultimos4?: string;
          p_url: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      api_dev_webhook_prueba: {
        Args: { p_ambiente: string; p_user_id: string };
        Returns: string;
      };
      api_portal_estado: { Args: never; Returns: Json };
      api_portal_guardar_ips: { Args: { p_ips: string[] }; Returns: Json };
      api_portal_solicitar_pase: { Args: { p_notas: string }; Returns: Json };
      api_registrar_log: {
        Args: {
          p_ambiente: string;
          p_api_key_id: string;
          p_codigo_error: string;
          p_comercio_id: string;
          p_integracion_id: string;
          p_ip: string;
          p_latencia_ms: number;
          p_metodo: string;
          p_request_id: string;
          p_ruta: string;
          p_status: number;
        };
        Returns: undefined;
      };
      api_v1_anular_link: {
        Args: { p_comercio_id: string; p_link_id: string };
        Returns: Json;
      };
      api_v1_contracargo_evidencia: {
        Args: { p_comercio_id: string; p_id: string; p_texto: string };
        Returns: Json;
      };
      api_v1_crear_link: {
        Args: {
          p_comercio_id: string;
          p_expira: string;
          p_items: Json;
          p_notas: string;
          p_pagos_parciales?: boolean;
          p_referencia: string;
          p_url_base: string;
        };
        Returns: Json;
      };
      api_v1_transferir: {
        Args: {
          p_cbu: string;
          p_comercio_id: string;
          p_concepto: string;
          p_monto: number;
          p_subcuenta: string;
        };
        Returns: Json;
      };
      aplicar_contracargo_retenido: {
        Args: { p_contracargo_id: string; p_lote_id: string };
        Returns: Json;
      };
      aplicar_liquidacion_lote: {
        Args: {
          p_fecha_cobro_real?: string;
          p_liquidacion: Json;
          p_lote_id: string;
        };
        Returns: Json;
      };
      asignar_alerta: {
        Args: { p_analyst_id: string; p_id: string };
        Returns: undefined;
      };
      backoffice_user_set_active: {
        Args: { p_active: boolean; p_user_id: string };
        Returns: undefined;
      };
      backoffice_user_update: {
        Args: { p_full_name: string; p_role_id: string; p_user_id: string };
        Returns: undefined;
      };
      bcra_calcular_a: { Args: { p_periodo: string }; Returns: Json };
      bcra_calcular_b: { Args: { p_periodo: string }; Returns: Json };
      bcra_calcular_i: { Args: { p_periodo: string }; Returns: Json };
      bcra_control: { Args: { p_periodo: string }; Returns: Json };
      bcra_corregir: {
        Args: {
          p_campo: string;
          p_fila: number;
          p_id: string;
          p_motivo: string;
          p_valor: string;
        };
        Returns: undefined;
      };
      bcra_generar: {
        Args: { p_archivo: string; p_periodo: string };
        Returns: string;
      };
      bcra_guardar_padron: {
        Args: { p_avisos?: Json; p_filas: Json; p_periodo: string };
        Returns: string;
      };
      bcra_guardar_parametro: {
        Args: { p_clave: string; p_valor: string };
        Returns: undefined;
      };
      bcra_guardar_partida: {
        Args: {
          p_activa: boolean;
          p_confirmada: boolean;
          p_descripcion: string;
          p_esquema: string;
          p_id: string;
          p_medio_pago: string;
          p_params: Json;
          p_regla: string;
        };
        Returns: undefined;
      };
      bcra_leer_parametros: { Args: never; Returns: Json };
      bcra_marcar_presentado: {
        Args: { p_id: string; p_notas?: string };
        Returns: undefined;
      };
      calcular_comision: {
        Args: {
          p_cliente_id: string;
          p_destino?: string;
          p_monto: number;
          p_subcuenta_id?: string;
          p_tipo?: string;
        };
        Returns: {
          comision: number;
          impuesto: number;
        }[];
      };
      calcular_comision_transferencia: {
        Args: {
          p_cliente_id: string;
          p_destino?: string;
          p_monto: number;
          p_subcuenta_origen?: string;
        };
        Returns: {
          comision: number;
          impuesto: number;
        }[];
      };
      calcular_fecha_limite_mediacion: {
        Args: { p_desde?: string; p_dias_hab?: number };
        Returns: string;
      };
      calcular_total_impuestos_lote: {
        Args: { p_lote_id: string };
        Returns: number;
      };
      calendario_acreditaciones_v2: {
        Args: {
          p_anio: number;
          p_bandera?: string;
          p_comercio_id?: string;
          p_estado?: string;
          p_mes: number;
        };
        Returns: Json;
      };
      calendario_acreditaciones_v3: {
        Args: { p_comercio_id?: string; p_desde: string; p_hasta: string };
        Returns: Json;
      };
      calendario_adelantos_por_dia: {
        Args: { p_comercio_id: string; p_fecha?: string };
        Returns: Json;
      };
      calendario_dia_detalle: {
        Args: { p_comercio_id?: string; p_fecha: string };
        Returns: Json;
      };
      calendario_exportar_dia: {
        Args: { p_comercio_id?: string; p_fecha: string };
        Returns: Json;
      };
      calendario_resumen_saldos: {
        Args: { p_comercio_id?: string };
        Returns: Json;
      };
      cambiar_estado_movimiento: {
        Args: {
          p_comentario?: string;
          p_movimiento_id: string;
          p_nuevo_estado_id: number;
        };
        Returns: Json;
      };
      cancelar_adelanto: {
        Args: { p_adelanto_id: string };
        Returns: {
          aceptado_at: string | null;
          acreditado_tx_id: string | null;
          comercio_id: string;
          compensado: number;
          created_at: string;
          descuento: number | null;
          estado: string;
          fecha_acreditacion: string | null;
          fecha_resolucion: string | null;
          fecha_solicitud: string;
          id: string;
          lote_acreditacion_id: string | null;
          modelo: string;
          monto_ofertado: number | null;
          monto_por_acreditar: number | null;
          monto_solicitado: number;
          motivo: string | null;
          neto_a_recibir: number | null;
          ofertado_at: string | null;
          ofertado_by: string | null;
          plazo_adelantado_dias: number;
          plazo_original_dias: number;
          rechazo_motivo: string | null;
          resuelto_por: string | null;
          tasa_interes_pct: number | null;
          tope_al_solicitar: number | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "adelantos";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      cancelar_transferencia_bdc: {
        Args: { p_motivo?: string; p_origin_id: string };
        Returns: Json;
      };
      cliente_legajo_actual: { Args: never; Returns: string };
      cliente_tiene_comision: {
        Args: { p_cliente_id: string };
        Returns: boolean;
      };
      cliente_tiene_movimientos: {
        Args: { p_legajo: string };
        Returns: boolean;
      };
      comentar_alerta: {
        Args: { p_alert_id: string; p_body: string };
        Returns: string;
      };
      comercio_contracargos: { Args: never; Returns: Json };
      comercio_liquidaciones_resumen: {
        Args: { p_desde?: string; p_hasta?: string };
        Returns: Json;
      };
      comercio_lote_apertura: { Args: { p_lote_id: string }; Returns: Json };
      comercio_lotes_acreditacion: {
        Args: { p_desde: string; p_hasta: string };
        Returns: Json;
      };
      comercio_ventas_detalle: { Args: { p_fecha: string }; Returns: Json };
      comercio_ventas_dia: {
        Args: { p_desde: string; p_hasta: string };
        Returns: Json;
      };
      confirmar_adelanto: {
        Args: { p_adelanto_id: string };
        Returns: {
          estado: string;
          fecha_resolucion: string;
          id: string;
          resuelto_por: string;
        }[];
      };
      confirmar_transferencia_bdc: {
        Args: { p_estado_bdc?: string; p_origin_id: string };
        Returns: Json;
      };
      contracargo_cambiar_estado: {
        Args: { p_contracargo_id: string; p_estado: string; p_nota?: string };
        Returns: Json;
      };
      contracargo_confirmar: {
        Args: { p_contracargo_id: string };
        Returns: Json;
      };
      contracargo_importar: { Args: { p_filas: Json }; Returns: Json };
      contracargo_registrar: {
        Args: {
          p_importe: number;
          p_motivo?: string;
          p_ticket?: string;
          p_transaction_id: string;
        };
        Returns: Json;
      };
      contracargos_doc_comercio_id: {
        Args: { p_name: string };
        Returns: string;
      };
      cotizar_transferencia: {
        Args: {
          p_destino?: string;
          p_monto: number;
          p_subcuenta_origen: string;
        };
        Returns: Json;
      };
      crear_bloqueo_manual: {
        Args: { p_legajo: string; p_reason: string; p_subaccount_id: string };
        Returns: string;
      };
      crear_lote: {
        Args: {
          p_cliente_legajo: string;
          p_dia_pago: number;
          p_fecha_venc_1: string;
          p_fecha_venc_2: string;
          p_fecha_venc_3: string;
          p_id: string;
          p_medios_pago: Json;
          p_nombre: string;
          p_notificaciones: boolean;
          p_pagos_parciales: boolean;
          p_periodo: string;
          p_tasa_interes: number;
        };
        Returns: undefined;
      };
      current_admin_id: { Args: never; Returns: string };
      current_cliente_id: { Args: never; Returns: string };
      current_cliente_legajo: { Args: never; Returns: string };
      ejecutar_barrido_compliance: { Args: never; Returns: Json };
      eliminar_auth_por_email: { Args: { p_email: string }; Returns: undefined };
      eliminar_lote: { Args: { p_lote_id: string }; Returns: undefined };
      eliminar_parametros_bloqueo_cliente: {
        Args: { p_id: string };
        Returns: undefined;
      };
      eliminar_perfil_transaccional: {
        Args: { p_id: string };
        Returns: undefined;
      };
      es_backoffice: { Args: never; Returns: boolean };
      es_dia_habil: { Args: { p_fecha: string }; Returns: boolean };
      evaluar_reglas_operacion: {
        Args: { p_operacion: string; p_transaction_id: string };
        Returns: Json;
      };
      fn_acreditar_adelanto: {
        Args: { p_adelanto_id: string; p_notas?: string };
        Returns: Json;
      };
      fn_aprobar_adelanto: {
        Args: { p_adelanto_id: string; p_notas?: string; p_tasa_pct: number };
        Returns: Json;
      };
      fn_calcular_tope_disponible: {
        Args: { p_comercio_id: string };
        Returns: number;
      };
      fn_rpc_log_event: {
        Args: {
          p_context?: Json;
          p_message: string;
          p_ok: boolean;
          p_source: string;
          p_step: string;
        };
        Returns: undefined;
      };
      generar_legajo: {
        Args: { p_cuit: string; p_tipo_persona: string };
        Returns: string;
      };
      guardar_alert_rules: { Args: { p_rules: Json }; Returns: number };
      guardar_parametros_bloqueo_cliente: {
        Args: {
          p_company_min_wages: number;
          p_id?: string;
          p_individual_min_wages: number;
          p_legajo: string;
        };
        Returns: string;
      };
      guardar_perfil_transaccional: {
        Args: {
          p_legajo: string;
          p_monthly_amount: number;
          p_monthly_operations: number;
          p_notes: string;
        };
        Returns: string;
      };
      guardar_smvm: { Args: { p_monto: number }; Returns: undefined };
      has_any_permission: { Args: { p_codes: string[] }; Returns: boolean };
      has_permission: { Args: { p_code: string }; Returns: boolean };
      incrementar_vistas_link: {
        Args: { p_link_id: string };
        Returns: undefined;
      };
      incrementar_vistas_lote: {
        Args: { p_lote_id: string };
        Returns: undefined;
      };
      ingresar_adelanto: {
        Args: {
          fecha_acreditacion?: string;
          lote_acreditacion_id?: string;
          monto: number;
          motivo?: string;
        };
        Returns: {
          aceptado_at: string | null;
          acreditado_tx_id: string | null;
          comercio_id: string;
          compensado: number;
          created_at: string;
          descuento: number | null;
          estado: string;
          fecha_acreditacion: string | null;
          fecha_resolucion: string | null;
          fecha_solicitud: string;
          id: string;
          lote_acreditacion_id: string | null;
          modelo: string;
          monto_ofertado: number | null;
          monto_por_acreditar: number | null;
          monto_solicitado: number;
          motivo: string | null;
          neto_a_recibir: number | null;
          ofertado_at: string | null;
          ofertado_by: string | null;
          plazo_adelantado_dias: number;
          plazo_original_dias: number;
          rechazo_motivo: string | null;
          resuelto_por: string | null;
          tasa_interes_pct: number | null;
          tope_al_solicitar: number | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "adelantos";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      is_admin: { Args: never; Returns: boolean };
      ledger_conciliar_saldos: {
        Args: never;
        Returns: {
          bucket: string;
          diferencia: number;
          saldo_ledger: number;
          saldo_operativo: number;
          subaccount_id: string;
        }[];
      };
      ledger_post: {
        Args: {
          p_ledger_status?: string;
          p_lines: Json;
          p_memo?: string;
          p_posting_key: string;
          p_transaction_id: string;
        };
        Returns: boolean;
      };
      leer_parametro_numerico: {
        Args: { p_clave: string; p_default: number };
        Returns: number;
      };
      leer_smvm: { Args: never; Returns: number };
      legajo_de_sesion: { Args: never; Returns: string };
      liberar_bloqueo: {
        Args: { p_id: string; p_notes: string };
        Returns: Json;
      };
      liquidacion_conciliar: {
        Args: {
          p_fecha_pago: string;
          p_ingresado: number;
          p_marca: string;
          p_notas?: string;
        };
        Returns: Json;
      };
      liquidacion_confirmar: {
        Args: {
          p_adquirente?: string;
          p_archivo_hash: string;
          p_archivo_nombre: string;
          p_rango_desde?: string;
          p_rango_hasta?: string;
          p_renglones: Json;
          p_revisado?: boolean;
        };
        Returns: Json;
      };
      liquidacion_previsualizar: {
        Args: { p_archivo_hash?: string; p_renglones: Json };
        Returns: Json;
      };
      liquidacion_resolver_excepciones: {
        Args: {
          p_accion: string;
          p_comercio_id?: string;
          p_motivo?: string;
          p_renglon_ids: string[];
        };
        Returns: Json;
      };
      listar_analistas: {
        Args: never;
        Returns: {
          email: string;
          id: string;
          nombre: string;
        }[];
      };
      listar_valores_ficha: { Args: never; Returns: Json };
      lote_elegibilidad: { Args: { p_lote_id: string }; Returns: Json };
      lote_establecimiento: { Args: { p_lote_id: string }; Returns: Json };
      lote_recalcular: { Args: { p_lote_id: string }; Returns: Json };
      lote_ventas: { Args: { p_lote_id: string }; Returns: Json };
      my_permissions: { Args: never; Returns: Json };
      my_security_events: {
        Args: { p_cursor_at?: string; p_cursor_id?: number; p_limit?: number };
        Returns: {
          action: string;
          category: string;
          id: number;
          ip: string;
          label: string;
          metadata: Json;
          occurred_at: string;
          outcome: string;
          user_agent: string;
        }[];
      };
      obtener_link_pago: { Args: { p_codigo: string }; Returns: Json };
      rbac_audit_list: {
        Args: {
          p_actor_id?: string;
          p_cursor_at?: string;
          p_cursor_id?: string;
          p_from?: string;
          p_limit?: number;
          p_table?: string;
          p_to?: string;
        };
        Returns: {
          actor_email: string;
          actor_id: string;
          actor_name: string;
          after_data: Json;
          before_data: Json;
          created_at: string;
          event: string;
          id: string;
          operation: string;
          permission_names: Json;
          role_names: Json;
          row_id: string;
          table_name: string;
        }[];
      };
      recaudadora_estado: { Args: never; Returns: Json };
      registrar_adjunto_alerta: {
        Args: {
          p_alert_id: string;
          p_comment_id?: string;
          p_file_name: string;
          p_path: string;
        };
        Returns: string;
      };
      registrar_deposito_entrante: {
        Args: {
          p_cbu_destino: string;
          p_cbu_origen?: string;
          p_cuit_origen?: string;
          p_fecha?: string;
          p_id_coelsa: string;
          p_importe: number;
          p_titular_origen?: string;
        };
        Returns: Json;
      };
      registrar_pago_link: {
        Args: {
          p_cliente_legajo: string;
          p_link_id: string;
          p_metodo: string;
          p_monto: number;
          p_pagador_email: string;
          p_pagador_nombre: string;
          p_referencia?: string;
        };
        Returns: Json;
      };
      registrar_pago_link_completo: {
        Args: {
          p_bandera_id: string;
          p_cliente_legajo: string;
          p_comercio_id: string;
          p_link_id: string;
          p_monto: number;
          p_pagador_email: string;
          p_pagador_nombre: string;
          p_referencia?: string;
        };
        Returns: Json;
      };
      registrar_pago_payway: {
        Args: {
          p_bandera_id: string;
          p_cliente_id: string;
          p_costo_payway_pago_unico?: number;
          p_cuotas?: number;
          p_link_id: string;
          p_monto: number;
          p_pagador_email: string;
          p_pagador_nombre: string;
          p_payway_payment_id: string;
          p_payway_status: string;
          p_payway_status_detail?: string;
          p_site_transaction_id: string;
        };
        Returns: Json;
      };
      registrar_transferencia_bdc: {
        Args: {
          p_concepto?: string;
          p_destinatario_cbu: string;
          p_estado_bdc?: string;
          p_monto: number;
          p_origin_id: string;
          p_subcuenta_origen: string;
        };
        Returns: Json;
      };
      registrar_transferencia_bdc_detallada: {
        Args: {
          p_concepto?: string;
          p_destinatario_banco?: string;
          p_destinatario_cbu: string;
          p_destinatario_cuit?: string;
          p_destinatario_nombre?: string;
          p_estado_bdc?: string;
          p_monto: number;
          p_origin_id: string;
          p_subcuenta_origen: string;
        };
        Returns: Json;
      };
      registrar_transferencia_externa: {
        Args: {
          p_concepto?: string;
          p_destinatario_cbu: string;
          p_monto: number;
          p_subcuenta_origen: string;
        };
        Returns: Json;
      };
      registrar_transferencia_subcuentas: {
        Args: {
          p_concepto?: string;
          p_monto: number;
          p_subcuenta_destino: string;
          p_subcuenta_origen: string;
        };
        Returns: Json;
      };
      reservar_transferencia_bdc: {
        Args: {
          p_concepto?: string;
          p_destinatario_banco?: string;
          p_destinatario_cbu: string;
          p_destinatario_cuit?: string;
          p_destinatario_nombre?: string;
          p_monto: number;
          p_origin_id: string;
          p_subcuenta_origen: string;
        };
        Returns: Json;
      };
      reservar_transferencia_servicio: {
        Args: {
          p_destinatario_banco?: string;
          p_destinatario_cbu: string;
          p_destinatario_cuit?: string;
          p_destinatario_nombre?: string;
          p_monto: number;
          p_origin_id: string;
          p_subcuenta_origen: string;
        };
        Returns: Json;
      };
      resolver_alerta: {
        Args: { p_id: string; p_notes: string; p_resolution: string };
        Returns: undefined;
      };
      resumen_acreditaciones: {
        Args: { p_comercio_id?: string; p_desde: string; p_hasta: string };
        Returns: Json;
      };
      resumen_lotes_admin: {
        Args: { p_desde?: string; p_hasta?: string };
        Returns: Json;
      };
      rls_es_admin: { Args: never; Returns: boolean };
      rls_es_cliente_de: { Args: { p_legajo: string }; Returns: boolean };
      rls_es_propietario_de_cliente: {
        Args: { p_cliente_id: string };
        Returns: boolean;
      };
      rls_tiene_permiso: {
        Args: { p_accion: string; p_recurso_codigo: string };
        Returns: boolean;
      };
      role_clone: {
        Args: { p_name: string; p_role_id: string };
        Returns: string;
      };
      role_delete: {
        Args: { p_reassign_to?: string; p_role_id: string };
        Returns: number;
      };
      role_save: {
        Args: {
          p_description: string;
          p_name: string;
          p_permissions: string[];
          p_role_id: string;
        };
        Returns: string;
      };
      rpc_debug_log_por_comercio: {
        Args: { p_comercio_id: string; p_n?: number };
        Returns: {
          comercio_id: string | null;
          created_at: string;
          id: number;
          legajo: string | null;
          nota: string | null;
          op: string;
          payload: Json | null;
          request_id: string | null;
          row_id: string | null;
          source_table: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "rpc_debug_log";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      rpc_debug_log_por_pago: {
        Args: { p_n?: number; p_site_transaction_id: string };
        Returns: {
          comercio_id: string | null;
          created_at: string;
          id: number;
          legajo: string | null;
          nota: string | null;
          op: string;
          payload: Json | null;
          request_id: string | null;
          row_id: string | null;
          source_table: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "rpc_debug_log";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      rpc_debug_log_recientes: {
        Args: { p_n?: number };
        Returns: {
          comercio_id: string | null;
          created_at: string;
          id: number;
          legajo: string | null;
          nota: string | null;
          op: string;
          payload: Json | null;
          request_id: string | null;
          row_id: string | null;
          source_table: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "rpc_debug_log";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      rpc_debug_log_resumen: {
        Args: { p_desde?: string; p_hasta?: string };
        Returns: {
          cantidad: number;
          op: string;
          primer_evento: string;
          source_table: string;
          ultimo_evento: string;
        }[];
      };
      rpc_debug_log_truncar: { Args: never; Returns: number };
      rpc_pool_recaudacion: { Args: never; Returns: Json };
      security_event_record: {
        Args: {
          p_action: string;
          p_actor_id?: string;
          p_actor_type?: string;
          p_ip?: string;
          p_metadata?: Json;
          p_outcome?: string;
          p_request_id?: string;
          p_severity?: string;
          p_source?: string;
          p_target_id?: string;
          p_target_type?: string;
          p_target_user_id?: string;
          p_tenant_id?: string;
          p_user_agent?: string;
        };
        Returns: number;
      };
      security_event_record_safe: {
        Args: {
          p_action: string;
          p_actor_id?: string;
          p_actor_type?: string;
          p_ip?: string;
          p_metadata?: Json;
          p_outcome?: string;
          p_source?: string;
          p_target_id?: string;
          p_target_type?: string;
          p_target_user_id?: string;
          p_tenant_id?: string;
          p_user_agent?: string;
        };
        Returns: undefined;
      };
      security_event_sanitize: { Args: { p_value: Json }; Returns: Json };
      security_events_list: {
        Args: {
          p_action?: string;
          p_category?: string;
          p_cursor_at?: string;
          p_cursor_id?: number;
          p_from?: string;
          p_limit?: number;
          p_outcome?: string;
          p_search?: string;
          p_severity?: string;
          p_to?: string;
        };
        Returns: {
          action: string;
          actor_email: string;
          actor_id: string;
          actor_type: string;
          category: string;
          id: number;
          ip: string;
          label: string;
          metadata: Json;
          occurred_at: string;
          outcome: string;
          request_id: string;
          severity: string;
          source: string;
          target_email: string;
          target_id: string;
          target_type: string;
          target_user_id: string;
          tenant_id: string;
          user_agent: string;
        }[];
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      simular_deposito_entrante: {
        Args: {
          p_cbu_destino: string;
          p_cbu_origen?: string;
          p_cuit_origen?: string;
          p_importe: number;
          p_titular_origen?: string;
        };
        Returns: Json;
      };
      simular_historial_depositos: {
        Args: {
          p_cantidad?: number;
          p_cbu_destino: string;
          p_meses_atras?: number;
          p_monto_total: number;
        };
        Returns: Json;
      };
      sumar_dias_habiles: {
        Args: { p_dias: number; p_fecha: string };
        Returns: string;
      };
      tax_create: { Args: { p_rates?: Json; p_tax: Json }; Returns: string };
      tax_exemptions_expire: { Args: { p_dry_run?: boolean }; Returns: Json };
      tax_filing_generate: {
        Args: { p_period: string; p_segment: number; p_tax_id?: string };
        Returns: string;
      };
      tax_filing_set_filed: {
        Args: { p_filed?: boolean; p_filing_id: string };
        Returns: undefined;
      };
      tax_filing_set_paid: {
        Args: { p_filing_id: string; p_paid?: boolean; p_reference?: string };
        Returns: undefined;
      };
      tax_normalization_apply: { Args: { p_run_id: string }; Returns: Json };
      tax_normalization_discard: {
        Args: { p_run_id: string };
        Returns: undefined;
      };
      tax_normalization_preview: {
        Args: { p_registry_id: string };
        Returns: Json;
      };
      tax_rate_preview: {
        Args: { p_legajo: string; p_tax_id: string };
        Returns: {
          calculation_type: string;
          direction: string;
          note: string;
          rate: number;
          rate_code: string;
          registry_id: string;
        }[];
      };
      taxpayer_registry_confirm: {
        Args: { p_registry_id: string };
        Returns: Json;
      };
      taxpayer_registry_create: {
        Args: {
          p_authority: string;
          p_file_name: string;
          p_name: string;
          p_tax_id: string;
        };
        Returns: string;
      };
      taxpayer_registry_discard: {
        Args: { p_registry_id: string };
        Returns: undefined;
      };
      taxpayer_registry_finish_load: {
        Args: { p_meta: Json; p_registry_id: string };
        Returns: Json;
      };
      taxpayer_registry_insert_batch: {
        Args: {
          p_errors?: Json;
          p_extra_errors?: number;
          p_progress?: number;
          p_registry_id: string;
          p_rows: Json;
        };
        Returns: Json;
      };
      taxpayer_registry_mark_error: {
        Args: { p_message: string; p_registry_id: string };
        Returns: undefined;
      };
      usuario_comercio_id: { Args: never; Returns: string };
      validar_acceso_api: {
        Args: {
          p_api_key_id: string;
          p_ip: string;
          p_metodo: string;
          p_ruta: string;
        };
        Returns: Json;
      };
      validar_condiciones_alert_rule: {
        Args: { p_conditions: Json };
        Returns: undefined;
      };
      validar_operacion_comercio: {
        Args: { p_comercio_id: string };
        Returns: boolean;
      };
      validar_parametros_alert_rule: {
        Args: { p_code: string; p_params: Json };
        Returns: undefined;
      };
      webhook_encolar_sandbox: {
        Args: { p_comercio_id: string; p_datos: Json; p_evento: string };
        Returns: number;
      };
      webhook_resultado: {
        Args: {
          p_body: string;
          p_error: string;
          p_id: string;
          p_latencia_ms: number;
          p_status: number;
        };
        Returns: string;
      };
      webhook_tomar: { Args: { p_limite?: number }; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
