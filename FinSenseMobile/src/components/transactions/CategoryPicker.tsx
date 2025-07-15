import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { useCategoryStore, Category } from '../../stores/categoryStore'

interface CategoryPickerProps {
  selectedCategoryId?: string
  onCategorySelect: (categoryId: string) => void
  placeholder?: string
  disabled?: boolean
}

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4',
  '#84CC16', '#F97316', '#EC4899', '#6B7280', '#14B8A6', '#A855F7'
]

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  selectedCategoryId,
  onCategorySelect,
  placeholder = 'Select category',
  disabled = false
}) => {
  const { colors } = useTheme()
  const { categories, isLoading, fetchCategories, createCategory } = useCategoryStore()
  const [modalVisible, setModalVisible] = useState(false)
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(DEFAULT_COLORS[0])
  const [isCreating, setIsCreating] = useState(false)

  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId)
  const styles = createStyles(colors)

  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories().catch(error => {
        console.error('Failed to fetch categories:', error)
      })
    }
  }, [])

  const handleCategorySelect = (categoryId: string) => {
    onCategorySelect(categoryId)
    setModalVisible(false)
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name')
      return
    }

    setIsCreating(true)
    try {
      const newCategory = await createCategory({
        name: newCategoryName.trim(),
        color: newCategoryColor,
        description: `Custom category: ${newCategoryName.trim()}`
      })
      
      onCategorySelect(newCategory.id)
      setNewCategoryName('')
      setNewCategoryColor(DEFAULT_COLORS[0])
      setShowNewCategoryForm(false)
      setModalVisible(false)
    } catch (error) {
      Alert.alert('Error', 'Failed to create category')
    } finally {
      setIsCreating(false)
    }
  }

  const renderCategoryItem = (category: Category) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryItem,
        selectedCategoryId === category.id && styles.selectedCategoryItem
      ]}
      onPress={() => handleCategorySelect(category.id)}
    >
      <View style={[styles.categoryColorDot, { backgroundColor: category.color }]} />
      <Text style={[
        styles.categoryName,
        selectedCategoryId === category.id && styles.selectedCategoryName
      ]}>
        {category.name}
      </Text>
      {selectedCategoryId === category.id && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  )

  const renderColorPicker = () => (
    <View style={styles.colorPickerContainer}>
      <Text style={styles.colorPickerTitle}>Choose Color</Text>
      <View style={styles.colorGrid}>
        {DEFAULT_COLORS.map(color => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              newCategoryColor === color && styles.selectedColorOption
            ]}
            onPress={() => setNewCategoryColor(color)}
          />
        ))}
      </View>
    </View>
  )

  const renderNewCategoryForm = () => (
    <View style={styles.newCategoryForm}>
      <Text style={styles.newCategoryTitle}>Create New Category</Text>
      
      <TextInput
        style={styles.newCategoryInput}
        placeholder="Category name"
        placeholderTextColor={colors.text + '80'}
        value={newCategoryName}
        onChangeText={setNewCategoryName}
        autoFocus
      />
      
      {renderColorPicker()}
      
      <View style={styles.newCategoryButtons}>
        <TouchableOpacity
          style={[styles.newCategoryButton, styles.cancelButton]}
          onPress={() => {
            setShowNewCategoryForm(false)
            setNewCategoryName('')
            setNewCategoryColor(DEFAULT_COLORS[0])
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.newCategoryButton, styles.createButton]}
          onPress={handleCreateCategory}
          disabled={isCreating || !newCategoryName.trim()}
        >
          <Text style={styles.createButtonText}>
            {isCreating ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.picker,
          disabled && styles.disabledPicker
        ]}
        onPress={() => setModalVisible(true)}
        disabled={disabled}
      >
        {selectedCategory ? (
          <View style={styles.selectedCategoryContainer}>
            <View style={[styles.categoryColorDot, { backgroundColor: selectedCategory.color }]} />
            <Text style={styles.selectedCategoryText}>{selectedCategory.name}</Text>
          </View>
        ) : (
          <Text style={styles.placeholderText}>{placeholder}</Text>
        )}
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {showNewCategoryForm ? (
            renderNewCategoryForm()
          ) : (
            <>
              <ScrollView style={styles.categoriesList}>
                {categories.map(renderCategoryItem)}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.newCategoryTrigger}
                  onPress={() => setShowNewCategoryForm(true)}
                >
                  <Text style={styles.newCategoryTriggerText}>+ Create New Category</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
  },
  disabledPicker: {
    opacity: 0.6,
  },
  selectedCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  selectedCategoryText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.text + '80',
    flex: 1,
  },
  chevron: {
    fontSize: 18,
    color: colors.text + '80',
    transform: [{ rotate: '90deg' }],
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.text,
  },
  categoriesList: {
    flex: 1,
    padding: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedCategoryItem: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  categoryName: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    marginLeft: 8,
  },
  selectedCategoryName: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  newCategoryTrigger: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  newCategoryTriggerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  newCategoryForm: {
    flex: 1,
    padding: 16,
  },
  newCategoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 20,
  },
  newCategoryInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 20,
  },
  colorPickerContainer: {
    marginBottom: 20,
  },
  colorPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: colors.text,
  },
  newCategoryButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  newCategoryButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  createButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})