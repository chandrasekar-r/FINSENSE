import React, { useState, useEffect } from 'react'
import { useCategoryStore } from '../stores/categoryStore'
import type { Category } from '../lib/api'

interface CategoryFormData {
  name: string
  color: string
  icon: string
}

interface CategoryManagerProps {
  onCategorySelect?: (category: Category) => void
  showSelectMode?: boolean
}

const defaultColors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
]

const defaultIcons = [
  '📁', '🍔', '🏠', '🚗', '💊', '🎬', '👕', '⚽', '📚', '🎮',
  '☕', '✈️', '🛒', '💡', '🎵', '🏋️', '🍕', '📱', '💻', '🎨',
  '💰', '🎯', '🛍️', '🏥', '⛽', '🎪', '🎸', '📰', '🎭', '🌮',
  '🍜', '🍣', '🍺', '🚌', '🚕', '🚇', '✂️', '🔧', '🎓', '💼'
]

export const CategoryManager: React.FC<CategoryManagerProps> = ({ 
  onCategorySelect, 
  showSelectMode = false 
}) => {
  const { 
    categories, 
    isLoading, 
    error, 
    fetchCategories, 
    createCategory, 
    updateCategory, 
    deleteCategory, 
    clearError 
  } = useCategoryStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    color: '#3B82F6',
    icon: '📁'
  })
  const [customIcon, setCustomIcon] = useState('')
  const [showIconInput, setShowIconInput] = useState(false)

  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories()
    }
  }, [])

  useEffect(() => {
    if (error) {
      // Auto-clear error after 5 seconds
      const timer = setTimeout(() => {
        clearError()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newCategory = await createCategory(formData)
      setFormData({ name: '', color: '#3B82F6', icon: '📁' })
      setCustomIcon('')
      setShowIconInput(false)
      setShowAddModal(false)
      
      if (onCategorySelect) {
        onCategorySelect(newCategory)
      }
    } catch (error) {
      console.error('Failed to create category:', error)
    }
  }

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory) return

    try {
      const updatedCategory = await updateCategory(editingCategory.id, formData)
      setShowEditModal(false)
      setEditingCategory(null)
      setFormData({ name: '', color: '#3B82F6', icon: '📁' })
      setCustomIcon('')
      setShowIconInput(false)
      
      if (onCategorySelect) {
        onCategorySelect(updatedCategory)
      }
    } catch (error) {
      console.error('Failed to update category:', error)
    }
  }

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return

    try {
      await deleteCategory(categoryToDelete.id)
      setShowDeleteModal(false)
      setCategoryToDelete(null)
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }

  const openEditModal = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      color: category.color,
      icon: category.icon
    })
    // Check if the icon is in our default icons list
    if (!defaultIcons.includes(category.icon)) {
      setCustomIcon(category.icon)
      setShowIconInput(true)
    } else {
      setCustomIcon('')
      setShowIconInput(false)
    }
    setShowEditModal(true)
  }

  const openDeleteModal = (category: Category) => {
    setCategoryToDelete(category)
    setShowDeleteModal(true)
  }

  const openAddModal = () => {
    setFormData({ name: '', color: '#3B82F6', icon: '📁' })
    setCustomIcon('')
    setShowIconInput(false)
    setShowAddModal(true)
  }

  const handleCategorySelect = (category: Category) => {
    if (onCategorySelect) {
      onCategorySelect(category)
    }
  }

  const handleCustomIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomIcon(value)
    if (value.trim()) {
      setFormData(prev => ({ ...prev, icon: value.trim() }))
    }
  }

  const toggleIconInput = () => {
    setShowIconInput(!showIconInput)
    if (!showIconInput) {
      setCustomIcon('')
      setFormData(prev => ({ ...prev, icon: '📁' }))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {showSelectMode ? 'Select Category' : 'Manage Categories'}
        </h3>
        <button
          onClick={openAddModal}
          className="px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          Add Category
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading categories...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 max-h-60 overflow-y-auto">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 ${
                showSelectMode 
                  ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
                  : 'bg-white dark:bg-gray-800'
              }`}
              onClick={() => showSelectMode && handleCategorySelect(category)}
            >
              <div className="flex items-center space-x-3">
                <span 
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white text-lg sm:text-xl font-medium shadow-sm"
                  style={{ backgroundColor: category.color }}
                >
                  <span style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Android Emoji, serif' }}>
                    {category.icon}
                  </span>
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {category.name}
                </span>
                {category.is_default && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                    Default
                  </span>
                )}
              </div>
              
              {!showSelectMode && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditModal(category)}
                    className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {!category.is_default && (
                    <button
                      onClick={() => openDeleteModal(category)}
                      className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {categories.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No categories found</p>
              <p className="text-sm">Create your first category to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Category Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 z-[60] flex items-center justify-center p-2 sm:p-4">
          <div className="relative mx-auto p-4 sm:p-6 border border-gray-200 dark:border-gray-700 w-full max-w-md sm:max-w-lg lg:max-w-xl shadow-xl rounded-lg bg-white dark:bg-gray-800 max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {showEditModal ? 'Edit Category' : 'Create New Category'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setShowEditModal(false)
                    setEditingCategory(null)
                    setCustomIcon('')
                    setShowIconInput(false)
                  }}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={showEditModal ? handleUpdateCategory : handleCreateCategory} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Groceries"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Color
                  </label>
                  <div className="space-y-3">
                    {/* Color Picker */}
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="w-12 h-12 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                      />
                      <div className="flex-1">
                        <input
                          type="text"
                          value={formData.color}
                          onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="#3B82F6"
                        />
                      </div>
                    </div>
                    
                    {/* Quick Color Presets */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick presets:</p>
                      <div className="flex flex-wrap gap-2">
                        {defaultColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, color }))}
                            className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                              formData.color === color ? 'border-gray-900 dark:border-white ring-2 ring-blue-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Icon
                  </label>
                  <div className="space-y-3">
                    {/* Custom Icon Input Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {showIconInput ? 'Custom emoji:' : 'Choose from presets:'}
                      </span>
                      <button
                        type="button"
                        onClick={toggleIconInput}
                        className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {showIconInput ? 'Use Presets' : 'Custom Emoji'}
                      </button>
                    </div>

                    {showIconInput ? (
                      /* Custom Icon Input */
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-2xl bg-white dark:bg-gray-700"
                          style={{ backgroundColor: formData.color + '20' }}
                        >
                          {formData.icon}
                        </div>
                        <input
                          type="text"
                          value={customIcon}
                          onChange={handleCustomIconChange}
                          placeholder="Enter any emoji (e.g. 🎸, 🌟, 💎)"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    ) : (
                      /* Default Icon Grid */
                      <div className="grid grid-cols-8 sm:grid-cols-10 gap-2 max-h-40 overflow-y-auto p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        {defaultIcons.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, icon }))
                              setCustomIcon('')
                            }}
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg border-2 text-lg sm:text-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110 ${
                              formData.icon === icon 
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-300' 
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                            title={`Use ${icon}`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Preview */}
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-medium shadow-md"
                        style={{ backgroundColor: formData.color }}
                      >
                        {formData.icon}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Preview</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formData.name || 'Category name'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                </div>

                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6 mt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium text-sm"
                  >
                    {showEditModal ? 'Update Category' : 'Create Category'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setShowEditModal(false)
                      setEditingCategory(null)
                      setCustomIcon('')
                      setShowIconInput(false)
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && categoryToDelete && (
        <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 z-[60] flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-xl rounded-lg bg-white dark:bg-gray-800">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.876c1.148 0 2.062-.929 2.062-2.077v-8.846C21 6.929 20.085 6 18.938 6H5.062C3.915 6 3 6.929 3 8.077v8.846C3 18.071 3.915 19 5.062 19z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4">Delete Category</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete "{categoryToDelete.name}"? This action cannot be undone.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setCategoryToDelete(null)
                  }}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCategory}
                  className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}