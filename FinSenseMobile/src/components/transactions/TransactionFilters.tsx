import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { useTheme } from '../../contexts/ThemeContext'
import { useTransactionStore, TransactionFilters as TransactionFiltersType } from '../../stores/transactionStore'
import { useCategoryStore } from '../../stores/categoryStore'

interface TransactionFiltersProps {
  visible: boolean
  onClose: () => void
}

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: 'week' },
  { label: 'Last 30 days', value: 'month' },
  { label: 'This month', value: 'thisMonth' },
  { label: 'Custom', value: 'custom' },
]

const SORT_OPTIONS = [
  { label: 'Date (Newest)', value: { sortBy: 'date', sortOrder: 'desc' } },
  { label: 'Date (Oldest)', value: { sortBy: 'date', sortOrder: 'asc' } },
  { label: 'Amount (Highest)', value: { sortBy: 'amount', sortOrder: 'desc' } },
  { label: 'Amount (Lowest)', value: { sortBy: 'amount', sortOrder: 'asc' } },
  { label: 'Vendor (A-Z)', value: { sortBy: 'vendor', sortOrder: 'asc' } },
  { label: 'Vendor (Z-A)', value: { sortBy: 'vendor', sortOrder: 'desc' } },
]

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  visible,
  onClose
}) => {
  const { colors } = useTheme()
  const { filters, updateFilters, clearFilters } = useTransactionStore()
  const { categories } = useCategoryStore()
  
  const [localFilters, setLocalFilters] = useState<TransactionFiltersType>(filters)
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>('month')
  const [showCustomDate, setShowCustomDate] = useState(false)
  
  const styles = createStyles(colors)

  const handleDatePresetChange = (preset: string) => {
    setSelectedDatePreset(preset)
    
    const today = new Date()
    let startDate: string | undefined
    let endDate: string | undefined
    
    switch (preset) {
      case 'today':
        startDate = format(today, 'yyyy-MM-dd')
        endDate = format(today, 'yyyy-MM-dd')
        break
      case 'week':
        startDate = format(subDays(today, 7), 'yyyy-MM-dd')
        endDate = format(today, 'yyyy-MM-dd')
        break
      case 'month':
        startDate = format(subDays(today, 30), 'yyyy-MM-dd')
        endDate = format(today, 'yyyy-MM-dd')
        break
      case 'thisMonth':
        startDate = format(startOfMonth(today), 'yyyy-MM-dd')
        endDate = format(endOfMonth(today), 'yyyy-MM-dd')
        break
      case 'custom':
        setShowCustomDate(true)
        return
    }
    
    setLocalFilters(prev => ({
      ...prev,
      startDate,
      endDate
    }))
    setShowCustomDate(false)
  }

  const handleSortChange = (sortOption: { sortBy: string; sortOrder: string }) => {
    setLocalFilters(prev => ({
      ...prev,
      sortBy: sortOption.sortBy as 'date' | 'amount' | 'vendor',
      sortOrder: sortOption.sortOrder as 'asc' | 'desc'
    }))
  }

  const handleApplyFilters = () => {
    updateFilters(localFilters)
    onClose()
  }

  const handleClearFilters = () => {
    clearFilters()
    setLocalFilters({
      search: '',
      type: 'all',
      sortBy: 'date',
      sortOrder: 'desc'
    })
    setSelectedDatePreset('month')
    setShowCustomDate(false)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (localFilters.search) count++
    if (localFilters.type !== 'all') count++
    if (localFilters.categoryId) count++
    if (localFilters.startDate || localFilters.endDate) count++
    return count
  }

  const renderSearchInput = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Search</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search transactions..."
        placeholderTextColor={colors.text + '80'}
        value={localFilters.search}
        onChangeText={(text) => setLocalFilters(prev => ({ ...prev, search: text }))}
      />
    </View>
  )

  const renderTypeFilter = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Transaction Type</Text>
      <View style={styles.typeSelector}>
        {[
          { label: 'All', value: 'all' },
          { label: 'Income', value: 'income' },
          { label: 'Expense', value: 'expense' }
        ].map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.typeOption,
              localFilters.type === option.value && styles.selectedTypeOption
            ]}
            onPress={() => setLocalFilters(prev => ({ 
              ...prev, 
              type: option.value as 'all' | 'income' | 'expense'
            }))}
          >
            <Text style={[
              styles.typeOptionText,
              localFilters.type === option.value && styles.selectedTypeOptionText
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderCategoryFilter = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Category</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            !localFilters.categoryId && styles.selectedCategoryChip
          ]}
          onPress={() => setLocalFilters(prev => ({ ...prev, categoryId: undefined }))}
        >
          <Text style={[
            styles.categoryChipText,
            !localFilters.categoryId && styles.selectedCategoryChipText
          ]}>
            All
          </Text>
        </TouchableOpacity>
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              localFilters.categoryId === category.id && styles.selectedCategoryChip
            ]}
            onPress={() => setLocalFilters(prev => ({ 
              ...prev, 
              categoryId: category.id === localFilters.categoryId ? undefined : category.id
            }))}
          >
            <View style={[styles.categoryColorDot, { backgroundColor: category.color }]} />
            <Text style={[
              styles.categoryChipText,
              localFilters.categoryId === category.id && styles.selectedCategoryChipText
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )

  const renderDateFilter = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Date Range</Text>
      <View style={styles.datePresets}>
        {DATE_PRESETS.map(preset => (
          <TouchableOpacity
            key={preset.value}
            style={[
              styles.datePreset,
              selectedDatePreset === preset.value && styles.selectedDatePreset
            ]}
            onPress={() => handleDatePresetChange(preset.value)}
          >
            <Text style={[
              styles.datePresetText,
              selectedDatePreset === preset.value && styles.selectedDatePresetText
            ]}>
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {showCustomDate && (
        <View style={styles.customDateContainer}>
          <View style={styles.dateInputContainer}>
            <Text style={styles.dateInputLabel}>From</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.text + '80'}
              value={localFilters.startDate}
              onChangeText={(text) => setLocalFilters(prev => ({ ...prev, startDate: text }))}
            />
          </View>
          <View style={styles.dateInputContainer}>
            <Text style={styles.dateInputLabel}>To</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.text + '80'}
              value={localFilters.endDate}
              onChangeText={(text) => setLocalFilters(prev => ({ ...prev, endDate: text }))}
            />
          </View>
        </View>
      )}
    </View>
  )

  const renderSortOptions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sort By</Text>
      <View style={styles.sortOptions}>
        {SORT_OPTIONS.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.sortOption,
              localFilters.sortBy === option.value.sortBy && 
              localFilters.sortOrder === option.value.sortOrder && 
              styles.selectedSortOption
            ]}
            onPress={() => handleSortChange(option.value)}
          >
            <Text style={[
              styles.sortOptionText,
              localFilters.sortBy === option.value.sortBy && 
              localFilters.sortOrder === option.value.sortOrder && 
              styles.selectedSortOptionText
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Filter Transactions</Text>
            {getActiveFiltersCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {renderSearchInput()}
          {renderTypeFilter()}
          {renderCategoryFilter()}
          {renderDateFilter()}
          {renderSortOptions()}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={handleClearFilters}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.applyButton]}
            onPress={handleApplyFilters}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  filterBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeOption: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectedTypeOption: {
    backgroundColor: colors.primary,
  },
  typeOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedTypeOptionText: {
    color: 'white',
    fontWeight: '600',
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  selectedCategoryChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedCategoryChipText: {
    color: 'white',
    fontWeight: '600',
  },
  datePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  datePreset: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedDatePreset: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  datePresetText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedDatePresetText: {
    color: 'white',
    fontWeight: '600',
  },
  customDateContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  dateInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    color: colors.text,
  },
  sortOptions: {
    gap: 8,
  },
  sortOption: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
  },
  selectedSortOption: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  sortOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedSortOptionText: {
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  applyButton: {
    backgroundColor: colors.primary,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
})