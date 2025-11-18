import type { Database } from './database';

// Helper to get RPC function return type array
export type RPCFunctionReturns<T extends keyof Database['public']['Functions']> =
  Database['public']['Functions'][T]['Returns'];

// Helper to get RPC function return type (single object from array)
export type RPCFunction<T extends keyof Database['public']['Functions']> =
  Database['public']['Functions'][T]['Returns'] extends (infer U)[]
    ? U
    : Database['public']['Functions'][T]['Returns'];

// Helper to get RPC function args type
export type RPCArgs<T extends keyof Database['public']['Functions']> =
  Database['public']['Functions'][T]['Args'];

// Helper to get table row type
export type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

// Helper to get table insert type
export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

// Helper to get table update type
export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
