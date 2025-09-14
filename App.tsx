import { StatusBar } from 'expo-status-bar'
import { RootNavigator } from './src/navigation/RootNavigator'
import { AuthProvider } from './src/stores/auth'

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  )
}
