import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { categoryAPI, Category } from '../lib/api'

interface CategoryState {
  categories: Category[]
  isLoading: boolean
  error: string | null
  fetchCategories: () => Promise<void>
  createCategory: (data: { name: string; color: string; description?: string }) => Promise<Category>
  updateCategory: (id: string, data: Partial<Category>) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
  findOrCreateCategory: (name: string, color?: string, description?: string) => Promise<Category>
  clearError: () => void
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set, get) => ({
      categories: [],
      isLoading: false,
      error: null,

      fetchCategories: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await categoryAPI.list()
          set({ 
            categories: response.data || [],
            isLoading: false 
          })
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to fetch categories'
          set({ 
            error: message,
            isLoading: false 
          })
          throw new Error(message)
        }
      },

      createCategory: async (data: { name: string; color: string; description?: string }) => {
        const { categories } = get()
        
        // Check for duplicates (case-insensitive)
        const existingCategory = categories.find(
          cat => cat.name.toLowerCase() === data.name.toLowerCase()
        )
        
        if (existingCategory) {
          return existingCategory
        }

        try {
          const response = await categoryAPI.create(data)
          const newCategory = response.data
          
          set(state => ({ 
            categories: [...state.categories, newCategory],
            error: null
          }))
          
          return newCategory
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to create category'
          set({ error: message })
          throw new Error(message)
        }
      },

      updateCategory: async (id: string, data: Partial<Category>) => {
        try {
          const response = await categoryAPI.update(id, data)
          const updatedCategory = response.data
          
          set(state => ({
            categories: state.categories.map(cat => 
              cat.id === id ? updatedCategory : cat
            ),
            error: null
          }))
          
          return updatedCategory
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to update category'
          set({ error: message })
          throw new Error(message)
        }
      },

      deleteCategory: async (id: string) => {
        try {
          await categoryAPI.delete(id)
          
          set(state => ({
            categories: state.categories.filter(cat => cat.id !== id),
            error: null
          }))
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to delete category'
          set({ error: message })
          throw new Error(message)
        }
      },

      findOrCreateCategory: async (name: string, color = '#3B82F6', description = '') => {
        const { categories, createCategory } = get()
        
        // Check if category already exists (case-insensitive)
        const existingCategory = categories.find(
          cat => cat.name.toLowerCase() === name.toLowerCase()
        )
        
        if (existingCategory) {
          return existingCategory
        }
        
        // Create new category if it doesn't exist
        return await createCategory({ name, color, description })
      },

      clearError: () => {
        set({ error: null })
      }
    }),
    {
      name: 'category-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        categories: state.categories,
      }),
    }
  )
)

// Helper hook to get category by ID
export const useCategoryById = (id: string) => {
  const categories = useCategoryStore(state => state.categories)
  return categories.find(cat => cat.id === id)
}

// Helper hook to get categories as options for select inputs
export const useCategoryOptions = () => {
  const categories = useCategoryStore(state => state.categories)
  return categories.map(cat => ({
    value: cat.id,
    label: cat.name,
    color: cat.color,
  }))
}