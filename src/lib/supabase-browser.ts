// Supabase stub - NOT USED
// All data operations use Directus
export const createClient = () => {
  console.warn('Supabase is deprecated - use Directus instead');
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
      signUp: async () => ({ data: null, error: { message: 'Use Directus auth' } }),
      signInWithPassword: async () => ({ error: { message: 'Use Directus auth' } }),
      updateUser: async () => ({ error: { message: 'Use Directus auth' } }),
      resetPasswordForEmail: async () => ({ error: { message: 'Use Directus auth' } }),
    },
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
    }),
  };
};
