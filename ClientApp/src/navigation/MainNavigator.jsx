import React from 'react';
import { Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

// Existing Screens
import HomeScreen from '../screens/HomeScreen';
import GroupScreen from '../screens/GroupScreen';
import BalancesScreen from '../screens/BalancesScreen';
import FriendsScreen from '../screens/FriendsScreen';
import ActivityScreen from '../screens/ActivityScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import ExpenseDetailScreen from '../screens/ExpenseDetailScreen';

// New Financial Management Screens
import FinancialDashboardScreen from '../screens/FinancialDashboardScreen';
import AccountsScreen from '../screens/AccountsScreen';
import BudgetScreen from '../screens/BudgetScreen';
import PlannedExpensesScreen from '../screens/PlannedExpensesScreen';
import SavingsGoalsScreen from '../screens/SavingsGoalsScreen';
import SMSTransactionsScreen from '../screens/SMSTransactionsScreen';
import ReportsScreen from '../screens/ReportsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const getStackScreenOptions = (theme, isAmharic) => ({
  headerStyle: {
    backgroundColor: theme.dark ? '#1E1E1E' : theme.colors.primary,
    borderBottomColor: theme.dark ? '#2C2C2C' : 'transparent',
    borderBottomWidth: theme.dark ? 1 : 0,
    elevation: theme.dark ? 0 : 4,
    shadowOpacity: theme.dark ? 0 : 0.2,
  },
  headerTintColor: '#fff',
  headerTitleStyle: {
    fontWeight: 'bold',
    fontFamily: isAmharic
      ? 'Noto Serif Ethiopic, "material-community", "Material Design Icons", sans-serif'
      : undefined,
  },
  cardStyle: {
    backgroundColor: theme.colors.background,
  },
});

const HomeStack = () => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(theme, isAmharic)}>
      <Stack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{ title: t('home') }}
      />
      <Stack.Screen
        name="Group"
        component={GroupScreen}
        options={{ title: t('groups') }}
      />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ title: t('add_expense') }}
      />
      <Stack.Screen
        name="EditExpense"
        component={AddExpenseScreen}
        options={{ title: t('edit_expense') || 'Edit Expense' }}
      />
      <Stack.Screen
        name="ExpenseDetail"
        component={ExpenseDetailScreen}
        options={{ title: t('expense_details') || t('expense_description') }}
      />
      <Stack.Screen
        name="FinancialDashboardScreen"
        component={FinancialDashboardScreen}
        options={{ title: t('financial_hub') || t('finance') }}
      />
      <Stack.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{ title: t('accounts') }}
      />
      <Stack.Screen
        name="Budgets"
        component={BudgetScreen}
        options={{ title: t('budgets') }}
      />
      <Stack.Screen
        name="PlannedExpenses"
        component={PlannedExpensesScreen}
        options={{ title: t('planned_expenses') }}
      />
      <Stack.Screen
        name="SavingsGoals"
        component={SavingsGoalsScreen}
        options={{ title: t('savings_goals') }}
      />
      <Stack.Screen
        name="SMSTransactions"
        component={SMSTransactionsScreen}
        options={{ title: t('sms_transactions') }}
      />
      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: t('reports') }}
      />
    </Stack.Navigator>
  );
};

const FinanceStack = () => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(theme, isAmharic)}>
      <Stack.Screen
        name="FinanceDashboard"
        component={FinancialDashboardScreen}
        options={{ title: t('financial_hub') || t('finance') }}
      />
      <Stack.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{ title: t('accounts') }}
      />
      <Stack.Screen
        name="Budgets"
        component={BudgetScreen}
        options={{ title: t('budgets') }}
      />
      <Stack.Screen
        name="PlannedExpenses"
        component={PlannedExpensesScreen}
        options={{ title: t('planned_expenses') }}
      />
      <Stack.Screen
        name="SavingsGoals"
        component={SavingsGoalsScreen}
        options={{ title: t('savings_goals') }}
      />
      <Stack.Screen
        name="SMSTransactions"
        component={SMSTransactionsScreen}
        options={{ title: t('sms_transactions') }}
      />
      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: t('reports') }}
      />
    </Stack.Navigator>
  );
};

const BalancesStack = () => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(theme, isAmharic)}>
      <Stack.Screen
        name="BalancesScreen"
        component={BalancesScreen}
        options={{ title: t('balances') }}
      />
    </Stack.Navigator>
  );
};

const FriendsStack = () => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(theme, isAmharic)}>
      <Stack.Screen
        name="FriendsScreen"
        component={FriendsScreen}
        options={{ title: t('friends') }}
      />
    </Stack.Navigator>
  );
};

const ActivityStack = () => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(theme, isAmharic)}>
      <Stack.Screen
        name="ActivityScreen"
        component={ActivityScreen}
        options={{ title: t('activity') }}
      />
    </Stack.Navigator>
  );
};

const ProfileStack = () => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(theme, isAmharic)}>
      <Stack.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={{ title: t('profile') }}
      />
    </Stack.Navigator>
  );
};

const MainNavigator = () => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Finance') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Balances') {
            iconName = focused ? 'cash' : 'cash-multiple';
          } else if (route.name === 'Friends') {
            iconName = focused ? 'account-group' : 'account-group-outline';
          } else if (route.name === 'Activity') {
            iconName = focused ? 'history' : 'history';
          } else if (route.name === 'Profile') {
            if (user?.avatar) {
              return (
                <Image
                  source={{ uri: user.avatar }}
                  style={{
                    width: size + 2,
                    height: size + 2,
                    borderRadius: (size + 2) / 2,
                    borderWidth: focused ? 2 : 1,
                    borderColor: focused ? theme.colors.primary : (theme.dark ? '#555' : '#ccc'),
                  }}
                />
              );
            }
            iconName = focused ? 'account' : 'account-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.dark ? '#888888' : 'gray',
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.dark ? '#2C2C2C' : '#E0E0E0',
        },
        tabBarLabelStyle: {
          fontFamily: isAmharic
            ? 'Noto Serif Ethiopic, "material-community", "Material Design Icons", sans-serif'
            : undefined,
          fontSize: 10,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ tabBarLabel: t('home'), title: t('home') }}
      />
      <Tab.Screen
        name="Finance"
        component={FinanceStack}
        options={{ tabBarLabel: t('finance'), title: t('finance') }}
      />
      <Tab.Screen
        name="Balances"
        component={BalancesStack}
        options={{ tabBarLabel: t('balances'), title: t('balances') }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsStack}
        options={{ tabBarLabel: t('friends'), title: t('friends') }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityStack}
        options={{ tabBarLabel: t('activity'), title: t('activity') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ tabBarLabel: t('profile'), title: t('profile') }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
