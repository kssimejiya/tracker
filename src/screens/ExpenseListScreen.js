import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Keyboard,
  RefreshControl,
  Modal
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

const ExpenseListScreen = () => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [userName, setUserName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [groupedExpenses, setGroupedExpenses] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    getUserName();
    const unsubscribe = subscribeToExpenses();
    return () => unsubscribe && unsubscribe();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    subscribeToExpenses();
  }, []);

  const getUserName = async () => {
    try {
      const name = await AsyncStorage.getItem('userName');
      if (name) {
        setUserName(name);
      } else {
        Alert.alert('Error', 'User name not found. Please login again.');
      }
    } catch (error) {
      console.error('Error getting username:', error);
      Alert.alert('Error', 'Failed to get user name');
    }
  };

  const subscribeToExpenses = () => {
    try {
      const q = query(
        collection(db, 'expenses'),
        orderBy('timestamp', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const expenseList = [];
        snapshot.forEach((doc) => {
          expenseList.push({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp || new Date().toISOString()
          });
        });

        const grouped = expenseList.reduce((groups, expense) => {
          const month = moment(expense.timestamp).format('MMM, YYYY');
          if (!groups[month]) {
            groups[month] = {
              expenses: [],
              total: 0
            };
          }
          groups[month].expenses.push(expense);
          groups[month].total += expense.amount;
          return groups;
        }, {});

        setGroupedExpenses(grouped);
        setIsLoading(false);
        setRefreshing(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up expense subscription:", error);
      Alert.alert('Error', 'Failed to setup expense tracking');
      setIsLoading(false);
      setRefreshing(false);
      return null;
    }
  };

  const onDateChange = (event, selected) => {
    if (event.type !== 'dismissed' && selected) {
      setSelectedDate(selected);
    }
  };

  const handleSaveDatePicker = () => {
    setShowDatePicker(false);
  };

  const handleAddExpense = async () => {
    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter amount');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const expenseData = {
        description: description.trim() || 'Other',
        amount: numericAmount,
        userName,
        timestamp: selectedDate.toISOString()
      };

      await addDoc(collection(db, 'expenses'), expenseData);
      setDescription('');
      setAmount('');
      setSelectedDate(new Date());
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error adding expense:', error);
      Alert.alert('Error', 'Failed to add expense');
    }
  };

  const handleUpdateExpense = async (expenseId) => {
    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter amount');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const expenseRef = doc(db, 'expenses', expenseId);
      await updateDoc(expenseRef, {
        description: description.trim() || 'Other',
        amount: numericAmount,
        timestamp: selectedDate.toISOString()
      });
      setEditingId(null);
      setDescription('');
      setAmount('');
      setSelectedDate(new Date());
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error updating expense:', error);
      Alert.alert('Error', 'Failed to update expense');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'expenses', expenseId));
              if (editingId === expenseId) {
                setEditingId(null);
                setDescription('');
                setAmount('');
                setSelectedDate(new Date());
              }
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const toggleMonthExpansion = (month) => {
    setExpandedMonth(expandedMonth === month ? null : month);
  };

  const renderExpenseItem = ({ item }) => (
    <View style={styles.expenseItem}>
      <View style={styles.row}>
        <Text style={styles.description}>
          {editingId === item.id ? (
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description (Optional)"
              style={styles.editInput}
            />
          ) : (
            item.description
          )}
        </Text>
        <Text style={styles.amount}>
          ₹{editingId === item.id ? (
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="Amount"
              keyboardType="numeric"
              style={styles.editInput}
            />
          ) : (
            item.amount
          )}
        </Text>
      </View>
      <View style={styles.row}>
        <View style={styles.userInfoContainer}>
          <Text style={styles.userName}>{item.userName}</Text>
          <Text style={styles.date}>
            {moment(item.timestamp).format('MMM D, YYYY')}
          </Text>
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.time}>
            {moment(item.timestamp).format('HH:mm')}
          </Text>
          <View style={styles.actionButtons}>
            {editingId === item.id ? (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleUpdateExpense(item.id)}
              >
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    setEditingId(item.id);
                    setDescription(item.description);
                    setAmount(item.amount.toString());
                    setSelectedDate(new Date(item.timestamp));
                  }}
                >
                  <Text style={styles.editButton}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteExpense(item.id)}
                >
                  <Text style={styles.deleteButton}>✕</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );

  const renderMonthSection = ({ item }) => (
    <View style={styles.monthSection}>
      <TouchableOpacity
        style={styles.monthHeader}
        onPress={() => toggleMonthExpansion(item.month)}
        activeOpacity={0.7}
      >
        <View style={styles.monthTitleContainer}>
          <Text style={styles.monthTitle}>{item.month} :</Text>
          <Text style={styles.monthTotal}> ₹{item.total}</Text>
        </View>
        <Text style={styles.expandCollapseIcon}>
          {expandedMonth === item.month ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>
      {expandedMonth === item.month && (
        <View style={styles.monthContent}>
          <FlatList
            data={item.expenses}
            renderItem={renderExpenseItem}
            keyExtractor={(expense) => expense.id}
            scrollEnabled={false}
          />
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {Object.keys(groupedExpenses).length > 0 ? (
          <FlatList
            style={styles.list}
            data={Object.entries(groupedExpenses).map(([month, data]) => ({
              month,
              expenses: data.expenses,
              total: data.total
            }))}
            renderItem={renderMonthSection}
            keyExtractor={(item) => item.month}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#007AFF']}
                tintColor="#007AFF"
              />
            }
          />
        ) : (
          <View style={styles.noExpensesContainer}>
            <Text style={styles.noExpensesText}>No expenses added yet</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {moment(selectedDate).format('MMM D, YYYY')}
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Amount"
            value={amount}
            returnKeyType='done'
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholderTextColor="#999"
          />

          <TouchableOpacity
            style={[
              styles.addButton,
              !amount.trim() && styles.addButtonDisabled
            ]}
            onPress={handleAddExpense}
            disabled={!amount.trim()}
          >
            <Text style={styles.buttonText}>Add Expense</Text>
          </TouchableOpacity>
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={handleSaveDatePicker}>
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                maximumDate={new Date()}
                style={styles.datePicker}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noExpensesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noExpensesText: {
    fontSize: 16,
    color: '#666',
  },
  monthSection: {
    marginBottom: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    overflow: 'hidden',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  monthTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  monthTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  expandCollapseIcon: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
  },
  monthContent: {
    padding: 12,
    backgroundColor: '#fff',
  },
  expenseItem: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  description: {
    fontSize: 16,
    flex: 1,
    color: '#000',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 8,
  },
  userInfoContainer: {
    flex: 1,
  },
  userName: {
    color: '#666',
    fontSize: 14,
  },
  date: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    color: '#666',
    fontSize: 14,
    marginRight: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 5,
    marginLeft: 8,
  },
  editButton: {
    color: '#007AFF',
    fontSize: 14,
  },
  deleteButton: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    color: '#4CD964',
    fontSize: 14,
  },
  inputContainer: {
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  input: {
    height: 44,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
    color: '#000',
  },
  descriptionInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  datePickerButton: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    minWidth: 120,
  },
  dateButtonText: {
    color: '#000',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 5,
    borderRadius: 3,
    minWidth: 100,
    backgroundColor: '#fff',
    color: '#000',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  modalCancelText: {
    fontSize: 17,
    color: '#666',
    minWidth: 60,
  },
  modalSaveText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  datePicker: {
    height: 200,
    width: '100%',
  },
});

export default ExpenseListScreen;