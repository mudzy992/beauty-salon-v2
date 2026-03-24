import React from 'react';
import { Redirect, Slot } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function AuthLayout() {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) return null;
  if (user) return <Redirect href="/" />;

  return <Slot />;
}

