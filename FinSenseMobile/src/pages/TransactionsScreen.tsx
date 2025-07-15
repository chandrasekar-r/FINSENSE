import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Share,
  ActivityIndicator,
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useTheme } from '../contexts/ThemeContext'
import { useTransactionStore } from '../stores/transactionStore'
import { useCategoryStore } from '../stores/categoryStore'
import { TransactionListItem } from '../components/transactions/TransactionListItem'
import { TransactionFilters } from '../components/transactions/TransactionFilters'
import { TransactionForm } from '../components/transactions/TransactionForm'
import { TransactionStats } from '../components/transactions/TransactionStats'
import { TransactionDetailsModal } from '../components/TransactionDetailsModal'
import { Transaction } from '../lib/api'

export const TransactionsScreen: React.FC = () => {
  const { colors } = useTheme()
  const navigation = useNavigation()
  const {
    transactions,
    isLoading,
    isRefreshing,
    error,
    pagination,
    fetchTransactions,
    refreshTransactions,
    loadMoreTransactions,
    deleteTransaction,
    exportTransactions,
    clearError,
  } = useTransactionStore()
  const { fetchCategories } = useCategoryStore()
  
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showStats, setShowStats] = useState(false)
  
  const styles = createStyles(colors)

  // Load data on screen focus
  useFocusEffect(
    useCallback(() => {
      if (transactions.length === 0) {
        fetchTransactions(true)
      }
      fetchCategories()
    }, [])
  )

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: clearError }
      ])
    }
  }, [error, clearError])

  const handleRefresh = useCallback(() => {
    refreshTransactions()
  }, [])

  const handleLoadMore = useCallback(() => {
    if (pagination.hasMore && !isLoading) {
      loadMoreTransactions()
    }
  }, [pagination.hasMore, isLoading, loadMoreTransactions])

  const handleTransactionPress = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setShowDetails(true)
  }, [])

  const handleEditPress = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction)
    setShowForm(true)
  }, [])

  const handleDeletePress = useCallback(async (transaction: Transaction) => {
    try {
      await deleteTransaction(transaction.id)
    } catch (error) {
      // Error handling is done in the store
    }
  }, [deleteTransaction])

  const handleFormSuccess = useCallback(() => {
    setShowForm(false)
    setEditingTransaction(null)
    refreshTransactions()
  }, [refreshTransactions])

  const handleFormCancel = useCallback(() => {
    setShowForm(false)
    setEditingTransaction(null)
  }, [])

  const handleExport = useCallback(async () => {
    Alert.alert(
      'Export Transactions',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'CSV',
          onPress: async () => {
            try {
              const csvData = await exportTransactions('csv')
              await Share.share({
                message: csvData,
                title: 'Transaction Export',
              })
            } catch (error) {
              Alert.alert('Error', 'Failed to export transactions')
            }
          }
        },
        {
          text: 'JSON',
          onPress: async () => {
            try {
              const jsonData = await exportTransactions('json')
              await Share.share({
                message: jsonData,
                title: 'Transaction Export',
              })
            } catch (error) {
              Alert.alert('Error', 'Failed to export transactions')
            }
          }
        },
      ]
    )
  }, [exportTransactions])

  const renderTransaction = useCallback(({ item }: { item: Transaction }) => (
    <TransactionListItem
      transaction={item}
      onPress={() => handleTransactionPress(item)}
      onEdit={() => handleEditPress(item)}
      onDelete={() => handleDeletePress(item)}
    />
  ), [handleTransactionPress, handleEditPress, handleDeletePress])

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.title}>Transactions</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowStats(!showStats)}
          >
            <Text style={styles.headerButtonText}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowFilters(true)}
          >
            <Text style={styles.headerButtonText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleExport}
          >
            <Text style={styles.headerButtonText}>📤</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {showStats && (
        <TransactionStats style={styles.statsContainer} />
      )}
      
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowForm(true)}
      >
        <Text style={styles.addButtonText}>+ Add Transaction</Text>
      </TouchableOpacity>
    </View>
  )

  const renderFooter = () => {
    if (!pagination.hasMore) return null
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerText}>Loading more transactions...</Text>
      </View>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💸</Text>
      <Text style={styles.emptyTitle}>No Transactions Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start tracking your finances by adding your first transaction
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => setShowForm(true)}
      >
        <Text style={styles.emptyButtonText}>Add First Transaction</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
      />

      {/* Loading Overlay */}
      {isLoading && transactions.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      )}

      {/* Filters Modal */}
      <TransactionFilters
        visible={showFilters}
        onClose={() => setShowFilters(false)}
      />

      {/* Form Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleFormCancel}
      >
        <TransactionForm
          transaction={editingTransaction}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        transaction={selectedTransaction}
        visible={showDetails}
        onClose={() => {
          setShowDetails(false)
          setSelectedTransaction(null)
        }}
        onEdit={() => {
          setShowDetails(false)
          setEditingTransaction(selectedTransaction)
          setShowForm(true)
        }}
        onDelete={() => {
          setShowDetails(false)
          if (selectedTransaction) {
            handleDeletePress(selectedTransaction)
          }
          setSelectedTransaction(null)
        }}
      />
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerButtonText: {
    fontSize: 16,
  },
  statsContainer: {
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: colors.text + '80',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.text + '80',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background + 'E6',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
  },
})