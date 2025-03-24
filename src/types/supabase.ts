
import type { Json } from '@/integrations/supabase/types';

// Type helpers for working with database types
export type JsonObject = { [key: string]: Json };

// Helper type for converting between database JSON and typed objects
export type DatabaseRecord<T> = {
  [K in keyof T]: T[K] extends object 
    ? Json 
    : T[K] extends object[] 
      ? Json 
      : T[K];
};

// Convert database table records to typed objects
export function convertFromDatabase<T>(data: any): T {
  return data as unknown as T;
}

// Convert typed objects to database table records
export function convertToDatabase<T>(data: T): DatabaseRecord<T> {
  return data as unknown as DatabaseRecord<T>;
}

// Safely access JSON properties with type checking
export function getJsonProperty<T>(json: Json | null | undefined, path: string, defaultValue: T): T {
  if (!json) return defaultValue;
  
  const parts = path.split('.');
  let current: any = json;
  
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[part];
  }
  
  return (current === null || current === undefined) ? defaultValue : current as T;
}
