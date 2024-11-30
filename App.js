import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import UserNameScreen from './src/screens/UserNameScreen';
import ExpenseListScreen from './src/screens/ExpenseListScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="UserName">
        <Stack.Screen name="UserName" component={UserNameScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ExpenseList" component={ExpenseListScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}